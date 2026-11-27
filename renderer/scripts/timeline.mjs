// Builds a film's timeline: voices the script one sentence at a time, places every shot where its "Plays under"
// line is spoken, and writes the files VideoHub reads.
//
// Usage: npm run timeline -- <film> [--paid]
//   reads   films/<film>/script.md, shot-list.csv, specs/, overrides.json, film.json (voice settings)
//   writes  films/<film>/timeline.json          every shot and sentence with its start and end (generated: don't edit)
//           films/<film>/audio/vo.wav            the narration on its own (VideoHub's voice layer)
//           films/<film>/audio/mix.wav           the sound VideoHub lays under renders (narration, plus music.wav if present)
//           films/<film>/words.json              word timings for VideoHub's captions and notes (estimated within each sentence)
//           films/<film>/shots.json              the scene lane on VideoHub's timeline
//           films/<film>/.videohub/project.json  title, length (DUR) and render settings (other keys are kept)
// --paid allows a paid voice engine (openai / elevenlabs) to voice sentences that aren't cached yet.
import fs from 'node:fs';
import path from 'node:path';
import {cli, die, filmDir, filmConfig, readJSON, writeJSON, readScript, splitSentences, readShotList, loadSpecs, readWav, wavBuffer, GRAPHIC_TYPES, FPS, tc, writeFilmsIndex} from './lib.mjs';
import {voiceSentences} from './voice.mjs';

const {pos, has} = cli();
const slug = pos[0];
const dir = filmDir(slug);
const cfg = filmConfig(dir);
const overrides = readJSON(path.join(dir, 'overrides.json'), {});

const SENTENCE_PAUSE = 0.22; // seconds between sentences
const PAUSE = 0.6; // between paragraphs
const CHAPTER_PAUSE = 1.4; // extra pause when a chapter starts
const LEAD = 0.15; // a shot appears this much before its sentence is heard
const HEAD = 0.5; // silence before the first sentence
const TAIL = 2; // after the last

const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const paras = readScript(dir);
const sentences = paras.flatMap((p, pi) =>
  splitSentences(p.text).map((text, k) => ({text, para: pi, chapter: p.chapter, firstInPara: k === 0, firstInChapter: k === 0 && pi > 0 && p.chapter !== paras[pi - 1].chapter})),
);
if (!sentences.length) die('script.md has no narration.');

// ---- 1. narration, one file per sentence (cached) ----
let voiceResult;
try {
  voiceResult = await voiceSentences(sentences, cfg.voice, path.join(dir, '.cache', 'vo'), {
    allowPaid: has('paid'),
    onProgress: (n, total) => (n % 25 === 0 || n === total) && console.log(`voiced ${n}/${total}`),
  });
} catch (e) {
  die(e.message);
}
let t = HEAD;
sentences.forEach((s, i) => {
  if (i > 0) t += s.firstInPara ? PAUSE : SENTENCE_PAUSE;
  if (s.firstInChapter) t += CHAPTER_PAUSE;
  s.start = +t.toFixed(3);
  s.dur = +voiceResult.files[i].seconds.toFixed(3);
  s.file = voiceResult.files[i].file;
  t += s.dur;
});
const narrationEnd = t + TAIL;

