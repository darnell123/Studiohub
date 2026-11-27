# Studiohub

Video editors for Claude. 
Research → script → visual plan → graphics → rough cut for faceless YouTube documentaries, done by Claude Code,
reviewed in [VideoHub](https://github.com/TensaikunYT/Videohub), finished in CapCut.
This replaces the TRACE app: its research, outline, script, fact-check, visual-plan and YouTube-package steps are now
Claude Code skills (`.claude/skills/`), and its renderer is `renderer/`.

## Windows setup (once)

1. Install the tools (PowerShell):
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Git.Git
   winget install Gyan.FFmpeg
   ```
   Node 22 or newer. Close and reopen PowerShell afterwards so they're on PATH.
2. Install [Claude Code](https://claude.com/claude-code) and VideoHub (its README: run `SETUP.cmd`).
3. Get this repo and install:
   ```powershell
   cd $HOME\Documents
   git clone <your repo URL> studio
   cd studio
   npm install
   ```
   The first render downloads Remotion's own headless Chrome (~140 MB).
4. Paid voices only: copy `.env.example` to `.env` and fill in the key(s).
5. In VideoHub: Settings → Folders → add `Documents\studio\films` as a **container**. Each film folder shows up as a project.
6. Open Claude Code in the `studio` folder and say, for example, "make a 12-minute film about …".

Rebuild a film's generated files on a new machine (they're not in git):
```powershell
npm run timeline -- north-korea
```
(the free Windows voice re-voices the script, so timings shift slightly from the Mac's).

## How a film gets made

| Step | Skill | Writes (in `films/<film>/`) |
|---|---|---|
| Start | new-film | `film.json`, `overrides.json`, `render.mjs` |
| Research | research | `research.md`: dated, cited ledger (two passes: people/backstory, events) |
| Outline | outline | `outline.md`: cold open, 4–8 chapters, claims, timeline, gaps |
| Script | script | `script.md`: `##` chapters + narration, sized to the target length |
| Fact check | factcheck | `factcheck.md`: flagged sentences and fixes |
| Visual plan | visual-plan | `shot-list.csv`: every shot, type, what to show, plays under, search terms, licensing |
| Graphics | graphics | `specs/*.json`: one per Map/Chart/Motion graphic/Text cue, checked against its text |
| Rough cut | rough-cut | `npm run timeline` → narration, timeline and VideoHub files; render; review notes in VideoHub |
| Package | youtube-package | `youtube.md`: titles, thumbnails, description with chapters, tags |
| Hand-off | rough-cut | `npm run handoff` → `capcut/` for footage and touch-ups in CapCut |

The user approves each step; Claude does the work.

## Commands

```
npm run new -- <film> "Title" --minutes 12   start a film
npm run status [-- <film>]                   where each film is
npm run cues -- <film>                       graphics cues and which need specs
npm run check -- <film>                      on-screen numbers must come from the cue text
npm run graphics -- <film> [shot …]          render graphics as standalone clips → graphics/
npm run timeline -- <film> [--paid]          voice + place shots + VideoHub files
npm run render -- <film> [workers] [--preview] [--clean]   the rough cut → render/<film>.mp4
npm run still -- <film> <seconds …>          frames → qa/
npm run studio -- <film>                     Remotion Studio with the narration
npm run handoff -- <film>                    CapCut package → capcut/
```

## VideoHub

Each film follows VideoHub's project contract:
- `render.mjs`: chunked render script ("family A"): 5-second chunks in `render/chunks/`, `ONLY=` for partial
  re-renders, stops after chunks when the queue runs it. VideoHub joins them and lays `audio/mix.wav` under them.
- `audio/mix.wav` (sound), `audio/vo.wav` (voice layer), `words.json` (captions/narration row), `shots.json` (scene lane),
  `.videohub/project.json` (title, `DUR`, render settings).
- No live preview (that needs a canvas page; Remotion films are reviewed as renders).

## Voices

Set in `film.json` → `voice`. `auto` uses the free system voice (Windows: SAPI; Mac: `say`) for timing. `openai` and
`elevenlabs` are paid and only run with `--paid`. See `.claude/skills/voice/SKILL.md`.
Every engine writes 24 kHz mono WAV per sentence, cached in `.cache/vo/`.
