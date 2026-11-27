// Shared helpers: paths, film config, script/shot-list parsing, the faithfulness check, WAV files, ffmpeg, bundling.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RENDERER = path.join(ROOT, 'renderer');
export const FILMS = path.join(ROOT, 'films');
export const GRAPHIC_TYPES = ['Motion graphic', 'Map', 'Chart', 'Text on screen'];
export const FPS = 30;

// ---------- command line ----------
const VALUE_FLAGS = new Set(['minutes', 'voice', 'rate', 'engine', 'title', 'workers']);
export function cli() {
  const a = process.argv.slice(2);
  const pos = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { if (VALUE_FLAGS.has(a[i].slice(2))) i++; }
    else pos.push(a[i]);
  }
  return {pos, has: (k) => a.includes(`--${k}`), opt: (k, d) => (a.includes(`--${k}`) ? a[a.indexOf(`--${k}`) + 1] : d)};
}
export function die(msg) {
  console.error(msg);
  process.exit(1);
}

// ---------- films ----------
export function filmDir(slug) {
  if (!slug) die('Name a film: its folder name under films/, e.g. north-korea');
  const dir = path.join(FILMS, slug);
  if (!fs.existsSync(path.join(dir, 'film.json'))) die(`No film at films/${slug}. Start one with: npm run new -- ${slug} "Title"`);
  return dir;
}
export const readJSON = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
export const writeJSON = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
export const filmConfig = (dir) => readJSON(path.join(dir, 'film.json'), {});
export const listFilms = () =>
  fs.existsSync(FILMS)
    ? fs.readdirSync(FILMS).filter((d) => !/^[._]/.test(d) && fs.existsSync(path.join(FILMS, d, 'film.json'))).sort()
    : [];

// ---------- script.md: "## Chapter" headings + narration paragraphs ----------
export function readScript(dir) {
  const f = path.join(dir, 'script.md');
  if (!fs.existsSync(f)) die(`No script.md in films/${path.basename(dir)} yet. Run the script skill first.`);
  const text = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const paras = [];
  let chapter = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) chapter = h[1].trim();
    else paras.push({chapter, text: line});
  }
  return paras;
}

// Splits a paragraph into sentences (keeps abbreviations like "U.S." together)
const SENT = /(?<!\bU\.S)(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bNo)(?<!\bInc)(?<!\bCo)(?<!\bJr)(?<!\bvs)([.!?]["”’)]*)\s+(?=["“‘(]?[A-Z0-9$])/g;
export function splitSentences(p) {
  const out = [];
  let last = 0;
  for (const m of p.matchAll(SENT)) {
    out.push(p.slice(last, m.index + m[1].length).trim());
    last = m.index + m[0].length;
  }
  out.push(p.slice(last).trim());
  return out.filter(Boolean);
}

/** Minimal RFC-4180 CSV parser (quoted fields, commas and newlines inside quotes). */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^\uFEFF/, ''), r[i] ?? ''])));
}
export const csvCell = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

export function readShotList(dir) {
  const f = path.join(dir, 'shot-list.csv');
  if (!fs.existsSync(f)) die(`No shot-list.csv in films/${path.basename(dir)} yet. Run the visual-plan skill first.`);
  return parseCSV(fs.readFileSync(f, 'utf8'));
}

export const typeSlug = (type) =>
  ({'Motion graphic': 'motion', Map: 'map', Chart: 'chart', 'Text on screen': 'text'})[type] ??
  type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const clipName = (spec) =>
  `${String(spec.shot).padStart(3, '0')}_${String(spec.timecode).replace(/:/g, '-')}_${typeSlug(spec.type)}.mp4`;

