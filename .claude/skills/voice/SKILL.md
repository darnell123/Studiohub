---
name: voice
description: Choose or change a film's narration voice (free system voice, OpenAI or ElevenLabs), make voice samples, and re-voice the film. Use when the user talks about the voice-over, narrator or voice quality.
---

# Voice

The voice is set in `films/<film>/film.json` → `voice`:

| engine | cost | settings |
|---|---|---|
| `auto` | free | the system voice: `say` on a Mac, `sapi` on Windows (scratch voice for timing) |
| `sapi` | free | `voice`: an installed Windows voice ("Microsoft Zira Desktop", "Microsoft David Desktop"), `rate`: −10..10 (default 1) |
| `say` | free | `voice`: "Samantha", `rate`: words per minute (175) |
| `openai` | paid | `voice`: onyx, ash, sage, coral, alloy, echo, fable, nova, shimmer, ballad, verse; `model`: gpt-4o-mini-tts; `instructions`: how to read (default: calm, measured documentary narrator) |
| `elevenlabs` | paid | `voice`: an ElevenLabs voice ID; `model`: eleven_multilingual_v2; optional `settings` {stability, similarity_boost, style} |

Keys go in `studio/.env` (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`); never print, log or commit them. A key pasted
twice by accident is handled.

**Paid voices cost money: always ask first.** `npm run timeline -- <film>` refuses to call a paid engine and prints
how many sentences and characters still need voicing; tell the user that number (and the rough price) and run
`npm run timeline -- <film> --paid` only after they say yes. Sentences are cached in `films/<film>/.cache/vo/`, so
re-voicing after a script edit only pays for changed sentences, and switching voices back is free.

Samples before committing to a voice: voice only the cold open (first few paragraphs) with each candidate, after the
user OKs the small cost. With the ElevenLabs connector in this session you can also list voices
(`creative_list_voices`) and generate a sample with `creative_generate_speech` (this uses credits: ask first).

All engines write 24 kHz mono 16-bit WAV per sentence, so the rest of the pipeline doesn't change. Paid voices are
worth backing up: `.cache/` isn't in git.
