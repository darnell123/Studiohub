// Usage: npm run graphics -- <film> [shot …]
// Renders each graphics spec as its own clip → films/<film>/graphics/<shot>_<timecode>_<type>.mp4 (uses the spec's durationSec).
import fs from 'node:fs';
import path from 'node:path';
import {cli, die, filmDir, loadSpecs, checkSpec, clipName, bundleRenderer} from './lib.mjs';

const {pos} = cli();
const dir = filmDir(pos[0]);
const specs = loadSpecs(dir, pos.slice(1));
if (!specs.length) die('No specs to render.');
const failing = specs.map((s) => [s, checkSpec(s)]).filter(([, p]) => p.length);
if (failing.length) {
  for (const [s, p] of failing) console.error(`✗ ${s.file}: ${p.join('; ')}`);
  die('\nRefusing to render: on-screen numbers must come from the cue text. Fix the specs above.');
}
const {renderMedia, selectComposition} = await import('@remotion/renderer');
const out = path.join(dir, 'graphics');
fs.mkdirSync(out, {recursive: true});
console.log('bundling');
const serveUrl = await bundleRenderer();
for (const [i, s] of specs.entries()) {
  const inputProps = {template: s.template, durationSec: s.durationSec, params: s.params};
  const composition = await selectComposition({serveUrl, id: 'Cue', inputProps});
  const t0 = Date.now();
  await renderMedia({composition, serveUrl, codec: 'h264', crf: 18, outputLocation: path.join(out, clipName(s)), inputProps});
  console.log(`[${i + 1}/${specs.length}] ${clipName(s)}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
console.log(`done → films/${path.basename(dir)}/graphics`);
