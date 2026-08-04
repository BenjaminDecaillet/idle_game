# Session state — 2026-08-04 (autonomous backlog run)

Contract: `.claude/skills/session-handoff/SKILL.md`. Mission: ship the
whole backlog (per-floor projects + cost scaling → Office tab → chiptune
→ improvements.md top-to-bottom), one slice = one branch = one PR,
Angular naming, no AI attribution in git history, checkpoint after every
slice.

## 1. Current slice — second tier: office pets

PRs #17–#25 merged (top tier + site specialization). Current slice on
branch `feat/office-pets`: complete, gates pending final run. Shipped:
4 zero-power VsCoin pets (global ownership, per-company petId, staff
room pet corner, lobby companion), push opt-in #12 formally SKIPPED
(decisions.md #33 — needs push-service backend).

**Next action:** gate → PR (strip session footer) → CI (`test` check)
→ merge → polish tier: #16 builder idle visibility, #18 confetti on
claims, #15 construction art pass (art-skinner), then tech #21 balance
harness. #19 bespoke city scenes is big art — only if time remains.

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
