---
name: codebase-overview
description: Architecture map of Idle Silicon Valley - directories, key modules, data flow, naming conventions, troubleshooting table. Invoke when orienting in the codebase or debugging, instead of reading many files to reconstruct the structure.
---

# Codebase overview

TypeScript PWA, Vite, vanilla DOM, vitest; zero runtime dependencies. Core loop: buy workstation → worker auto-seated → work/sec flows into the active project → completion pays out and auto-repeats → upgrade/hire/unlock. No tapping for core progress; offline progress (24 h cap) reuses the same `tick()`.

## Data flow

`src/main.ts` boots: `loadGame()` (save + offline sim) → builds `UI` → `requestAnimationFrame` loop calling `tick(state, dt)` and `ui.frame()`, autosaving on a timer. All mutation goes through action functions in `engine.ts` returning `string | null`; the UI dispatches them via `[data-action="verb:arg"]` event delegation and renders state read-only.

## src/game/ — pure logic (no DOM, timers, or ambient randomness)

- `types.ts` — `GameState` and nested types
- `engine.ts` — `tick()`, `createInitialState()`, all player actions, `SAVE_VERSION` (top of file, currently v7)
- `data.ts` — ALL balance numbers: projects, upgrades, workers, floors, missions, story rewards
- `save.ts` — serialize + `migrate()` (merge-onto-fresh, not versioned steps)
- `missions.ts` — progress derived from durable counters; VsCoin only via `grantVsCoin`/`spendVsCoin` (audited ledger with source/sink tags)
- `story.ts` — one-shot beats on durable milestones; `tutorial.ts` — declarative, skippable step list
- `player.ts` — avatar `look` validation; `format.ts` — number formatting

## src/ui/

`ui.ts` (tabs, 2 Hz innerHTML re-render + 60 fps HUD `textContent` writes, `buildSkeleton()` owns HUD ids), `officeScene.ts` and `cityMap.ts` (large SVG scenes), `persona.ts` (deterministic per-worker cartoon art), `portraits.ts`/`portraitArt.ts`/`gabrielPortrait.ts` (painted portraits), `itemArt.ts`, `icons.ts`, `fx.ts` (canvas particles/sound), `gabriel.ts` (dialog panel), `coachPlacement.ts` (tutorial popup anchoring).

⚠ The art files are 40–80 KB each. Grep for the builder you need, then Read line ranges — never whole files.

## src/i18n/

`en.ts` (source of truth) · `fr.ts` (type-checked complete against en) · `index.ts` (`t()` for literal keys, `lookup()` for dynamic ones).

## tests/

14 vitest files; they import from `src/game/` only, never `src/ui/`. States are built via `createInitialState()` + public actions; time advances only via `tick()`/`simulateOffline`.

## Troubleshooting

| Symptom | Where to look |
|---|---|
| Progress not accruing | Worker has no desk (`stationMultiplier` → 0)? `autoSeat` called after hire/buy? |
| Projects not auto-repeating | `tick()` completion `while` loop and its `guard` cap |
| Save not loading | `migrate()` vs new fields; corrupt JSON silently falls back to a fresh game |
| UI stale | Tab content rebuilds at 2 Hz in `ui.frame()`; HUD ids in `buildSkeleton()` |
| PWA not updating on phone | `registerType: 'autoUpdate'` — close all app instances once; check new `sw.js` deployed |
| Wrong asset paths on Pages | `base` in `vite.config.ts` (`/idle_game/`), `VITE_BASE` env for other hosts |
