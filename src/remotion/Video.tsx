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

  return (
    <AbsoluteFill
      style={{
        background: '#171616',
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
            filter: `blur(${preview.blur}px)`,
          }}
        />
        <Img
          src={src}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.05) contrast(1.02)',
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
