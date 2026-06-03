export type Keyframe = {
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

export type Project = {
  duration: number;
  fps: number;
  width: number;
  height: number;
  image: string;
  keyframes: Keyframe[];
};

export const defaultProject: Project = {
  duration: 5,
  fps: 30,
  width: 1920,
  height: 1080,
  image: 'grill-me-skill.png',
  keyframes: [
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
  ],
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ease = (t: number) => t * t * (3 - 2 * t);

export function interpolateKeyframe(keyframes: Keyframe[], time: number): Keyframe {
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

export function projectImageToBrowserSrc(image: string) {
  if (image.startsWith('http') || image.startsWith('data:') || image.startsWith('/')) {
    return image;
  }

  return `/${image}`;
}

export function normalizeProject(value: Project): Project {
  return {
    ...defaultProject,
    ...value,
    keyframes: value.keyframes
      .map((frame, index) => ({
        ...defaultProject.keyframes[Math.min(index, defaultProject.keyframes.length - 1)],
        ...frame,
        id: frame.id || `kf-${index}`,
      }))
      .sort((a, b) => a.time - b.time),
  };
}
