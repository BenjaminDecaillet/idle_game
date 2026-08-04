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

3. **Worker traits & rare candidates** — Deterministic trait roll at
   candidate creation (night owl, coffee addict…) with a badge on the
   persona; creates hiring excitement now that candidates have visible
   faces. Engine-pure via the injectable `rand`.

4. **Random events with choices** — "An investor offers $X for 2×
   salaries for 10 min — accept?" Small decision moments break idle
   monotony: an event def table, a timed modifier in `tick`, one dialog on
   the Gabriel surface.

5. **Piggy-bank vault** — A % of earnings accrues to a capped vault opened
   with VsCoin (later: ad/IAP). Top-converting mechanic of the genre;
   reuses `grantVsCoin`/`spendVsCoin` and the boost-badge UI patterns.

## Second tier — gameplay depth

9. **Per-company specialization identity** — Companies play identically
   apart from scale. Letting each site favor one specialization (Seattle =
   DevOps contracts +50%) makes founding a build choice and gives the
   spec-match bonus a portfolio-level layer. Pure `data.ts` + one
   multiplier.

## Second tier — retention & monetization

12. **PWA push notification opt-in at the right moment** — Ask after the
    first offline-earnings modal, never on first launch. Highest-leverage
    re-engagement channel on mobile PWA; needs a tiny backend or
    Notification API + local scheduling first pass.

14. **Cosmetic-first premium catalog** — Zero-power VsCoin items before any
    power items: app icon colors, office pets, map weather, avatar
    outfits (customizer exists). Every item doubles as a mission/story
    reward candidate.

## Polish

15. **Construction art pass** — The in-progress floor is a dimmed block +
    progress bar; a scaffolding/crane illustration (art-svg conventions,
    `officeScene.ts`) and a builder persona on site would sell the fantasy.
    Same for map sites under construction (currently a 🏗️ label prefix).

16. **Builder idle visibility** — Show idle vs busy builders persistently
    (HUD chip or Office header is count-only today); optional cosmetic
    "which builder is on it" attribution (engine keeps occupancy derived).

17. ~~**Story recap → sound design pass**~~ — shipped with the chiptune
    slice: distinct chimes for story beats (angelic arpeggio), mission
    claims (fanfare) and VsCoin pack claims (sparkle blips), all ducking
    the new theme loop (decisions.md #26).

18. **Confetti/FX on mission claim & tutorial completion** — Route claims
    through `fx.payoutBurst`-style particles at the button position so
    VsCoin feels premium.

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
