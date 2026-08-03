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
- [x] **Multi-company map** (save v3) — found companies at map sites (shared wallet, all companies produce in parallel, per-company teams/projects/upgrades, site output bonus), Map tab to buy/switch
- [x] **Buildings & floors** — 4 desk slots per floor, up to 8 floors per building, floor prices scale with site tier; office tab renders the building floor-by-floor
- [x] **Employee training fix** — replaced the dead-end `150·4^tier·level²` instant training with a timed program (120 s off the floor, +3 levels) costing `baseRate·45·(1+0.15·(lvl−1))`; payback guard test keeps it worthwhile
- [x] **Wallpapers & decor** — 7 wallpapers + 3 map themes bought once with project money, applied per company / player default / map
- [x] **QoL & sinks** — free x1/x2/x4 live speed toggle, marketing campaign (paid 2× boost, extendable), per-company renaming
- [x] **Refonte graphique cartoon** (voir [design-system.md](design-system.md)) — thème « sunny valley » (Baloo 2 embarquée, boutons 3D, cartes crème contours ink) ; carte de ville illustrée cliquable + bottom sheet (`cityMap.ts`, 3 thèmes) ; bureau en coupe dollhouse avec 7 wallpapers-scènes (`officeScene.ts`) ; illustrations d'objets/upgrades/projets + postes spécifiques par workstation + props d'upgrades au rez-de-chaussée (`itemArt.ts`, `persona.ts`) ; set de 30 icônes UI (`icons.ts`), HUD/tab bar redessinés, nouveau favicon/PWA icons
- [x] **Company progression difficulty** — exponential per-company cost multiplier (`COMPANY_COST_GROWTH`), 3 new late-game sites (Seattle/NYC/Orbital, 8 total, new map art), per-site contract scaling (`projectScale`: bigger rewards/unlock costs, sub-linear work), 4 upgrades gated at 2/3/5/7 companies (synergy, mentorship, talent, moonshot)
- [x] **Story + Gabriel tutorial + i18n foundation** (save v4) — 19-beat earnest AGI-dream arc (`story.ts`), skippable/resumable first-launch tutorial with Gabriel persona (`tutorial.ts`, `gabriel.ts`), typed EN/FR i18n layer (`src/i18n/`, auto-detect + settings toggle); veterans' saves skip tutorial & backfill beats
- [x] **Missions + VsCoin** (save v5) — 23 missions in 6 derived-metric chains, claim flow, `grantVsCoin`/`spendVsCoin` audited ledger (monetization-ready hooks), premium sinks (Founder's Aura, Diamond Penthouse, Golden Sprint), Missions tab + HUD badge
- [x] **Founder office + avatar customization** (save v6) — customizable player avatar (`player.ts` + persona art), founder office scene evolving with the global goal (4 stages), richer employee personas (per-tier outfits, more expressions, desk micro-details, blink/bob idle animations)
- [x] **Anchored tutorial coach** — the Gabriel popup anchors next to the element each step explains (pure `placeCoach()` flip/clamp logic, per-step target selectors, pulsing highlight, scroll-into-view) instead of covering the bottom of the screen
- [x] **Painted character portraits** (save v7) — hybrid raster/SVG portrait pipeline (`portraits.ts`): drop-in WebP/PNG cards in `public/portraits/` (see [portraits.md](portraits.md)) with painted SVG placeholders (`portraitArt.ts`, `gabrielPortrait.ts`); employee hash slot mapping, player portrait picker, Gabriel dialog portraits
- [x] **Progression & international expansion** (save v8, beta reset — see [plan-expansion.md](plan-expansion.md), [balance.md](balance.md), [decisions.md](decisions.md)) — per-country economies (8 countries, starting-country choice, International Business unlock, free travel, +25%/country world bonus), generic timed actions (training/promotion/desk upgrades) with VsCoin fast-forward (first free, tutorial freebie), employee grade caps + promotions, training-duration ramp, Steve Gates scripted first hire, in-place desk renovations, per-project reward soft caps (plateau pushing toward the next company), multi-project floor assignment, parody company auto-naming per country + escalating paid renames (cash + VsCoin), debt with interest/crisis resignations/Gabriel warnings, missions badge dot + new promotion/country mission chains, per-country city-map themes
- [x] **Workforce, timed expansion & shop** (save v9, beta reset — see [plan-workforce.md](plan-workforce.md), balance.md Phase W, decisions.md 15–16) — per-country builder pool ("Workers" in the UI) gating every timed action with a free/cash/VsCoin purchase ladder, floors and company foundings became timed constructions (country-level timed actions for foundings, VsCoin fast-forwardable, offline-exact), zero output from anything being worked on (desks under renovation auto-unseat), Gabriel's once-per-game free second floor + free fast-forward credit, Shop tab (VsCoin → progression-scaled funding rounds) and VsCoin tab (IAP-shaped SKUs, free unlimited starter behind `BETA_FREE_IAP`)
- [x] **Beta delivery fix** — `BETA_FORCE_REFRESH` (decisions.md #17): aggressive service-worker update checks + silent save-and-reload so every deploy reaches installed PWAs within ~1 min; build stamp (sha + date) in Settings
- [ ] **Monetization Phase 0** — analytics (PostHog/Plausible) + privacy policy → see [monetization.md](monetization.md)
- [x] **Shop/Boost tab** — closed by the workforce/shop update above: Shop + VsCoin tabs over `spendVsCoin`/`grantVsCoin`; the rewarded-ad boost offers still plug in via `grantBoost`/`timeSkip` when Phase 2 starts
- [ ] **Rewarded ads** — portal SDK (CrazyGames/Poki) or H5 Games Ads + consent banner
- [ ] **Web IAP** — Founder Edition / Starter Pack via a Merchant of Record
- [x] **Prestige** ("IPO & open-source the dream") — post-epilogue reset banking permanent Reputation from all-time earnings (`1 + 0.5·√rep` output multiplier, docs/balance.md Phase P, decisions.md #18); keeps VsCoin/cosmetics/story, restarts from the garage; epilogue beat `new-venture`
- [ ] **Achievements** (first hire, $1M, 100 completions…) with small permanent bonuses
- [ ] **Statistics graphs** — money-over-time sparkline on the Stats tab
- [ ] **Random events** — "Investor visit: 2× output for 60 s", outage debuffs
- [x] **Multiple concurrent projects** — project slots unlocked by building height; upper floors assignable to their own projects (v8 expansion)
- [ ] **Worker traits** — rare candidates with quirks (night owl, coffee addict)
- [ ] **Cloud saves** — optional backend or Google Drive sync
- [ ] **Capacitor wrapper** — App Store / Play Store with AdMob + RevenueCat (monetization Phase 4)
- [ ] **i18n** — EN/FR done for story/tutorial/missions/settings via `src/i18n/`; remaining: migrate the rest of the UI strings + DE (see improvements.md #16)
- [ ] **Lighthouse pass** — PWA/perf/a11y audit on the deployed URL

## Engineering conventions

See `CLAUDE.md`: pure logic in `src/game`, all balance in `data.ts`, save policy = beta reset (pre-v8 saves discarded with a translated notice; same-version hygiene only — see the bump-save-version skill), tests must stay green (`npm test`), CI deploys `master` to Pages.
