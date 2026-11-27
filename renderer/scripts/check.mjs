// Usage: npm run check -- <film> [shot …]
// Every number and date a spec puts on screen must appear in that cue's own shot-list text.
import {cli, filmDir, loadSpecs, checkSpec} from './lib.mjs';
const {pos} = cli();
const dir = filmDir(pos[0]);
let bad = 0;
const specs = loadSpecs(dir, pos.slice(1));
for (const s of specs) {
  const p = checkSpec(s);
  if (p.length) { bad++; console.log(`✗ ${s.file}\n  - ${p.join('\n  - ')}`); }
}
console.log(bad ? `${bad} of ${specs.length} specs show numbers that aren't in their cue text.` : `✓ all ${specs.length} specs pass`);
process.exit(bad ? 1 : 0);
