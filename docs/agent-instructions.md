# Agent Instructions for Idle Silicon Valley Development

How to work with an AI agent on this project.

> **v2.0 (July 2026):** the project moved from Godot to a **TypeScript + Vite PWA** so it can be built, unit-tested and deployed headlessly (phones + web from one codebase). The Godot-era instructions were replaced. Phases 1–5 of the original plan are implemented — see `docs/plan.md` for status and the roadmap.

## Project overview

**Game:** Idle Silicon Valley · **Stack:** TypeScript, Vite, vanilla DOM, vite-plugin-pwa · **Type:** Idle/Incremental

Core loop: buy workstation → worker auto-seated → work/sec into active project → completion pays out and auto-repeats → upgrade/hire/unlock.

Key principles (unchanged):
- **No tapping for core progress** — projects auto-repeat
- **Exponential scaling** — work +13–17%, reward +10% per completion; costs grow geometrically
- **Idle-friendly** — offline progress (24 h cap) via the same `tick()` used online

## Ground rules for agents

1. **Pure logic stays in `src/game/`** — no DOM, timers, or ambient randomness. UI in `src/ui/` only renders state and dispatches actions.
2. **One progression code path** — never re-implement earnings math in UI or offline code; extend `tick()`.
3. **Balance lives in `src/game/data.ts`** — tuning requests touch only this file.
4. **Saves must keep loading** — extend `migrate()` in `save.ts` for any `GameState` change; bump `SAVE_VERSION` for breaking changes.
5. **Tests stay green** — `npm test`; add tests in `tests/` for new engine behavior. `npm run build` must pass (it typechecks `tests/` too).
6. **Verify in the browser** — `npm run dev`, or build + `npm run preview`; screenshot mobile (390×844) and desktop widths when changing UI.

## Example prompts

- *Content:* "Add 3 late-game projects after 'AGI Research Lab' in `data.ts` with smooth cost/reward continuation, and a test asserting projects.json ordering by unlockCost."
- *Feature:* "Implement prestige: an `ipo()` action in engine.ts that resets state but grants a permanent output multiplier `1 + log10(totalEarned/1e6)`; migrate old saves; add UI on the Stats tab; unit-test the multiplier math."
- *Balance:* "Early game feels slow — raise Intern baseRate to 0.6 and cut Landing Page baseWork to 25, then update the affected test expectations."
- *UI:* "Add a sparkline of money over the last 10 minutes to the Stats tab; sample in main.ts, render as inline SVG, no new dependencies."
- *Monetization:* "Build the Shop tab from docs/monetization.md Phase 2: three rewarded-ad offers (2× for 4h boost, 1h time skip, free reroll) calling `grantBoost`/`timeSkip` through a `showRewardedAd(placement)` adapter that in dev resolves after a fake 5s countdown; daily cap of 6 stored in GameState (migrate!); unit-test the cap logic."

## Troubleshooting

| Symptom | Where to look |
|---|---|
| Progress not accruing | Worker has no desk (`stationMultiplier` → 0)? `autoSeat` called after hire/buy? |
| Projects not auto-repeating | `tick()` completion `while` loop and its `guard` cap |
| Save not loading | `migrate()` vs new fields; corrupt JSON falls back to a fresh game silently |
| UI stale | Tab content rebuilds at 2 Hz in `ui.frame()`; HUD ids in `buildSkeleton()` |
| PWA not updating on the phone | `registerType: 'autoUpdate'` — close all app instances once; check new `sw.js` deployed |
| Wrong asset paths on Pages | `base` in `vite.config.ts` (`/idle_game/`), `VITE_BASE` env for other hosts |

## Delivery checklist

- [ ] Core loop works without any clicking once a worker + desk exist
- [ ] `npm test` and `npm run build` pass
- [ ] Old saves still load (test with an export code from the previous version)
- [ ] Mobile layout (390 px) and desktop both look right
- [ ] `docs/plan.md` status/roadmap updated
