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
- Save format: bump `SAVE_VERSION` and extend `migrate()` in `save.ts` when changing `GameState` — old saves must keep loading. New projects/upgrades added to `data.ts` appear in old saves automatically via `migrate`. Full checklist: `.claude/skills/bump-save-version`.
- Balance values (costs, rates, growth factors) all live in `src/game/data.ts` — tune there only.
- **i18n** (`src/i18n/`): `en.ts` is the key source of truth, `fr.ts` is compile-checked complete against it. All *new* user-facing text goes through `t()`/`lookup()` with EN **and** FR content. `src/game/**` stays language-agnostic (ids/error strings only; the UI maps ids to keys like `story.<id>.title`). See `.claude/skills/add-translation`.
- **Narrative** — `src/game/story.ts` (one-shot beats on *durable* state milestones, shown as Gabriel dialogs; grants VsCoin) and `src/game/tutorial.ts` (declarative step list, skippable/resumable, persisted). Never trigger narrative from transient flags — offline simulation would skip them. See `.claude/skills/add-story-beat`.
- **Missions & VsCoin** — mission defs in `data.ts` (chains per metric), progress always *derived* from durable counters in `src/game/missions.ts`. All VsCoin movement goes through `grantVsCoin(state, n, source)` / `spendVsCoin(state, n, sink)` (audited ledger; future IAP/ad flows plug in via `source` tags only). See `.claude/skills/add-mission`.
- **Art**: hand-drawn cartoon SVG per `docs/design-system.md` (ink outlines, cel shading, no filters, memoised builders, unique gradient-id prefixes). Employee personas are deterministic-per-worker (`src/ui/persona.ts`, FNV-1a hash + `>>>` shifts — extend with new shifts, never change existing ones). Player avatar is explicit state (`state.player.look`, validated in `src/game/player.ts`). **Exception — character portraits** (`src/ui/portraits.ts`, `docs/portraits.md`): worker/candidate cards, the customizer preview and Gabriel dialogs use painted semi-realistic portraits — raster from `public/portraits/` when present, painted SVG placeholder otherwise (no filters / memoised / unique gradient ids still apply; cartoon ink-outline rules do not).

## Docs

`docs/plan.md` holds the roadmap/todos; keep its status list updated when finishing features. `docs/improvements.md` is the curated future-improvement backlog. Repeatable workflows are documented as skills in `.claude/skills/` (add-story-beat, add-mission, add-translation, bump-save-version) — keep them accurate when the underlying systems change.
