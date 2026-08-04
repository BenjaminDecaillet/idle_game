# Session state — 2026-08-04 (autonomous backlog run)

Contract: `.claude/skills/session-handoff/SKILL.md`. Mission: ship the
whole backlog (per-floor projects + cost scaling → Office tab → chiptune
→ improvements.md top-to-bottom), one slice = one branch = one PR,
Angular naming, no AI attribution in git history, checkpoint after every
slice.

## 1. Current slice — second tier: site specialization

Top tier COMPLETE: A–D5 merged (PRs #17–#24). Current slice on branch
`feat/site-specialization`: complete, gates green (700 tests / 31
files, build, smoke). Shipped: favoredSpec per paid site (+50% on
matching contracts via SITE_SPEC_BONUS in workerRate, stacks with the
personal spec match), site-sheet Specialty row + starred contract
cards (decisions.md #32), 4 tests, improvements #9 ticked.

**Next action:** PR (strip auto-appended session footer) → CI → merge
→ next: improvements #12 push opt-in (likely SKIP: needs a backend or
Notification-API scheduling work — assess briefly, record the skip) →
#14 cosmetic-first premium catalog → polish items (#15 construction
art via art-skinner, #16 builder visibility, #18 confetti) → tech #21
balance harness. Sourcery's innerHTML flags remain established false
positives — merge on the `test` check.

## 2. Slice queue (mission order)

1. ~~A: per-floor projects + cost scaling + beta shop~~ → PR #17 merged
2. ~~B: one Office tab~~ → PR #18 merged
3. ~~C: chiptune + chimes~~ → PR #19 merged
4. ~~D1: daily contracts~~ → PR #20 merged
4b. ~~D2: i18n sweep~~ → PR #21 merged
4c. ~~D3: worker traits~~ → PR #22 merged
4d. ~~D4: random events~~ → PR #23
5. D2+: improvements.md — i18n sweep → worker traits → random events →
   vault, then second tier (specialization, push opt-in, cosmetics),
   polish (construction art, builder visibility, confetti, city
   scenes), tech (balance harness). Skip only external-account items
   (analytics/ads/IAP/Capacitor — see monetization.md).

## 3. Standing decisions to remember

- `BETA_FORCE_REFRESH` + `BETA_FREE_IAP` flips stay untouched (beta
  exit checklist, improvements.md #22).
- Sandbox network policy blocks the deployed Pages URL; rely on CI
  smoke + Settings build stamp.
- Task tracker (this session) mirrors the slice queue; tasks #1–#4.
