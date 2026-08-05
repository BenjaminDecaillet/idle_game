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

## Phase E — random events

Live opportunity dialogs with a real trade-off, wall-clock scheduled by
the UI (6–11 min windows, `EVENT_INTERVAL_*`; never while hidden, never
offline — briefcase precedent) once `tutorial.done && totalEarned ≥
EVENT_MIN_EARNED (5 000)`. Cash sides are minutes of gross income at
roll time (floored), so offers stay meaningful at every scale:

| event | weight | you get | you pay |
|---|---|---|---|
| 💼 Investor offer | 3 | 30 min income cash now | salaries ×2 for 10 min |
| 📰 Press coverage | 3 | output ×2 for 4 min | 5 min income upfront |
| 🍕 Crunch pizza | 2 | output ×1.5 for 10 min | 2 min income + salaries ×1.5 for 10 min |
| 🎤 Keynote slot | 2 | output ×2.5 for 3 min | 10 min income upfront |

EV check: every accept is mildly positive for an attentive player
(press coverage nets ≈ +3 min income; the investor offer nets ≈ +30 min
income minus 10 min of doubled wages, positive whenever salaries <
gross — guaranteed by Phase S parity), so accepting is never a trap;
declining costs nothing. The salary lever rides a new optional
`salaryMult` on Boost (max 5 active boosts caps stacking; same-source
re-grants extend).

## Phase V — piggy vault

`VAULT_RATE (5%)` of every project payout accrues **on top** into a
global vault — a bonus pool, deliberately not a skim: taxing payouts
would silently distort income, mission pacing and every earlier phase's
math. Cap = `VAULT_CAP_MINUTES (120)` of gross income (floor
`VAULT_CAP_MIN` 10k), clamped once per tick; at 5% of income the vault
fills from empty in ~40 h of play — a natural multi-session cycle.
Opening costs `VAULT_OPEN_COST (5)` VsCoin flat: at full it pays 120 min
of income for 5 coins, sitting between the Series A (15 min / 10) and
Series B (40 min / 20) funding rounds in value — deliberately the best
cash-per-coin deal in the game, because the pool is earned, and the real
monetization hook is the habit (later: ad-gated or IAP "golden hammer"
opening per docs/monetization.md). Global like VsCoin, so it survives
prestige — a small cushion for the fresh garage.

## Phase H — balance simulation harness

`tests/balance-harness.test.ts`: a greedy bot that plays
through `tick()` only — best affordable desk, strongest affordable
candidate (first hire at face value, later ones with a 1.5× cash
cushion), coffee habit, project unlocks at 3× wallet, floors at 2×,
next site at 1.5×. It deliberately skips training/promotions (builder
flows), so it runs well behind the human-assumption targets: measured
curve as of Phase H — second company ≈ 10.3 h, $1M ≈ 9.3 h, fourth
company ≈ 60 h, $1B ≈ 69 h over 4 simulated days.

Two uses:
- **Always-on CI guards** anchored on that measured curve with ~2×
  slack (second company and $1M inside a simulated day; four companies
  inside four days; ends cash-positive). They catch a data.ts change
  that wrecks the curve — they do not enforce the aspirational pacing.
- **Tuning tables**: `npm run balance:sim` prints the full
  time-to-milestone table (~1 s), turning curve tuning into the
  30-second check improvements #21 asked for.

Note: candidate refills roll through Math.random, so milestone times
vary a little run to run — the ~2× guard slack absorbs that; treat the
table as a curve reading, not an exact number.

When a deliberate rebalance shifts the curve, rerun the table and move
the guard anchors in the same commit.

## Phase Q — desk "pays for itself in X" hint (display-only)

Shop workstation cards show the payback time of buying **one** desk of a
def. No balance numbers change; one pure helper in `src/game`.

### Formula (exact HUD delta, not an approximation)

`deskPaybackSec(state, company, defId) = stationCost(company, defId) / Δ`
with `Δ = incomeAfter − incomeBefore` (in $/s):

