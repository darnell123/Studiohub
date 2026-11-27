---
name: research
description: Research a film's topic on the web and write its research ledger (films/<film>/research.md). Use after new-film, or when the user asks to research or add research to a film.
---

# Research ledger

Today's date matters: the research is recent reporting published before today, so events in it have already happened.

Read `films/<film>/film.json` for the topic and `targetMinutes` (call it M). The writer will only know what you put in
this ledger, so gather far more than the story needs: **aim for max(30, M × 5) or more distinct, cited facts.**

Do **two passes**, and give each real depth (use web search and read the pages; run the two passes as parallel
subagents when the topic is big):

**Pass 1: the people and the backstory**
1. The main people: childhood and origins, education, early jobs, how they got where they are, their personality and
   habits as reported, and signature moments people still retell.
2. The institutions: founding stories, early struggles, near-failures and comebacks, the big bets and turning points
   that made them what they are, and earlier scandals or conflicts.
3. The landscape and stakes: rivals, markets, money and political actors, what each wanted, and why the central events
   matter to so many people.

**Pass 2: the central events and what followed**
1. Day by day, and hour by hour at the critical points: who did what, when and where, what was said publicly, and what
   happened next.
2. Competing accounts: what each side says, what is reported but unconfirmed, and who reported it.
3. Consequences, reactions and what is still unresolved.

The writer needs **moments, not only facts**. Hunt for direct quotes, reactions and scenes: who was in the room, where
people were, what someone said or did in the moment, how employees, rivals, investors or the public responded, and
small vivid details sources report. Capture memorable numbers and ironies too.

Search from many angles: profiles, interviews, long-form features, court records, filings, government releases and
contemporaneous news. Prefer primary records (court filings, press releases from agencies and companies, filings) and
note when only secondary reporting exists.

## Format of `research.md`

```markdown
# Research ledger: <topic>

**Research cutoff: <today's date>.** Dates are when events occurred unless labeled as a report, filing or ruling.

## 1. <Section, e.g. Origins>

1. **2017-04: <short headline>.** One or two plain sentences of fact. Allegations say "prosecutors allege", reports say
   who reported them, unconfirmed items say so. ([source title](https://url))
2. …

## Gaps
- What the research could not find or confirm.
```

- Dated, chronological within sections; every fact cites at least one URL you actually opened.
- Mark each item's kind where it isn't plain record: *allegation*, *company statement*, *unconfirmed report*, *court finding*.
- Quotes are exact and attributed. Never estimate or invent missing facts; put them under Gaps.

Finish by telling the user how many cited facts the ledger has, the strongest storylines you see, and the gaps.
