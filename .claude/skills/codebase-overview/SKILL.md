---
name: codebase-overview
description: Architecture map of Idle Silicon Valley - directories, key modules, data flow, naming conventions, troubleshooting table. Invoke when orienting in the codebase or debugging, instead of reading many files to reconstruct the structure.
---

# Codebase overview

TypeScript PWA, Vite, vanilla DOM, vitest; zero runtime dependencies. Core loop: buy workstation → worker auto-seated → work/sec flows into the desk's assigned project → completion pays out and auto-repeats (reward growth soft-caps per site) → upgrade/hire/train/promote/unlock → own the city → expand to a new country. No tapping for core progress; offline progress (24 h cap) reuses the same `tick()`.

## Data flow

`src/main.ts` boots: `loadGame()` (save + offline sim; pre-v10 saves are discarded = beta reset) → builds `UI` → `requestAnimationFrame` loop calling `tick(state, dt)` and `ui.frame()`, autosaving on a timer. All mutation goes through action functions in `engine.ts` returning `string | null` (raw text or an i18n key id — the UI toasts errors through `lookup()`); the UI dispatches them via `[data-action="verb:arg"]` event delegation (plus `[data-select]` change events for floor→project assignment) and renders state read-only.

## State shape (v10)

`GameState` holds the **global** layer: `countries: CountryState[]` + `activeCountryId`, lifetime totals, VsCoin (+ledger, +`globalUpgrades`), missions, story, tutorial, cosmetics, avatar, settings, boosts, `freeFastForwards`/`floorGiftClaimed` (Gabriel's floor-gift counters). Each `CountryState` is an **independent economy**: `money` (can be < 0 = debt), companies, per-country totals, used parody names, `builders` (the construction pool — "Workers" in the UI, deliberately distinct from `WorkerState` employees) and country-level `timedActions` (company-build). Companies own workers/desks/projects/cash-upgrades and `timedActions` (training / promotion / desk-upgrade / floor-build). Every in-flight timed action occupies one builder — availability is derived via `freeBuilders()`, never stored (see the add-timed-action skill). Floors and company foundings are timed constructions: pay on start, effect on completion, VsCoin fast-forwardable.

## src/game/ — pure logic (no DOM, timers, or ambient randomness)

- `types.ts` — `GameState`, `CountryState`, `CompanyState`, `TimedAction` and nested types
- `engine.ts` — `tick()` (per-country: salaries+debt, per-project work, XP with grade caps, timed actions at company AND country level, soft-capped completions), `createInitialState()`/`createCountry()`, all player actions, country accessors (`activeCountry`, `allCompanies`, `walletMoney`), builder pool (`freeBuilders`/`builderCost`/`hireBuilder`), shop (`shopPackCash`/`buyShopPack`, `claimVsCoinPack`), `SAVE_VERSION` (top of file, currently v10), company-tier cost scaling (`companyCostScale`/`companySalaryScale` — capital costs & salaries scale with the owning company's league, docs/balance.md Phase S)
- `data.ts` — ALL balance numbers: projects, upgrades, workers (tier `maxSkill`), floors, missions, story rewards, countries (+parody name pools), debt/promotion/fast-forward/soft-cap constants, builder ladder, construction durations, `SHOP_CASH_PACKS`/`VSCOIN_PACKS`/`BETA_FREE_IAP`
- `save.ts` — serialize + beta-reset gate + `migrate()` (same-version hygiene merge; see bump-save-version skill)
- `missions.ts` — progress derived from durable counters aggregated across countries; VsCoin only via `grantVsCoin`/`spendVsCoin` (audited ledger with source/sink tags)
- `story.ts` — one-shot beats on durable milestones (incl. debt + expansion beats); `tutorial.ts` — declarative, skippable step list (incl. choose-country + fast-forward freebie)
- `player.ts` — avatar `look` validation. (Number formatting lives in `src/ui/format.ts` — locale-aware, so it's presentation, not game logic.)

## src/ui/

`ui.ts` (9 tabs incl. Shop — funding rounds — and VsCoin — IAP-shaped SKUs; 2 Hz innerHTML re-render + 60 fps HUD `textContent` writes, `buildSkeleton()` owns HUD ids; missions badge dot; International Business panel in the Map tab; construction states on the Office building and the map site sheet), `officeScene.ts` and `cityMap.ts` (large SVG scenes; `cityMapSvg(themeId, sites, countryId)` with per-country `COUNTRY_THEMES`), `persona.ts` (deterministic per-worker cartoon art), `portraits.ts`/`portraitArt.ts`/`gabrielPortrait.ts` (painted portraits), `itemArt.ts`, `icons.ts`, `fx.ts` (canvas particles/sound), `gabriel.ts` (dialog panel), `coachPlacement.ts` (tutorial popup anchoring).

⚠ The art files are 40–80 KB each. Grep for the builder you need, then Read line ranges — never whole files.

## src/i18n/

`en.ts` (source of truth) · `fr.ts` (type-checked complete against en) · `index.ts` (`t()` for literal keys, `lookup()` for dynamic ones).

## tests/

20 vitest files; they import from `src/game/` only, never `src/ui/`. States are built via `createInitialState()` + public actions; time advances only via `tick()`/`simulateOffline`. Money is set/read via `activeCountry(state).money`.

## Troubleshooting

| Symptom | Where to look |
|---|---|
| Progress not accruing | Worker has no desk (`stationMultiplier` → 0)? Busy in training/promotion (`workerBusy`)? `autoSeat` called after hire/buy? |
| Projects not auto-repeating | `tick()` completion `while` loop and its `guard` cap; reward frozen at the soft cap is intended (plateau) |
| Money draining / negative | Debt is a feature: interest + crisis resignations in `tickCountry` — check `inDebt`/`inDebtCrisis` thresholds |
| Save not loading | Pre-v8 = intentional beta reset (`betaReset: true`); corrupt JSON silently falls back to a fresh game |
| UI stale | Tab content rebuilds at 2 Hz in `ui.frame()`; HUD ids in `buildSkeleton()` |
| PWA not updating on phone | `registerType: 'autoUpdate'` — close all app instances once; check new `sw.js` deployed |
| Wrong asset paths on Pages | `base` in `vite.config.ts` (`/idle_game/`), `VITE_BASE` env for other hosts |
