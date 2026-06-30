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

export function FocusKeyframeVideo({project: rawProject}: Props) {
  const project = normalizeProject(rawProject);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const preview = interpolateKeyframe(project.keyframes, seconds);
  const transform = `perspective(1200px) translate(${preview.x}px, ${preview.y}px) scale(${preview.scale}) rotateX(${preview.tiltX}deg) rotateY(${preview.tiltY}deg) rotateZ(${preview.roll}deg)`;
  const mask = `radial-gradient(circle at ${preview.focusX}% ${preview.focusY}%, black 0%, black ${preview.focusSize}%, transparent ${preview.focusFalloff}%)`;
  const src = toRenderSrc(project.image);
  const backgrounds = {
    current: 'repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 48px), #171616',
    clear: 'transparent',
    grid: 'repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, rgba(255,255,255,.09) 0 1px, transparent 1px 48px), #202020',
    dots: 'radial-gradient(circle, rgba(255,255,255,.18) 1.5px, transparent 1.5px), #202020',
    light: '#e8e6e1',
    dark: '#101010',
  };

  return (
    <AbsoluteFill
      style={{
        background: backgrounds[project.background],
        backgroundSize: project.background === 'dots' ? '24px 24px' : undefined,
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
