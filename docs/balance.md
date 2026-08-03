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
- The seated worker keeps working during the upgrade (friendliness; the money
  + time cost is the constraint).

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
