// Renders a film's rough cut in chunks the way VideoHub's queue expects ("family A", docs/PROJECT-CONTRACT.md §4):
// render/chunks/c_000.mp4, c_001.mp4 … each exactly CH frames, silent (the queue joins them and lays audio/mix.wav).
// Called by each film's render.mjs, which holds the numbers VideoHub reads (FPS, CH, VW, VH).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {bundleRenderer, concat, mux} from './lib.mjs';

export async function renderFilm({dir, FPS, CH, VW, VH, env = process.env, workers}) {
  const slug = path.basename(dir);
  if (!fs.existsSync(path.join(dir, 'timeline.json'))) throw new Error(`No timeline yet: run "npm run timeline -- ${slug}" in the studio folder first.`);
  const W = Math.max(1, Number(workers || env.WK || 2));
  const preview = env.PREVIEW === '1';
  const only = env.ONLY ? new Set(env.ONLY.split(',').map(Number)) : null;
  const clean = env.CLEAN === '1';
  const {renderMedia, selectComposition, openBrowser} = await import('@remotion/renderer');

  console.log('bundling');
  const serveUrl = await bundleRenderer();
  const inputProps = {clean};
  const composition = await selectComposition({serveUrl, id: `RoughCut-${slug}`, inputProps});
  if (composition.width !== VW || composition.height !== VH || composition.fps !== FPS) throw new Error(`render.mjs says ${VW}x${VH} at ${FPS} fps but the composition is ${composition.width}x${composition.height} at ${composition.fps}`);
  const total = composition.durationInFrames;
  if (env.DUR && Math.abs(Number(env.DUR) * FPS - total) > 1) console.log(`note: DUR=${env.DUR}s but the timeline is ${(total / FPS).toFixed(3)}s; using the timeline`);
  const browser = await openBrowser('chrome');
  const cores = os.cpus().length;

  try {
    if (preview) {
      // whole film at half size, with its sound, for a quick look
      const out = path.join(dir, 'render', 'preview');
      fs.mkdirSync(out, {recursive: true});
      const silent = path.join(out, 'video_silent.tmp.mp4');
      let last = -1;
      await renderMedia({composition, serveUrl, inputProps, codec: 'h264', crf: 26, scale: 0.5, muted: true, outputLocation: silent, puppeteerInstance: browser,
        onProgress: ({renderedFrames}) => { const p = Math.floor((renderedFrames / total) * 20); if (p !== last) { last = p; console.log(`w0] ${renderedFrames}/${total}`); } }});
      mux(silent, path.join(dir, 'audio', 'mix.wav'), path.join(out, 'video.mp4'));
      fs.rmSync(silent, {force: true});
      console.log(`preview → ${path.relative(dir, path.join(out, 'video.mp4'))}`);
      return;
    }

    const OUT = path.join(dir, 'render', 'chunks');
    // run by hand without ONLY: start fresh so no chunk from an older timeline survives (the queue moves old chunks away itself)
    if (!only && !env.VIDEOHUB_JOB && env.RESUME !== '1') fs.rmSync(OUT, {recursive: true, force: true});
    fs.mkdirSync(OUT, {recursive: true});
    const n = Math.ceil(total / CH);
    const file = (c) => path.join(OUT, `c_${String(c).padStart(3, '0')}.mp4`);
    // skip chunks that already exist and aren't asked for; with ONLY, render only those
    const todo = [...Array(n).keys()].filter((c) => (only ? only.has(c) : !fs.existsSync(file(c))));
    console.log(`${todo.length}/${n} chunks to render`);
    let done = 0, next = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({length: Math.min(W, todo.length)}, async (_, w) => {
      while (next < todo.length) {
        const c = todo[next++];
        const a = c * CH, b = Math.min(total, a + CH) - 1;
        const tmp = file(c).replace(/\.mp4$/, '.tmp.mp4');
        await renderMedia({composition, serveUrl, inputProps, codec: 'h264', crf: 18, muted: true, frameRange: [a, b], outputLocation: tmp,
          puppeteerInstance: browser, concurrency: Math.max(1, Math.floor(cores / W))});
        fs.renameSync(tmp, file(c));
        done++;
        console.log(`[w${w}] chunk ${c} ok — ${done} done  ${done}/${todo.length}  ${Math.round((Date.now() - t0) / 1000)}s`);
      }
    }));

    const after = only ? 'partial' : env.VIDEOHUB_JOB ? 'queue' : 'join';
    if (after !== 'join') return;
    // run by hand: join the chunks and lay the sound → render/<film>.mp4
    const chunks = [...Array(n).keys()].map(file);
    const video = path.join(dir, 'render', 'video.mp4');
    concat(chunks, video);
    const final = path.join(dir, 'render', `${slug}${clean ? '-clean' : ''}.mp4`);
    mux(video, path.join(dir, 'audio', 'mix.wav'), final);
    console.log(`done → ${path.relative(dir, final)}`);
  } finally {
    await browser.close({silent: true}).catch(() => {});
  }
}
