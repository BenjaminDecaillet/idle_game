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
| S7 VsCoin tab (BETA_FREE_IAP free starter pack) | not started |
| S8 i18n EN+FR | not started |
| S9 tests | not started |
| S10 docs + skills updates | not started |
| S11 optional art | not started |

## 2. In-progress unit

None — S5 just landed: buyCompany pushes 'company-build' onto
country.timedActions (siteId + price payload, builder-gated, first
company of a country instant), tickCountry runs the country-level
countdown + completeCountryTimedAction (parody name on completion, NO
active-company switch), fastForwardAction covers country actions,
companyCost/availableSites count pending builds, Map sheet shows the
construction w/ progress + ff, save hygiene round-trips country actions
(tests added). 380 tests. decisions.md 15b. Beta-reset notice copy still
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

S7: VsCoin tab — `data.ts`: BETA_FREE_IAP = true + VSCOIN_PACKS
(vsc-starter 20 / vsc-angel 50 / vsc-venture 150 / vsc-growth 400 /
vsc-unicorn 1000, future CHF prices as comments; VsCoinPackDef already in
types.ts); `engine.ts` claimVsCoinPack (starter only while BETA_FREE_IAP,
grantVsCoin 'shop:<sku>', others → 'error.iapComingSoon'); `ui.ts` Tab
'vscoin' (icon 'vscoin'), renderVsCoinShop(): free starter card with BETA
badge + claim button ('claim-vscoin:<sku>'), larger packs disabled with
coming-soon note. i18n EN+FR. Update docs/monetization.md cross-ref.
NOTE: tab labels stay hardcoded EN like the existing 7 (improvements #16).

## 5. Build health

`npm test`: 352/352 green (19 files). `npm run build`: green.
