// Voice engines. Every engine writes one WAV per sentence: 24 kHz, mono, 16-bit, so they're interchangeable.
//
//   say         macOS built-in voice (free scratch voice)          voice: "Samantha", rate: words per minute (175)
//   sapi        Windows built-in voice (free scratch voice)        voice: "Microsoft Zira Desktop" etc. (optional), rate: -10..10 (1)
//   openai      gpt-4o-mini-tts (paid)                             voice: "onyx", "ash", "sage", "coral"…, instructions: how to read
//   elevenlabs  ElevenLabs (paid)                                  voice: a voice ID, model: "eleven_multilingual_v2"
//   auto        say on a Mac, sapi on Windows
//
// Paid engines need OPENAI_API_KEY / ELEVENLABS_API_KEY in the environment or in studio/.env. Keys are never printed.
// A sentence is voiced once and cached in films/<film>/.cache/vo/ by a hash of engine, voice, settings and text.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT, readWav, wavBuffer} from './lib.mjs';

export const PAID = new Set(['openai', 'elevenlabs']);
const RATE = 24000;

export function resolveVoice(cfg = {}) {
  const v = {engine: 'auto', ...cfg};
  if (v.engine === 'auto') v.engine = process.platform === 'darwin' ? 'say' : process.platform === 'win32' ? 'sapi' : 'none';
  if (v.engine === 'say') v.voice ??= 'Samantha', v.rate ??= 175;
  if (v.engine === 'sapi') v.rate ??= 1;
  if (v.engine === 'openai') v.voice ??= 'onyx', v.model ??= 'gpt-4o-mini-tts', v.instructions ??= DEFAULT_INSTRUCTIONS;
  if (v.engine === 'elevenlabs') v.model ??= 'eleven_multilingual_v2';
  if (v.engine === 'none') throw new Error('No free voice on this system: set voice.engine in film.json');
  return v;
}

export const DEFAULT_INSTRUCTIONS =
  'Calm, measured documentary narrator. Serious and neutral, clear diction, moderate pace with natural pauses between sentences. No dramatics, no upspeak.';

const hashOf = (v, text) =>
  crypto.createHash('sha1').update(JSON.stringify([v.engine, v.voice ?? '', v.rate ?? '', v.model ?? '', v.instructions ?? '', v.settings ?? '', text])).digest('hex').slice(0, 10);

/**
 * Voices every sentence that isn't cached yet. sentences: [{text}] → returns [{file, seconds}] in the same order.
 * Paid engines only run with allowPaid (the caller asks the user first).
 */
export async function voiceSentences(sentences, cfg, cacheDir, {allowPaid = false, onProgress} = {}) {
  const v = resolveVoice(cfg);
  const dir = path.join(cacheDir, v.engine);
  fs.mkdirSync(dir, {recursive: true});
  const jobs = sentences.map((s, i) => ({i, text: s.text, file: path.join(dir, `${hashOf(v, s.text)}.wav`)}));
  const todo = jobs.filter((j) => !fs.existsSync(j.file));
  if (todo.length && PAID.has(v.engine) && !allowPaid) {
    const chars = todo.reduce((n, j) => n + j.text.length, 0);
    const err = new Error(`${todo.length} sentences (${chars.toLocaleString()} characters) need the paid ${v.engine} voice. Re-run with --paid once the user has OK'd the cost.`);
    err.code = 'NEEDS_PAID';
    throw err;
  }
  if (todo.length) {
    if (v.engine === 'say') todo.forEach((j, k) => { say(v, j); onProgress?.(k + 1, todo.length); });
    else if (v.engine === 'sapi') sapi(v, todo);
    else await pool(todo, 4, async (j, k) => {
      const pcm = v.engine === 'openai' ? await openai(v, j.text) : await elevenlabs(v, j, jobs);
      fs.writeFileSync(j.file + '.tmp', wavBuffer(pcm, {rate: RATE}));
      fs.renameSync(j.file + '.tmp', j.file);
      onProgress?.(k + 1, todo.length);
    });
  }
  return {voice: v, voiced: todo.length, files: jobs.map((j) => ({file: j.file, seconds: readWav(j.file).seconds}))};
}

// ---------- free engines ----------
function say(v, j) {
  execFileSync('say', ['-v', v.voice, '-r', String(v.rate), `--data-format=LEI16@${RATE}`, '-o', j.file, j.text]);
}

function sapi(v, todo) {
  // one PowerShell run for the whole batch; text goes through a UTF-8 JSON file, never the command line
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sapi-'));
  const list = path.join(tmp, 'jobs.json');
  fs.writeFileSync(list, JSON.stringify(todo.map((j) => ({text: j.text, file: j.file + '.tmp'}))), 'utf8');
  const ps = path.join(tmp, 'speak.ps1');
  fs.writeFileSync(ps, `
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 -LiteralPath $args[0] | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
${v.voice ? `$s.SelectVoice(${JSON.stringify(v.voice).replace(/"/g, "'")})` : ''}
$s.Rate = ${Number(v.rate) | 0}
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${RATE}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$n = 0
foreach ($j in $jobs) { $s.SetOutputToWaveFile($j.file, $fmt); $s.Speak($j.text); $n++; if ($n % 20 -eq 0) { Write-Output "$n/$($jobs.Count) voiced" } }
$s.SetOutputToNull()
`, 'utf8');
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps, list], {stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true});
    for (const j of todo) fs.renameSync(j.file + '.tmp', j.file);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
}

// ---------- paid engines ----------
export function apiKey(name) {
  let k = process.env[name];
  if (!k) {
    for (const f of [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')]) {
      if (!fs.existsSync(f)) continue;
      const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'));
      if (m) { k = m[1].trim(); break; }
    }
  }
  if (!k) throw new Error(`${name} is not set (put it in studio/.env)`);
  // a key pasted twice by accident: use one copy
  const half = k.length / 2;
  if (Number.isInteger(half) && half > 25 && k.slice(0, half) === k.slice(half)) k = k.slice(0, half);
  return k;
}

async function retry(label, fn) {
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    if (res.ok) return res;
    const msg = (await res.text()).slice(0, 300);
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) throw new Error(`${label} ${res.status}: ${msg}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

async function openai(v, text) {
  const res = await retry('OpenAI TTS', () =>
    fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey('OPENAI_API_KEY')}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model: v.model, voice: v.voice, input: text, instructions: v.instructions, response_format: 'pcm'}),
    }),
  );
  return Buffer.from(await res.arrayBuffer()); // raw 24 kHz 16-bit mono
}

async function elevenlabs(v, j, all) {
  if (!v.voice) throw new Error('Set voice.voice in film.json to an ElevenLabs voice ID');
  const res = await retry('ElevenLabs TTS', () =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(v.voice)}?output_format=pcm_24000`, {
      method: 'POST',
      headers: {'xi-api-key': apiKey('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json'},
      body: JSON.stringify({
        text: j.text,
        model_id: v.model,
        // neighbouring sentences keep the delivery continuous across separately voiced sentences
        previous_text: all[j.i - 1]?.text,
        next_text: all[j.i + 1]?.text,
        ...(v.settings ? {voice_settings: v.settings} : {}),
      }),
    }),
  );
  return Buffer.from(await res.arrayBuffer());
}

async function pool(items, n, fn) {
  let next = 0, done = 0;
  await Promise.all(Array.from({length: Math.min(n, items.length)}, async () => {
    while (next < items.length) { const it = items[next++]; await fn(it, done); done++; }
  }));
}
