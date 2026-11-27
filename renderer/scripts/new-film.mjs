// Usage: npm run new -- <film> "Title" [--minutes 12]
// Creates films/<film>/ with film.json, overrides.json, render.mjs (VideoHub's render script) and empty folders.
import fs from 'node:fs';
import path from 'node:path';
import {cli, die, FILMS, RENDERER, writeJSON} from './lib.mjs';

const {pos, opt} = cli();
const [slug, title] = pos;
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('Usage: npm run new -- <film-name-in-kebab-case> "Title" [--minutes 12]');
const dir = path.join(FILMS, slug);
if (fs.existsSync(path.join(dir, 'film.json'))) die(`films/${slug} already exists.`);
fs.mkdirSync(path.join(dir, 'specs'), {recursive: true});
writeJSON(path.join(dir, 'film.json'), {
  title: title ?? slug,
  topic: title ?? slug,
  targetMinutes: Number(opt('minutes', 12)),
  voice: {engine: 'auto'},
});
writeJSON(path.join(dir, 'overrides.json'), {review: true, shots: {}});
fs.copyFileSync(path.join(RENDERER, 'film-template', 'render.mjs'), path.join(dir, 'render.mjs'));
console.log(`films/${slug} ready. Next: the research skill ("research ${slug}").`);
