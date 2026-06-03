import React, {useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Copy, Diamond, Download, Pause, Play, Plus, Trash2} from 'lucide-react';
import './styles.css';

type Keyframe = {
  id: string;
  time: number;
  x: number;
  y: number;
  scale: number;
  tiltX: number;
  tiltY: number;
  roll: number;
  blur: number;
  focusX: number;
  focusY: number;
  focusSize: number;
  focusFalloff: number;
};

const duration = 5;
const imageSrc = '/grill-me-skill.png';

const initialKeyframes: Keyframe[] = [
  {
    id: 'kf-start',
    time: 0,
    x: 0,
    y: 0,
    scale: 0.86,
    tiltX: 5,
    tiltY: -9,
    roll: -2,
    blur: 12,
    focusX: 22,
    focusY: 54,
    focusSize: 12,
    focusFalloff: 38,
  },
  {
    id: 'kf-end',
    time: 5,
    x: 70,
    y: -10,
    scale: 0.98,
    tiltX: 1,
    tiltY: 8,
    roll: 1,
    blur: 18,
    focusX: 83,
    focusY: 16,
    focusSize: 10,
    focusFalloff: 34,
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ease = (t: number) => t * t * (3 - 2 * t);

function interpolateKeyframe(keyframes: Keyframe[], time: number): Keyframe {
  const frames = [...keyframes].sort((a, b) => a.time - b.time);
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (time <= first.time) return first;
  if (time >= last.time) return last;
  const nextIndex = frames.findIndex((frame) => frame.time >= time);
  const from = frames[nextIndex - 1];
  const to = frames[nextIndex];
  const progress = ease((time - from.time) / (to.time - from.time));
  return {
    ...from,
    id: 'preview',
    time,
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    scale: lerp(from.scale, to.scale, progress),
    tiltX: lerp(from.tiltX, to.tiltX, progress),
    tiltY: lerp(from.tiltY, to.tiltY, progress),
    roll: lerp(from.roll, to.roll, progress),
    blur: lerp(from.blur, to.blur, progress),
    focusX: lerp(from.focusX, to.focusX, progress),
    focusY: lerp(from.focusY, to.focusY, progress),
    focusSize: lerp(from.focusSize, to.focusSize, progress),
    focusFalloff: lerp(from.focusFalloff, to.focusFalloff, progress),
  };
}

function App() {
  const [keyframes, setKeyframes] = useState(initialKeyframes);
  const [activeId, setActiveId] = useState(initialKeyframes[1].id);
  const [time, setTime] = useState(4.45);
  const [playing, setPlaying] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

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
    setKeyframes((frames) =>
      frames
        .map((frame) => (frame.id === active.id ? {...frame, ...patch} : frame))
        .sort((a, b) => a.time - b.time),
    );
  };

  const addKeyframe = () => {
    const frame = {...preview, id: `kf-${Date.now()}`, time: Number(time.toFixed(2))};
    setKeyframes((frames) => [...frames, frame].sort((a, b) => a.time - b.time));
    setActiveId(frame.id);
  };

  const removeKeyframe = () => {
    if (keyframes.length <= 2) return;
    const remaining = keyframes.filter((frame) => frame.id !== active.id);
    setKeyframes(remaining);
    setActiveId(remaining[0].id);
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

  const json = JSON.stringify({duration, image: imageSrc, keyframes}, null, 2);
  const transform = `perspective(1200px) translate(${preview.x}px, ${preview.y}px) scale(${preview.scale}) rotateX(${preview.tiltX}deg) rotateY(${preview.tiltY}deg) rotateZ(${preview.roll}deg)`;
  const mask = `radial-gradient(circle at ${preview.focusX}% ${preview.focusY}%, black 0%, black ${preview.focusSize}%, transparent ${preview.focusFalloff}%)`;

  return (
    <main className="app">
      <section className="previewPanel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local prototype</p>
            <h1>Focus keyframe tool</h1>
          </div>
          <button className="primary" onClick={addKeyframe}>
            <Plus size={17} /> Keyframe
          </button>
        </header>

        <div className="stage" data-testid="stage">
          <div className="shot" style={{transform}}>
            <img className="shotImage blurred" src={imageSrc} style={{filter: `blur(${preview.blur}px)`}} />
            <img
              className="shotImage sharp"
              src={imageSrc}
              style={{maskImage: mask, WebkitMaskImage: mask}}
            />
          </div>
        </div>

        <div className="transport">
          <button className="iconButton" aria-label={playing ? 'Pause preview' : 'Play preview'} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <span className="clock">{time.toFixed(2)}s / {duration.toFixed(2)}s</span>
          <input
            aria-label="Current time"
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={time}
            onChange={(event) => setTime(Number(event.target.value))}
          />
        </div>

        <div className="timeline">
          {keyframes.map((frame) => (
            <button
              key={frame.id}
              className={`marker ${frame.id === active.id ? 'active' : ''}`}
              style={{left: `${(frame.time / duration) * 100}%`}}
              onClick={() => {
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
          <Download size={16} /> Export JSON
        </button>
      </aside>
    </main>
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

createRoot(document.getElementById('root')!).render(<App />);
