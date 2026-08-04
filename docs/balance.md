# Balance — curves & rationale

Every number lives in `src/game/data.ts`; this file records the formula and
the why. Time-to-value (TTV) targets: first session = minutes-scale rewards,
second company (200k) = an earned mid-game goal (~20–40 min of plateau play),
each later system = a visible step, never a wall.

## Training ramp (Phase 1)

`duration = TRAIN_DURATION_SEC × TRAIN_DURATION_GROWTH^timesTrained`
with `TRAIN_DURATION_SEC = 120`, `TRAIN_DURATION_GROWTH = 1.6`.

| trainings done | duration |
|---|---|
| 0 | 2 min |
| 3 | 8.2 min |
| 6 | 33.6 min |
| 9 | ~2.3 h |

Rationale: the first training must stay a tutorial-friendly ~2 min; 1.6×
keeps the first handful inside one session while pushing the tail into
idle/offline territory, which is exactly where fast-forward (VsCoin) becomes
attractive without ever being necessary. Cost curve unchanged (payback-time
anchored to tier base rate).

## Grade caps & promotion (Phase 1)

Caps (`maxSkill` per tier): intern 10, junior 20, mid 35, senior 55,
architect 75, principal 100. XP level-ups and training both clamp to the cap.

Promotion (timed action, appears at cap):
- cost = next tier `hireCost × PROMOTE_COST_FACTOR (0.6)`
- duration = `PROMOTE_DURATION_BASE (180 s) × PROMOTE_DURATION_GROWTH (2)^tierIndex`
  (tierIndex of the *target* tier, 1-based)

| promotion | cost | duration |
|---|---|---|
| intern → junior | 60 | 6 min |
| mid → senior | 1 500 | 24 min |
| architect → principal | 48 000 | 96 min |

Rationale: promoting is ~40% cheaper than a fresh hire at the target tier
*and* keeps the earned skill level (a fresh hire starts at 1), so the
training grind pays off; the time cost makes the choice hire-vs-grow real.

## Timed-action fast-forward (Phase 2)

`cost = max(1, ceil(remainingSec / FASTFORWARD_SEC_PER_VSCOIN))`,
`FASTFORWARD_SEC_PER_VSCOIN = 600` → 1 VsCoin per started 10 min.
A 2-min training = 1, a 96-min promotion = 10. First-ever fast-forward free
(tutorial). Rationale: lifetime mission+story VsCoin income is ~150+, so
casual skipping is affordable but habitual skipping of late-game actions
competes with the premium upgrades/cosmetics sinks.

## Desk upgrades (Phase 3)

Upgrade desk tier i → i+1 in place:
- cost = `(next.baseCost − current.baseCost) × DESK_UPGRADE_COST_FACTOR (0.8)`
  — 20% cheaper than the price gap of buying new, rewarding early cheap desks
  instead of making them dead weight. Uses *base* costs (no ownership
  escalation) so upgrading stays attractive when many desks are owned.
- duration = `DESK_UPGRADE_DURATION_BASE (180 s) × DESK_UPGRADE_DURATION_GROWTH (2)^targetTierIndex`
  → standing 6 min, dual 12 min, corner 24 min.
- (Phase W revision) The desk is a construction site for the duration: its
  employee is auto-unseated on start and the desk produces nothing until the
  renovation completes — downtime is part of the price, consistent with the
  "nothing produces while it is being worked on" rule.

## Company soft caps (Phase 5)

Per project: reward stops growing at
`cap = baseReward × site.projectScale × PROJECT_REWARD_CAP_MULT (50)`;
when the cap is reached, *both* reward growth and work growth freeze (a
plateau, not a decline — declining income reads as a bug to players).
With rewardGrowth 1.1 the cap lands after ~41 completions.

Garage plateau check: a full-ish garage team (~300–600 work/s) on a
mid-ladder project plateaus around 100–250 $/s → 200k SoMa Loft in
~20–40 min of plateau play. That makes the second company an earned goal
while the pre-cap ramp still feels exponential.

## Multi-project slots (Phase 5)

Slot 2: floors ≥ 4 (half of MAX_FLOORS 8), cost `25 000 × site.projectScale`.
Slot 3: floors = 8, cost `250 000 × site.projectScale`.
Rationale: priced like a mid/late building investment for that site tier;
running two projects ≈ splitting the same headcount, so the value is
flexibility (spec-matching two teams) not raw throughput — cost stays a
one-time convenience price, not a multiplier price.

## Debt (Phase 6)

- Wages may push a country's balance negative (no floor at 0 any more).
- Interest: `DEBT_INTEREST_PER_SEC = 0.0002` (~1.2%/min, compounding in
  tick) — debt roughly doubles in an hour of neglect: forgiving inside a
  session, punishing across offline gaps (offline is capped at 24 h, so debt
  can grow ~e^17… clamped by `DEBT_CAP_FACTOR`, see below).
- Debt cap: `−DEBT_CAP_SALARY_SEC (3600) × salaries/s` (min −10 000): keeps
  offline debt spirals recoverable. No hard game-over.
- Crisis threshold: debt beyond `DEBT_CRISIS_SALARY_SEC (600) × salaries/s`
  (min −500): one employee quits every `DEBT_QUIT_INTERVAL_SEC (60)` until
  back under. Quitting shrinks payroll → the system self-recovers.

## International expansion (Phase 7)

