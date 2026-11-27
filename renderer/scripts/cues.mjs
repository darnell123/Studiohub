// Usage: npm run cues -- <film>
// Lists the film's graphics cues (Motion graphic, Map, Chart, Text on screen) and which still need a spec → films/<film>/cues.json
import fs from 'node:fs';
import path from 'node:path';
import {cli, filmDir, readShotList, loadSpecs, clipName, GRAPHIC_TYPES, readJSON, writeJSON} from './lib.mjs';

const dir = filmDir(cli().pos[0]);
const rows = readShotList(dir);
const have = new Set(loadSpecs(dir).map((s) => String(s.shot)));
const skipped = new Set(readJSON(path.join(dir, 'specs', '_skipped.json'), []).map((s) => String(s.shot)));
const cues = rows
  .filter((r) => GRAPHIC_TYPES.includes(r.Type))
  .map((r) => ({
    shot: Number(r.Shot), timecode: r.Timecode, type: r.Type, scene: r.Scene,
    clip: clipName({shot: r.Shot, timecode: r.Timecode, type: r.Type}),
    status: have.has(r.Shot) ? 'spec' : skipped.has(r.Shot) ? 'skipped' : 'todo',
    source: {whatToShow: r['What to show'], playsUnder: r['Plays under']},
  }));
writeJSON(path.join(dir, 'cues.json'), cues);
const n = (s) => cues.filter((c) => c.status === s).length;
console.log(`${rows.length} shots → ${cues.length} graphics cues (${n('spec')} with spec, ${n('skipped')} skipped, ${n('todo')} to do). Wrote cues.json`);
if (n('todo')) console.log(`To do: shots ${cues.filter((c) => c.status === 'todo').map((c) => c.shot).join(', ')}`);
