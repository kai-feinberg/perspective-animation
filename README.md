# Focus Keyframe Tool

Local prototype for animating a screenshot with editable keyframes, CSS 3D transforms, one blur control, and a draggable focus point.

## Run

```bash
pnpm install
pnpm dev --port 5177
```

Open `http://127.0.0.1:5177/`.

## What Works

- CRUD-style keyframes: add, select, delete.
- Scrub/play preview across a 5 second composition.
- Interpolated transform values: position, scale, tilt X/Y, and roll.
- One blur effect using a blurred base image.
- Custom focus point using a sharp image layer with a radial mask.
- Save/load JSON for the current project state.
- Headless MP4 rendering through Remotion.

## Render Headlessly

```bash
pnpm render -- --project examples/focus-keyframes.json --out out/focus-keyframes.mp4
```

The CLI renders the `FocusKeyframeVideo` Remotion composition from the JSON project file. JSON saved from the UI can be passed to `--project`.

## Test Asset

The prototype uses `/Users/kai/Downloads/grill-me-skill.png`, copied into `public/grill-me-skill.png`.

## Verification

Verified with:

```bash
pnpm build
agent-browser open http://127.0.0.1:5177/
agent-browser screenshot /Users/kai/Desktop/projects/explorations/keyframe-focus-tool/verification.png
```

Browser checks confirmed the blurred layer, radial focus mask, transform interpolation, keyframe creation, blur updates, and focus point updates.
