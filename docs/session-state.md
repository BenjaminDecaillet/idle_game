# Session state — 2026-08-05 (bugfix + feature run, WRAPPED)

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

4. **docs/idle-game-state-of-the-art — DONE, PR #35 open** — survey doc
   + improvements.md #23-#36 (+ correction commit: export/import already
   existed in the codebase; picks rotated to bulk buy / welcome-back
   itemization / payback-time display).
5. **feat/bulk-buy-desks — DONE, PR #36 open** (commit 9824211) —
   stationCostN/maxAffordableStations/buyWorkstations + x1/x10/Max
   toggle, 8 tests, Playwright-verified.

## Conventions in force

- One branch per concern off latest master, Angular commit style, no AI
  attribution anywhere in git.
- Session-state checkpoints are pushed to branch
  `claude/idle-sv-autonomous-session-u0o112`.
- Definition of done: npm test + npm run build green, EN+FR complete,
  plan.md updated, pushed, PR open.

6. **feat/welcome-back-report — DONE, PR #37 open** (commits 1309f54 +
   81e20fe). simulateOfflineReport aggregates tick events; modal
   itemizes; hardcoded modal strings migrated to i18n; 5 tests;
   Playwright-verified with screenshot.
7. **feat/payback-time — DONE, PR #38 open** (commit 3164573).
   deskPaybackSec (balance.md Phase Q, designed by balance-designer),
   payback hints on desk cards, seatPotential extraction, 5 tests with
   predict-vs-realize identities, Playwright-verified.

## Next concrete action

All planned work items are DONE. Session wrap: PRs #32-#38 all open
awaiting review/merge (fix/floor-project-selector #32,
feat/floor-training-visibility #33, feat/desk-slot-employee-cap #34,
docs/idle-game-state-of-the-art #35, feat/bulk-buy-desks #36,
feat/welcome-back-report #37, feat/payback-time #38). Each is green
(vitest + build; #32's smoke regression check runs in CI) and has
screenshot evidence in the PR/session. Nothing in flight. Note:
i18n keys added near 'ui.awayTraining'/'ui.buyBtn' on several branches
will trivially conflict on merge — resolve by keeping all keys.
On "continue": check PR review comments / CI on #32-#38 and address
them; otherwise pick from docs/improvements.md #23-#36.