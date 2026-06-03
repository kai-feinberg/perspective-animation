import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {defaultProject, normalizeProject, type Project} from '../project';
import {FocusKeyframeVideo} from './Video';

type InputProps = {
  project?: Project;
};

function RemotionRoot({project = defaultProject}: InputProps) {
  const normalized = normalizeProject(project);

  return (
    <Composition
      id="FocusKeyframeVideo"
      component={FocusKeyframeVideo}
      durationInFrames={Math.round(normalized.duration * normalized.fps)}
      fps={normalized.fps}
      width={normalized.width}
      height={normalized.height}
      defaultProps={{project: normalized}}
    />
  );
}

registerRoot(RemotionRoot);
