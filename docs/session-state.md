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
| S4 timed floor construction + Gabriel floor gift + freeFastForwards | not started |
| S5 timed company founding (country-level actions) | not started |
| S6 Shop tab (VsCoin → cash packs) | not started |
| S7 VsCoin tab (BETA_FREE_IAP free starter pack) | not started |
| S8 i18n EN+FR | not started |
| S9 tests | not started |
| S10 docs + skills updates | not started |
| S11 optional art | not started |

## 2. In-progress unit

None — S3 just landed: `stationUnderUpgrade()` helper, stationMultiplier
returns 0 for desks under renovation, autoSeat skips them, upgradeDesk
unseats via autoSeat; training/promotion verified zero-output; regression
tests incl. offline parity (359 tests). decisions.md entries 15+16,
balance.md desk-upgrade paragraph revised. Beta-reset notice copy still
describes v8 — refresh in S8.

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

S4: timed floor construction — `data.ts`: FLOOR_BUILD_DURATION_BASE 600,
FLOOR_BUILD_FLOOR_GROWTH 1.5, FLOOR_BUILD_COMPANY_GROWTH 1.15. `engine.ts`:
`floorBuildDurationSec`, `floorUnderConstruction`, buyFloor → starts
'floor-build' (targetId = company.id, gated on builder + one-at-a-time),
completion case adds the floor + floorBuildsDone event; `claimFloorGift`
(first company of countries[0], floors===1, sets floorGiftClaimed, floors=2,
freeFastForwards+=1); fastForwardCost free while freeFastForwards>0
(consumed in fastForwardAction when fastForwardsUsed>0). Office tab:
construction banner with progress/remaining/👷/ff button + gift button.

## 5. Build health

`npm test`: 352/352 green (19 files). `npm run build`: green.
