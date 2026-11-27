// Usage: npm run status [-- <film>]
// Where each film is in the pipeline.
import fs from 'node:fs';
import path from 'node:path';
import {cli, FILMS, listFilms, filmConfig, readJSON, readShotList, loadSpecs, GRAPHIC_TYPES, tc} from './lib.mjs';

const want = cli().pos[0];
for (const slug of want ? [want] : listFilms()) {
  const dir = path.join(FILMS, slug);
  const has = (f) => fs.existsSync(path.join(dir, f));
  const cfg = filmConfig(dir);
  const steps = [
    ['research', has('research.md')],
    ['outline', has('outline.md')],
    ['script', has('script.md')],
    ['fact check', has('factcheck.md')],
    ['visual plan', has('shot-list.csv')],
  ];
  let graphics = '';
  if (has('shot-list.csv')) {
    const rows = readShotList(dir).filter((r) => GRAPHIC_TYPES.includes(r.Type));
    const specs = new Set(loadSpecs(dir).map((s) => String(s.shot)));
    const skipped = new Set(readJSON(path.join(dir, 'specs', '_skipped.json'), []).map((s) => String(s.shot)));
    const todo = rows.filter((r) => !specs.has(r.Shot) && !skipped.has(r.Shot)).length;
    graphics = `${rows.length - todo}/${rows.length} graphics specs`;
    steps.push(['graphics', todo === 0]);
  }
  const tl = readJSON(path.join(dir, 'timeline.json'));
  steps.push(['timeline', !!tl]);
  const vh = readJSON(path.join(dir, '.videohub', 'project.json'), {});
  console.log(`${slug}: ${cfg.title ?? ''}${cfg.targetMinutes ? ` (${cfg.targetMinutes} min target)` : ''}`);
  console.log('  ' + steps.map(([n, ok]) => `${ok ? '✓' : '·'} ${n}`).join('   '));
  if (graphics) console.log(`  ${graphics}`);
  if (tl) console.log(`  timeline ${tc(tl.durationSec)} · ${tl.shots.length} shots · voice ${tl.voice.engine}${tl.voice.voice ? ` "${tl.voice.voice}"` : ''} · VideoHub status ${vh.status ?? '–'}`);
}
