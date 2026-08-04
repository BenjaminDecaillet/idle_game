# Session state — 2026-08-04 (autonomous backlog run)

Contract: `.claude/skills/session-handoff/SKILL.md`. Mission: ship the
whole backlog (per-floor projects + cost scaling → Office tab → chiptune
→ improvements.md top-to-bottom), one slice = one branch = one PR,
Angular naming, no AI attribution in git history, checkpoint after every
slice.

## 1. Current slice — B: the Office tab

Slice A (per-floor projects + cost scaling + beta shop, save v10)
**merged as PR #17**. Slice B on branch `feat/office-floor-management`:
implementation complete, local gates green (551 tests / 26 files,
build, extended Chromium smoke incl. the office drill-down). Shipped:
tabs Map/Office/Shop/VsCoin/Stats; Office drill-down company list →
building → floor view / staff room (decisions.md #23–25); hire popup;
missions folded into VsCoin; tutorial + goals retargeted; four
tutorial texts rewritten EN+FR.

**Next action:** commit this checkpoint → open the slice B PR → CI →
merge → start slice C (`feat/audio-chiptune`).

## 2. Slice queue (mission order)

1. ~~A: per-floor projects + cost scaling + beta shop~~ → PR #17 merged
2. B: one Office tab → this branch, PR next
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
