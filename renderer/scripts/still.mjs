// Usage: npm run still -- <film> <seconds> [more seconds …] [--clean]
// Saves frames of the rough cut to films/<film>/qa/<seconds>.png for checking (qa/ is VideoHub's throwaway folder).
import fs from 'node:fs';
import path from 'node:path';
import {cli, filmDir, bundleRenderer, FPS} from './lib.mjs';

const {pos, has} = cli();
const dir = filmDir(pos[0]);
const {renderStill, selectComposition} = await import('@remotion/renderer');
const serveUrl = await bundleRenderer();
const inputProps = {clean: has('clean')};
const composition = await selectComposition({serveUrl, id: `RoughCut-${path.basename(dir)}`, inputProps});
fs.mkdirSync(path.join(dir, 'qa'), {recursive: true});
for (const sec of pos.slice(1)) {
  const output = path.join(dir, 'qa', `${sec}.png`);
  await renderStill({composition, serveUrl, output, frame: Math.min(composition.durationInFrames - 1, Math.round(Number(sec) * FPS)), inputProps, scale: 0.5});
  console.log(output);
}
