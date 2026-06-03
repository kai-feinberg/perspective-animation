import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);

const readArg = (name, fallback) => {
  const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (index === -1) return fallback;
  const match = args[index].match(/^[^=]+=(.*)$/);
  if (match) return match[1];
  return args[index + 1] ?? fallback;
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  pnpm render -- --project examples/focus-keyframes.json --out out/focus.mp4

Options:
  --project <path>  Keyframe project JSON file
  --out <path>      Output video path
`);
  process.exit(0);
}

const projectPath = path.resolve(readArg('--project', 'examples/focus-keyframes.json'));
const outputPath = path.resolve(readArg('--out', 'out/focus-keyframes.mp4'));
const compositionId = 'FocusKeyframeVideo';

const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));

await fs.mkdir(path.dirname(outputPath), {recursive: true});

console.log(`Bundling Remotion composition...`);
const serveUrl = await bundle({
  entryPoint: require.resolve('../src/remotion/index.tsx'),
  webpackOverride: (config) => config,
});

console.log(`Selecting ${compositionId}...`);
const inputProps = {project};
const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  inputProps,
});

console.log(`Rendering ${composition.width}x${composition.height} at ${composition.fps}fps...`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: outputPath,
  inputProps,
  onProgress: ({progress}) => {
    process.stdout.write(`\r${Math.round(progress * 100)}%`);
  },
});

process.stdout.write('\n');
console.log(`Rendered ${outputPath}`);
