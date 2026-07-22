# Idle Silicon Valley

An idle/incremental game where you build the greatest tech company: hire workers, buy them desks, ship software projects, and earn money — even while you're away.

**Stack:** TypeScript + Vite, installable **PWA** (works on phones and desktop browsers). No frameworks, no runtime dependencies.

```
Buy workstation
→ Assign worker (automatic seating: best worker gets the best desk)
→ Worker contributes work/sec to the active project
→ Project completes → money payout → project auto-repeats & scales
→ Upgrade / hire / unlock
→ Repeat
```

> Projects auto-repeat once unlocked. **No tapping for core progress.**

## Play it

- **Web / phone:** deployed automatically to GitHub Pages on every push to `master` → `https://benjamindecaillet.github.io/idle_game/`
  (first time: enable Pages in repo *Settings → Pages → Source: GitHub Actions*)
- **On a phone:** open that URL, then "Add to Home Screen" — it installs like a native app, runs fullscreen, and works offline.

## Development

```bash
npm install
npm run dev        # local dev server (http://localhost:5173)
npm test           # unit tests (vitest)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

## Game features

- **Core loop** — workers generate work/sec into the active project; completed projects pay out and auto-repeat with exponential scaling (+13–17% work, +10% reward per completion).
- **Team** — 6 worker tiers (Intern → Principal Engineer), 4 specializations with a **1.5× bonus** when a worker's specialization matches the active project. Workers gain experience and level up (+10% output per level); training them costs money but is instant.
- **Office** — 4 workstation types with output multipliers. Workers without a desk produce nothing; seating is optimized automatically.
- **Projects** — 12 projects from "Landing Page Refresh" to "AGI Research Lab", unlocked with money.
- **Upgrades** — 5 global upgrades (output, XP rate, salary reduction, desk bonuses).
- **Economy** — salaries drain money every second; income must outpace payroll.
- **Offline progress** — up to 24h of progress simulated with the exact same engine rules when you come back.
- **Saves** — auto-save every 10s to localStorage, plus export/import via save codes.
- **Nice graphics** — dark startup-dashboard theme, glassmorphism cards, animated gradient progress bars, confetti + floating "+$" payout effects, synth sound feedback.

## Repository layout

```
src/game/    engine (pure logic, fully unit-tested): types, data, engine, save, format
src/ui/      rendering, tabs, effects (canvas particles + WebAudio)
src/main.ts  game loop bootstrap
tests/       vitest unit tests for the engine
public/      PWA icons + favicon
docs/        specs, implementation plan, agent instructions
```

See [docs/specs.md](docs/specs.md) for the architecture, [docs/plan.md](docs/plan.md) for the implementation plan, status and roadmap, and [docs/monetization.md](docs/monetization.md) for the monetization strategy (rewarded ads, IAP, store releases).
