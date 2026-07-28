# Idle Silicon Valley — agent notes

Idle game as a TypeScript PWA (Vite, no frameworks). Deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `master`.

## Commands

- `npm run dev` — dev server
- `npm test` — vitest unit tests (must stay green)
- `npm run build` — `tsc --noEmit` (includes `tests/`) + vite build
- `node scripts/gen-icons.mjs` — regenerate PWA PNGs after editing `public/favicon.svg` (needs Chromium at `/opt/pw-browsers/chromium` or `CHROMIUM_PATH`)

## Hard rules

- `src/game/**` is pure logic — no DOM, no timers, no `Math.random()` outside injectable `rand` params. `tick(state, dt)` in `engine.ts` is the single source of progression truth; offline progress = `simulateOffline()` calling `tick`. Never duplicate progression math in the UI.
- Player actions in `engine.ts` return `string | null` (error message or success); UI shows errors as toasts.
- `src/ui/ui.ts` re-renders the active tab at 2 Hz via innerHTML and updates HUD at 60 fps via targeted `textContent`. Clicks use event delegation on `[data-action="verb:arg"]`.
- Changing `GameState` → bump `SAVE_VERSION` and extend `migrate()` in `save.ts`; old saves must keep loading. Use the **bump-save-version** skill.
- Balance values (costs, rates, growth factors) live only in `src/game/data.ts`.
- All user-facing text goes through i18n (`src/i18n/`, EN + FR, compile-checked complete). `src/game/**` stays language-agnostic (ids only). Use the **add-translation** skill.
- Story beats and missions trigger only on durable state (counters, ownership) — never transient flags, or offline simulation skips them. VsCoin moves only through `grantVsCoin`/`spendVsCoin`. Use the **add-story-beat** / **add-mission** skills.
- SVG art has strict conventions (deterministic personas, portrait exception, no filters). Read the **art-svg** skill before touching any art builder in `src/ui/`.

## Orientation

Invoke the **codebase-overview** skill instead of reading files to reconstruct the architecture; delegate searches to the **explore** agent and test/build runs to the **test-runner** agent. `docs/plan.md` = roadmap (keep its status updated when finishing features); `docs/improvements.md` = backlog. Keep `.claude/skills/` accurate when the underlying systems change.

# Compact instructions

When compacting, preserve: the current task and acceptance criteria; which files were edited and why; failing tests with exact failure text; any in-flight `SAVE_VERSION`/`migrate()` change; i18n keys still missing their EN or FR entry. Drop: contents of files already committed, passing test output, and exploration dead ends.
