# Session state — progression & expansion build

Branch: `feat/idle-sv-progression-and-expansion` (from master).
Contract: see `.claude/skills/session-handoff/SKILL.md`.

## 1. Phase list

| Item | Status |
|---|---|
| P0 docs + agents + skills | done |
| P0 GameState schema rework + beta reset (v8) | not-started |
| P2 generic timed actions + fast-forward + tutorial freebie | not-started |
| P1 employees: training ramp, grade caps, promotion, Steve Gates | not-started |
| P3 upgradable desks | not-started |
| P4 missions badge UX | not-started |
| P5 companies: parody names, renames, soft caps, multi-project | not-started |
| P6 debt | not-started |
| P7 international expansion + world map + country themes | not-started |
| P8 close-out: i18n audit, docs, PR | not-started |

## 2. In-progress unit

None — P0 scaffolding just landed.

## 3. Decisions & assumptions

All recorded in `docs/decisions.md` (14 entries); balance curves in
`docs/balance.md`. No open questions.

## 4. Next action

Start the schema rework unit: edit `src/game/types.ts` — add `CountryId`,
`CountryDef`, `CountryState`, `TimedAction(Kind)`, extend
`CompanyState` (purchasePrice, renameCount, projectSlots, floorProjects,
timedActions), `WorkerState.timesTrained` (drop `training`), rework
`GameState` to `countries`/`activeCountryId` + global layer. Then data.ts
(COUNTRIES + new constants from docs/balance.md), engine.ts (country
accessors, tick over countries, timed-action loop), save.ts (beta reset),
tutorial (choose-country step), story/missions helpers over countries,
minimal ui.ts adaptation, i18n keys, fix tests.

## 5. Build health

`npm test`: green (baseline, pre-changes). `npm run build`: green (baseline).
