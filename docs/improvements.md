# Improvement backlog — curated & prioritized

Re-baselined 2026-08-05 after the survey-backlog run: everything
actionable from the 2026-08 state-of-the-art survey shipped in one
branch — earned automation, ownership milestones, market seasons,
recruiters, scouting expeditions, viral clickables, deep prestige
(explicitly pulled forward from post-1.0), app badge, offline-cap
honesty, floating-number/reduced-motion FX controls, scene instancing,
the last five bespoke city scenes, pet wave 2 and the colorblind audit
(plus repairing a semantic merge collision from PRs #36/#38 that broke
the build on master). What remains below is external-infra (push, ads,
IAP, analytics — see plan.md/monetization.md) and the
deliberately-untouched beta exit checklist.

Previous re-baseline (2026-08-04, PRs #17–#30): save v10, Office-first
tabs, chiptune + chimes, daily contracts, i18n sweep, worker traits,
random events, piggy vault, site specialization, office pets, polish
passes, balance harness, city scenes wave 1.

## Top tier (next session, in this order)

1. ~~**Daily contracts (rotating missions)**~~ — shipped: 3 delta-progress
   contracts per UTC day seeded from the day number (balance.md Phase D,
   decisions.md #27), rendered atop the VsCoin tab with badge + chime,
   ~2.5–3.5 VsCoin/day realized.

2. ~~**Migrate the remaining UI strings into the i18n layer**~~ — shipped:
   full ui.ts/main.ts chrome sweep (~90 keys incl. tab labels with a
   skeleton rebuild on language change) + all engine errors as
   'error.*' ids (decisions.md #28). SVG signage deliberately stays
   English (diegetic set dressing). DE is now unblocked.

3. ~~**Worker traits & rare candidates**~~ — shipped: 6 traits with
   output/salary/XP multipliers rolled at candidate creation (35% one
   trait, ~2% rare double-trait golden candidates), badges on candidate
   and worker cards (balance.md Phase T, decisions.md #29).

4. ~~**Random events with choices**~~ — shipped: 4 income-scaled offers
   with real trade-offs (salary-multiplier boosts), Gabriel-surface
   dialog with Accept/Pass, wall-clock scheduling (balance.md Phase E,
   decisions.md #30).

5. ~~**Piggy-bank vault**~~ — shipped: 5% of every payout accrues on top
   into a global, prestige-surviving vault capped at 2 h of income,
   opened for 5 VsCoin (balance.md Phase V, decisions.md #31); HUD
   piggy chip + Shop card.

## Second tier — gameplay depth

9. ~~**Per-company specialization identity**~~ — shipped: every paid site
   favors one specialization (+50% on matching contracts, garage stays
   generalist), stacking with the personal spec match (decisions.md
   #32); site sheet + contract cards surface it.

## Second tier — retention & monetization

12. **PWA push notification opt-in** — SKIPPED this session
    (decisions.md #33): real web-push needs a push-service backend
    (VAPID + subscription storage) — external infrastructure; a
    page-open Notification fallback can't re-engage. Revisit with
    monetization Phase 0.

14. ~~**Cosmetic-first premium catalog**~~ — wave 1 (four zero-power
    office pets — decisions.md #33) + wave 2 (goldfish, parrot,
    hedgehog, llama). App icon colors / map weather remain future
    waves.

## Polish

15. ~~**Construction art pass**~~ — shipped: full cartoon construction
    scene on rising floors (crane, scaffold, hard-hat builder) and crane
    silhouettes over map sites under construction (decisions.md #35).

16. ~~**Builder idle visibility**~~ — shipped: persistent HUD chip with
    free/total builders (red when all busy, tap → Office), 60 fps,
    occupancy still derived (decisions.md #34).

17. ~~**Story recap → sound design pass**~~ — shipped with the chiptune
    slice: distinct chimes for story beats (angelic arpeggio), mission
    claims (fanfare) and VsCoin pack claims (sparkle blips), all ducking
    the new theme loop (decisions.md #26).

18. ~~**Confetti/FX on mission claim**~~ — shipped: mission, daily and
    vault claims burst confetti at the button position on top of their
    chimes (decisions.md #34).

19. ~~**Bespoke per-country city scenes**~~ — COMPLETE: wave 1 (CH/SA/CN,
    decisions.md #37) + wave 2 (US bay & bridge, CA lake & peaks, IT
    riviera, FR Seine quay, DE Rhine & castle) — all eight countries
    now have bespoke backdrops on the same hook.
19. ~~**Bespoke per-country city scenes**~~ — complete: every country
    except the US reference map now has a bespoke scene via the
    `backdrop` theme hook, interactive geometry untouched. First wave
    (decisions.md #37): Swiss lakeside, Saudi desert highway, Shanghai
    waterfront. Second wave (decisions.md #38): Canadian lakeshore,
    Venetian canal, Seine quay, Berlin Spree with mural wall.

## Tech

21. ~~**Balance simulation harness**~~ — shipped: greedy bot through
    tick() with always-on CI pacing guards + `npm run balance:sim`
    tables (balance.md Phase H, decisions.md #36).

22. **Beta exit checklist** — Before real-user testing: flip
    `BETA_FORCE_REFRESH` (decisions.md #17) and `BETA_FREE_IAP`
    (decisions.md, monetization Phase 3) — both in `src/game/data.ts` —
    and re-decide the save-reset policy (CLAUDE.md beta clause). Keep this
    item at the top of any release-prep session.

## From the 2026-08 state-of-the-art survey

Source: [idle-game-state-of-the-art.md](idle-game-state-of-the-art.md)
(licences checked there; adapt ideas, never copy code).

23. ~~**Earned automation**~~ — shipped: auto-training/auto-hiring/
    auto-desks unlock at lifetime counters (25/40/75) or a VsCoin
    early-unlock, toggle per company, run inside `tick()` on a 5 s
    cadence with cash/builder reserves (balance.md Phase A).

24. ~~**Ownership milestone multipliers**~~ — shipped at 8/16/32 (the
    32-slot building makes 25/50/100 unreachable): +5/10/15% per track,
    desks × employees tracks multiply; staircase card in the office
    shop (balance.md Phase M).

25. ~~**Payback-time on purchase buttons**~~ — promoted to an immediate
    implementation pick of the survey (shipping as its own feat branch).

26. ~~**Quarterly market seasons**~~ — shipped: 6 h
    stable/boom/crunch/recovery quarters from playTimeSec inside
    `tick()`, boom spec rotating per cycle, cycle mean exactly 1.0;
    HUD season badge (balance.md Phase K).

27. ~~**App badge for finished timers**~~ — shipped: waiting claims
    (missions + dailies) set the icon badge on hide, cleared on return.

28. ~~**Recruiters tier**~~ — shipped: per-company levels widen the
    candidate pool (3+level) and deliver timed candidates
    deterministically (balance.md Phase R).

29. ~~**Market-scouting expeditions**~~ — shipped: a timed action (2%
    of the unlock price, 4 h base) gates every country unlock; the
    market report banks +5% permanent output per scouted market
    (balance.md Phase X).

30. ~~**Deep prestige: differentiated exits + founder points**~~ —
    shipped (pulled forward from post-1.0 by explicit request):
    Acquisition/IPO/Spin-off gates on one shared reset, FP from three
    high-water tracks in delta form, 5-perk respec-able board
    (balance.md Phase F).

31. ~~**Viral-moment clickables**~~ — shipped: wall-clock 🔥 bubbles
    (online-only), income-scaled cash, durable catch counter,
    day-capped VsCoin jackpot (balance.md Phase B).

32. ~~**Scene instancing pass**~~ — shipped: `<symbol>`/`<use>` for
    repeated office furniture + persona-seeded negative
    animation-delay so loops keep phase across 2 Hz re-renders.

33. ~~**Floating "+$" overlay**~~ — shipped: coalesced per-frame payout
    floats, big gold pops on VsCoin claims (missions/dailies/vault),
    behind the new Floating-numbers toggle + prefers-reduced-motion.

34. ~~**Reduced-motion & FX toggles**~~ — shipped: Animations and
    Floating-numbers settings, ambient scene art paused while hidden
    and under `prefers-reduced-motion`.

35. ~~**Colorblind redundancy audit**~~ — shipped: Okabe-Ito spec
    accents, debt warning icon, active-company tag; audit confirmed the
    other states already carry text/icon channels.

36. ~~**Offline cap as content**~~ — shipped: the welcome-back modal
    states the cap honestly, and the Cloud Infrastructure founder perk
    now sells +4 h extensions exactly as this item predicted.

## Dropped from the previous list

- ~~VsCoin starter bundle as first IAP~~ — superseded: the VsCoin tab ships
  IAP-shaped SKUs behind `BETA_FREE_IAP`; the remaining work is the
  Merchant-of-Record integration tracked in `monetization.md`.
- ~~Tab bar label i18n (old #20)~~ — folded into #20 above (i18n sweep).
- ~~Playwright smoke standalone (old #17)~~ — merged into #7 (CI on PRs).
