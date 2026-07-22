# Idle Silicon Valley — agent notes

Idle game as a TypeScript PWA (Vite, no frameworks). Deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `master`.

## Commands

- `npm run dev` — dev server
- `npm test` — vitest unit tests (must stay green)
- `npm run build` — `tsc --noEmit` (includes `tests/`) + vite build
- `node scripts/gen-icons.mjs` — regenerate PWA PNGs after editing `public/favicon.svg` (needs Chromium at `/opt/pw-browsers/chromium` or `CHROMIUM_PATH`)

## Architecture rules

- `src/game/**` is **pure logic** — no DOM, no timers, no `Math.random()` outside injectable `rand` params where determinism matters. All game rules live here so tests and offline simulation share one code path.
- `tick(state, dt)` in `engine.ts` is the single source of progression truth. Offline progress = `simulateOffline()` which calls `tick` in 60s chunks. Never duplicate progression math in the UI.
- Player actions in `engine.ts` return `string | null` (error message or success). UI shows errors as toasts.
- `src/ui/ui.ts` re-renders the active tab at 2 Hz via innerHTML and updates HUD/hero at 60 fps via targeted `textContent` writes. Clicks use event delegation on `[data-action="verb:arg"]`.
- Save format: bump `SAVE_VERSION` and extend `migrate()` in `save.ts` when changing `GameState` — old saves must keep loading. New projects/upgrades added to `data.ts` appear in old saves automatically via `migrate`.
- Balance values (costs, rates, growth factors) all live in `src/game/data.ts` — tune there only.

## Docs

`docs/plan.md` holds the roadmap/todos; keep its status list updated when finishing features.
