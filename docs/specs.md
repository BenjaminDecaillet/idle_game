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
| Game | `GameState` — countries, global lifetime totals, VsCoin, story/missions, cosmetics, settings | `types.ts` |
| Country | `CountryState` — own money (may be < 0 = debt), companies, per-country totals, used parody names, builder pool, country-level timed actions | `CountryState` |
| Company | site, floors, teams/desks/projects, upgrades, timed actions, rename/slot state | `CompanyState` |
| Worker | tier (grade cap), specialization, skill, experience, desk, timesTrained, promotions | `WorkerState` |
| Builder pool | count of construction workers per country ("Workers" in the UI; occupancy derived from in-flight timed actions) | `BuilderState` |
| Workstation | instance of a workstation type (upgradable in place) | `WorkstationState` |
| Project | unlocked, progress, completions, scaled work/reward (soft-capped) | `ProjectState` |
| Timed action | training / promotion / desk-upgrade / floor-build (company level) · company-build (country level) | `TimedAction` |
| Upgrade | level per upgrade id (cash = per company; VsCoin = global) | `upgrades` / `globalUpgrades` |

### The tick (single source of truth)

`tick(state, dt)` in `engine.ts`, called every animation frame (dt clamped to 2 s) **and** by offline simulation in 60 s chunks. Every country advances in parallel:

1. Pay salaries from the country wallet — the balance **can go negative** (debt). While negative: interest compounds (`DEBT_INTEREST_PER_SEC`), the balance is clamped at a salary-scaled cap, and past the crisis threshold one employee resigns per interval (never the country's last; with zero workers the debt decays instead so recovery is always possible).
2. Add work per assigned project: each seated worker contributes to their desk's floor project (`floorProjects`, default the company's main project).
3. Grant experience to seated workers; level-ups clamp at the tier's `maxSkill` grade cap.
4. Count down company-level timed actions (training / promotion / desk upgrades / floor builds); apply effects exactly once on completion.
5. Complete projects while `progress ≥ currentWork`: payout to the country wallet + global lifetime totals, growth applies until the per-site reward soft cap, where reward *and* work freeze (plateau → the next company is the way forward).
6. Count down country-level timed actions (company builds); a finished build creates the company (parody-named, active company unchanged).

Returns `TickEvents` (completions, level-ups, trainings/promotions/desk upgrades/floor builds/company builds done, debt resignations) that the UI turns into confetti/toasts — logic never touches the DOM.

## Game rules

