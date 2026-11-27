// Usage: npm run render -- <film> [workers] [--preview] [--clean]
// Runs the film's own render.mjs (the same script VideoHub's render queue runs) → films/<film>/render/<film>.mp4
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {cli, filmDir} from './lib.mjs';

const {pos, has} = cli();
const dir = filmDir(pos[0]);
const env = {...process.env, ...(has('preview') ? {PREVIEW: '1'} : {}), ...(has('clean') ? {CLEAN: '1'} : {})};
const r = spawnSync(process.execPath, [path.join(dir, 'render.mjs'), pos[1] ?? '2'], {cwd: dir, env, stdio: 'inherit'});
process.exit(r.status ?? 1);
