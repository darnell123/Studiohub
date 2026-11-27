# Notes: how we got here and what's decided

Written 2026-11-26 on the Mac, before moving to Windows, so Claude on the new PC picks up where the last
conversation left off. Read this with `CLAUDE.md`. Update it when a decision changes.

## Who does what
- **The user is the producer and orchestrator.** They choose topics, approve each step, watch cuts and send notes.
  **They don't know how to edit video**, so Claude does the editing: research, script, visual plan, graphics and the cut.
- **Explain before doing big work.** The user asked "tell me what you're doing first": before a large change or a
  long job, say in plain words what you'll do and why, then do it.
- The user wants to **see the tools working before spending money** (paid voices, footage, subscriptions).
- Plain language. No jargon without a one-line explanation.

## Decisions
- **TRACE is retired as an app.** Its steps (research, outline, script, fact check, visual plan, YouTube package)
  are now the skills in `.claude/skills/`, with the same prompts and rules. The user chose this over keeping TRACE's
  interface: less to build and maintain.
- **Windows for good.** The user moved from the Mac to a Windows PC because it's easier for them to work there.
  This repo is how the work moved.
- **Remotion stays** as the graphics/edit engine (HyperFrames was considered and rejected).
- **Review happens in VideoHub** (github.com/TensaikunYT/Videohub): the user watches renders there, leaves notes,
  sends them to Claude, and Claude fixes and re-renders only the changed parts.
- **CapCut is only for the final review and touch-ups** (filling placeholder shots with real footage, small fixes).
  The main edit is done by Claude before that. `npm run handoff` builds the CapCut package.
- **Remotion Studio is not the review tool.** The user found it "terrible and ugly and hard to use". `npm run studio`
  still exists for Claude's own checking.

## Feedback already acted on
- "Transitions too slow" → graphics build in within about a second (`SPEED = 0.5` in
  `renderer/src/components/Frame.tsx`), shots crossfade in 0.27 s (`XFADE = 8` frames in `RoughCut.tsx`), no fade to black.
- "Graphics don't line up with the script" → every shot is placed on its exact narration sentence (starts 0.15 s
  before the sentence is spoken), from per-sentence voicing.
- "The voice is robotic" → **the free system voice is only a scratch track for timing. A finished video needs a
  natural voice** (see Open items).
- Possible next ask: graphics hold still after they build in. If the user says they feel static, add slow motion
  (a gentle push-in or drift) to the templates rather than longer build-ins.

## Open items, in order
1. **Windows setup** (README → Windows setup): Node, Git, ffmpeg, Claude Code, VideoHub, `npm install`, add
   `Documents\studio\films` to VideoHub as a container folder, then `npm run timeline -- north-korea`.
2. **Real voice.** The user chose OpenAI first, then said to set it aside for now. Their OpenAI key on the Mac was
   pasted twice in `.env.local` (that caused the 401 errors); `renderer/scripts/voice.mjs` now uses one copy
   automatically. ElevenLabs is also available (the user has it as a Claude connector, and the `elevenlabs` engine
   takes an API key). Either way: samples of the cold open first, **ask before spending credits**, then voice the
   film with `--paid`.
3. **First full test video: North Korea** (`films/north-korea`, 18:36, 82 shots: 59 graphics done, 23 placeholder
   cards for footage). Render it, review in VideoHub, fix notes, then the CapCut hand-off.
4. Then new films through the full pipeline, starting from the research skill.

## Left on the Mac (not in this repo)
- The old TRACE app (`~/Documents/Trace`) and its outputs, including research ledgers and scripts for **FTX** and
  **Nvidia** in `Trace/Claude outputs/story-pipeline/`. They'd need copying over by hand if the user wants them as films.
- The OpenAI key (`Trace/.env.local`). On Windows, keys go in `studio/.env` (see `.env.example`); never print or commit them.
- Generated audio and renders (rebuilt from the film files with `npm run timeline`).

## How the North Korea film was made (worked example)
TRACE wrote the script and shot list; Claude wrote the 59 graphics specs from the shot list
(`films/north-korea/specs/`, notes on simplifications in `specs/SIMPLIFIED.md`). Layout problems fixed along the way
became the tips in the graphics skill (map label directions, flow layouts without crossing edges, sensible map zoom).