- **Worker output**: `baseRate × skillMult × stationMult × globalMult × specBonus`
  - `skillMult = 1 + 0.1·(level−1)`; levels from experience (90 s × 1.5^level per level, capped at the tier's `maxSkill`) or paid training (ramped duration ×1.6 per completed program)
  - `stationMult`: 0 without a desk; desk multiplier (1×–2.2×), amplified by the Chairs upgrade; desks upgrade in place (money + time)
  - `globalMult`: Espresso (+10%/lvl) × Fiber (+15%/lvl) × world bonus (+25% per extra unlocked country) × global VsCoin upgrades
  - `specBonus = 1.5` when worker specialization matches the project
- **Grades & promotion**: each tier has a skill cap (intern 10 → principal 100); at the cap a Promote timed action (0.6× next tier's hire cost, 180 s × 2^tierIndex) moves the worker up a grade keeping their skill.
- **Timed actions & fast-forward**: training, promotion, desk upgrades, floor builds (`CompanyState.timedActions`) and company builds (`CountryState.timedActions`) run through one system ticked in `tick()`; any action can be completed instantly for VsCoin (1 per started 10 min remaining; the first-ever skip and Gabriel's `freeFastForwards` credits are free). See the add-timed-action skill.
- **Builder pool** ("Workers" in the UI): every in-flight timed action occupies 1 builder of the per-country pool; availability is derived (`freeBuilders`), never stored. Ladder: #1 free (Gabriel's gift, i18n-named), #2–#3 cash (2.5k / 250k), #4–#5 VsCoin (8 / 15), #6+ `ceil(12 × 1.8^(n−5))` VsCoin (sink `shop:builder`).
- **Construction**: floors cost their cash price up front and build over `600 s × 1.5^(floorIndex−2) × 1.15^companyIndex` (one per company at a time); company foundings cost cash up front and build over `600 s × 1.6^companiesFounded` (a country's first company is instant; escalation counts pending builds; completion does not switch the active company). Nothing produces while worked on: desks under renovation auto-unseat and output zero, training/promotion targets are off the floor. Gabriel's gift (once per game, first company of the first country): free instant second floor + one free fast-forward credit.
- **Shop**: funding-round packs convert VsCoin → cash into the active country's wallet, scaled `max(floorCash, grossRewardRate × 60 × minutes)` and gated on companies owned (never counted as earnings); the VsCoin tab presents IAP-shaped SKUs — starter free & unlimited while `BETA_FREE_IAP`, larger packs disabled until real payments (sources `shop:<sku>` today, `iap:<sku>` later).
- **Seating**: automatic — workers sorted by potential output take desks sorted by multiplier (`autoSeat`). Runs on hire/fire/buy/project-switch; busy workers (training/promotion) hold no desk.
- **Salaries**: per-second drain, reduced by HR upgrade (−6%/lvl, floor 40%); unpayable wages create debt (see the tick section).
- **Costs**: workstations `base × 1.18–1.22^owned`; upgrades `base × 2.4–3^level` with level caps; training `baseRate·45·(1+0.15·(lvl−1))`; candidate reroll ×1.5 each time; renames cash+VsCoin doubling per rename (first cash rename ≥ purchase price).
- **Candidates**: 3 rolled at a time, tier pool weighted by what the player can roughly afford; during the tutorial the first candidate is always the intern "Steve Gates".
- **Projects**: 12 defs in `data.ts`, unlock with money; one project per unlocked slot (slot 2 at ≥4 floors, slot 3 at 8, paid per site scale); upper floors assignable per project; rewards soft-cap at `baseReward × projectScale × 50`.
- **Countries**: 8 (`COUNTRIES` in data.ts); starting country chosen in the tutorial; owning all 8 city sites unlocks International Business — further countries cost `5e13 × 3^(countries−1)` from the active wallet, travel is free, each country is a fresh economy (companies auto-named from per-country parody pools); VsCoin/missions/story/cosmetics/avatar are global. See the add-country skill.
- **Boosts** (monetization delivery, see `docs/monetization.md`): `grantBoost(state, mult, sec, source)` adds a timed output multiplier (max 5 sources, same source extends); counted down inside `tick` with mid-tick expiry pro-rating, so online/offline behave identically. `timeSkip(state, sec)` fast-forwards through real ticks. HUD shows a pulsing 🚀 badge while boosted. Save format v2.

## Persistence

- Auto-save every 10 s + on tab hide/close (`visibilitychange`/`pagehide`) to `localStorage` under `idle-silicon-valley-save`.
- **Offline progress**: on load, elapsed time (capped 24 h) is simulated through the real `tick`, so offline and online rules can never diverge. A "Welcome back" modal shows earnings.
- **Beta reset policy** (v9): saves below `SAVE_VERSION` are discarded on load with a translated notice (`betaReset` in `LoadResult`); `migrate()` is a same-version hygiene pass only (defaults for new fields, corrupt-value repair, unknown-id cleanup). See the bump-save-version skill.
- Export/import: base64 save codes (Settings tab).

## UI

- Layout: HUD (money, net income, salaries) → hero card (active project, animated progress bar, ETA) → tab content → fixed bottom tab bar (Map, Projects, Team, Office, Upgrades, Shop, VsCoin, Missions, Stats). Max width 680 px, safe-area insets, works from small phones to desktop.
- Rendering: hero/HUD update at 60 fps via `textContent` writes; the active tab re-renders at 2 Hz (innerHTML) to refresh costs/affordability. All clicks are delegated via `data-action="verb:arg"` attributes.
- Effects: canvas confetti + floating `+$X` on payouts (throttled), money-counter pop, WebAudio "cha-ching"/click synth. Both toggleable in Settings.
- **Personas** (`src/ui/persona.ts`): every worker/candidate gets a deterministic procedural SVG character (skin/hair/hairstyle from an FNV hash of their seed, shirt color from specialization, accessory from tier — cap/glasses/headphones/crown/halo). The Office tab renders an animated floor: seated personas typing at their desks (CSS keyframes; floor only re-renders on structural changes so animations don't reset), desk-less workers standing in a waiting row. Tapping a persona shows a speech bubble — cosmetic only, core progress never requires tapping.
- **Golden briefcase**: rare optional spawn (first ~1 min, then every 3–7 min, in `main.ts`); tapping it grants `grantBoost(2, 60s, 'event')` + confetti. Optional juice, not core progress.

## Deployment

- GitHub Actions (`deploy.yml`): on push to `master` → `npm ci` → vitest → build → deploy `dist/` to GitHub Pages. Base path `/idle_game/` (override with `VITE_BASE`).
- PWA: `vite-plugin-pwa` generates the service worker (offline capable, auto-update) and manifest; installable on iOS/Android/desktop.
