import React, {useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Copy, Diamond, Download, Film, Pause, Play, Plus, Trash2, Upload} from 'lucide-react';
import {
  Keyframe,
  Project,
  clamp,
  defaultProject,
  interpolateKeyframe,
  normalizeProject,
  projectImageToBrowserSrc,
} from './project';
import './styles.css';

function App() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [activeId, setActiveId] = useState(defaultProject.keyframes[1].id);
  const [time, setTime] = useState(4.45);
  const [playing, setPlaying] = useState(false);
  const [renderState, setRenderState] = useState<
    | {status: 'idle'}
    | {status: 'rendering'}
    | {status: 'complete'; videoUrl: string; outputPath: string}
    | {status: 'error'; message: string}
  >({status: 'idle'});
  const focusRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const didDragKeyframeRef = useRef(false);

  const {duration, keyframes} = project;
  const imageSrc = projectImageToBrowserSrc(project.image);
  const active = keyframes.find((frame) => frame.id === activeId) ?? keyframes[0];
  const preview = useMemo(() => interpolateKeyframe(keyframes, time), [keyframes, time]);

  React.useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let started = performance.now();
    const origin = time;
    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      const next = (origin + elapsed) % duration;
      setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const updateActive = (patch: Partial<Keyframe>) => {
    setProject((current) => ({
      ...current,
      keyframes: current.keyframes
        .map((frame) => (frame.id === active.id ? {...frame, ...patch} : frame))
        .sort((a, b) => a.time - b.time),
    }));
  };

  const addKeyframe = () => {
    const frame = {...preview, id: `kf-${Date.now()}`, time: Number(time.toFixed(2))};
    setProject((current) => ({
      ...current,
      keyframes: [...current.keyframes, frame].sort((a, b) => a.time - b.time),
    }));
    setActiveId(frame.id);
  };

  const removeKeyframe = () => {
    if (keyframes.length <= 2) return;
    const remaining = keyframes.filter((frame) => frame.id !== active.id);
    setProject((current) => ({...current, keyframes: remaining}));
    setActiveId(remaining[0].id);
  };

  const loadProject = async (file: File) => {
    const nextProject = normalizeProject(JSON.parse(await file.text()));
    setProject(nextProject);
    setTime(0);
    setActiveId(nextProject.keyframes[0].id);
    setRenderState({status: 'idle'});
  };

  const renderCurrentProject = async () => {
    setRenderState({status: 'rendering'});

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(project),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Render failed.');
      }

      setRenderState({status: 'complete', videoUrl: body.videoUrl, outputPath: body.outputPath});
    } catch (error) {
      setRenderState({status: 'error', message: error instanceof Error ? error.message : String(error)});
    }
  };

  const onFocusDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = focusRef.current?.getBoundingClientRect();
    if (!rect) return;
    const write = (clientX: number, clientY: number) => {
      updateActive({
        focusX: Math.round(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)),
        focusY: Math.round(clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)),
      });
    };
    write(event.clientX, event.clientY);
    const move = (moveEvent: PointerEvent) => write(moveEvent.clientX, moveEvent.clientY);
    const done = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', done);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', done);
  };

  const writeKeyframeTime = (id: string, clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextTime = Number(clamp(((clientX - rect.left) / rect.width) * duration, 0, duration).toFixed(2));
    setProject((current) => ({
      ...current,
      keyframes: current.keyframes
        .map((frame) => (frame.id === id ? {...frame, time: nextTime} : frame))
        .sort((a, b) => a.time - b.time),
    }));
    setTime(nextTime);
  };

  const onKeyframePointerDown = (event: React.PointerEvent<HTMLButtonElement>, frame: Keyframe) => {
    event.preventDefault();
    event.stopPropagation();
    setPlaying(false);
    setActiveId(frame.id);
    setTime(frame.time);
    didDragKeyframeRef.current = false;

    const startX = event.clientX;
    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 2) {
        didDragKeyframeRef.current = true;
      }
      writeKeyframeTime(frame.id, moveEvent.clientX);
    };
    const done = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', done);
      if (didDragKeyframeRef.current) {
        writeKeyframeTime(frame.id, upEvent.clientX);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', done);
  };

  const json = JSON.stringify(project, null, 2);
  const transform = `perspective(1200px) translate(${preview.x}px, ${preview.y}px) scale(${preview.scale}) rotateX(${preview.tiltX}deg) rotateY(${preview.tiltY}deg) rotateZ(${preview.roll}deg)`;
  const mask = `radial-gradient(circle at ${preview.focusX}% ${preview.focusY}%, black 0%, black ${preview.focusSize}%, transparent ${preview.focusFalloff}%)`;
  const showSharpLayer = project.focusEnabled || !project.blurEnabled;

  return (
    <main className="app">
      <section className="previewPanel">
        <div className={`stage background-${project.backgroundTheme} pattern-${project.backgroundPattern}`} data-testid="stage">
          <div className="shot" style={{transform}}>
            <img className="shotImage blurred" src={imageSrc} style={{filter: project.blurEnabled ? `blur(${preview.blur}px)` : 'none'}} />
            {showSharpLayer && (
              <img
                className="shotImage sharp"
                src={imageSrc}
                style={project.focusEnabled ? {maskImage: mask, WebkitMaskImage: mask} : undefined}
              />
            )}
          </div>
        </div>

        <div className="timelinePanel">
          <div className="timelineToolbar">
            <button className="iconButton" aria-label={playing ? 'Pause preview' : 'Play preview'} onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <span className="clock">{time.toFixed(2)}s / {duration.toFixed(2)}s</span>
            <button className="primary" onClick={addKeyframe}>
              <Plus size={17} /> Keyframe
            </button>
          </div>
          <div className="timeline" ref={timelineRef}>
            <input
              className="timelineScrubber"
              aria-label="Current time"
              type="range"
              min="0"
              max={duration}
              step="0.01"
              value={time}
              onChange={(event) => setTime(Number(event.target.value))}
            />
            {keyframes.map((frame) => (
              <button
                key={frame.id}
                className={`marker ${frame.id === active.id ? 'active' : ''}`}
                style={{left: `${(frame.time / duration) * 100}%`}}
                onPointerDown={(event) => onKeyframePointerDown(event, frame)}
                onClick={() => {
                  if (didDragKeyframeRef.current) {
                    didDragKeyframeRef.current = false;
                    return;
                  }
                  setActiveId(frame.id);
                  setTime(frame.time);
                }}
                aria-label={`Keyframe at ${frame.time}s`}
              >
                <Diamond size={14} fill="currentColor" />
              </button>
            ))}
            <div className="playhead" style={{left: `${(time / duration) * 100}%`}} />
          </div>
        </div>
      </section>

      <aside className="controls">
        <div className="panelTitle">
          <div>
            <p className="eyebrow">Selected</p>
            <h2>{active.time.toFixed(2)}s keyframe</h2>
          </div>
          <button className="iconButton" aria-label="Delete selected keyframe" onClick={removeKeyframe}>
            <Trash2 size={16} />
          </button>
        </div>

        <div className="switchRow">
          <Toggle label="Blur" checked={project.blurEnabled} onChange={(blurEnabled) => setProject((current) => ({...current, blurEnabled}))} />
          <Toggle label="Focus" checked={project.focusEnabled} onChange={(focusEnabled) => setProject((current) => ({...current, focusEnabled}))} />
        </div>

        <label className="backgroundControl">
          <span>Theme</span>
          <select value={project.backgroundTheme} onChange={(event) => setProject((current) => ({...current, backgroundTheme: event.target.value as Project['backgroundTheme']}))}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label className="backgroundControl">
          <span>Pattern</span>
          <select value={project.backgroundPattern} onChange={(event) => setProject((current) => ({...current, backgroundPattern: event.target.value as Project['backgroundPattern']}))}>
            <option value="lines">Lines</option>
            <option value="grid">Grid</option>
            <option value="dots">Dots</option>
            <option value="clear">Clear</option>
          </select>
        </label>

        <div className="sectionBreak" />
        <Control label="Time" value={active.time} min={0} max={duration} step={0.01} suffix="s" onChange={(timeValue) => updateActive({time: timeValue})} />
        <Control label="X" value={active.x} min={-220} max={220} step={1} onChange={(x) => updateActive({x})} />
        <Control label="Y" value={active.y} min={-160} max={160} step={1} onChange={(y) => updateActive({y})} />
        <Control label="Scale" value={active.scale} min={0.5} max={1.35} step={0.01} suffix="x" onChange={(scale) => updateActive({scale})} />
        <Control label="Tilt X" value={active.tiltX} min={-30} max={30} step={1} suffix="deg" onChange={(tiltX) => updateActive({tiltX})} />
        <Control label="Tilt Y" value={active.tiltY} min={-30} max={30} step={1} suffix="deg" onChange={(tiltY) => updateActive({tiltY})} />
        <Control label="Roll" value={active.roll} min={-20} max={20} step={1} suffix="deg" onChange={(roll) => updateActive({roll})} />

        <div className="sectionBreak" />
        <Control label="Blur" value={active.blur} min={0} max={32} step={1} suffix="px" onChange={(blur) => updateActive({blur})} />
        <Control label="Focus size" value={active.focusSize} min={4} max={35} step={1} suffix="%" onChange={(focusSize) => updateActive({focusSize})} />
        <Control label="Falloff" value={active.focusFalloff} min={14} max={70} step={1} suffix="%" onChange={(focusFalloff) => updateActive({focusFalloff})} />

        <div className="focusHeader">
          <span>Focus point</span>
          <strong>{Math.round(active.focusX)}%, {Math.round(active.focusY)}%</strong>
        </div>
        <div className="focusPad" ref={focusRef} onPointerDown={onFocusDrag} data-testid="focus-pad">
          <span className="focusDot" style={{left: `${active.focusX}%`, top: `${active.focusY}%`}} />
        </div>

        <details>
          <summary><Copy size={15} /> Project JSON</summary>
          <pre>{json}</pre>
        </details>

        <button
          className="secondary"
          onClick={() => {
            const blob = new Blob([json], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'focus-keyframes.json';
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} /> Save JSON
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Load JSON
        </button>
        <button className="secondary renderButton" disabled={renderState.status === 'rendering'} onClick={renderCurrentProject}>
          <Film size={16} /> {renderState.status === 'rendering' ? 'Rendering...' : 'Render MP4'}
        </button>
        <RenderStatus state={renderState} />
        <input
          ref={fileRef}
          className="fileInput"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadProject(file);
            event.currentTarget.value = '';
          }}
        />
      </aside>
    </main>
  );
}

function RenderStatus({
  state,
}: {
  state:
    | {status: 'idle'}
    | {status: 'rendering'}
    | {status: 'complete'; videoUrl: string; outputPath: string}
    | {status: 'error'; message: string};
}) {
  if (state.status === 'idle') {
    return <p className="renderStatus">Run with <code>pnpm serve</code> to render from the editor.</p>;
  }

  if (state.status === 'rendering') {
    return <p className="renderStatus">Rendering through the local Remotion CLI...</p>;
  }

  if (state.status === 'error') {
    return <p className="renderStatus error">{state.message}</p>;
  }

  return (
    <p className="renderStatus success">
      Render complete. <a href={state.videoUrl} target="_blank" rel="noreferrer">Open MP4</a>
    </p>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{value.toFixed(step < 1 ? 2 : 0)}{suffix}</output>
    </label>
  );
}

function Toggle({label, checked, onChange}: {label: string; checked: boolean; onChange: (checked: boolean) => void}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggleTrack"><span /></span>
      <strong>{label}</strong>
    </label>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
