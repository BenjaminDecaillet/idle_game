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

## In progress

2. **feat/floor-training-visibility** — next up, not started.
   Acceptance: on the floor view, a training/promoting employee's desk
   shows a state badge (training vs promotion visually distinct), a live
   progress bar and remaining time, readable without hover. Derive from
   `timedActions` (`kind === 'training' | 'promotion'`, `targetId`). All
   strings i18n EN+FR. Screenshot evidence. Relevant code: floor rendering
   `src/ui/ui.ts` ~1399+, desk/stand slots ~1765+.

## Queue

3. **feat/desk-slot-employee-cap** — headcount hard-capped by
   `FLOOR_CAPACITY × MAX_FLOORS` desk slots per site (derive, don't
   hardcode 32). Hire blocked at cap with translated error; hire buttons
   disabled with reason; live `n / cap` counter in roster/office header;
   graceful over-capacity handling; unit tests (hire at cap, after firing,
   cap growth on floor completion).
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

Start `feat/floor-training-visibility` off `origin/master`: read the floor
desk-slot rendering (`src/ui/ui.ts` ~1765) and the timed-action helpers,
then design the badge/progress markup.
