// Usage: npm run studio -- <film>
// Opens Remotion Studio (live preview with a scrubber) with the film's narration (audio/vo.wav) playing.
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {cli, filmDir, writeFilmsIndex, ROOT, RENDERER} from './lib.mjs';

const dir = filmDir(cli().pos[0]);
writeFilmsIndex();
const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'remotion.cmd' : 'remotion');
const r = spawnSync(bin, ['studio', path.join(RENDERER, 'src', 'index.ts'), '--public-dir', path.join(dir, 'audio'), ...process.argv.slice(3)], {cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32'});
process.exit(r.status ?? 1);
