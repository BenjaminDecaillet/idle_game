# Specifications — Idle Silicon Valley

Technical specification of the game as implemented. Stack decision (2026-07): **TypeScript + Vite PWA** instead of Godot, so one codebase runs on phones (installable PWA) and the web, and can be built/tested headlessly in CI.

## Table of Contents

- [Project structure](#project-structure)
- [Core game model](#core-game-model)
- [Game rules](#game-rules)
- [Persistence](#persistence)
- [UI](#ui)
- [Deployment](#deployment)

## Project structure

```
idle_game/
├── index.html                 # single page, PWA meta tags
├── vite.config.ts             # base path + vite-plugin-pwa manifest
├── public/                    # favicon.svg, icon-192/512.png
├── scripts/gen-icons.mjs      # regenerates PNG icons from favicon.svg
├── src/
│   ├── main.ts                # bootstrap: load save, rAF game loop, autosave
│   ├── style.css              # dark startup-dashboard theme
│   ├── game/                  # PURE logic — no DOM access
│   │   ├── types.ts           # all interfaces (GameState, WorkerState, …)
│   │   ├── data.ts            # balance data: tiers, stations, projects, upgrades
│   │   ├── engine.ts          # tick(), derived values, player actions, autoSeat
│   │   ├── save.ts            # localStorage save/load, migrate, offline progress
│   │   └── format.ts          # number/money/duration formatting (1.23M …)
│   └── ui/
│       ├── ui.ts              # HUD + hero + 5 tabs, event delegation
│       └── fx.ts              # canvas confetti, floating "+$", WebAudio synth
├── tests/                     # vitest unit tests for src/game
└── .github/workflows/deploy.yml  # test + build + deploy to GitHub Pages
```

## Core game model

### Entities

| Entity | State | Defined in |
|---|---|---|
| Company | `GameState` — money, totals, settings, entity lists | `types.ts` |
| Worker | tier, specialization, skill level, experience, desk | `WorkerState` |
| Workstation | instance of a workstation type | `WorkstationState` |
| Project | unlocked, progress, completions, scaled work/reward | `ProjectState` |
| Upgrade | level per upgrade id | `upgrades: Record<string, number>` |

### The tick (single source of truth)

`tick(state, dt)` in `engine.ts`, called every animation frame (dt clamped to 2 s) **and** by offline simulation in 60 s chunks:

1. Pay salaries: `money = max(0, money − totalSalaries·dt)`
2. Add work to the active project: `progress += Σ workerRate · dt`
3. Grant experience to seated workers; handle level-ups
4. Complete the project while `progress ≥ currentWork`: payout, `completions++`, `currentWork ×= workGrowth`, `currentReward ×= rewardGrowth`, progress rolls over (auto-repeat)

Returns `TickEvents` (completions, level-ups) that the UI turns into confetti/sounds — logic never touches the DOM.

## Game rules

- **Worker output**: `baseRate × skillMult × stationMult × globalMult × specBonus`
  - `skillMult = 1 + 0.1·(level−1)`; levels from experience (90 s × 1.5^level per level) or paid training
  - `stationMult`: 0 without a desk; desk multiplier (1×–2.2×), amplified by the Chairs upgrade
  - `globalMult`: Espresso (+10%/lvl) × Fiber (+15%/lvl)
  - `specBonus = 1.5` when worker specialization matches the project
- **Seating**: automatic — workers sorted by potential output take desks sorted by multiplier (`autoSeat`). Runs on hire/fire/buy/project-switch.
- **Salaries**: per-second drain, reduced by HR upgrade (−6%/lvl, floor 40%).
- **Costs**: workstations `base × 1.18–1.22^owned`; upgrades `base × 2.4–3^level` with level caps; training `150 × 4^tierIndex × level²`; candidate reroll ×1.5 each time.
- **Candidates**: 3 rolled at a time, tier pool weighted by what the player can roughly afford.
- **Projects**: 12 defs in `data.ts`, unlock with money; exactly one active; switching is free.
- **Boosts** (monetization delivery, see `docs/monetization.md`): `grantBoost(state, mult, sec, source)` adds a timed output multiplier (max 5 sources, same source extends); counted down inside `tick` with mid-tick expiry pro-rating, so online/offline behave identically. `timeSkip(state, sec)` fast-forwards through real ticks. HUD shows a pulsing 🚀 badge while boosted. Save format v2.

## Persistence

- Auto-save every 10 s + on tab hide/close (`visibilitychange`/`pagehide`) to `localStorage` under `idle-silicon-valley-save`.
- **Offline progress**: on load, elapsed time (capped 24 h) is simulated through the real `tick`, so offline and online rules can never diverge. A "Welcome back" modal shows earnings.
- `migrate()` merges old saves onto a fresh state: new fields get defaults, new projects appear automatically. Bump `SAVE_VERSION` on breaking changes.
- Export/import: base64 save codes (Settings tab).

## UI

- Layout: HUD (money, net income, salaries) → hero card (active project, animated progress bar, ETA) → tab content → fixed bottom tab bar (Projects, Team, Office, Upgrades, Stats). Max width 680 px, safe-area insets, works from small phones to desktop.
- Rendering: hero/HUD update at 60 fps via `textContent` writes; the active tab re-renders at 2 Hz (innerHTML) to refresh costs/affordability. All clicks are delegated via `data-action="verb:arg"` attributes.
- Effects: canvas confetti + floating `+$X` on payouts (throttled), money-counter pop, WebAudio "cha-ching"/click synth. Both toggleable in Settings.
- **Personas** (`src/ui/persona.ts`): every worker/candidate gets a deterministic procedural SVG character (skin/hair/hairstyle from an FNV hash of their seed, shirt color from specialization, accessory from tier — cap/glasses/headphones/crown/halo). The Office tab renders an animated floor: seated personas typing at their desks (CSS keyframes; floor only re-renders on structural changes so animations don't reset), desk-less workers standing in a waiting row. Tapping a persona shows a speech bubble — cosmetic only, core progress never requires tapping.
- **Golden briefcase**: rare optional spawn (first ~1 min, then every 3–7 min, in `main.ts`); tapping it grants `grantBoost(2, 60s, 'event')` + confetti. Optional juice, not core progress.

## Deployment

- GitHub Actions (`deploy.yml`): on push to `master` → `npm ci` → vitest → build → deploy `dist/` to GitHub Pages. Base path `/idle_game/` (override with `VITE_BASE`).
- PWA: `vite-plugin-pwa` generates the service worker (offline capable, auto-update) and manifest; installable on iOS/Android/desktop.
