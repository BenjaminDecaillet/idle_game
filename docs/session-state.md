# Session state — progression & expansion build

Branch: `feat/idle-sv-progression-and-expansion` (from master).
Contract: see `.claude/skills/session-handoff/SKILL.md`.

## 1. Phase list

| Item | Status |
|---|---|
| P0 docs + agents + skills | done |
| P0 GameState schema rework + beta reset (v8) | done |
| P2 generic timed actions + fast-forward + tutorial freebie | done (engine + UI + tests/timedActions.test.ts) |
| P1 employees: training ramp, grade caps, promotion, Steve Gates | done (engine + UI + tests/employees.test.ts) |
| P3 upgradable desks | done (engine + Renovations UI + tests/desks.test.ts) |
| P4 missions badge UX | done (badge dot + live toast, offline-safe) |
| P5 companies: parody names, renames, soft caps, multi-project | done (engine + UI: CAP chip, slots+floor selects, paid rename confirm) |
| P6 debt | done (engine + beats + HUD red money + quit toasts + tests/debt.test.ts) |
| P7 international expansion | engine + world panel UI done; per-country city map themes IN PROGRESS (agent editing src/ui/cityMap.ts); countries tests not-started |
| P8 close-out: i18n audit, docs, PR | not-started |

## 2. In-progress unit

Country city-map themes: a subagent is adding `COUNTRY_THEMES` (palette
overrides + skyline + landmarks per country) to `src/ui/cityMap.ts` and
changing `cityMapSvg(themeId, sites, countryId='us')`. After it lands:
update the call site in `src/ui/ui.ts` (`renderMap`) to pass
`activeCountry(s).id`, verify tsc + tests, commit.

## 3. Decisions & assumptions

`docs/decisions.md` + `docs/balance.md`. Since last update: world panel
lives inside the Map tab (section under the city) rather than a separate
tab — fewer structural changes, same information; brief satisfied via the
International Business section with travel/unlock actions.

## 4. Next action

1. Land cityMap country themes (agent) → pass `activeCountry(s).id` at the
   `cityMapSvg(` call in `src/ui/ui.ts` renderMap.
2. Write `tests/countries.test.ts` (test-writer): starting-country choice,
   unlock flow (worldUnlocked gate, escalating cost), travel, per-country
   isolation of money/companies, global VsCoin/missions/story, offline
   parity across countries, world output bonus.
3. Then P8: docs/plan.md + specs.md + improvements.md updates, i18n audit,
   final green, single PR (Angular title).

## 5. Build health

`npm test`: 317/317 green (18 files). `tsc --noEmit`: clean. Last commit:
198d63e (v8 schema rework). Working tree: UI features + 4 new test files
uncommitted (cityMap.ts being edited by agent — do not commit it mid-edit).
