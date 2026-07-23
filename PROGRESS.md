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
- Sub-agent configs created: `.claude/agents/test-writer.md`, `.claude/agents/mechanic.md` (haiku-powered, for delegated mechanical work).

### In progress
- Core save-v3 multi-company refactor (engine/types/save + UI adaptation).

### Next up (dependency order)
1. Core refactor: companies[] in state, tick over all companies, migration v2→v3, adapt UI to active company, update existing tests.
2. Map tab: view sites, buy company, switch active company.
3. Buildings/floors: capacity gate on desks, floor unlock purchase, office UI grouped by floor.
4. Training rework: timed program + cost rebalance (document findings below).
5. Wallpapers/customization: purchasable wallpapers, per-company apply + global default; map theme.
6. QoL: x1/x2/x4 speed toggle, per-company renaming, marketing-campaign money sink (paid boost).
7. Persona visual detail upgrade (delegate to sub-agent).
8. Final docs pass (`docs/plan.md`), full test run, push.

## Findings: Employee Training bug (feature 3)

Current formula (`trainCost` in engine.ts, `TRAIN_COST_BASE = 150` in data.ts):
`cost = 150 * 4^tierIndex * skillLevel^2`, instant +1 level, +10% base output per level.
Why it's unusable: cost grows quadratically with level and 4x per tier while the benefit
is a flat +10% of base rate per level. Example: Architect (tier 4) level 1→2 costs
150*256*1 = $38,400... payback takes hours; higher levels are effectively never worth it.
Also redundant: passive XP levels workers for free, so paying should buy *time*, not levels.
Fix direction (decision 3): timed training program with sharply rebalanced cost — see
implementation notes once landed.

## Open issues

- (none yet)