- `incomeBefore` = `companyIncome(state, company)` (what the HUD sums).
- `incomeAfter` = same math on a **ghost seating**: append one desk of
  `defId` at array position `workstations.length` (so `stationFloor` →
  `floorProject` give its project), then re-pair exactly like `autoSeat`:
  stations not under upgrade sorted by def multiplier desc × workers not
  busy sorted by `tier.baseRate × skillMultiplier × spec-match` desc.
- Salaries don't change, so Δ is pure reward-rate delta:
  `Σ_projects (currentReward / currentWork) × ΔworkRate(project)`.
- Implementation: give `workerRate` an optional station-multiplier
  override (default `stationMultiplier(company, worker.stationId)`), pass
  the **real** company for every multiplier (global/spec/site/traits) and
  only the ghost pairing for desk multiplier + floor project. Never
  mutate state; never re-derive the rate formula.

Because it is the exact `companyIncome` delta, the hint can never
contradict the HUD: after buying, income rises by exactly Δ.

### Edge rules (exact)

- **Δ ≤ 0** (no workers, or all seated and the new desk beats no
  occupied desk): show **no number** (UI may caption "seats your next
  hire"). No hypothetical-average-worker math — it would promise income
  the HUD won't show. Note Δ > 0 is common even with everyone seated:
  a better desk reshuffles the best worker onto it (autoSeat re-sorts).
- **Soft cap**: ratio uses `currentReward / currentWork`, frozen at the
  plateau — capped companies automatically show honest (long) paybacks.
- **Busy workers** (training/promotion) count as absent, matching the
  income the HUD shows right now.
- **Debt**: same formula; debt interest ignored (second-order, display
  only). **Boosts**: included via `globalOutputMultiplier` — optimistic
  during a boost, but consistent with the boosted HUD income, which wins.
- Label as "at current rates": the ratio drifts down per completion
  (rewardGrowth 1.1 < workGrowth 1.13) until the cap freezes it.

### Worked examples (garage, costScale 1, no upgrades, G = 1)

1. **Early**: 1 intern (rate 0.5, skill 1) unseated, first Basic Desk
   ($20), Landing ratio 15/30 = 0.5 → Δ = 0.5·1·0.5 = 0.25 $/s →
   **payback 80 s**. First-session purchase feels instantly right.
2. **Reshuffle (all seated)**: junior skill 5 (pot. 1.4) + intern skill 8
   (0.85) on two Basic Desks; first Standing Desk ($250) seats the junior
   (1.25×), intern keeps a basic → Δ = 1.4·(1.25−1)·(70/120) ≈ 0.20 $/s →
   **payback ≈ 20 min**. An earned early-mid goal, not a trap.
3. **No value**: 1 seated intern, second Basic Desk ($24): pairing
   unchanged, Δ = 0 → **no hint shown** (desk buys ahead of hiring).

## Phase A — earned automation (improvements #23)

Three automations in the Antimatter-Dimensions mold: tedium converted into
an anticipated reward. Each is **unlocked** by a durable lifetime counter
(mid-game per the human curve, survives prestige like all lifetime
counters) OR **bought early** for VsCoin (convenience-speed, priced in the
vault-5 / pets-4–10 band, never power). Once unlocked, each automation is
a **per-company toggle, default OFF** (`company.auto = { train, hire,
desks }`, all `false`) — automation must never surprise a player who
didn't ask for it, and per-company toggles let the player automate the
farm companies while hand-tuning the new one. Checks run inside `tick()`
every `AUTOMATION_CHECK_INTERVAL_SEC (5)` so offline simulation gets them
for free (60 s offline chunks ≥ the interval — fine, coarser is safe).

| automation | milestone unlock (durable counter) | VsCoin early unlock | behavior when ON |
|---|---|---|---|
| 🔁 Auto-train | 25 lifetime trainings completed (**new** global counter `trainingsDone`, mirrors `promotionsDone`) | 6 | for each idle worker below their cap: restart training if wallet ≥ `AUTO_CASH_RESERVE_FACTOR (2)` × trainCost **and** free builders > `AUTO_BUILDER_RESERVE (1)` |
| 🤝 Auto-hire | 40 lifetime hires (**new** global counter `hiresDone`) | 8 | when an idle desk exists (`workstations.length > workers.length`) and wallet ≥ hireCost + `AUTO_HIRE_SALARY_COVER_SEC (1800)` × the candidate's salary: hire the best candidate by `seatPotential` |
| 🖥️ Auto-desks | 75 desks owned (global `desks` mission metric) | 10 | buy the def with the **lowest** `deskPaybackSec` when payback ≤ `AUTO_DESK_PAYBACK_MAX_SEC (1800)` and wallet ≥ `AUTO_CASH_RESERVE_FACTOR (2)` × cost |

Threshold TTVs (human curve): 25 trainings ≈ day 2–4 for a player using
the training loop (3–8 programs per early company); 40 lifetime hires ≈
the tower era (~company 4–5, churn included); 75 global desks ≈ a 4–5
company empire at 3–5 floors each. All three land squarely mid-game —
after the habit exists, before it becomes a chore multiplied by 8
companies. VsCoin prices total 24 ≈ one more "identity" slice of the ~150
lifetime budget (Phase W sanity check still holds: it competes with
builders #4–5 at 23).

Guard-rail rationale (the numbers that keep automation debt-safe):
- `AUTO_HIRE_SALARY_COVER_SEC = 1800` — 30 min of the **new hire's own**
  salary in the bank, i.e. 3× the debt-crisis threshold anchor
  (`DEBT_CRISIS_SALARY_SEC` 600): auto-hire can never be the thing that
  tips a country into a quit spiral. Early: mid hire = 500 + 0.5×1800 =
  $1,400 trigger. Late (orbital #8 principal): ≈ 83M + 16.6M ≈ 100M ≈
  17 min of the orbital plateau — same session-scale feel (Phase S parity).
- `AUTO_DESK_PAYBACK_MAX_SEC = 1800` — buys everything the Phase Q hint
  would call obviously good (80 s early buys, ~20 min reshuffles) and
  stops exactly where Phase Q's "earned early-mid goal" band ends; capped
  companies show hour-scale paybacks and are correctly left alone.
- `AUTO_CASH_RESERVE_FACTOR = 2` — automation never spends the second
  half of the wallet, so the player's own planned purchase (floor, next
  company) is never silently eaten.
- `AUTO_BUILDER_RESERVE = 1` — auto-train never takes the last free
  builder; promotions/floors/foundings (all manual decisions) stay
  startable. Promotions are deliberately **not** automated: promoting is
  the hire-vs-grow choice (Phase 1) and must stay a decision.

**Phase H guard note:** the harness bot never toggles automation
(default-off), so the measured curve and all CI anchors are untouched. If
a future harness variant enables automations, note that every unlock
threshold sits beyond the guard-anchor milestones for the greedy bot (it
skips training entirely, so `trainingsDone` stays 0). New state
(`company.auto`, `trainingsDone`, `hiresDone`) → additive fields +
`migrate()` hygiene defaults, `SAVE_VERSION` bump per the beta policy.

Watch metric: if <30% of players with the milestone ever toggle a given
automation ON, the guard thresholds (reserve factor / cover seconds) are
too conservative — loosen the reserve factor to 1.5 first, one knob.

## Phase M — ownership milestone multipliers (improvements #24)

Pecorella step-multipliers, adapted to ISV's hard capacity: a company can
never own more than `MAX_FLOORS (8) × FLOOR_CAPACITY (4) = 32` desks, and
headcount is capped by desk slots — so the survey's 25/50/100 steps are
unreachable per company. The steps become **8 / 16 / 32**, i.e. "fill
floor 2" / "fill half the tower" / "full house", which maps each step to
an existing purchase ladder (floors) instead of an arbitrary count.

Two tracks per company, both durable ownership counts:
- desks: `workstations.length` ≥ 8 / 16 / 32
- employees: `workers.length` ≥ 8 / 16 / 32

`milestoneMult(company) = (1 + Σ deskBonuses) × (1 + Σ workerBonuses)`
with `COMPANY_MILESTONE_BONUS = [0.05, 0.10, 0.15]` per step reached
(additive within a track, tracks multiply). Multiplies into
`globalOutputMultiplier` — so it raises plateau income too, which is the
point: the soft-cap plateau stops being a dead end and becomes a
staircase whose top step (full house, 1.30 × 1.30 ≈ **1.69×**) is an
authored per-company capstone.

| step | requirement | bonus (track) | expected TTV |
|---|---|---|---|
| 8 desks / 8 employees | fill floor 2 (Gabriel's gift floor) | +5% each | first session, ~20–40 min (~$60–500 of desks + hires) |
| 16 / 16 | 4 floors (garage floors 3–4 ≈ $14k + $86k) | +10% each | early-mid, ~1–3 h garage; minutes for later scaled companies |
| 32 / 32 | all 8 floors (garage floor 8 ≈ $112M) | +15% each | late per-company goal, post-plateau — the reason to finish a tower |

Why these sizes: each single step (+5/10/15%) is at most one coffee-level
(+10%) to 1.5 coffee-levels of power — visible, never mandatory. The
combined 1.69× full-house ceiling ≈ one moonshot level (+50%) plus change,
and it costs the entire floor ladder (≈ $131M in the garage) — priced like
the late-game upgrade it is. Milder than the survey's example (+10/15/25%)
per step *because* there are two stacking tracks that in practice complete
together (headcount cap = desk slots).

**Phase H guard note:** the greedy bot hits 8/8 and later 16/16 in company
1 before the second-company anchor → up to 1.10 × 1.10 ≈ +21% output at
that point, pulling the measured 10.3 h second company toward ~8.5–9 h and
$1M (9.3 h) similarly. Both stay far inside the "within one simulated day"
guards (~2× slack). **Rerun `npm run balance:sim` in the landing commit
and move the anchors to the new measured curve anyway** (the guards
anchor on measurements, not targets). No new stored state (derived from
counts) — no save-version impact.

Watch metric: if plateau-era retention telemetry shows players parking at
16/16 and never buying floors 5–8, raise the top step to +20% per track
(full house 1.35² ≈ 1.82×) — one knob.

## Phase K — quarterly market seasons (improvements #26)

Kittens-style rhythm, fully deterministic from **tick-accumulated
playtime** (`state.playTimeSec`, which already advances inside `tick()`
and therefore accrues through offline simulation too — no new state, no
randomness, nothing for `migrate()` to touch).

```
SEASON_LENGTH_SEC = 21_600           // 6 h of played+simulated time per quarter
SEASON_ORDER = ['stable', 'boom', 'crunch', 'recovery']
quarter  = floor(playTimeSec / SEASON_LENGTH_SEC)
season   = SEASON_ORDER[quarter % 4]
cycle    = floor(quarter / 4)
boomSpec = SPECIALIZATIONS[cycle % 4]   // deterministic rotation
```

Payout multipliers (applied to project **payouts** at completion time and
mirrored in `grossRewardRate`/`companyIncome` via one shared helper — the
stored `currentReward` and the soft-cap math are never touched, so the
plateau/cap invariants of Phase 5 are undisturbed):

| season | multiplier | note |
|---|---|---|
| 🌤️ stable | ×1.0 all projects | first 6 h of a fresh save = neutral — tutorial-safe with zero gating code |
| 🚀 boom | ×`SEASON_BOOM_SPEC_MULT (1.6)` on `boomSpec` projects, ×1.0 others | the engaged-play hook: reassign floors (Phase 5 slots) to ride it |
| 📉 crunch | ×`SEASON_CRUNCH_MULT (0.8)` all projects | labeled in the HUD (a season chip) — an *explained* dip, not the "decline reads as a bug" trap |
| 📈 recovery | ×`SEASON_RECOVERY_MULT (1.05)` all projects | gentle rebound, distinct identity from stable |

**Long-run average = 1.0 exactly** under the ~¼-income-in-favored-spec
assumption: (1.15 + 1.0 + 0.8 + 1.05) / 4 = 1.0 (boom's expected global
value is 1 + 0.25 × 0.6 = 1.15). Bounds if the assumption breaks: a player
who never matches the boom spec averages ×0.9625 (−3.75%); a player who
reassigns everything into every boom averages ×1.1125 (+11%) — that spread
*is* the intended skill expression, and both ends sit far inside the ~2×
Phase H slack. Sample timeline: first boom at 6–12 h of playtime
(typically day 2), first full cycle after ~24 h of accumulated time
(~1–2 real days with offline).

Income-anchored prices (marketing, shop packs, daily earn target, vault
cap) read the season through `grossRewardRate` and simply breathe ±20%
with it — self-consistent by construction; the daily earn target is
snapshotted at roll (Phase D), so a crunch-time roll only ever gets easier.

**Phase H guard note:** the 4-day harness run spans 4 full cycles; the
spec-agnostic bot lands between the −3.75% and 0% bounds → the measured
curve shifts ≤ ~4%, absorbed by guard slack. Rerun the sim table in the
landing commit regardless.

Watch metric: if session telemetry shows logins avoiding crunch quarters,
soften `SEASON_CRUNCH_MULT` to 0.9 and rebalance boom to 1.4 to keep the
mean at 1.0 ((1.10 + 1 + 0.9 + 1.0)/4 with recovery back at 1.0) — two
knobs, one constraint: the quartet must keep averaging 1.0.

## Phase R — recruiters (improvements #28)

Producer-of-producers, grounded in the actual candidate flow: the engine
already refills 3 fresh candidates the moment the pool empties, so raw
candidate *supply* is not the late-game bottleneck — pool **size** and
**freshness** are (finding spec-matched high-tier candidates for 32-desk
buildings, feeding Phase A auto-hire). A per-company **Recruiting** level:

- pool capacity = `3 + level` (max **8** at `RECRUITER_MAX_LEVEL (5)`)
- one empty slot refills with a standard weighted roll every
  `RECRUITER_INTERVAL_SEC (600) / level` seconds (L1 = 10 min, L5 = 2 min)
- level-0 behavior is exactly today's (instant refill-of-3 on empty) — no
  early-game regression, and manual reroll (Phase S pricing) stays the
  fast lane for impatient players: recruiters are comfort, not power.

Cost curve (Pecorella `b·r^k`, Phase S–scaled so it self-anchors at every
tier): `cost(level) = RECRUITER_BASE_COST (50_000) ×
RECRUITER_COST_GROWTH (3)^level × companyCostScale(company)` (level 0 →
L1 uses exponent 0).

| company | L1 | L5 | TTV / relevance |
|---|---|---|---|
| garage (scale 1) | 50k | 4.05M | unaffordable in session one (~10–40 $/s) → **irrelevant early** by price alone; ~4–8 min at the plateau if wanted |
| tower #5 (scale 45.6) | 2.3M | 185M | mid-game: minutes of empire income when staffing 20+ desks |
| orbital #8 (scale 1041) | 52M | 4.2B | late: L1 ≈ 9 min of the ~100k $/s plateau; L5 during a 32-desk bulk staffing |

Throughput check at the 50+ employee scale it is designed for: L5 + an
8-slot pool + auto-hire ≈ 30 hires/h sustained, i.e. a fresh 32-desk
company staffs itself in ~1 h hands-off — while a present player clicking
manual rerolls is still strictly faster. Rationale for growth 3: matches
the mid-game upgrade tracks (fiber/chairs/synergy), keeping L4–L5 a real
save rather than an auto-include.

**Phase H guard note:** recruiters produce candidates, not income; the
harness hires from the default pool and never buys recruiters → zero
guard impact. New state: `company.recruiterLevel` (additive, default 0) +
timer field → `SAVE_VERSION` bump with the rest of this wave.

Watch metric: if manual reroll spend collapses to ~0 among L3+ companies,
recruiters are cannibalizing the reroll sink faster than intended — raise
`RECRUITER_INTERVAL_SEC` to 900 before touching prices.

## Phase X — market-scouting expeditions (improvements #29)

Level13-style chapter opening: each country unlock (after International
Business) is **gated** by a completed expedition to that country — a
country-level timed action started from the active country, occupying 1
builder (the Phase W scarcity economy applies; several expeditions may run
in parallel to different targets).

- **Cost**: `EXPEDITION_COST_FRACTION (0.02) × countryUnlockCost(state)`,
  cash, paid at start. 2% of the mountain you are already saving toward —
  a real stake that scales with the ×3 unlock ladder automatically, never
  a second mountain. (First expedition: 0.02 × 5e13 = 1e12.)
- **Duration**: `EXPEDITION_DURATION_BASE_SEC (14_400) ×
  EXPEDITION_DURATION_GROWTH (1.3)^(countriesUnlocked − 1)`.

| expedition | duration | fast-forward | context |
|---|---|---|---|
| → country #2 | 4 h | 24 VsCoin | overlaps the 5e13 save-up — no added wall, same trick as the company-founding overlap |
| → country #5 | ~8.8 h | 53 VsCoin | one offline gap |
| → country #8 | ~19.3 h | 116 VsCoin | empire capstone; the skip is deliberately whale-priced (cf. builder #10 at 227) |

Durations sit intentionally **above** the construction ladder's worst case
(floor 8 company 8 ≈ 5 h): an expedition is a chapter transition, not a
routine build, and it always runs concurrently with a multi-hour cash
save-up, so its wall-clock cost is ~zero for a player who starts it early.

**Reward — decided: report + permanent modifier, not purely
informational.** Completing the expedition yields the market report
(authored flavor + preview) **and** a permanent
`EXPEDITION_OUTPUT_BONUS (0.05)` — +5% output for all companies in that
country, forever. Justification: countries are mechanically identical
(data.ts says so), so a purely informational report has zero pull on a
second read; +5% (half a coffee level) makes the wait *earned* without
creating a growth axis, and it seeds the future per-country-modifier
system the report fiction promises. Scouted-country set + bonus live on
global state and **survive prestige** (knowledge is the one thing a
founder keeps) — a deliberate small accelerant for post-prestige world
tours, consistent with Phase P's "each restart measurably faster".

**Phase H guard note:** the harness horizon (4 days, 4 companies) never
reaches the world stage; the +5% applies only to countries the guards
never see. No impact. New state: `state.scoutedCountries: string[]` +
`expedition` timed-action kind → `SAVE_VERSION` bump.

Watch metric: if players report the gate as a wall (unlock cash ready,
expedition forgotten), surface the expedition CTA on the world map the
moment `worldUnlocked()` flips — a UI fix, not a number fix.

## Phase B — viral clickables (improvements #31)

The golden-cookie analog: a "🔥 viral moment" bubble, spawned by the UI
scheduler (briefcase/event precedent: wall-clock, never while hidden,
never offline, **no offline compensation by design**) once
`tutorial.done && totalEarned ≥ VIRAL_MIN_EARNED (5_000)`.

- Spawn window: uniform `VIRAL_MIN_INTERVAL_SEC (480)` –
  `VIRAL_MAX_INTERVAL_SEC (900)` (8–15 min; deliberately offset from the
  random-event window 6–11 min so the two presence systems interleave
  instead of colliding).
- Lifetime: `VIRAL_LIFETIME_SEC (18)` on screen, then gone — long enough
  on mobile, short enough to be a presence reward.
- Reward: `VIRAL_REWARD_MINUTES (3)` of gross income (floor
  `VIRAL_REWARD_FLOOR (250)`), through the same income-anchor formula as
  events/packs. Early: ~3 × 60 × 30 $/s ≈ 5.4k. Plateau: ~27k–45k. Late:
  scale-invariant by construction.
- Jackpot: `VIRAL_JACKPOT_CHANCE (0.08)` of +`VIRAL_JACKPOT_VSCOIN (1)`
  instead of a big cash pop, hard-capped at
  `VIRAL_JACKPOT_DAILY_CAP (2)` per UTC day (reuses the daily day
  number; durable counters `state.viral = { day, jackpotsToday,
  lifetimeCatches }` — the lifetime counter is the future mission hook).

Budget math (the "must not beat dailies" constraint): an attentive 2 h/day
player sees ~10 spawns (mean interval 11.5 min), catches ~8 → **cash**
+24 min of income per day (~+26% on top of that live session's passive
income — active play visibly better, the genre's ~2× active:idle target,
and strictly less than the random-event EV already shipped) and
**VsCoin** E[jackpots] = 8 × 0.08 ≈ 0.64/day; even a 6 h grinder is
clamped to 2/day by the cap — comfortably under the dailies' realized
2.5–3.5/day, so dailies remain the headline retention income.
Online-only fairness holds because the reward is minutes-of-income
(missing bubbles while offline costs a bonus, never base progression) and
the offline doubler already owns the offline-reward moment.

**Phase H guard note:** entirely UI-scheduled; `tick()` and the harness
are untouched; no compensation → no pacing shift. Additive `state.viral`
defaults via `migrate()` hygiene + `SAVE_VERSION` bump with this wave.

Watch metric: if telemetry shows catch-rate < 40% on mobile, raise
`VIRAL_LIFETIME_SEC` to 25 before raising rewards; if VsCoin/day from
jackpots exceeds 1.5 at the median, drop `VIRAL_JACKPOT_CHANCE` to 0.05 —
one knob per symptom.

## Phase F — deep prestige: differentiated exits & founder points (improvements #30, post-1.0)

### How the exits map onto the current single prestige

Today (`engine.ts`): one prestige — `prestigeReset()` gated on the
`dream-achieved` story beat + `prestigePreview ≥ 1`, banking Reputation
(log of all-time earnings, Phase P) into a permanent output multiplier.
Phase F **keeps that system intact** — same reset, same Reputation
constants, same output multiplier — and layers exits on top:

- The current prestige *becomes* the mid-tier **IPO** exit verbatim (same
  gates, same narrative). Nothing about Phase P's numbers changes.
- **Acquisition** (early) and **Spin-off** (late) are new *eligibility
  gates* for the very same `prestigeReset()`. Reputation is still banked
  in delta form on every exit (an early Acquisition simply banks +0 rep,
  honestly previewed, because 1e9 ≪ `PRESTIGE_MIN_LIFETIME` 1e14).
- **Founder Points (FP)** are a new, parallel prestige currency banked on
  *every* exit, spent on a respec-able perk board.

| exit | gate (durable) | narrative | expected first TTV |
|---|---|---|---|
| 🤝 Acquisition | all-time earned ≥ `ACQ_MIN_EARNED (1e9)` | "sell the startup" | ~2–3 days (harness reaches 1e9 ≈ 69 h; humans faster) |
| 🔔 IPO | current gates unchanged (`dream-achieved` + rep preview ≥ 1) | Phase P's open-source epilogue | ~10–14 days |
| 🌍 Spin-off | countries ≥ `SPINOFF_MIN_COUNTRIES (3)` at exit | "found the holding" | weeks (post world-tour) |

### Founder Point tracks (fractional-power, high-water, delta form)

Three tracks, each a pure function of a **never-decreasing durable
metric**, banked in delta form exactly like Reputation (so preview =
award, nothing is lost across resets, and no metric can be farmed by
cycling — re-reaching an old high-water banks nothing):

```
fpAcq(E)  = E < ACQ_MIN_EARNED ? 0 : floor(ACQ_FP_K (3) × (E / ACQ_MIN_EARNED)^ACQ_FP_EXP (0.1))
fpIpo(H)  = floor(IPO_FP_K (1) × H^IPO_FP_EXP (0.6))        // H = lifetime peak concurrent headcount
fpSpin(C) = floor(SPINOFF_FP_K (8) × (C − 1)^SPINOFF_FP_EXP (0.7))  // C = max countries ever held
award on any exit = Σ over tracks (fpTrack(metric high-water) − bankedTrack)
```

On the exponents: headcount and countries take Pecorella's p ≈ 0.5–0.7
directly (0.6 / 0.7). Earnings are exponential, so a 0.5 power would
explode across 9 decades; `E^0.1` is the power-law form of the same
intent — ×1.26 FP-value per earned decade, matching Phase P's
one-decade-at-a-time rhythm. Sample points:

| track | early | mid | late |
|---|---|---|---|
| Acquisition (E) | 1e9 → 3 FP | 3e14 → 10 FP | 1e17 → 18 FP · 1e20 → 37 FP |
| IPO (peak heads) | 12 → 4 FP | 40 → 9 FP | 100 → 15 FP · 256 (full country) → 27 FP |
| Spin-off (countries) | 2 → 8 FP | 4 → 17 FP | 8 → 31 FP |

Lifetime ceiling ≈ 37 + 27 + 31 = **95 FP** vs. a 70-FP full perk board —
the board is completable only by a player who does everything, in ~4–6
exits.

**Patience is strictly rewarded, small resets stay viable:** because all
tracks bank on every exit and are high-water functions, total FP is a
function of *how far you have ever pushed each metric*, not of how often
you reset. At equal wall-clock, the player who waited for IPO has higher
E (uninterrupted compounding + world bonus, no rebuild tax) **and**
higher peak H, so their bankable FP strictly dominates the serial
acquirer's — e.g. day-4 Acquisition banks 3 FP and restarts from money
50, while the day-12 IPO player banks ~19 FP (10 + 9) in one exit. Yet
the early Acquisition is never a trap: its 3 FP (output rank 1 + training
rank 1, permanent) is a real, immediate perk head start, and the delta
form guarantees the reset destroys no future FP.

### The perk board (7 perks, respec-able)

Costs are per rank; `Σ` = full track. Effects hook into existing
formulas only (no new math surfaces). Respec: **free once per exit**
(`FOUNDER_RESPEC_FREE_PER_EXIT = 1`, flag reset on prestige) — Trimps
precedent; experimentation is the point, thrash is not.

| perk | effect per rank | ranks | FP costs | Σ | rationale |
|---|---|---|---|---|---|
| 📈 Vision | +5% output | 5 | 1/2/3/4/5 | 15 | the plain-power track; full = 1 Aura level, deliberately modest vs rep's 2× |
| 🎓 Alumni network | training duration ×0.90 | 4 | 1/2/3/4 | 10 | stacks with Mentorship (0.85) — tames the 1.6^n training tail |
| 🧾 Lean ops | salaries ×0.95 | 4 | 1/2/3/4 | 10 | independent of HR's 0.4 floor; total ×0.815 |
| ☁️ Cloud infra | offline cap +4 h | 3 | 2/3/4 | 9 | 24 → 36 h; the "offline cap as content" hook (#36) |
| 💰 War chest | starting cash 500 / 5,000 / 50,000 | 3 | 1/2/3 | 6 | replaces `COUNTRY_STARTING_MONEY` (50) on restarts *and* fresh countries; 50k ≈ skips ~10 min of garage — convenience only |
| 👷 Foreman | all timed-action durations ×0.92 | 4 | 2/3/4/5 | 14 | the builder-economy perk; total ×0.716 — priced highest because it discounts the VsCoin fast-forward sink |
| 🧲 Reputation hire | hire costs ×0.95 | 3 | 1/2/3 | 6 | stacks with Talent Network |

First-IPO shopping check: ~19 FP buys Vision 1–3 + Alumni 1 + War chest 1
(+15% output, faster training, 500 start) — a felt, chosen head start on
top of rep's 2×, without doubling it.

**Phase H guard note:** post-1.0 feature; the harness never prestiges, so
guards are untouched. State needed: `state.founder = { points, banked:
{acq, ipo, spin}, peakHeadcount, maxCountries, perks: {}, respecUsed }` —
`peakHeadcount` updated in the hire path (init from current headcount in
`migrate()`), `maxCountries` in `unlockCountry`. `SAVE_VERSION` bump.
Story/mission hooks: each exit type is a natural mission-chain terminus
(improvements #30's "long-horizon chains").

Watch metrics: if >50% of first exits are Acquisitions at the 1e9 floor
followed by churn, raise `ACQ_MIN_EARNED` to 1e10 (shifts the whole track,
one knob); if the board completes in < 3 exits at the median, raise
`IPO_FP_EXP`'s denominator instead of touching perk costs (income knob
before price knob, as always).

## VsCoin flows (Phase A/B/F update)

New sinks: automation early-unlocks (6/8/10, one-time, global), expedition
fast-forwards (24–116, luxury). New sources: viral jackpots (realized
~0.6–0.8/day, hard-capped 2/day — below dailies by design). The Phase W
"one identity" budget survives: automations (24) now compete with builders
#4–5 (23), full Aura (30) and the pack ladder for the ~150 + dailies
income. Founder Points are deliberately **not** purchasable for VsCoin —
prestige depth stays gameplay-earned.
