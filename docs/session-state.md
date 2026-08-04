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

## Next concrete action

Remaining picks, each on its own branch off origin/master:
(a) feat/welcome-back-report — add simulateOfflineReport(state,
elapsed, cap) in engine.ts aggregating tick() event counts per chunk
(projectsCompleted, trainingsDone, promotionsDone, deskUpgradesDone,
floorsBuilt, companiesBuilt, quits, levelUps) + earnings; keep
simulateOffline delegating (signature unchanged). loadGame returns the
report in LoadResult; ui.welcomeBack(offlineSec, report) itemizes
non-zero lines. IMPORTANT: welcomeBack currently has hardcoded EN
strings ("Welcome back!", "While you were away...", "Back to work") —
migrate to i18n as part of this. Tests: report counts after a seeded
offline window.
(b) feat/payback-time — display-only payback seconds on desk purchase
buttons (cost / marginal work-rate→income gain is complex; simpler
honest metric: cost / current company income per sec = time to recoup
at current income; decide with balance-designer if unclear). Keep pure
derived helpers in src/game, no progression math duplication.
