# Session state — 2026-08-04 (bugfix + feature run, IN PROGRESS)

Contract: `.claude/skills/session-handoff/SKILL.md`.

## Done this session

1. **fix/floor-project-selector — DONE, PR #32 open** (commit d85d6b1).
   The 2 Hz innerHTML refresh destroyed the floor-project `<select>` while
   its popup was open. Fix: `rebuildTab(periodic)` skips periodic repaints
   while a select/input/textarea has focus (`formControlEngaged()`);
   explicit rebuilds unchanged. Regression check added to
   `scripts/smoke-test.mjs` (verified it fails on master, passes with fix).
   Verified interactively with Playwright: picked project persists in save.

2. **feat/floor-training-visibility — DONE, PR #33 open** (commit 6d85721).
   Shared busy-worker tile (badge gold-Training/blue-Promotion + live bar
   + countdown) on floor strip and building strip; `data-live-*` targeted
   updates in frame(); 4 new i18n keys EN+FR; verified with Playwright +
   screenshots; 708 tests + build + smoke green.

3. **feat/desk-slot-employee-cap — DONE, PR #34 open** (commits
   11087b8 + 9c345a6). `atHeadcountCap` + `error.officeAtCapacity` in
   engine; hire-sheet banner + disabled buttons + n/cap counters;
   over-capacity grace; 8 new tests (716 total green); Playwright
   verified + screenshot.

## Queue

4. **docs/idle-game-state-of-the-art** — 3 background research reports are
   COMPLETE (OSS repos survey, design theory, UI/UX+QoL). Raw reports live
   in the session task outputs; if lost, re-run three general-purpose
   agents (angles: GitHub OSS idle repos + licences / design theory +
   pacing + prestige / UI-UX + QoL + PWA offline patterns). Deliverables:
   the doc, backlog entries in docs/improvements.md, then implement 2–3
   highest-value low-risk ideas on own feat branches. Leading candidates
   from the reports: welcome-back offline report modal, export/import
   saves, bulk-buy/earned automation, achievements-with-multiplier.

## Conventions in force

- One branch per concern off latest master, Angular commit style, no AI
  attribution anywhere in git.
- Session-state checkpoints are pushed to branch
  `claude/idle-sv-autonomous-session-u0o112`.
- Definition of done: npm test + npm run build green, EN+FR complete,
  plan.md updated, pushed, PR open.

## Next concrete action

Task 4 (state of the art): the full doc draft already exists at
scratchpad/state-of-the-art-draft.md (content also reproducible from the
three research reports). Create branch docs/idle-game-state-of-the-art
off origin/master, land the doc + append backlog entries to
docs/improvements.md, PR. Then implement picks on own branches:
(a) feat/save-export-import (settings UI, base64 ISV1| prefix, import
through normal load path + confirm dialog), (b) feat/bulk-buy-desks
(closed-form geometric-sum cost + maxAffordable in engine, x1/x10/xMax
segmented control, UI-local quantity — no save change), (c) welcome-back
itemized offline report (extend ui.welcomeBack with a state diff from
loadGame; snapshot cheap counters pre-sim in save.ts).