// ---- 2. place each shot where its narration line is spoken ----
const rows = fs.existsSync(path.join(dir, 'shot-list.csv')) ? readShotList(dir) : [];
const specs = Object.fromEntries(loadSpecs(dir).map((s) => [String(s.shot), s]));
const P = sentences.map((s) => norm(s.text));
const wordSet = (s) => new Set(norm(s).toLowerCase().match(/[a-z0-9']+/g) ?? []);
function locate(line) {
  const n = norm(splitSentences(norm(line))[0] ?? line); // match on the line's first sentence
  for (const len of [60, 30]) {
    const key = n.slice(0, len);
    const i = key ? P.findIndex((p) => p.includes(key)) : -1;
    if (i >= 0) return {i, frac: P[i].indexOf(key) / P[i].length};
  }
  const w = wordSet(line); // fuzzy fallback: the sentence sharing the most words
  let best = {i: 0, score: -1};
  P.forEach((p, i) => {
    const pw = wordSet(p);
    const score = [...w].filter((x) => pw.has(x)).length / Math.max(1, w.size);
    if (score > best.score) best = {i, score};
  });
  return {i: best.i, frac: 0, fuzzy: true};
}

let shots = rows.map((r) => {
  const {i, frac, fuzzy} = locate(r['Plays under']);
  const o = overrides.shots?.[r.Shot] ?? {};
  const s = sentences[i];
  const spec = specs[r.Shot];
  const graphic = GRAPHIC_TYPES.includes(r.Type) && spec;
  return {
    shot: Number(r.Shot),
    scene: r.Scene,
    type: r.Type,
    start: +Math.max(0, s.start + frac * s.dur - LEAD + (o.startOffset ?? 0)).toFixed(3),
    hide: !!o.hide,
    minDuration: o.minDuration,
    note: o.note,
    fuzzy: fuzzy || undefined,
    ...(graphic
      ? {kind: 'graphic', template: spec.template, params: spec.params}
      : {kind: 'placeholder', whatToShow: r['What to show'], searchTerms: r['Search terms'], needsLicensing: r['Needs licensing']}),
  };
});
shots = shots.filter((s) => !s.hide).sort((a, b) => a.start - b.start || a.shot - b.shot);
shots.forEach((s, k) => (s.end = Math.max(shots[k + 1]?.start ?? narrationEnd, s.start + (s.minDuration ?? 0))));
for (let k = 1; k < shots.length; k++) if (shots[k].start < shots[k - 1].end) shots[k].start = shots[k - 1].end; // a minDuration pushes followers back
shots.forEach((s, k) => (s.end = +Math.max(s.end, shots[k + 1]?.start ?? s.end).toFixed(3)));
const durationSec = +(Math.ceil(Math.max(narrationEnd, shots.at(-1)?.end ?? 0) * FPS) / FPS).toFixed(3);

const chapters = [];
for (const s of sentences) if (s.chapter && chapters.at(-1)?.title !== s.chapter) chapters.push({title: s.chapter, start: s.start});

const timeline = {
  film: slug,
  title: cfg.title ?? slug,
  fps: FPS,
  durationSec,
  voice: voiceResult.voice,
  review: overrides.review ?? true,
  chapters,
  narration: sentences.map((s) => ({start: s.start, dur: s.dur, text: s.text})),
  shots: shots.map(({hide, minDuration, ...s}) => ({...s, timecode: tc(s.start)})),
};
writeJSON(path.join(dir, 'timeline.json'), timeline);

// ---- 3. sound: narration on its own, and the mix ----
fs.mkdirSync(path.join(dir, 'audio'), {recursive: true});
const RATE = 24000;
const pcm = Buffer.alloc(Math.ceil(durationSec * RATE) * 2);
for (const s of sentences) {
  const w = readWav(s.file);
  if (w.fmt.rate !== RATE || w.fmt.ch !== 1 || w.fmt.bits !== 16) die(`Unexpected audio format in ${s.file}`);
  w.data.copy(pcm, Math.round(s.start * RATE) * 2, 0, Math.min(w.data.length, pcm.length - Math.round(s.start * RATE) * 2));
}
fs.writeFileSync(path.join(dir, 'audio', 'vo.wav'), wavBuffer(pcm, {rate: RATE}));
const mix = Buffer.from(pcm);
const musicFile = path.join(dir, 'audio', 'music.wav');
if (fs.existsSync(musicFile)) {
  const m = readWav(musicFile);
  if (m.fmt.rate !== RATE || m.fmt.ch !== 1 || m.fmt.bits !== 16) console.warn('audio/music.wav must be 24 kHz mono 16-bit to be mixed in; skipped.');
  else for (let o = 0; o < Math.min(mix.length, m.data.length); o += 2) mix.writeInt16LE(Math.max(-32768, Math.min(32767, mix.readInt16LE(o) + m.data.readInt16LE(o))), o);
}
fs.writeFileSync(path.join(dir, 'audio', 'mix.wav'), wavBuffer(mix, {rate: RATE}));

// ---- 4. VideoHub: words, scenes, project settings ----
const words = [];
for (const s of sentences) {
  const ws = s.text.split(/\s+/).filter(Boolean);
  const weight = ws.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
  const total = weight.reduce((a, b) => a + b, 0);
  let at = s.start;
  ws.forEach((w, k) => {
    const d = (s.dur * weight[k]) / total;
    words.push([+at.toFixed(3), +(at + d).toFixed(3), w]);
    at += d;
  });
}
writeJSON(path.join(dir, 'words.json'), words);
writeJSON(path.join(dir, 'shots.json'), timeline.shots.map((s) => ({name: `${s.shot} · ${s.type}`, t0: s.start, t1: s.end})));
const vhFile = path.join(dir, '.videohub', 'project.json');
fs.mkdirSync(path.dirname(vhFile), {recursive: true});
const vh = readJSON(vhFile, {});
vh.title ??= cfg.title ?? slug;
vh.status ??= 'in-progress';
vh.render = {script: 'render.mjs', workers: 2, ...vh.render, env: {...vh.render?.env, DUR: String(durationSec)}};
vh.transcript ??= {file: 'words.json', offset: 0};
writeJSON(vhFile, vh);
writeFilmsIndex();

const g = shots.filter((s) => s.kind === 'graphic').length;
console.log(
  `${slug}: ${tc(durationSec)} long · ${sentences.length} sentences (${voiceResult.voiced} newly voiced, ${voiceResult.voice.engine}${voiceResult.voice.voice ? ` "${voiceResult.voice.voice}"` : ''}) · ` +
    `${shots.length} shots (${g} graphics, ${shots.length - g} placeholders)`,
);
const fz = shots.filter((s) => s.fuzzy).map((s) => s.shot);
if (fz.length) console.log(`Matched by similarity (the "Plays under" wording differs from the script): shots ${fz.join(', ')}`);
const missing = rows.filter((r) => GRAPHIC_TYPES.includes(r.Type) && !specs[r.Shot]).map((r) => r.Shot);
if (missing.length) console.log(`Graphics cues without a spec yet (shown as placeholder cards): shots ${missing.join(', ')}`);
