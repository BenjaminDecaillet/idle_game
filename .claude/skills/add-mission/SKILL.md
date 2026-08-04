---
name: add-mission
description: Add a mission (VsCoin objective) or a new mission metric to Idle Silicon Valley. Use when extending the mission chains, tuning mission rewards, or adding new objective types.
---

# Add a mission

Missions are declarative objectives paying VsCoin, defined entirely in data.

## Adding a mission to an existing chain

Edit `MISSIONS` in `src/game/data.ts` only:

```ts
{ id: 'ship-50000', metric: 'projectsCompleted', target: 50_000, reward: 12, emoji: '📦' },
```

- Keep each chain (same `metric`) sorted by ascending `target` — the UI shows
  completed-unclaimed missions plus the FIRST uncompleted link per chain
  (`visibleMissions` in `src/game/missions.ts`).
- `id` convention: `<chain>-<target-ish>`. Never reuse a retired id.
- Reward scale so far: 1–12 VsCoin (story beats pay 2, aura level 1 costs 2,
  golden sprint costs 3, diamond wallpaper 8). Keep late-chain rewards in that
  economy.
- Removing a mission is safe: `migrate()` drops stale claim ids.

## Adding a new metric

1. Extend the `MissionMetric` union in `src/game/types.ts`.
2. Add the case to `metricValue()` in `src/game/missions.ts`. The metric MUST
   be derived from durable state (counters, lengths, ownership) — never add
   per-tick bookkeeping. Cross-country metrics aggregate via
   `allCompanies(state)` / `state.countries`. If the quantity isn't
   derivable, add a monotonic counter to `GameState` instead (default it in
   `createInitialState` + a hygiene fallback in `migrate()` — additive
   fields need no version bump; see the bump-save-version skill).
3. Add label keys `mission.<metric>` to `src/i18n/en.ts` AND `fr.ts`
   (placeholder `{target}` is formatted as money for `totalEarned`-like
   metrics in `ui.ts` → `renderMissions`; extend that ternary if needed).
4. Test in `tests/missions.test.ts`: metric derivation + one claim path.

Claims flow through `claimMission()` → `grantVsCoin(state, n, 'mission:<id>')`
(ledger audited). Run `npm test` + `npm run build`.

## Daily contracts (src/game/daily.ts)

A second consumer of the mission metrics: 3 delta-progress contracts per
UTC day, rolled deterministically from the day number out of
`DAILY_CONTRACT_POOL` (data.ts), progress = metricValue − day-start
baseline (`state.daily.baselines`). New metrics added for regular
missions become available to the daily pool too — add a pool entry with
a sane one-day delta target. The day number is computed in main.ts and
passed in (`ensureDaily(state, day)`); daily.ts never reads the clock.
Claims grant VsCoin with source `daily:<id>`.
