# Improvement backlog — curated & prioritized

Re-baselined 2026-08-04 after the autonomous backlog run (PRs #17–#30):
save v10 (per-floor projects + company-tier cost scaling + beta shop),
the Office-first tab layout, the chiptune + chimes, daily contracts,
the full i18n sweep, worker traits, random events, the piggy vault,
site specialization, office pets, builder-chip + confetti polish, the
construction art pass, the balance harness, and the first wave of
bespoke city scenes. Everything actionable without external
accounts/SDKs is shipped; what remains below is either external-infra
(push, ads, IAP, analytics — see plan.md/monetization.md), the
deliberately-untouched beta exit checklist, or same-pattern content
follow-ups (more bespoke scenes, more pets/cosmetic waves).

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

14. ~~**Cosmetic-first premium catalog**~~ — first wave shipped: four
    zero-power office pets (VsCoin, global ownership, per-company pick,
    staff-room pet corner + lobby companion — decisions.md #33). App
    icon colors / map weather remain future waves.

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

23. **Earned automation** — auto-restart training, auto-hire, auto-buy
    desks as mission/milestone rewards, VsCoin early-unlock tier that
    sells convenience-speed, not power (Antimatter Dimensions pattern).
    Engine flags live in `tick()` so offline simulation gets them free.

24. **Ownership milestone multipliers** — stepped output bonuses at
    25/50/100 desks/employees per company; converts the smooth decay
    curve into a goal staircase and feeds missions durable counters
    (Pecorella Part II). Needs balance-designer before numbers land.

25. ~~**Payback-time on purchase buttons**~~ — promoted to an immediate
    implementation pick of the survey (shipping as its own feat branch).

26. **Quarterly market seasons** — deterministic boom/stable/crunch/
    recovery cycle from elapsed game time inside `tick()`, multiplying
    sector payouts; offline-safe, no randomness (Kittens Game seasons).

27. **App badge for finished timers** — `navigator.setAppBadge(n)` with
    completed-but-unseen timed actions + claimable missions on
    visibilitychange; no permission prompt, no backend; clear on focus.

28. **Recruiters tier** — producer-of-producers: recruiting capacity
    generates candidates/junior hires over time for late-game bulk
    (Swarm Simulator chain). Pairs with #23.

29. **Market-scouting expeditions** — timed action before a country
    unlock returning a "market report" (flavor + economy modifiers
    preview); makes expansion an authored chapter opening (Level13).

30. **Deep prestige: differentiated exits + founder points** —
    Acquisition/IPO/spin-off exit types keyed to different durable
    metrics, awarding allocatable respec-able perk points (Evolve +
    Trimps). Post-1.0; current single prestige stays until then.

31. **Viral-moment clickables** — presence-gated short-lived bonus
    events (golden-cookie analog) via injectable rand, online-only by
    design; durable catch counter so missions stay offline-safe.

32. **Scene instancing pass** — `<symbol>`/`<use>` for repeated office
    furniture + persona-seeded negative animation-delay so loops don't
    reset phase across re-renders; do when scenes pass ~20 personas.

33. **Floating "+$" overlay** — pooled spans, transform/opacity only,
    coalesced bursts, big pops reserved for VsCoin/milestones, behind
    prefers-reduced-motion + settings toggle (extends fx.ts bursts).

34. **Reduced-motion & FX toggles** — honor `prefers-reduced-motion`,
    add Animations/Floating-numbers settings, pause scene animation on
    `document.hidden`.

35. **Colorblind redundancy audit** — affordability/mission/rarity
    states must not encode by hue alone (add icons/locks/labels);
    Okabe-Ito palette for categorical accents.

36. **Offline cap as content** — show the 24 h cap honestly in the
    welcome-back modal; later sell/award cap extensions ("cloud
    infrastructure upgrades", Cookie Clicker precedent).

## Dropped from the previous list

- ~~VsCoin starter bundle as first IAP~~ — superseded: the VsCoin tab ships
  IAP-shaped SKUs behind `BETA_FREE_IAP`; the remaining work is the
  Merchant-of-Record integration tracked in `monetization.md`.
- ~~Tab bar label i18n (old #20)~~ — folded into #20 above (i18n sweep).
- ~~Playwright smoke standalone (old #17)~~ — merged into #7 (CI on PRs).
