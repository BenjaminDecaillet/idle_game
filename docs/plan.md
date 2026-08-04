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
- [x] **2026-08 retention & guidance batch** (PRs #9–#15, decisions.md #18–#19) — prestige, Gabriel goal chip (`src/game/goals.ts`), offline-earnings doubler (ad-ready), story journal, FR locale formatting (`src/ui/format.ts`), builders-guild beat + builders missions, CI on PRs (vitest + build + Chromium smoke)
- [x] **Per-floor projects + company-tier cost scaling + beta shop** (save v10, beta reset — decisions.md 20–22, balance.md Phase S) — every floor owns its own project slot (the `projectSlots` cap and its unlock are gone; floors are the concurrency unit), all capital costs (desks, hires, training, promotions, desk & cash upgrades, candidate rerolls) and salaries scale with the owning company's league via `companyCostScale`/`companySalaryScale` (garage keeps exact v9 numbers; income-parity base + mild founding-escalation premium on capital costs only), and every VsCoin SKU is a free claim during beta (no dead buttons until real IAP ships)
- [x] **Office-first tab layout** (decisions.md 23–25) — tabs collapse to Map, Office, Shop, VsCoin, Stats; the Office tab drills company list → building → enlarged floor view (desks, employees, floor project slot managed in place); hiring via a candidate bottom-sheet popup; a staff room atop the building holds all upgrades + marketing + decor; missions fold into the VsCoin tab; tutorial/goal hints retargeted; smoke test walks the drill-down
- [x] **8-bit theme song + event chimes** (decisions.md 26, audio-chiptune skill) — "Garage Dreams" chiptune loop synthesized in `fx.ts` (no assets), lookahead-scheduled off the shared AudioContext, music toggle + volume in Settings (off by default, gesture-gated, persisted additively), chimes for story beats / mission claims / VsCoin claims that duck the music (closes improvements #17)
- [x] **Daily contracts** (balance.md Phase D, decisions.md 27) — 3 deterministic delta-progress contracts per UTC day from a data.ts pool (desks entry eligibility-filtered at roll), day computed in main.ts, additive `state.daily` (no reset), claims via `grantVsCoin('daily:<id>')`, board + badge on the VsCoin tab
- [x] **Full i18n sweep** (decisions.md 28) — every ui.ts/main.ts chrome string and tab label through t() (tab bar rebuilds on language change), all ~44 engine error returns migrated to `error.*` ids with tests asserting ids; FR audited; DE unblocked
- [x] **Piggy vault** (balance.md Phase V, decisions.md 31) — 5% of payouts accrue on top into a global, prestige-surviving vault (cap: 2 h of income), opened for 5 VsCoin; HUD chip + Shop card; future ad/IAP opening hook
- [x] **Site specialization** (decisions.md 32) — each paid site favors one specialization: +50% on matching contracts, stacking with the worker spec match; surfaced on the map sheet and contract cards
- [x] **Office pets** (decisions.md 33) — cosmetic-first premium wave: four zero-power VsCoin pets, global ownership, per-company companion in the lobby, staff-room pet corner
- [x] **Polish: builder chip + claim confetti** (decisions.md 34) — persistent free/total builders HUD chip (red when all busy) and confetti bursts on mission/daily/vault claims
- [x] **Construction art pass** (decisions.md 35) — cartoon construction scenes on rising floors (crane, scaffold, builder persona) and crane silhouettes on map sites under construction, theme-neutral
- [x] **Balance simulation harness** (balance.md Phase H, decisions.md 36) — greedy bot through tick(): CI pacing guards + `npm run balance:sim` milestone tables
- [ ] **Monetization Phase 0** — analytics (PostHog/Plausible) + privacy policy → see [monetization.md](monetization.md)
- [x] **Shop/Boost tab** — closed by the workforce/shop update above: Shop + VsCoin tabs over `spendVsCoin`/`grantVsCoin`; the rewarded-ad boost offers still plug in via `grantBoost`/`timeSkip` when Phase 2 starts
- [ ] **Rewarded ads** — portal SDK (CrazyGames/Poki) or H5 Games Ads + consent banner
- [ ] **Web IAP** — Founder Edition / Starter Pack via a Merchant of Record
- [x] **Prestige** ("IPO & open-source the dream") — post-epilogue reset banking permanent Reputation from all-time earnings (`1 + 0.5·√rep` output multiplier, docs/balance.md Phase P, decisions.md #18); keeps VsCoin/cosmetics/story, restarts from the garage; epilogue beat `new-venture`
- [ ] **Achievements** (first hire, $1M, 100 completions…) with small permanent bonuses
- [ ] **Statistics graphs** — money-over-time sparkline on the Stats tab
- [x] **Random events** (balance.md Phase E, decisions.md 30) — 4 live opportunity dialogs with trade-offs (cash vs output vs salary multipliers), engine-pure offers/resolution, UI wall-clock scheduling
- [x] **Multiple concurrent projects** — project slots unlocked by building height; upper floors assignable to their own projects (v8 expansion)
- [x] **Worker traits** (balance.md Phase T, decisions.md 29) — 6 deterministic traits (output/salary/XP multipliers) rolled at candidate creation, rare double-trait candidates with golden cards, badges + trait-aware salaries in the UI
- [ ] **Cloud saves** — optional backend or Google Drive sync
- [ ] **Capacitor wrapper** — App Store / Play Store with AdMob + RevenueCat (monetization Phase 4)
- [x] **i18n** — EN/FR complete for the whole app (story/tutorial/missions/settings + full UI chrome + engine errors); remaining someday: DE
- [ ] **Lighthouse pass** — PWA/perf/a11y audit on the deployed URL

## Engineering conventions

See `CLAUDE.md`: pure logic in `src/game`, all balance in `data.ts`, save policy = beta reset (pre-v8 saves discarded with a translated notice; same-version hygiene only — see the bump-save-version skill), tests must stay green (`npm test`), CI deploys `master` to Pages.
