# Session state — 2026-08-04 (autonomous backlog run)

Contract: `.claude/skills/session-handoff/SKILL.md`. Mission: ship the
whole backlog (per-floor projects + cost scaling → Office tab → chiptune
→ improvements.md top-to-bottom), one slice = one branch = one PR,
Angular naming, no AI attribution in git history, checkpoint after every
slice.

## 1. Current slice — A: state shape + economy scaling

Branch `feat/state-economy-scaling`, **PR #17 open, waiting on CI**
(vitest + build + Chromium smoke). Local gates green: 551 tests / 26
files, `npm run build` clean.

Shipped in the PR (save v10, single beta reset):
- Per-floor project slots — `projectSlots` cap/action/costs removed;
  floors are the concurrency unit; `activeProjectId` = default for
  null-assigned floors (decisions.md #20).
- Company-tier cost scaling — `companyCostScale`/`companySalaryScale`
  in engine.ts, constants in data.ts, curve in balance.md Phase S
  (decisions.md #21). Garage = exactly 1. Signatures changed:
  `trainCost(company, worker)`, `promoteCost(company, worker)`,
  `deskUpgradeCost(company, defId)`; new `tierSalary(company, tierId)`.
- Beta shop — all VsCoin SKUs free-claimable under `BETA_FREE_IAP`
  (decisions.md #22).
- New tests: floor-projects (14), cost-scaling (41). Skills
  codebase-overview + bump-save-version refreshed to v10.

**Next action:** when PR #17 CI is green → merge → start slice B
(`feat/office-floor-management`) from fresh master. If CI fails, fix on
this branch (drive-to-green). A `send_later` check-in re-checks the PR
in ~1 h in case webhooks drop.

## 2. Slice queue (mission order)

1. ~~A: per-floor projects + cost scaling + beta shop~~ → PR #17
2. B: one Office tab (Map, Office, Shop, VsCoin, Stats; Team/Upgrades/
   Projects tabs die; company → floors → enlarged floor view; hiring
   popup with candidate cards + reroll; staff-room floor holds all
   upgrades; bounded lists at 2 Hz)
3. C: 8-bit theme song in fx.ts (+ distinct chimes, improvements #17)
4. D+: improvements.md top tier (daily contracts → i18n sweep → traits
   → random events → vault), then second tier / polish / tech. i18n
   sweep must run AFTER slice B.

## 3. Standing decisions to remember

- `BETA_FORCE_REFRESH` + `BETA_FREE_IAP` flips stay untouched (beta
  exit checklist, improvements.md #22).
- Sandbox network policy blocks the deployed Pages URL; rely on CI
  smoke + Settings build stamp.
- Task tracker (this session) mirrors the slice queue; tasks #1–#4.
