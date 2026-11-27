---
name: graphics
description: Turn a film's graphics cues (Motion graphic, Map, Chart, Text on screen) into template specs in films/<film>/specs/, check them, and fix graphics from review notes. Use after visual-plan, or when the user gives notes on a graphic.
---

# Graphics specs

The renderer draws graphics from fixed templates in one look (dark canvas `#131312`, gold accent `#dfb371`, Inter).
You write one JSON spec per cue; the templates do the drawing.

1. `npm run cues -- <film>` → `films/<film>/cues.json` lists every graphics cue with its text and status (`todo`, `spec`, `skipped`).
2. For each `todo` cue write `films/<film>/specs/NNN_<template>.json` (NNN = shot number, 3 digits):
   ```json
   {
     "shot": 42, "timecode": "9:16", "type": "Chart", "scene": "<chapter>", "template": "counter", "durationSec": 8,
     "source": {"whatToShow": "<copied from the shot list>", "playsUnder": "<copied from the shot list>"},
     "params": {"stats": [{"qualifier": "As many as", "value": 871, "label": "proxy identities"}]}
   }
   ```
   `durationSec` is only for standalone clips; in the rough cut a graphic lasts until the next shot.
3. **Faithfulness: every number, name and date on screen comes only from that cue's own "What to show" / "Plays
   under" text.** `npm run check -- <film>` enforces numbers and dates (word numbers like "three" count; ×1,000 and
   ×1,000,000 scaling is accepted for "$17 million" → 17000000). Don't add facts from elsewhere, even true ones.
   A cue that can't be shown faithfully goes in `specs/_skipped.json` (`[{"shot": 12, "reason": "…"}]`) and stays a
   placeholder card. Where a clip shows less than the cue asked for, note it in `specs/SIMPLIFIED.md`.
4. `npm run check -- <film>` must pass. To look at one: `npm run graphics -- <film> 42` renders it to
   `films/<film>/graphics/`, or `npm run still -- <film> <seconds>` saves a frame of the rough cut to `qa/`.

## Templates

Every template takes optional `title`, `tag` (small gold label, e.g. "ALLEGED BY PROSECUTORS": use it for allegations)
and `source` ("Source: court records").

| template | for | params |
|---|---|---|
| `map` | world or regional map, highlighted countries/states, labeled points, animated arcs | `highlight` (world-atlas country names, e.g. "United States of America", "China", "Russia"), `highlightStates` (U.S. state names: draws the U.S. layer), `points[]` {id, label, lon, lat, kind: point/region/target, note, labelDir: above/below/left/right}, `lines[]` {from, to (point ids), dashed, label, bow (curve, −1..1)}, `rotate` (central longitude) or `zoom` {center:[lon,lat], scale}, `caption` |
| `chart` | `kind: "bars"`: compare values; `kind: "split"`: a share of one whole | bars: `bars[]` {label, value, display ("$17M"), sublabel}; split: `barLabel`, `portion` (percent), `rangeFrom` (percent, shows a range), `portionLabel`, `portionDisplay`, `restLabel` |
| `counter` | one big count-up number or a grid of up to 4 figures, optional icon row/grid | `stats[]` {prefix, value or text, decimals, suffix, qualifier ("As many as", "More than"), label}, `icons` {count, glyph, label, qualifier} (more than 6 icons → a grid that fills as the number counts) |
| `timeline` | date axis with spans and dated markers | `from`/`to` (YYYY-MM, default from the data), `spans[]` {from, to (omit = ongoing), label}, `markers[]` {date (YYYY, YYYY-MM or YYYY-MM-DD), label} |
| `text` | title card, quote, questions or a numbered list | `lines[]`, `style`: title/quote/question/list, `mode`: sequence (one at a time) or stack, `kicker`, `attribution`, `finale: "blank-prompt"` |
| `flow` | how something works: steps, fan-in/fan-out, hierarchy, hub and satellites | `nodes[]` {id, label, sublabel, glyph, col (column index), dashed, emphasis}, `edges[]` {from, to, label, dashed, noArrow}, `layout`: columns/hub, `direction`: right/down, `hub` (node id), `caption` |

Glyphs (for `flow` nodes and counter icons): laptop, house, person, people, id, money, bank, building, globe, document,
lock, check, alert, cross, chat, shield, video, fingerprint, box, website, phone, crypto, mask, keyboard, flag, file, link.

Layout tips learned on the first film: keep labels short (2–5 words), use `labelDir` to stop map labels colliding, give
flows at most ~7 nodes, add a middle node rather than crossing edges, and zoom maps to the region that matters.
`films/north-korea/specs/` has 59 worked examples of every template.

The templates live in `renderer/src/templates/`; change them only when the user asks for a new look or a new kind of
graphic, and then re-check stills of graphics that use that template.
