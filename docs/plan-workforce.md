# Plan — Workforce, timed expansion & shop

Feature branch: `feat/workforce-and-shop`. Save v8 → v9 (beta reset policy).
Numbers: `docs/balance.md` § "Workforce, construction & shop". Decisions are
mirrored into `docs/decisions.md` as they land.

## Design anchors (locked)

- **Builder pool** (`BuilderState` / `builders` in code, "Workers"/"Ouvriers"
  in UI — the existing `WorkerState` employees keep their name) lives on
  `CountryState`, per country like money. All five timed-action kinds
  (`training`, `promotion`, `desk-upgrade`, `floor-build`, `company-build`)
  occupy exactly 1 builder for their duration. Occupancy is **derived** from
  in-flight timed actions, never stored.
- Ladder per country: #1 free (Gabriel's gift, named via i18n), #2–3 cash,
  #4–5 VsCoin, #6+ VsCoin at `base × growth^(n-5)`.
- Nothing produces while worked on: desks under `desk-upgrade` output zero
  and auto-unseat their employee; training/promotion targets output zero
  (verify + regression-test).
- `floor-build` lives on `CompanyState.timedActions` (`targetId` =
  company id); `company-build` lives on new `CountryState.timedActions`
  (no company exists yet; `siteId` payload identifies the site).
- Gabriel's floor gift: once globally (first company of the first country),
  floor 2 free + instant, bundled with one `freeFastForwards` credit.
- Two new tabs: **Shop** (VsCoin → progression-scaled cash packs, funding
  round themed) and **VsCoin** (IAP-shaped SKUs; starter pack free &
  unlimited while `BETA_FREE_IAP` is true).

## Slices

Every slice ends green (`npm test` + `npm run build` via test-runner),
committed (angular, no AI attribution), pushed, with
`docs/session-state.md` updated.

### S0 — Recon & plan *(this commit)*
- [x] Explore ×2 (timed-action pipeline; floors/founding/tabs), balance set
      appended to `docs/balance.md`, this plan committed.

### S1 — State foundations (v9)
- `SAVE_VERSION` 8 → 9 (`// v9` comment) per bump-save-version.
- `types.ts`: `BuilderState` (+ code-vs-UI naming comment),
  `CountryState.builders`, `CountryState.timedActions: TimedAction[]`,
  `TimedActionKind` + `'floor-build' | 'company-build'`, payload fields
  (`siteId?: string`), `GameState.freeFastForwards: number`,
  `GameState.floorGiftClaimed: boolean`.
- `engine.ts` defaults in `createCountry()` / `createInitialState()`;
  `save.ts` hygiene (arrays, numeric guards, nextEntityId sweep over
  country-level actions).
- Accept: v9 round-trips; pre-v9 save discarded with `betaReset: true`;
  tests + build green.

### S2 — Builder pool & gating
- `engine.ts`: `builderCount(country)`, `busyBuilders(country)` (derived:
  all in-flight actions, company + country level), `freeBuilders(country)`;
  every start function requires a free builder (`string | null` i18n'd
  error id); `hireBuilder(state)` implementing the ladder (cash → VsCoin →
  escalating VsCoin via `spendVsCoin`, source `'shop:builder'`).
- Constants in `data.ts`. Gabriel's gift builder = pool starts at 1, named
  by i18n key (EN/FR flavours; 3 candidates in the commit body).
- UI: builder counter + hire affordance (Office tab header or Team tab).
- Accept: no action starts with 0 free builders; completion/fast-forward
  frees the builder; ladder prices match balance.md.

### S3 — Zero-output rules
- Desk-upgrade start unseats the employee (`stationId = null`, autoSeat
  skips stations under upgrade); upgrading desk contributes no
  multiplier/output.
- Verify training/promotion targets produce zero (already off-floor via
  `workerBusy`); add regression tests either way.
- Update `docs/balance.md` + `docs/decisions.md` (reverses old decision 4).
- Accept: tick and simulateOffline agree; tests prove zero output for all
  three in-flight kinds.

### S4 — Timed floor construction
- `buyFloor` → starts `floor-build` (pay on start, floor on completion in
  `completeTimedAction`), duration ramp per floor index × company index;
  add-timed-action checklist (TickEvents entry, fast-forward free).
- Gabriel's gift: global `floorGiftClaimed`; free instant floor 2 on the
  first company of the first (starting) country + `freeFastForwards += 1`;
  `fastForwardCost` returns 0 while `freeFastForwards > 0` (consumed on
  use).
- Office tab: in-construction floor rendered distinctly (progress bar,
  remaining time, builder occupancy, fast-forward button).
- Accept: only one floor-build per company at a time; offline completion
  identical; gift fires at most once globally.

### S5 — Timed company founding
- `buyCompany` → starts `company-build` on `CountryState.timedActions`
  (pay on start; `createCompany` on completion), duration ramps with the
  country's company count; first company of a country exempt (instant) so
  fresh starts aren't walled.
- Country-level countdown + completion dispatch in `tickCountry`;
  fast-forward finds country-level actions too.
- Map tab: site under construction state in `renderMap`/`renderSiteSheet`
  (progress, remaining time, fast-forward).
- Accept: site can't be double-bought while building; offline completion
  identical; save round-trips in-flight country actions.

### S6 — Shop tab (VsCoin → cash)
- `Tab` union + `TABS` + icon; pack defs in `data.ts`; grant formula
  progression-scaled per balance.md; cash to active country via existing
  wallet (debt: UI states it pays down debt first — it's one wallet);
  `spendVsCoin` source `'shop:<sku>'`.
- Accept: pack values scale with state; ledger entries tagged; buttons
  disabled when VsCoin insufficient.

### S7 — VsCoin tab
- `Tab` union + `TABS` + icon; SKU defs in `data.ts` (IAP-shaped ids),
  `BETA_FREE_IAP = true`; starter pack free/unlimited with BETA badge;
  larger packs rendered disabled ("coming with monetization");
  `grantVsCoin` source `'shop:<sku>'`. Update `docs/monetization.md`.
- Accept: flipping the flag disables the free claim path; grants audited.

### S8 — i18n EN + FR
- All keys for S1–S7 (builder names, errors, tabs, packs, badges) via
  add-translation + i18n-writer; story/tutorial touchpoints only if they
  hang on durable state.
- Accept: fr.ts compiles complete against en.ts; no hardcoded strings in
  the new UI.

### S9 — Tests
- test-writer: builder gating & release; zero-output (all three kinds);
  offline parity for floor-build and company-build; save v9 round-trip
  incl. country-level actions + freeFastForwards; shop grant/spend ledger;
  free-pack repeatability; floor-gift once-globally.
- Accept: `npm test` green with the new coverage.

### S10 — Docs & skills
- `docs/plan.md` roadmap (close "Shop/Boost tab"), `balance.md`,
  `decisions.md`, `improvements.md`, `monetization.md` cross-refs; update
  **add-timed-action** (country-level actions, builder gating),
  **bump-save-version** (v9), **codebase-overview**; new skills/agents if
  they earned their keep.
- Accept: skills describe the shipped system; session-state final.

### S11 — Optional art (budget permitting)
- art-skinner: construction scaffolding on in-progress floors / builder
  art, per art-svg.

Then: one PR, template-populated, at the very end.