- Country unlock (after International Business opens): cash from the *active*
  country's wallet, `COUNTRY_UNLOCK_BASE (5e13) × COUNTRY_UNLOCK_GROWTH (3)^(countries−1)`.
  Rationale: the 8-company city costs ~2×10¹⁴ cumulative; the first unlock is
  ~25% of that — a short save-up, then each next country is a fresh mountain.
- Prestige incentive: `WORLD_OUTPUT_PER_COUNTRY (0.25)` — +25% output in
  *every* country per additional unlocked country. Starting from scratch
  abroad (money 50) is the prestige loop; the bonus makes each fresh start
  measurably faster than the previous one.

## VsCoin flows (updated)

New sinks: fast-forwards (1–10 per use), rename (2 × 2^renames), premium
upgrades/cosmetics (existing). New sources: unchanged (missions ~100+,
story 2/beat). Watch: if fast-forward proves too cheap late-game, raise
`FASTFORWARD_SEC_PER_VSCOIN` pressure by lowering it — one knob.

## Rename (Phase 5)

- cash = `max(purchasePrice, RENAME_CASH_MIN 1 000) × RENAME_COST_GROWTH (2)^renames`
- VsCoin = `RENAME_VSCOIN_BASE (2) × RENAME_COST_GROWTH^renames`
- Both are charged. First cash rename ≥ purchase price by construction
  (garage purchase price is 0 → the 1 000 floor applies).

## Workforce, construction & shop (Phase W)

A per-country **builder pool** gates every timed action (training, promotion,
desk upgrade, plus the two new ones below: floor construction and company
founding). Each in-flight action occupies exactly 1 builder; an action cannot
start while all builders are busy. Fast-forwarding completes the action and
frees its builder immediately — builder scarcity is therefore itself a soft
VsCoin sink, on top of the explicit builder prices.

### Builder purchase ladder (per country)

- Builder #1: free (granted with the country — the tutorial's timed actions
  must never be blocked).
