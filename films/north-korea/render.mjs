// Renders this film's rough cut to MP4 in chunks (Remotion). VideoHub runs it as `node render.mjs <workers>` in this folder.
//
//   node render.mjs 2            → render/chunks/c_000.mp4 … then render/<film>.mp4 with sound (when run by hand)
//   ONLY=3,4 node render.mjs     → re-renders only chunks 3 and 4 (VideoHub's partial re-render)
//   PREVIEW=1 node render.mjs    → half size, render/preview/video.mp4 (quick look)
//   CLEAN=1 node render.mjs      → no "Shot N · Type" labels
//
// What VideoHub reads from this file: FPS, CH (frames per chunk) and the word "chunks" make it a chunked
// ("family A") script; process.env.ONLY means it can re-render single chunks; VW/VH give the size.
// With process.env.VIDEOHUB_JOB set it stops after the chunks: the queue joins them and lays audio/mix.wav itself.
// process.env.WK and process.env.PREVIEW are read too. process.env.VIDEOHUB_ENCODER is ignored (Remotion encodes with x264).
// The picture comes from timeline.json: rebuild it with `npm run timeline -- <film>` in the studio folder after any change.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderFilm} from '../../renderer/scripts/chunks.mjs';

const FPS = 30, CH = 150, VW = 1920, VH = 1080;
const dir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(dir);
renderFilm({dir, FPS, CH, VW, VH, workers: process.argv[2] || process.env.WK}).catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
