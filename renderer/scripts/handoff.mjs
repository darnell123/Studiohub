// Usage: npm run handoff -- <film> [workers]
// Builds films/<film>/capcut/ for final review and touch-ups in CapCut:
//   <film>.mp4           the full edit with sound, no shot labels
//   voiceover.wav        the narration alone, same timing as the video
//   graphics/            every graphic as its own clip, cut to its length in the edit
//   shot-list.csv        every shot with its real start/end and the footage it still needs
//   HOW-TO-CAPCUT.txt
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {cli, filmDir, readJSON, csvCell, typeSlug, bundleRenderer} from './lib.mjs';

const {pos} = cli();
const dir = filmDir(pos[0]);
const slug = path.basename(dir);
const timeline = readJSON(path.join(dir, 'timeline.json'));
if (!timeline) throw new Error(`Run "npm run timeline -- ${slug}" first.`);
const PKG = path.join(dir, 'capcut');
fs.rmSync(PKG, {recursive: true, force: true});
fs.mkdirSync(path.join(PKG, 'graphics'), {recursive: true});
const tc = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const fileTc = (s) => tc(s).replace(':', 'm').replace('.', 's');

fs.copyFileSync(path.join(dir, 'audio', 'vo.wav'), path.join(PKG, 'voiceover.wav'));

const lines = [['Shot', 'Start', 'End', 'Seconds', 'Type', 'In the video', 'What to show', 'Search terms', 'Needs licensing', 'Graphic clip'].join(',')];
const clips = [];
for (const s of timeline.shots) {
  const len = s.end - s.start;
  const clip = s.kind === 'graphic' ? `graphics/${String(s.shot).padStart(3, '0')}_${fileTc(s.start)}_${typeSlug(s.type)}.mp4` : '';
  if (clip) clips.push({s, clip, len});
  const ph = s.kind === 'placeholder';
  lines.push([s.shot, tc(s.start), tc(s.end), len.toFixed(1), csvCell(s.type), ph ? 'Placeholder card: needs footage' : 'Graphic (done)',
    csvCell(ph ? s.whatToShow : ''), csvCell(ph ? s.searchTerms : ''), csvCell(ph ? s.needsLicensing : ''), clip].join(','));
}
fs.writeFileSync(path.join(PKG, 'shot-list.csv'), lines.join('\n') + '\n');
console.log('voiceover.wav, shot-list.csv');

// the clean edit: the film's own chunked render with CLEAN=1
const r = spawnSync(process.execPath, [path.join(dir, 'render.mjs'), pos[1] ?? '2'], {cwd: dir, env: {...process.env, CLEAN: '1', ONLY: '', VIDEOHUB_JOB: ''}, stdio: 'inherit'});
if (r.status !== 0) process.exit(r.status ?? 1);
fs.renameSync(path.join(dir, 'render', `${slug}-clean.mp4`), path.join(PKG, `${slug}.mp4`));

const {renderMedia, selectComposition} = await import('@remotion/renderer');
const serveUrl = await bundleRenderer();
for (const [i, {s, clip, len}] of clips.entries()) {
  const props = {template: s.template, params: s.params, durationSec: +len.toFixed(2)};
  const comp = await selectComposition({serveUrl, id: 'Cue', inputProps: props});
  await renderMedia({composition: comp, serveUrl, codec: 'h264', crf: 18, inputProps: props, outputLocation: path.join(PKG, clip)});
  if ((i + 1) % 10 === 0 || i === clips.length - 1) console.log(`graphics ${i + 1}/${clips.length}`);
}

fs.writeFileSync(path.join(PKG, 'HOW-TO-CAPCUT.txt'), `${timeline.title}: CapCut hand-off

The video is already edited. CapCut is only for final review and touch-ups.

1. CapCut → New project → Import → drag in ${slug}.mp4 and put it on the timeline.
   That's the whole video: narration, graphics and transitions included.
2. Gray "placeholder" cards mark shots that still need real footage (B-roll, archival photos and footage, documents).
   shot-list.csv lists each one with its exact Start/End time, what to show and search terms.
   To fill one: import your footage, drag it onto the track ABOVE the video at that Start time, and trim it to the End time.
3. Want to change the voice level, add music or captions? The narration is also in voiceover.wav, timed to match the video.
4. Every graphic is also in graphics/ as its own clip (named shot_start-time_type), if you want to move or reuse one.

Bigger changes (re-timing, different graphics, new voice) are easier in VideoHub: leave notes and send them to Claude.
`);
console.log(`done → films/${slug}/capcut`);
