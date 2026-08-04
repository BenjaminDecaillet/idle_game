# Improvement backlog — curated & prioritized

Re-baselined 2026-08-03 against master after the v9 workforce/shop update
(PR #6) and the beta force-refresh fix (PR #7). Ordered globally by
impact ÷ effort with dependencies respected; the top tier is what I'd build
next, in order. Roadmap TODOs that need external accounts or SDKs
(analytics, ads, real IAP, Capacitor) live in `plan.md`/`monetization.md`
and are not repeated here.

**Shipped 2026-08-03** (PRs #7–#15): beta force-refresh + build stamp,
backlog re-baseline, prestige ("IPO & open-source the dream", no save
wipe), goal-hint chip, offline-earnings doubler (ad-ready placement),
story journal, FR locale number formatting, builders-guild beat +
mission chain, and CI on PRs (vitest + build + Chromium smoke test).

**Why this top tier:** with the retention loop (prestige) and first-hour
guidance shipped, the biggest gaps are now the comeback trigger (daily
contracts feed both retention and the VsCoin economy), full FR coverage
(the i18n sweep unblocks DE later and finishes what locale formatting
started), and cheap gameplay variety (traits, events) that keeps mid-game
sessions fresh. The vault is the strongest monetization mechanic still
missing and reuses existing plumbing.

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

4. **Random events with choices** — "An investor offers $X for 2×
   salaries for 10 min — accept?" Small decision moments break idle
   monotony: an event def table, a timed modifier in `tick`, one dialog on
   the Gabriel surface.

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

15. **Construction art pass** — The in-progress floor is a dimmed block +
    progress bar; a scaffolding/crane illustration (art-svg conventions,
    `officeScene.ts`) and a builder persona on site would sell the fantasy.
    Same for map sites under construction (currently a 🏗️ label prefix).

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

19. **Bespoke per-country city scenes** — v8 ships one parameterized
    renderer (`cityMap.ts` `COUNTRY_THEMES`); fully bespoke scenes per
    country (Swiss lakeside, Riyadh desert highway, Shanghai waterfront)
    are pure data+draw with no engine impact. Big effort, art-only.

## Tech

21. **Balance simulation harness** — A greedy bot through `tick()` printing
    time-to-milestone tables turns curve tuning into a 30-second check;
    validates the "~1 week to Orbital HQ" pacing target. Nearly free
    thanks to engine purity.

22. **Beta exit checklist** — Before real-user testing: flip
    `BETA_FORCE_REFRESH` (decisions.md #17) and `BETA_FREE_IAP`
    (decisions.md, monetization Phase 3) — both in `src/game/data.ts` —
    and re-decide the save-reset policy (CLAUDE.md beta clause). Keep this
    item at the top of any release-prep session.

## Dropped from the previous list

- ~~VsCoin starter bundle as first IAP~~ — superseded: the VsCoin tab ships
  IAP-shaped SKUs behind `BETA_FREE_IAP`; the remaining work is the
  Merchant-of-Record integration tracked in `monetization.md`.
- ~~Tab bar label i18n (old #20)~~ — folded into #20 above (i18n sweep).
- ~~Playwright smoke standalone (old #17)~~ — merged into #7 (CI on PRs).
