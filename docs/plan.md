# Implementation plan, status & roadmap

## Status of the original 5-phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 — Setup & data structures | Project scaffold, types, balance data | ✅ done (TypeScript/Vite instead of Godot) |
| 2 — Game logic | tick loop, payouts, salaries, XP, save/load, offline progress | ✅ done, unit-tested |
| 3 — UI | HUD, hero project card, 5 tabs, dialogs, real-time updates | ✅ done |
| 4 — Balance & content | 12 projects, 6 worker tiers, 4 specializations, 5 upgrades, spec-match bonus, training | ✅ done (first pass — needs playtest tuning) |
| 5 — Polish | dark theme, animations, particles, sounds, tooltips-in-cards, settings, offline modal, export/import | ✅ done |

## How to test (for Benjamin)

1. **Local:** `npm install && npm run dev` → open the printed URL. On a phone in the same network: `npm run dev -- --host` and open `http://<your-ip>:5173`.
2. **Deployed:** merge/push to `master`, enable *Settings → Pages → Source: GitHub Actions* once, then open `https://benjamindecaillet.github.io/idle_game/`. Add to Home Screen on your phone for the app experience.
3. **What to check first:** hire an Intern (Team tab), buy a Basic Desk (Office tab) — the Landing Page project starts filling and auto-repeats with confetti on payout. Close the tab, come back later → "Welcome back" modal with offline earnings.

## Balance smoke-values

Start: $50 → Intern ($25) + Basic Desk ($20) ≈ 0.5 work/s → first payouts within ~1 min. Early game targets: first Junior at ~3 min, first project unlock at ~5 min. If it feels too slow/fast, tune only `src/game/data.ts`.

## Roadmap / TODOs (in suggested order)

- [ ] **Playtest & balance tuning** — adjust `data.ts` values after real play sessions
- [x] **Monetization groundwork** — timed boosts (`grantBoost`), `timeSkip`, HUD boost badge, save migration (v2), dev console API (`isv.boost/skip`)
- [x] **Personas & interactivity** — procedural SVG characters (deterministic per worker), animated office floor (typing at desks, standing when desk-less), tap-to-poke speech bubbles, golden briefcase tap bonus (2× 60s via `grantBoost` 'event'), money pop on payouts
- [ ] **Monetization Phase 0** — analytics (PostHog/Plausible) + privacy policy → see [monetization.md](monetization.md)
- [ ] **Shop/Boost tab** — UI for boost & time-skip offers over the existing engine hooks (mock "ad" in dev)
- [ ] **Rewarded ads** — portal SDK (CrazyGames/Poki) or H5 Games Ads + consent banner
- [ ] **Web IAP** — Founder Edition / Starter Pack via a Merchant of Record
- [ ] **Prestige** ("IPO & found a new startup"): reset for permanent multiplier based on `totalEarned`
- [ ] **Achievements** (first hire, $1M, 100 completions…) with small permanent bonuses
- [ ] **Statistics graphs** — money-over-time sparkline on the Stats tab
- [ ] **Random events** — "Investor visit: 2× output for 60 s", outage debuffs
- [ ] **Multiple concurrent projects** — one active project per specialization team
- [ ] **Worker traits** — rare candidates with quirks (night owl, coffee addict)
- [ ] **Cloud saves** — optional backend or Google Drive sync
- [ ] **Capacitor wrapper** — App Store / Play Store with AdMob + RevenueCat (monetization Phase 4)
- [ ] **i18n** — EN/FR/DE
- [ ] **Lighthouse pass** — PWA/perf/a11y audit on the deployed URL

## Engineering conventions

See `CLAUDE.md`: pure logic in `src/game`, all balance in `data.ts`, saves must migrate, tests must stay green (`npm test`), CI deploys `master` to Pages.
