import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Project, interpolateKeyframe, normalizeProject} from '../project';

type Props = {
  project: Project;
};

const toRenderSrc = (image: string) => {
  if (image.startsWith('http') || image.startsWith('data:')) {
    return image;
  }

  return staticFile(image.replace(/^\//, ''));
};

const getBackgroundStyle = (project: Project): React.CSSProperties => {
  const isLight = project.backgroundTheme === 'light';
  const base = isLight ? '#e8e6e1' : '#171616';
  const line = isLight ? 'rgba(20,18,15,.14)' : 'rgba(255,255,255,.075)';
  const dot = isLight ? 'rgba(20,18,15,.24)' : 'rgba(255,255,255,.2)';

  if (project.backgroundPattern === 'clear') {
    return {background: base};
  }

  if (project.backgroundPattern === 'grid') {
    return {
      background: `repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 48px), ${base}`,
    };
  }

  if (project.backgroundPattern === 'dots') {
    return {
      background: `radial-gradient(circle, ${dot} 1.5px, transparent 1.5px), ${base}`,
      backgroundSize: '24px 24px',
    };
  }

  return {
    background: `repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 48px), ${base}`,
  };
};

export function FocusKeyframeVideo({project: rawProject}: Props) {
  const project = normalizeProject(rawProject);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const preview = interpolateKeyframe(project.keyframes, seconds);
  const transform = `perspective(1200px) translate(${preview.x}px, ${preview.y}px) scale(${preview.scale}) rotateX(${preview.tiltX}deg) rotateY(${preview.tiltY}deg) rotateZ(${preview.roll}deg)`;
  const mask = `radial-gradient(circle at ${preview.focusX}% ${preview.focusY}%, black 0%, black ${preview.focusSize}%, transparent ${preview.focusFalloff}%)`;
  const src = toRenderSrc(project.image);
  const backgroundStyle = getBackgroundStyle(project);

  return (
    <AbsoluteFill
      style={{
        ...backgroundStyle,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        perspective: 1200,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '86%',
          aspectRatio: '3418 / 1856',
          transform,
          transformStyle: 'preserve-3d',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#050505',
          boxShadow: '0 40px 90px rgba(0, 0, 0, 0.55)',
        }}
      >
        <Img
          src={src}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.025)',
            filter: project.blurEnabled ? `blur(${preview.blur}px)` : 'none',
          }}
        />
        {(project.focusEnabled || !project.blurEnabled) && (
          <Img
            src={src}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.05) contrast(1.02)',
              maskImage: project.focusEnabled ? mask : undefined,
              WebkitMaskImage: project.focusEnabled ? mask : undefined,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
}
