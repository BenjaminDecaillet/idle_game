# PROGRESS — business-sim expansion (branch `claude/business-sim-game-dev-dymaeh`)

Orchestrator log for the multi-company expansion. Updated after every completed subtask.
Resume rule: read this file top-to-bottom, then continue at **Next up**.

## Locked decisions (from Benjamin, 2026-07-23)

1. **Money**: one shared player wallet. Companies have their own teams/buildings/projects/upgrades, but all revenue and spending goes through `state.money`.
2. **Parallelism**: all owned companies produce simultaneously, online and offline.
3. **Training fix**: timed training program (worker leaves desk for a duration, returns with more skill levels), cost rebalanced to be worthwhile.
4. **Time acceleration**: FREE x1/x2/x4 toggle (user's explicit choice over paid boost). Applies to the live loop only, not offline simulation, to keep offline earnings anchored to wall-clock time.

## Architecture decisions

- Save v3: `GameState` gains `companies: CompanyState[]` + `activeCompanyId`. Per-company state: name, site (map location), floors, wallpaper, workers, workstations, projects, activeProjectId, upgrades, candidates, reroll cost. Global: money, totalEarned, boosts, settings, owned wallpapers, nextEntityId.
- Old saves migrate into company #1 at the free starting site ("The Garage").
- Map = fixed list of sites in `data.ts` (one company per site, escalating purchase cost, small site perk).
- Floors: `FLOOR_CAPACITY` desks per floor; desks capped by `floorsUnlocked * FLOOR_CAPACITY`; floor cost grows per company and site tier.
- `tick()` loops over all companies; boosts/timeScale stay global.
- Upgrades (coffee, HR, …) become **per company** — more sinks, matches "managed independently".
- Personas stay procedural SVG (no image assets) — visual upgrade adds more deterministic variety.

## Status

### Done
- Baseline verified green: 70 tests, 4 files (pre-existing).
- Sub-agent configs created: `.claude/agents/test-writer.md`, `.claude/agents/mechanic.md` (haiku-powered, for delegated mechanical work). NOTE: configs created mid-session aren't picked up by the Agent tool until a new session; workaround used this session: `general-purpose` agent + `model: haiku` override with the same instructions inlined.
- Core save-v3 refactor written (`types.ts`, `engine.ts`, `save.ts`): `companies: CompanyState[]` + `activeCompanyId`, shared wallet, tick loops all companies, per-company upgrades, site output bonus, v2→v3 migration folds flat saves into company #1 ('garage'); `nextEntityId` re-derived from max id in save. Action functions kept their signatures (they act on the active company) to minimize churn.
- Map tab UI: sites list, found-company (prompt for name), switch active company, per-company income readout. `src` typechecks clean.

- Commit `8f3256f`: orchestration setup. Commit (pushed) multi-company map + save v3 + migrated tests (70 green).
- Buildings/floors implemented: `floors` per company, `FLOOR_CAPACITY=4` desks/floor, `MAX_FLOORS=8`, cost `FLOOR_BASE_COST(400) * site.floorCostFactor * 6^(floors-1)`; desk purchases gated by capacity; office tab renders the building floor-by-floor with free-slot tiles + "Add floor" button; migration grandfathers old saves enough floors for their desks.
- Training rework implemented (see findings below) with rewritten trainWorker tests incl. payback balance guard. 72 tests green locally.

- Sub-agent delivered `tests/companies.test.ts` (14 tests) + `tests/floors.test.ts` (13 tests) — compile clean against the training-era types.
- Wallpapers & map themes implemented: `WALLPAPERS` (7, 'concrete' free) + `MAP_THEMES` (3, 'daylight' free) in data.ts; buy once globally, apply per company (`wallpaperId`, null = follow player default `defaultWallpaperId`), map theme player-level; building/map backgrounds driven by data `css`; decor shop in Office tab, theme picker in Map tab; migration hygiene (unknown ids dropped, defaults ensured). `tests/customization.test.ts` (7 tests) written in main session.
- Suite: 106 tests green, tsc clean, production build OK.

- Committed + pushed: floors/training/cosmetics batch (106 tests), then QoL batch (110 tests): free x1/x2/x4 speed toggle (live loop only, `settings.timeScale`, migration-validated) and marketing campaign sink (`marketingCost` ≈ 300 s of gross income, min $500, 2×/10 min extendable boost, source 'marketing'). `tests/qol.test.ts` added.
- `docs/plan.md` roadmap updated with all shipped features.

### In progress
- Delegated (sonnet sub-agent): persona visual detail upgrade in `src/ui/persona.ts` (+ style.css if needed) — more deterministic traits (hairstyles, facial detail, eyes, shirt patterns, seniority grey-hair bias), signatures unchanged. On completion: review diff, verify tsc+tests, document trait system here, commit.

### Next up (dependency order)
1. Review + commit persona upgrade.
2. Final pass: full test run + build, PROGRESS.md wrap-up, push.

## Findings: Employee Training bug (feature 3)

Current formula (`trainCost` in engine.ts, `TRAIN_COST_BASE = 150` in data.ts):
`cost = 150 * 4^tierIndex * skillLevel^2`, instant +1 level, +10% base output per level.
Why it's unusable: cost grows quadratically with level and 4x per tier while the benefit
is a flat +10% of base rate per level. Example: Architect (tier 4) level 1→2 costs
150*256*1 = $38,400... payback takes hours; higher levels are effectively never worth it.
Also redundant: passive XP levels workers for free, so paying should buy *time*, not levels.
Fix implemented:
- Training is now a **timed program**: pay up front, the worker leaves their desk
  (produces nothing, gains no XP) for `TRAIN_DURATION_SEC = 120`, then returns
  `TRAIN_LEVELS = 3` skill levels stronger (capped at 100) and is auto-reseated.
- New cost formula (`trainCost`): `baseRate * TRAIN_COST_RATE_FACTOR(45) *
  (1 + 0.15 * (skillLevel - 1))`. Anchoring to the tier's output rate (not hire
  cost) makes payback time uniform across tiers: the granted +30% base output
  repays the cost in ~5 min at the conservative early reward/work ratio (0.5),
  faster later. A regression test ("balance guard") asserts payback < 15 min for
  every tier, so future data.ts tuning can't silently re-break the feature.
  (First attempt anchored to hireCost — the guard test caught senior/principal
  paybacks of 22-71 min; that's why it's rate-anchored.)
- Opportunity cost (120 s off the floor) roughly doubles the effective price,
  which keeps it an actual decision instead of a no-brainer.
- Engine ordering: training countdown runs AFTER the seated-XP loop in tick()
  so the graduating tick doesn't also grant a full tick of seated XP.

## Open issues

- (none yet)
