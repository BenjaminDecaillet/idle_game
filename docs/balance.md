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
