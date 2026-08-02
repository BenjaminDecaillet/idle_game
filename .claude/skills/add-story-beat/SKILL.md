---
name: add-story-beat
description: Add a narrative story beat to Idle Silicon Valley (trigger + EN/FR text + tests). Use when adding or editing story content, milestones dialogs, or Gabriel narration.
---

# Add a story beat

Story beats are one-shot narrative dialogs (Gabriel panel) fired on durable
state milestones. Three places must stay in sync:

1. **Trigger** — `src/game/story.ts`, `STORY_BEATS` array (order = display
   priority when several fire together). Rules:
   - Trigger predicates must be **durable**: derived from counters/ownership
     (`totalEarned`, `projectsCompleted`, `anyCompanyAtSite(...)`, project
     `completions`, `s.countries.length`, debt helpers `inDebt`/`inDebtCrisis`)
     — never from transient flags like an in-flight timed action, or beats
     can be missed during offline simulation. Beats are global: aggregate
     across countries via `allCompanies`/`anyCompanyAtSite`, not the
     active-country accessors.
   - Insert the beat in chronological story position, not at the end.
2. **Text** — `src/i18n/en.ts` AND `src/i18n/fr.ts`: add BOTH
   `story.<id>.title` and `story.<id>.text`. `fr.ts` is type-checked against
   `en.ts`, so a missing FR key fails `npm run build`. Voice: Gabriel,
   earnest-warm with light humor; 2–3 sentences; the arc is
   "garage nobody → ship a benevolent AGI to everyone from Orbital HQ".
3. **Tests** — `tests/narrative.test.ts`: the "has story text for every beat"
   test passes automatically; add a trigger test if the predicate is
   non-trivial (see the `agi-shipped` / `dream-achieved` examples).

Notes:
- Firing a beat auto-grants `VSCOIN_PER_STORY_BEAT` (data.ts) — no extra code.
- A beat added in an update will fire (dialog + coins) for existing
  same-version players the first time its condition holds — that is intended.
  (`backfillStory()` exists for marking already-passed beats seen without
  dialogs/coins if a future flow needs it; the beta reset made the old
  pre-story-save backfill path moot.)
- The UI needs no changes; dialogs render from the queue automatically
  (`ui.ts` → `updateNarrative`). Gabriel's pose is 'think' except ids listed
  in `showStoryModal` (add yours there if it deserves 'cheer').
- Run `npm test` and `npm run build` before committing.