- Builders #2–#3: cash, `BUILDER_CASH_COSTS = [2_500, 250_000]`
  (index 0 = builder #2).
- Builders #4–#5: VsCoin, `BUILDER_VSCOIN_COSTS = [8, 15]`.
- Builder #6+: `cost = ceil(BUILDER_VSCOIN_BASE (12) × BUILDER_VSCOIN_GROWTH (1.8)^(n−5))`
  — an open-ended VsCoin sink.

| builder # | cost | expected TTV |
|---|---|---|
| 2 | $2 500 | first session, ~min 10–15 (a few minutes of early ~10–40 $/s income) |
| 3 | $250 000 | just after the SoMa Loft — ~17–40 min at the 100–250 $/s garage plateau, so it's the *next* save after company #2 |
| 4 | 8 VsCoin | mid-game; ~½ of the mission income earned by company 3 |
| 5 | 15 VsCoin | late mid-game; forces a real choice vs. Founder's Aura / boosts |
| 6 / 7 / 8 | 22 / 39 / 70 VsCoin | late-game aspiration: 131 total ≈ most of a free player's remaining budget |
| 10 | 227 VsCoin | prestige/whale territory (above lifetime free income ~150) |

Rationale: builder #2 removes the first "training blocks promotion"
frustration inside session one; #3 deliberately mirrors the second-company
price band (250k vs 200k) so parallelism is an earned mid-game comfort, not
a default. The VsCoin tail (12 × 1.8^(n−5), ceil'd) continues smoothly from
the fixed 8/15 prices (…15, 22, 39, 70, 126, 227…) and, being **per
country**, multiplies into an effectively unbounded sink across 8 countries
without any single price looking abusive. 5 builders comfortably cover a
full 8-company city's routine actions; #6+ is pure parallelism luxury.

### Floor construction time (new timed action)

Floors were instant; now
`duration = FLOOR_BUILD_DURATION_BASE (600 s) × FLOOR_BUILD_FLOOR_GROWTH (1.5)^(floorIndex − 2) × FLOOR_BUILD_COMPANY_GROWTH (1.15)^companyIndex`
where `floorIndex` is the floor being built (2..8; floor 1 ships with the
building) and `companyIndex` is 0-based within the country. Cash cost
(`floorCost`) is unchanged and paid up front when construction starts.

| floor, company | duration | fast-forward |
|---|---|---|
| floor 2, company #1 | 10 min | 1 VsCoin |
| floor 5, company #3 | ~45 min | 5 VsCoin |
| floor 8, company #8 | ~5.0 h | 31 VsCoin |

Rationale: the 600 s base satisfies the hard 10-real-minute minimum for the
cheapest floor; 1.5^6 ≈ 11.4× per building and 1.15^7 ≈ 2.7× per city keep
the worst case (last floor, last company) at ~5 h — hours-not-days, i.e. one
offline gap or a 31-VsCoin skip, never a wall. The company ramp makes later
companies *build* slower even though they *earn* faster, which is what keeps
income plateaus pointing at the next purchase instead of instant scale-up.

### Company founding time (new timed action)

`duration = COMPANY_BUILD_DURATION_BASE (600 s) × COMPANY_BUILD_DURATION_GROWTH (1.6)^companiesFoundedInCountry`.
**Company #1 is exempt entirely** (founded instantly): the garage is the
tutorial and must not depend on builder availability — recommended over a
"near-instant" duration because it also keeps prestige restarts (fresh
country, 1 free builder) friction-free. The exponent counts companies
already founded in the country, so the timer applies from founding #2.

| company # | duration | fast-forward |
|---|---|---|
| 2 | 16 min | 2 VsCoin |
| 4 | ~41 min | 5 VsCoin |
| 8 | ~4.5 h | 27 VsCoin |

Rationale: 16 min for company #2 lands inside the 20–40 min loft save
(start the founding while the plateau pays it off — good overlap, no dead
time); 1.6× matches the training-growth feel and puts company #8 at ~4.5 h,
a satisfying "empire capstone" that a 27-VsCoin skip (vs the company-8
mission's 12) prices as a genuine luxury.

### Shop cash packs (VsCoin → cash, "funding rounds")

One formula, anchored on the active country's **gross** reward rate (same
anchor as `marketingCost`; gross is never negative, unlike net income during
a debt spiral):

`cashGranted = max(pack.floorCash, round(grossRewardRate(state) × 60 × pack.minutes))`

`SHOP_CASH_PACKS` (each: minutes of income, cash floor, VsCoin price,
`requiresCompanies` in the active country — same gating pattern as the
company-count upgrades):

| pack | minutes | floorCash | VsCoin | requires |
|---|---|---|---|---|
| 🌱 Seed | 5 | 1 000 | 4 | — |
| 💼 Series A | 15 | 10 000 | 10 | 2 companies |
| 🏦 Series B | 40 | 100 000 | 20 | 3 companies |
| 🏛️ Series C | 100 | 1 000 000 | 40 | 5 companies |
| 🔔 IPO | 240 | 10 000 000 | 75 | 7 companies |

TTV/value check: at the garage plateau (~100–250 $/s gross) Seed grants
30k–75k ≈ 15–37% of the 200k loft — a nudge, not a skip. Series A first
becomes buyable *after* company #2, when the 3M Palo Alto target is already
~30–120 min of income, so 15 min ≈ 12–50% of it. The `requiresCompanies`
gate is the anti-trivialization mechanism: no pack can ever pre-pay the
milestone it would trivialize, because owning that milestone is its unlock
condition. Anti-exploit reasoning for the floor: income-anchored grants go
to ~0 for a fresh/prestiged country (or if the player unassigns projects to
game the anchor — gross only counts assigned projects), so `floorCash`
guarantees a minimum; floors are sized at roughly the pack's value for a
player one tier *below* its unlock, so idling income to 0 before buying is
never profitable. Per-coin value rises with pack size (~1.3 → ~3.2 min of
income per VsCoin) — a standard value ladder that still stays below the
10 min/VsCoin fast-forward parity, so packs never dominate the
fast-forward sink.

### VsCoin tab SKUs (IAP-shaped; beta = free starter)

`VSCOIN_PACKS` — future CHF prices as comments only, no real checkout yet:

| SKU | VsCoin | future price (comment) | CHF/coin |
|---|---|---|---|
| Starter | 20 | CHF 2.00 — **free & unlimited while `BETA_FREE_IAP = true`** | 0.100 |
| Angel | 50 | CHF 4.00 | 0.080 |
| Venture | 150 | CHF 9.00 | 0.060 |
| Growth | 400 | CHF 19.00 | 0.048 |
| Unicorn | 1 000 | CHF 39.00 | 0.039 |

Rationale: the 20-coin starter ≈ 200 min of fast-forward or Seed+Series A —
enough that a casual free player can skip regularly, while each claim is
only ~13% of the ~150 lifetime mission income, so missions stay the
headline source (and claiming is a deliberate button press, which gives
beta telemetry on sink demand). Unlimited-in-beta is intentional: we want
sink data, and the save-reset beta policy wipes any hoards before 1.0.
Prices follow the monetization doc's anchor rule (the CHF 39 whale pack
makes CHF 4–9 look reasonable); per-coin discount deepens monotonically.
`VSCOIN_LEDGER_CAP (200)` is a ledger *history* cap, not a balance cap, so
large SKUs need no engine change. When real IAP ships, only the Starter
SKU's `BETA_FREE_IAP` branch is removed.

### VsCoin budget sanity check (free player, whole game)

Lifetime free income ~150 (missions + story) + beta starter claims. Sinks
now competing: fast-forwards (1–31 per use), builders #4+ (23 for #4–5,
131 more for #6–8, per country), cash packs (4–75), Aura (2/4/8/16),
boosts (3), Diamond wallpaper (8), renames. A free player can afford *one*
identity (e.g. "5 builders everywhere I settle" or "regular skipper" or
"pack buyer") but not all — which is the design goal. Watch metric: if
builders #4–5 are bought by <20% of players reaching company 3, drop
`BUILDER_VSCOIN_COSTS` toward [5, 10] — one knob per segment.

## Phase P — Prestige (IPO: open-source the AGI)

Prestige ("IPO / open-source the AGI & restart with reputation") wipes
countries, companies and money; keeps VsCoin, premium global upgrades,
cosmetics, avatar, story-seen and missions-claimed. In exchange the player
converts **all-time lifetime earnings** into permanent **Reputation** points
that feed a global output multiplier.

### Constants (for `src/game/data.ts`)

```ts
// Prestige: convert all-time lifetime earnings into permanent Reputation.
// totalRep(E) = E <= MIN ? 0 : floor(POINTS_PER_DECADE * log10(E / MIN))
// award on prestige = totalRep(allTimeEarned) - state.reputation  (delta form:
// fractional decades carry over, nothing is lost to floor() across resets)
// output mult = 1 + PRESTIGE_OUTPUT_K * reputation^PRESTIGE_OUTPUT_ALPHA
export const PRESTIGE_MIN_LIFETIME = 100_000_000_000_000; // 1e14 — log anchor & hard floor
export const PRESTIGE_POINTS_PER_DECADE = 10; // rep per ×10 of all-time earnings
export const PRESTIGE_OUTPUT_K = 0.5;
export const PRESTIGE_OUTPUT_ALPHA = 0.5; // sqrt — heavy diminishing returns
export const PRESTIGE_STORY_BEAT = 'dream-achieved'; // epilogue gate (story-seen survives prestige)
```

State needs: a never-reset all-time earnings accumulator and a cumulative
`reputation` integer. Simplest: keep `state.totalEarned` un-reset across
prestige (it already only feeds claimed-once missions and seen-once story
beats, both of which survive prestige anyway); per-country `totalEarned`
dies with its country as today.

### 1. Reputation from lifetime earnings (log-based, diminishing)

`totalRep(E) = E <= PRESTIGE_MIN_LIFETIME ? 0 : floor(PRESTIGE_POINTS_PER_DECADE × log10(E / PRESTIGE_MIN_LIFETIME))`

- 1.26e14 (= 1e14 × 10^0.1, the first point): 1 rep — earliest possible
  prestige, ~9–12 days in (Orbital ≈ 1.13e14 as company #8, AGI ~shipped).
- 3e14 (typical epilogue wealth: full city + AGI + slack): 4 rep — ~10–14 days.
- 1e17 (patient first run: all 8 countries before prestiging): 30 rep —
  ~4–6 weeks; the long route is rewarded but not mandatory.

Rationale: log (not sqrt) because late-game wealth is exponential — one
rep-decade per ×10 earned keeps rep growth *linear per run* no matter how
the economy inflates, which is what caps ten prestiges at ~5×.

### 2. Permanent output multiplier from cumulative Reputation

`prestigeMult(rep) = 1 + PRESTIGE_OUTPUT_K (0.5) × rep^PRESTIGE_OUTPUT_ALPHA (0.5)`

Multiplies into `globalOutputMultiplier()` alongside `aura` and `world`.

- rep 1 (minimum first prestige): 1.50× — bottom of the promised +50–100% band.
- rep 4 (comfortable first prestige at 3e14): 2.00× — top of the band.
- rep 60 (~10 prestiges, see table): 4.87× — under the ~5–10× lifetime cap;
  even a runaway 1e22 all-time (80 rep) only reaches 5.47×.

Rationale: sqrt-of-log stacks two diminishing curves, so the knob that
matters is *when* you prestige, not how many times — no rep-farming loop.

### 3. Eligibility

Prestige is offered only when **both** hold:

- story beat `PRESTIGE_STORY_BEAT` (`dream-achieved`: Orbital HQ owned +
  AGI shipped) is in `story.seen` — narrative gate; you can only
  open-source an AGI you have actually built (checked once ever, since
  story-seen survives prestige);
- `prestigePreview(state) ≥ 1` (see #4) — economic gate; below
  ~1.26e14 all-time the formula yields 0, and after a prestige the gate
  automatically becomes "grow all-time earnings ×1.26 past the last
  conversion point", so a pointless immediate re-prestige is impossible.

UI: disable the button with the preview showing `+0 rep` when ineligible.

### 4. Next-prestige preview (UI)

`prestigePreview(state) = max(0, totalRep(allTimeEarned) − state.reputation)`

Pure function of durable state — safe to render at 2 Hz and to recompute
after offline simulation. The delta form also *is* the award formula, so
preview and grant can never disagree.

### 5. Sanity table

Assumes each run pushes all-time earnings roughly one decade at first
(perm mult + kept Aura/VsCoin make re-climbing fast), tapering to ×3–4 per
run as the plateau economy makes further decades slower.

| prestige # | all-time earnings at reset | rep gained | total rep | mult after | expected TTV (cumulative) |
|---|---|---|---|---|---|
| 1 | 3e14 | +4 | 4 | 2.00× | ~10–14 days (first full story run) |
| 2 | 3e15 | +10 | 14 | 2.87× | +~6–8 days (2× perm start, re-climb + 1 decade) |
| 3 | 2e16 | +9 | 23 | 3.40× | +~5–7 days |
| 4 | 1e17 | +7 | 30 | 3.74× | +~5–7 days (≈ full 8-country wealth) |
| 5 | 4e17 | +6 | 36 | 4.00× | +~5–7 days |
| 7 | 3e18 | +4/run | 44 | 4.32× | ~2 months total |
| 10 | 1e20 | +5–6/run | 60 | 4.87× | ~3 months total |

Rationale for the pacing: first prestige lands right after the story
epilogue with a 2× head start — big enough that run 2's first session
reaches the SoMa Loft in well under an hour, small enough that the lost
world bonus (up to 2.75× with 8 countries) still makes finishing a world
tour a real alternative to prestiging early. Each later prestige is
roughly a week and buys a visibly smaller slice (+0.5×, +0.3×, …), pushing
long-term players toward breadth (countries, builders, missions) instead
of an infinite prestige treadmill.

Watch metrics: if players prestige at the 1-rep minimum and churn, raise
`PRESTIGE_MIN_LIFETIME` to 2e14 (one knob, shifts the whole curve); if ten
prestiges feel flat, raise `PRESTIGE_OUTPUT_K` toward 0.7 (rep 60 → 6.4×)
without touching the earning curve.

## Phase S — company-tier cost scaling

Requirement: desk price, hire cost, salary, training, promotion, desk
upgrades and cash-upgrade prices must scale with the owning company's
founding price — a company bought for 100T must never sell a $20 desk.
Company 1 (the garage, purchasePrice 0) keeps today's exact numbers.

### Why not the obvious bases

First, derive how a company's *income* actually scales per site. From the
engine: `currentReward = baseReward × projectScale`,
`currentWork = baseWork × projectScale^PROJECT_WORK_SCALE_EXP (0.5)`, and
worker output carries `site.outputBonus`. So per-worker income

`$/s ∝ tier.baseRate × outputBonus × ($/work) = tier.baseRate × outputBonus × projectScale^(1−0.5)`

Define the **income-parity site scale** `S = outputBonus × √projectScale`:
garage 1, loft 2.2, paloalto 5, campus 12, tower 32, seattle 80, nyc 192,
orbital 512. (The reward soft cap and its work freeze both carry the same
`√projectScale` in $/work, so `S` holds at the plateau too.)

- **(a) purchasePrice ratio directly — rejected.** Garage anchors at 0
  (division by zero), and price grows vastly faster than income: orbital #8
  costs 113T while income scale is only 512×. Salaries ×~5.7e8 (vs the
  loft's 200k) against income ×512 → every late company permanently
  insolvent, debt crisis by construction.
- **(b) raw projectScale — rejected.** projectScale reaches 16,384 at
  orbital but income only scales 512× (work grows with the √ exponent).
  A mid dev there: salary 0.5 × 16,384 = 8,192 $/s vs ~640 $/s gross —
  every orbital company runs at a loss forever. projectScale does *not*
  preserve payback ratios; `S = outputBonus × √projectScale` does, exactly.
- **(c) hybrid — chosen.** `S` for parity, times a *sub-linear* power of
  the founding escalation (`purchasePrice / site.cost = 2.2^(n−2)`) so the
  PO's "founding price" intent shows up in capital costs without breaking
  profitability. Salaries get **no** escalation term (recurring cost: any
  escalation there compounds into unfair debt crises; capital costs are
  one-time, so a mild premium just stretches payback slightly).

### The formula

Two derived multipliers, both pure functions of `company.siteId` +
`company.purchasePrice` (the exact engine inputs):

```
siteScale(site)   = site.outputBonus × site.projectScale^(1 − PROJECT_WORK_SCALE_EXP)
escalation        = site.cost > 0 ? max(1, company.purchasePrice / site.cost) : 1
companyCostScale  = siteScale × escalation^COMPANY_COST_SCALE_ESCALATION_EXP   (0.15)
companySalaryScale = siteScale × escalation^COMPANY_SALARY_SCALE_ESCALATION_EXP (0)
```

- Company 1: garage has cost 0 and purchasePrice 0 → escalation 1,
  siteScale 1 → both multipliers exactly 1. Today's numbers untouched.
- `siteScale` reuses `outputBonus`, `projectScale` and
  `PROJECT_WORK_SCALE_EXP` — no new per-site constants, and it stays in
  lock-step if the work exponent ever changes.
- Exponent 0.15 sample points: escalation^0.15 = 1.00 at company #2,
  1.43 at #5 (2.2³ = 10.6), 2.03 at #8 (2.2⁶ = 113.4). Rationale: because
  2.2^0.15 ≈ 1.125, this is "+12.5% capital cost per extra company in the
  country" — same shape as `FLOOR_BUILD_COMPANY_GROWTH (1.15)`, and it
  keeps worst-case fresh-company payback ≈ 2× the garage's (minutes, not
  hours — see the invariant table). 0.5 would give 10.6× at #8 → ~75 min
  paybacks; rejected.

**What multiplies by `companyCostScale`** (all per-company): station cost
(`baseCost × growth^owned × scale`), desk-upgrade cost, hire cost (talent
discount still multiplies; promotion cost = 0.6 × *scaled* target hireCost
follows automatically, preserving the "40% cheaper than a fresh hire"
invariant exactly), training cost, cash upgrade prices (`coffee` … 
`moonshot`), candidate reroll base (see below).
**What multiplies by `companySalaryScale`**: salaries only (in
`companySalaries`; the debt cap/crisis thresholds are salary-anchored so
they auto-scale).
**Untouched**: floor cost & project unlock/slot costs (already site-scaled
via `floorCostFactor`/`projectScale`), marketing (income-anchored), rename
(purchasePrice-anchored already), builders & shop packs (country/income
level), VsCoin prices (`aura`, wallpapers — premium economy stays global).

### Worked examples (ladder-order purchase #n → escalation 2.2^(n−2))

**Loft, company #2** — purchasePrice = 200k × 2.2⁰ = 200k, escalation 1,
S = 1.1 × √4 = 2.2, cost scale = **2.2**, salary scale = **2.2**.
Basic desk 44, corner 44,000; mid hire 1,100, principal 176,000; mid
salary 1.10 $/s; mid training (skill 1) ≈ 248; intern→junior promotion 132.

**Tower, company #5** — purchasePrice = 500M × 2.2³ = 5.32B, escalation
10.65 → ^0.15 ≈ 1.43, S = 2 × √256 = 32, cost scale = **45.6**, salary
scale = **32**. Basic desk 913, corner ≈ 913k; mid hire 22.8k, principal
3.65M; mid salary 16 $/s; senior→architect promotion ≈ 411k.

**Orbital, company #8** — purchasePrice = 1T × 2.2⁶ ≈ 113.4T, escalation
113.4 → ^0.15 ≈ 2.03, S = 4 × √16384 = 512, cost scale = **1,041**, salary
scale = **512**. Basic desk ≈ 20.8k (the "100T company never sells a $20
desk" check), corner ≈ 20.8M; mid hire ≈ 520k, principal ≈ 83M (~14 min at
the ~100k $/s orbital plateau); mid salary 256 $/s; architect→principal
promotion ≈ 50M.

### Profitability invariant (fresh company: 1 basic desk + 1 mid hire)

Model: 1 mid dev (skill 1, no spec match, no upgrades) on the scaled
Landing Page: gross = 1.25 × S $/s, salary = 0.5 × S $/s → net =
0.75 × S $/s (the salary/gross ratio is 40% at *every* tier — identical to
today's garage, income covers payroll from the first completion). Payback
= (desk + hire) / net = 693 s × escalation^0.15.

| site (purchase #) | basic desk | mid hire | mid salary/s | 1st-project reward (landing) | payback |
|---|---|---|---|---|---|
| garage (#1) | 20 | 500 | 0.50 | 15 | 11.6 min |
| loft (#2) | 44 | 1,100 | 1.10 | 60 | 11.6 min |
| paloalto (#3) | 113 | 2,814 | 2.50 | 240 | 13.0 min |
| campus (#4) | 304 | 7,600 | 6.00 | 960 | 14.6 min |
| tower (#5) | 913 | 22,813 | 16.00 | 3,840 | 16.5 min |
| seattle (#6) | 2,568 | 64,194 | 40.00 | 15,360 | 18.5 min |
| nyc (#7) | 6,936 | 173,400 | 96.00 | 61,440 | 20.9 min |
| orbital (#8) | 20,816 | 520,400 | 256.00 | 245,760 | 23.5 min |

Every tier pays back its starting outlay in ~12–24 min — early-game feel
preserved, with a gentle escalation drift that nudges toward "finish the
plateau before founding the next company". Side effect worth naming: today
a loft company hires at garage prices while earning 2.2× — a hidden
discount; removing it slightly slows post-purchase snowballing, which is
exactly the per-company-plateau pacing target. Training payback keeps its
~5 min anchor × escalation^0.15 (≤ ~2×) for the same reason.

### Marketing minimum & candidate reroll

- **Marketing min (500): keep flat.** `marketingCost` is already anchored
  to 300 s of the country's gross income, so it self-scales; the 500 floor
  only ever binds when income ≈ 0 (fresh or prestiged country), and
  scaling it would punish exactly those restarts. Not a per-company price;
  no change.
- **Candidate reroll base (10): scale by `companyCostScale`.** A flat 10
  at an orbital company is free infinite scumming for spec-matched
  principal candidates. Initialize `candidateRerollCost =
  round(CANDIDATE_REROLL_BASE × companyCostScale)` at company creation
  (loft 22, tower #5 ≈ 456, orbital #8 ≈ 10.4k — a constant ~2% of a mid
  hire at every tier, today's friction ratio preserved); keep the ×1.5
  per-reroll growth. Note: the base 10 and growth 1.5 are currently
  literals in `engine.ts` — move them to `data.ts` while touching this
  (hard rule: balance values live in data.ts). `candidateRerollCost` is
  stored state → bump `SAVE_VERSION` per the beta policy.

### Constants to land (src/game/data.ts)

```ts
// Company-tier cost scaling (docs/balance.md, Phase S).
// companyCostScale(company)   = siteScale × escalation^COST_EXP  — capital costs
// companySalaryScale(company) = siteScale × escalation^SALARY_EXP — salaries
// siteScale = site.outputBonus × site.projectScale^(1 − PROJECT_WORK_SCALE_EXP)
// escalation = site.cost > 0 ? max(1, purchasePrice / site.cost) : 1
export const COMPANY_COST_SCALE_ESCALATION_EXP = 0.15; // 2.2^0.15 ≈ +12.5% per extra company
export const COMPANY_SALARY_SCALE_ESCALATION_EXP = 0; // recurring cost: parity only (raise only if late companies overprint)
export const CANDIDATE_REROLL_BASE = 10; // moved from engine.ts literal; × companyCostScale at creation
export const CANDIDATE_REROLL_GROWTH = 1.5; // moved from engine.ts literal
```

Engine surface (mechanical): `companyCostScale(company)` and
`companySalaryScale(company)` reading only `company.siteId` and
`company.purchasePrice`; multiply into `stationCost`, `deskUpgradeCost`
(needs a `company` param), `hireCost`, `trainCost` / `promoteCost` (need a
`company` param), `upgradeCost` (cash branch only), `companySalaries`, and
the `candidateRerollCost` initializer. Watch metric: if late companies
still snowball too fast, raise `COMPANY_COST_SCALE_ESCALATION_EXP` toward
0.25 (payback #8 → ~34 min) — one knob, salaries stay safe by design.

## Phase D — daily contracts

Every UTC day, `DAILY_CONTRACTS_PER_DAY (3)` contracts are rolled
deterministically (seed = UTC day number) from a 6-entry pool. Each tracks
**delta** progress from a day-start baseline snapshot of the mission
metrics: `progress = max(0, metricValue − baseline[metric])`. Two rules the
balance depends on:

- **Eligibility filter at roll**: an entry can declare itself ineligible
  against the day-start snapshot (only `daily-desks` needs it, see below);
  the seeded roll then draws from the eligible subset — still fully
  deterministic per (player state, day).
- **The earn target is snapshotted at roll**:
  `target = max(DAILY_EARN_FLOOR, grossRewardRate(state) × 60 × DAILY_EARN_MINUTES)`
  — evaluated once at the day boundary, so intraday growth only ever makes
  it easier.

Claims go through `grantVsCoin(state, reward, 'daily:<id>')`. As shipped
(decisions.md #27): `state.daily` is an additive, defaultable field — same-
version hygiene in `migrate()`, no `SAVE_VERSION` bump — and the day
rollover happens at the UI boundary (`ensureDaily(state, day)` from
main.ts, the offline-doubler pattern) rather than inside `tick()`: a board
from an offline day was never claimable live, so simulating its rollover
would only discard it earlier. Progress itself derives purely from durable
counters, so offline gains still count toward today's board.

### Pool (validated targets & rewards)

| contract | metric | daily Δ target | reward | early (day-2 garage) | mid (tower era) | late (orbital) |
|---|---|---|---|---|---|---|
| 📦 Ship | projectsCompleted | 15 | 1 | ~15–30 min (api/payments cadence 15 s–3 min) | passive: ~1/few min across 3–5 companies | passive: 15–40/day (8 companies × 2–3 slots) |
| 💰 Earn | totalEarned | `gross × 1800`, floor 500 | 2 | 30 $/s → 54k, ~30–40 min active (or idle) | 5k $/s → 9M, same shape | 100k $/s → 180M, same shape |
| 🤝 Hire | workers | 2 | 1 | 2 interns ≈ $50–250, minutes | seconds of empire income (or ~10–25 min of the hiring company's net at-tier) | seconds |
| 🖥️ Furnish | desks | 3 | 1 | ~$60–160 (+ $2.4k floor 2 if full), ≤ 10 min | 3 basics in newest company ≈ 2.7k–20k, seconds | filtered out when capacity < 3 |
| ⚙️ Upgrade | upgradeLevels | 4 | 1 | coffee 200/480/1,152/2,765 ≈ 3–8 min of income | newest company's cheap ladder ≈ seconds–minutes | same via newest company; worst case ~30–75 min (see below) |
| 🎖️ Promote | promotions | 1 | 2 | often organic (first intern near cap 10) | organic (training pushes workers to caps) | guaranteed fallback ≈ 16 min (see below) |

### Reachability math (the Phase S parity argument)

Capital costs scale with `companyCostScale = S × escalation^0.15` while
per-company income scales with `S` alone, so "2 hires" or "3 desks" costs a
**constant number of minutes of that company's income × escalation^0.15**,
and the escalation drift is bounded: 2.2^0.15 per extra company → 1.00× at
company #2, 1.43× at #5, 2.03× at #8. The Phase S payback table (11.6 →
23.5 min for desk+hire across the whole ladder) is exactly this invariant —
so hire/desk dailies stay session-scale at every tier. In practice they are
far cheaper than that mid/late, because the metrics are **global**: the
player buys in whichever company is cheapest (garage interns are $25
forever), and empire income dwarfs any one company's.

- **projectsCompleted 15 vs the soft cap**: `PROJECT_REWARD_CAP_MULT (50)`
  freezes *both* reward and work growth at the plateau, so completion
  cadence never keeps degrading — it stalls at
  `baseWork × workGrowth^~41 / teamRate`. At the garage plateau (~450
  work/s): landing ≈ 10 s, payments ≈ 12 min, ci ≈ 40 min, search ≈ 3 h per
  completion. Crucially, $/work roughly *equalizes* at cap (landing 0.17,
  ci 0.19, search 0.14 $/work), so farming completions on a cheap project
  costs almost no income — 15/day is sane at every scale and mildly rewards
  the interesting "run a fast side project" choice. Only a literal day-1
  player (0.5–2 work/s) needs 30–45 min; dailies are a day-2+ system.
- **Earn 30 min of gross**: self-scaling by construction; with marketing
  (2×) or the VsCoin boost (3×) it compresses to ~10–15 min of active play,
  and idle income across the 24 h day completes it passively — the
  deliberate login-reward component of the pool (hence reward 2, and hence
  not more than 2).
- **Upgrade 4 levels**: the steepest entry, because per-track growth
  (2.4–3×/level) outruns income *within one company*. Cheapest-4-levels
  across all tracks/companies stays minutes-scale whenever any company has
  a young ladder; the worst realistic case (no recent company, cheap levels
  exhausted) is ~30–75 min of income. That is why the target is 4, not 5 —
  5 would tip the worst case past a session.
- **Promote 1 — the fallback bound**: verified no trap. A worker promotes
  only at `maxSkill`, which can be days away for high-tier workers (training
  durations ramp 1.6^timesTrained per worker), *but* hiring needs no free
  desk (checked `hireWorker`) and the intern chain is always open: hire
  intern ($25 × cheapest company's scale) → 3 trainings (120 + 192 + 307 s,
  exactly skill 1→10) → promote to junior (360 s, $60) ≈ **16.3 min of one
  builder + ~$185** at garage prices. Reward 2 ≈ fast-forward parity for
  that 16 min, so skipping it with VsCoin is value-neutral, never printing.
  Requires 1 free builder — a deliberate soft synergy with the builder sink.
  Keep the entry; no pairing needed.

### Daily VsCoin budget vs. the mission economy and sinks

Pool rewards {1, 2, 1, 1, 1, 2}, mean 8/6; 3 draws/day → **expected 4.0/day
at full clear**, realized ~2.5–3.5 (earn is near-automatic; ship/hire/
upgrade need intent; desks is sometimes filtered; promote is sometimes
16 min of friction) → **~18–25/week**.

- Ground truth from `MISSIONS`: 32 missions totalling **187** VsCoin
  lifetime (117 excluding the 70-coin world-tour chain), front-loaded at
  ~8–10/day-equivalent in the first weeks. Dailies add ≤4/day on top —
  <35% of early income, so the mission chains stay the headline source;
  dailies become the *primary* income only after missions dry up (~7–9
  weeks), which is the design goal: retention income feeding the
  open-ended sinks.
- Sink check ("meaningful trickle, no trivialization"): builder #4 (8) ≈ 3
  days of dailies, #5 (15) ≈ 5–6 days — "save toward a builder within a
  week" ✓. Full Aura (2+4+8+16 = 30) ≈ 10–12 days ✓. Diamond wallpaper
  (8) ≈ 3 days — impulse range, fine for a cosmetic ✓. Boost (3): dailies
  sustain ~1 boost/day — an intended, bounded engagement loop (1 h, ×3).
  The per-country builder tail (22/39/70/126) and the 40–75-coin cash packs
  stay multi-week saves ✓.

Do **not** raise any pool reward above 2: a 3+ daily would fully fund a
daily boost habit plus a builder/week, collapsing the "pick one identity"
budget from the Phase W sanity check.

### Traps & mitigations

- **`desks` is capacity-trappable** (the one real trap): `deskCapacity =
  floors × 4`, `MAX_FLOORS 8`; a full empire (or one where the only
  headroom needs a 2.5–5 h floor build) can't add 3 desks in a day.
  Eligibility filter at roll: `Σ deskCapacity − Σ workstations ≥ 3` on the
  day-start snapshot, else the entry is excluded from that day's draw.
- **`workers` is a level metric, not cumulative**: debt-crisis quits or
  firing regress the delta (progress floors at 0). Acceptable — re-hiring
  interns is cheap, and it stops hire/refire cycling from being entirely
  free. Post-claim firing is unpreventable but bounded at 1 VsCoin/day.
- **Earn-target cheese**: `grossRewardRate` counts only assigned projects
  (same anchor caveat as shop packs), so unassigning everything before UTC
  midnight forces the 500 floor. Unlike shop packs the upside is a *fixed*
  2 VsCoin once/day, so accept it. Watch metric: if telemetry shows
  midnight unassign spikes, re-anchor the target to yesterday's realized
  earnings ÷ 48 (the baseline snapshot already marks the day boundary), 
  which makes sandbagging strictly unprofitable.
- **`promotions` / `upgradeLevels`**: no hard trap (fallbacks above); both
  merely degrade to ~16–75 min in worst cases, within a day.

### Constants to land (src/game/data.ts)

```ts
// Daily contracts (docs/balance.md, Phase D): every UTC day,
// DAILY_CONTRACTS_PER_DAY contracts are rolled deterministically
// (seed = UTC day number) from DAILY_CONTRACT_POOL, restricted to entries
// eligible against the day-start baseline snapshot (only 'daily-desks'
// filters: empire free desk capacity ≥ target). Progress is the delta
// from the snapshot, floored at 0. The earn target is derived at roll:
// max(DAILY_EARN_FLOOR, grossRewardRate × 60 × DAILY_EARN_MINUTES).
export const DAILY_CONTRACTS_PER_DAY = 3;
export const DAILY_EARN_MINUTES = 30;
export const DAILY_EARN_FLOOR = 500;
export const DAILY_CONTRACT_POOL: DailyContractDef[] = [
  { id: 'daily-ship', metric: 'projectsCompleted', target: 15, reward: 1, emoji: '📦' },
  { id: 'daily-earn', metric: 'totalEarned', target: 0, reward: 2, emoji: '💰' }, // target derived at roll
  { id: 'daily-hire', metric: 'workers', target: 2, reward: 1, emoji: '🧑‍💻' },
  { id: 'daily-desks', metric: 'desks', target: 3, reward: 1, emoji: '🪑' }, // roll-filtered on capacity
  { id: 'daily-upgrade', metric: 'upgradeLevels', target: 4, reward: 1, emoji: '⚙️' },
  { id: 'daily-promote', metric: 'promotions', target: 1, reward: 2, emoji: '🎖️' },
];
```

Watch metrics: if 30-day-retained players hoard >100 VsCoin, drop the earn
reward to 1 (expected/day 4.0 → 3.5) before touching targets; if daily
completion of `daily-ship` is <50% among day-2–7 players, lower its target
to 12 — one knob per symptom.

## Phase T — worker traits

Rolled once per candidate through the injectable `rand`:
`TRAIT_CHANCE = 0.35` of candidates carry one trait, and of those
`RARE_TRAIT_CHANCE = 0.06` roll a second (distinct) trait — the "rare"
candidate, ~2.1% of all candidates, golden card in the UI. Weighted pool
(weight → share of single-trait draws): night-owl 3, coffee-addict 3,
quick-study 3, frugal 3, perfectionist 2, rockstar 1 (the strongest trait
is also the rarest).

Expected value check (why this is excitement, not a growth axis): the
mean output multiplier across ALL candidates is
1 + 0.35 × Σ(weightᵢ/15 × (outputᵢ − 1)) ≈ 1 + 0.35 × 0.132 ≈ **+4.6%**
— an order of magnitude below one coffee-machine upgrade level. Salary
effects are net ≈ 0 (coffee-addict +10% and rockstar +25% offset frugal
−15%), so the Phase S salary-to-income parity is undisturbed. XP traits
(quick-study +50%, perfectionist −15%) only shift the training/promotion
cadence, which the timed-action economy already prices.

Steve Gates (the scripted tutorial hire) is deliberately traitless: the
tutorial's cost/time script stays exact.

Constants: `TRAITS`, `TRAIT_CHANCE`, `RARE_TRAIT_CHANCE` in data.ts.
