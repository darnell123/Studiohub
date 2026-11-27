---
name: rough-cut
description: Assemble a film's rough cut (narration + graphics + placeholder cards), render it for review in VideoHub, and act on the user's review notes; also builds the CapCut hand-off. Use after graphics, when the user sends VideoHub notes, or asks for a render or the CapCut package.
---

# Rough cut and review

## Build

```bash
npm run timeline -- <film>     # voices script.md sentence by sentence, places every shot, writes VideoHub's files
```

Each shot starts 0.15 s before its "Plays under" sentence is spoken and runs until the next shot (0.27 s crossfade).
Graphics build in fast (about a second) and hold; B-roll/archival/document shots show a placeholder card describing the
footage still needed. Shots show a "Shot N · Type" label so notes can name shots.
The output lists shots matched by similarity (their "Plays under" wording differs from the script): check those.

It writes, in `films/<film>/`: `timeline.json` (generated, never edit), `audio/vo.wav` + `audio/mix.wav`, `words.json`
(captions), `shots.json` (VideoHub's scene lane) and `.videohub/project.json` (title, `DUR`, render settings; other keys
are kept). Re-run it after any change to the script, shot list, specs or overrides.

## Review in VideoHub

VideoHub watches the `films/` folder (Settings → Folders, as a *container*), so each film is a project.
Remotion films have no live preview, so review is on renders:

- Render with VideoHub's queue: `hub_render({project: "<film>", mode: "full"})`, or by hand `npm run render -- <film>`
  (→ `films/<film>/render/<film>.mp4`). `npm run render -- <film> --preview` is a quick half-size render.
  Only render when the user asks for one.
- The user watches it in VideoHub, leaves notes and presses **Send to Claude**. Read them with `hub_notes` / `hub_wait`.
  A note carries its time, so find the shot in `timeline.json` (or the scene lane name, `<shot> · <type>`).
- Fix, re-run `npm run timeline -- <film>`, then re-render only what changed:
  `hub_render({project: "<film>", mode: "partial", notes: [ids]})` (re-renders just those 5-second chunks). If the
  timing of the film changed (narration or shot lengths), do a full render instead: chunks after the change move.
- Mark notes done with `hub_note_update`.

## Kinds of fixes

| Note says | Fix |
|---|---|
| a shot comes in too early/late | `overrides.json` → `"shots": {"14": {"startOffset": -1.5}}` (seconds) |
| a shot is too short | `{"minDuration": 6}` |
| drop a shot | `{"hide": true}` (the previous shot stays on screen) |
| remind yourself on screen | `{"note": "tighter"}` (shows in the shot label) |
| a graphic is wrong or ugly | edit its spec in `specs/` (graphics skill rules), `npm run check -- <film>` |
| wording / facts | edit `script.md` (script skill), then factcheck the changed sentences |
| a different visual | edit the shot's row in `shot-list.csv` |
| pacing between sentences | constants at the top of `renderer/scripts/timeline.mjs` (pauses) |
| final, no labels | `overrides.json` → `"review": false` |

Edits go in the film's files and survive rebuilds.

## CapCut hand-off

When the user approves the cut: `npm run handoff -- <film>` → `films/<film>/capcut/`: the clean film with sound,
`voiceover.wav`, every graphic as its own clip cut to its length, `shot-list.csv` with real start/end times and the
footage each placeholder still needs, and `HOW-TO-CAPCUT.txt` (the user fills placeholders with footage in CapCut).
Set the VideoHub status with `hub_project({project: "<film>", set: {status: "approved"}})` when the user says so.
