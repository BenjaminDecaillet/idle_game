# Session state — workforce, timed expansion & shop

Branch: `feat/workforce-and-shop` (from master @ 3ce2128).
Contract: `.claude/skills/session-handoff/SKILL.md`. Plan:
`docs/plan-workforce.md`. Numbers: `docs/balance.md` Phase W section.

## 1. Phase list

| Slice | Status |
|---|---|
| S0 recon + plan + balance numbers | done |
| S1 state foundations (SAVE_VERSION 9, builders, country timedActions) | done |
| S2 builder pool gating + purchase ladder | done |
| S3 zero-output rules (desk-upgrade unseat, training/promo verify) | done |
| S4 timed floor construction + Gabriel floor gift + freeFastForwards | done |
| S5 timed company founding (country-level actions) | done |
| S6 Shop tab (VsCoin → cash packs) | done |
| S7 VsCoin tab (BETA_FREE_IAP free starter pack) | done |
| S8 i18n EN+FR | done |
| S9 tests | done |
| S10 docs + skills updates | done |
| S11 optional art (construction scaffolding decor) | done |

## 2. In-progress unit

None. All scope shipped; **PR #6 is open against master**
(https://github.com/BenjaminDecaillet/idle_game/pull/6).

## 3. Decisions & assumptions (autonomous, veto-able)

- Branch is `feat/workforce-and-shop` per the task brief (overrides the
  harness-suggested `claude/workforce-and-shop-teovzu`).
- Builder pool starts at 1 in `createCountry()` (Gabriel's gift is simply
  pre-granted, per country) — avoids an unclaimable-training dead state.
- `floor-build` lives on `CompanyState.timedActions` (targetId = company
  id); `company-build` on new `CountryState.timedActions` with a `siteId`
  payload (no CompanyState exists yet).
- First company of any country founds instantly (tutorial + prestige
  restarts stay friction-free); ramp starts at company #2.
- Gabriel's floor gift = global `floorGiftClaimed` flag + a claim button on
  floor 2 of the first company of the starting country; bundles
  `freeFastForwards += 1` (durable counter; cost 0 while > 0).
- Shop cash packs anchor on `grossRewardRate` (never negative), gated by
  `requiresCompanies`; debt countries just get wallet credit (one wallet —
  UI copy explains it pays debt first).

## 4. Next action

Nothing pending. Post-merge follow-ups live in `docs/improvements.md`
#19–#22 (narrative touchpoints for the builder economy, tab-label i18n
via skeleton rebuild, richer construction art, builder idle visibility).
Story beats/missions were deliberately skipped this round (#19).

## 5. Build health

`npm test`: 398/398 green (20 files). `npm run build`: green
(tsc + vite + PWA precache). Everything committed and pushed; PR #6 open.
