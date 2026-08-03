# Session state — workforce, timed expansion & shop

Branch: `feat/workforce-and-shop` (from master @ 3ce2128).
Contract: `.claude/skills/session-handoff/SKILL.md`. Plan:
`docs/plan-workforce.md`. Numbers: `docs/balance.md` Phase W section.

## 1. Phase list

| Slice | Status |
|---|---|
| S0 recon + plan + balance numbers | done |
| S1 state foundations (SAVE_VERSION 9, builders, country timedActions) | done |
| S2 builder pool gating + purchase ladder | not started |
| S3 zero-output rules (desk-upgrade unseat, training/promo verify) | not started |
| S4 timed floor construction + Gabriel floor gift + freeFastForwards | not started |
| S5 timed company founding (country-level actions) | not started |
| S6 Shop tab (VsCoin → cash packs) | not started |
| S7 VsCoin tab (BETA_FREE_IAP free starter pack) | not started |
| S8 i18n EN+FR | not started |
| S9 tests | not started |
| S10 docs + skills updates | not started |
| S11 optional art | not started |

## 2. In-progress unit

None — S1 just landed (v9 committed: `BuilderState`, `CountryState.builders`
+ `.timedActions`, `floor-build`/`company-build` kinds + `siteId` payload,
`freeFastForwards`/`floorGiftClaimed`, save.ts hygiene incl. country-level
action ids, TickEvents entries). Beta-reset notice copy still describes v8 —
refresh it in S8.

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

S2: `src/game/engine.ts` — add `busyBuilders(country)` /
`freeBuilders(country)` (derived over company + country timedActions),
gate the three existing start functions on a free builder, add
`hireBuilder(state)` + `builderCost(country)` per the Phase W ladder in
balance.md; constants into `data.ts`; builder counter + hire button in
`ui.ts` (Office tab header).

## 5. Build health

`npm test`: 352/352 green (19 files). `npm run build`: green.