export function loadSpecs(dir, filter = []) {
  const sdir = path.join(dir, 'specs');
  if (!fs.existsSync(sdir)) return [];
  return fs
    .readdirSync(sdir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .map((f) => ({file: f, ...JSON.parse(fs.readFileSync(path.join(sdir, f), 'utf8'))}))
    .filter((s) => filter.length === 0 || filter.includes(String(s.shot)));
}

// ---------- faithfulness check: every number shown on screen must appear in the cue's own text ----------
const SKIP_KEYS = new Set(['lon', 'lat', 'rotate', 'zoom', 'center', 'scale', 'decimals', 'bow', 'col']);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function collect(node, key, out) {
  if (SKIP_KEYS.has(key)) return;
  if (Array.isArray(node)) node.forEach((n) => collect(n, key, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) collect(v, k, out);
  else if (typeof node === 'number') out.push({key, num: node});
  else if (typeof node === 'string') {
    if (/^\d{4}(-\d{2}){0,2}$/.test(node)) out.push({key, date: node});
    else for (const m of node.matchAll(/\d[\d,]*(\.\d+)?/g)) out.push({key, num: Number(m[0].replace(/,/g, '')), raw: m[0]});
  }
}

export function checkSpec(spec) {
  const src = `${spec.source?.whatToShow ?? ''} ${spec.source?.playsUnder ?? ''}`;
  const lower = src.toLowerCase();
  const nums = [...src.matchAll(/\d[\d,]*(\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
  const words = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12, fourteen: 14, seventeen: 17, twenty: 20, forty: 40};
  for (const [w, n] of Object.entries(words)) if (new RegExp(`\\b${w}\\b`).test(lower)) nums.push(n);
  const scaled = new Set();
  for (const n of nums) { scaled.add(n); scaled.add(n * 1e3); scaled.add(n * 1e6); }
  const problems = [];
  const found = [];
  collect(spec.params, '', found);
  for (const f of found) {
    if (f.date) {
      const [y, m, d] = f.date.split('-').map(Number);
      if (!lower.includes(String(y))) problems.push(`date ${f.date}: year ${y} not in cue text`);
      if (m && !lower.includes(MONTHS[m - 1])) problems.push(`date ${f.date}: ${MONTHS[m - 1]} not in cue text`);
      if (d && !src.includes(` ${d},`) && !src.includes(` ${d} `)) problems.push(`date ${f.date}: day ${d} not in cue text`);
    } else if (!scaled.has(f.num)) {
      problems.push(`number ${f.raw ?? f.num} (in "${f.key}") not in cue text`);
    }
  }
  return problems;
}

// ---------- WAV (16-bit PCM) ----------
export function readWav(f) {
  const b = fs.readFileSync(f);
  let o = 12, fmt = null;
  while (o < b.length - 8) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = {ch: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22)};
    if (id === 'data') {
      const data = b.subarray(o + 8, Math.min(b.length, o + 8 + size)); // some writers leave the size unset
      return {fmt, data, seconds: data.length / (fmt.rate * fmt.ch * (fmt.bits / 8))};
    }
    o += 8 + size + (size % 2);
  }
  throw new Error(`Not a readable WAV file: ${f}`);
}
export function wavBuffer(pcm, {rate = 24000, ch = 1, bits = 16} = {}) {
  const bps = (bits / 8) * ch;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * bps, 28); h.writeUInt16LE(bps, 32); h.writeUInt16LE(bits, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// ---------- ffmpeg: FFMPEG env, else ffmpeg on PATH, else the copy Remotion ships ----------
let FF = null;
export function ffmpeg() {
  if (FF) return FF;
  const env = {...process.env};
  if (process.env.FFMPEG) return (FF = {bin: process.env.FFMPEG, env});
  if (spawnSync('ffmpeg', ['-version'], {stdio: 'ignore', windowsHide: true}).status === 0) return (FF = {bin: 'ffmpeg', env});
  const require = createRequire(path.join(ROOT, 'package.json'));
  const pkg = {darwin: `@remotion/compositor-darwin-${os.arch()}`, linux: `@remotion/compositor-linux-${os.arch()}-gnu`, win32: '@remotion/compositor-win32-x64-msvc'}[process.platform];
  try {
    const dir = path.dirname(require.resolve(`${pkg}/package.json`));
    const bin = path.join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (process.platform === 'darwin') env.DYLD_LIBRARY_PATH = dir;
    else if (process.platform === 'linux') env.LD_LIBRARY_PATH = dir;
    else env.PATH = `${dir};${env.PATH}`;
    if (fs.existsSync(bin)) return (FF = {bin, env});
  } catch {}
  die('ffmpeg not found. Install it (Windows: winget install Gyan.FFmpeg) or set FFMPEG to its path.');
}
export function runFfmpeg(argv) {
  const {bin, env} = ffmpeg();
  const r = spawnSync(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], {env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true});
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${argv.join(' ')}`);
}
/** Lays a WAV under a silent video: stream-copies the picture, AAC sound. */
export function mux(video, wav, out) {
  runFfmpeg(['-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);
}
/** Joins chunk files (same codec and size) without re-encoding. */
export function concat(files, out) {
  const list = out + '.list.txt';
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  try { runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]); } finally { fs.rmSync(list, {force: true}); }
}

// ---------- Remotion bundle: every film with a timeline gets a RoughCut-<slug> composition ----------
export function writeFilmsIndex() {
  const films = listFilms().filter((f) => fs.existsSync(path.join(FILMS, f, 'timeline.json')));
  const id = (s) => '_' + s.replace(/[^a-zA-Z0-9]/g, '_');
  const src =
    '// Generated by renderer/scripts/lib.mjs (writeFilmsIndex) from films/*/timeline.json. Do not edit.\n' +
    "import type {Timeline} from './RoughCut';\n" +
    films.map((f) => `import ${id(f)} from '../../films/${f}/timeline.json';\n`).join('') +
    `export const films: Record<string, Timeline> = {${films.map((f) => `\n  '${f}': ${id(f)} as unknown as Timeline,`).join('')}\n};\n`;
  const file = path.join(RENDERER, 'src', 'films.generated.ts');
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== src) fs.writeFileSync(file, src);
  return films;
}
export async function bundleRenderer() {
  writeFilmsIndex();
  const {bundle} = await import('@remotion/bundler');
  const empty = path.join(RENDERER, 'public');
  fs.mkdirSync(empty, {recursive: true});
  return bundle({entryPoint: path.join(RENDERER, 'src', 'index.ts'), publicDir: empty});
}

export const tc = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
