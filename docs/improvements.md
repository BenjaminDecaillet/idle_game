# Improvement backlog — curated & prioritized

Further improvements I (Claude) consider most valuable for Idle Silicon Valley,
after implementing the 2026-07 content update (progression curve, story/tutorial,
i18n, missions/VsCoin, founder office). Ordered by expected impact within each
category; each entry has a one-paragraph rationale. Roadmap TODOs already listed
in `plan.md` (analytics, shop tab, ads, IAP, Capacitor…) are not repeated here.

## Gameplay

1. **Prestige tied to the story epilogue ("Open-source the AGI")** — The story
   now ends with the AGI shipped from orbit; prestige is the natural sequel and
   the single biggest retention mechanic the game lacks. Framing the reset as
   "open-source everything and start a new venture with your reputation"
   (permanent multiplier from `totalEarned`, keep VsCoin + cosmetics + look)
   turns the narrative finale into the start of the long-term loop instead of
   an ending. The engine is ready: one action, one multiplier in
   `globalOutputMultiplier`, a story epilogue beat, save-version bump.

2. **Per-company specialization identity** — All companies currently play
   identically apart from scale. Letting each site favor one specialization
   (e.g. Seattle = DevOps contracts pay +50%) would make founding a company a
   build choice, justify keeping different teams, and give the spec-match bonus
   a strategic layer at the portfolio level. Pure `data.ts` + one multiplier.

3. **Daily contracts (rotating missions)** — The mission engine is metric-driven
   and could support a "3 contracts today" board seeded from the day number
   (deterministic, no backend). Daily goals are the genre's strongest
   comeback trigger and would feed the VsCoin economy a steady trickle that
   makes the premium sinks (aura levels, future cosmetics) feel reachable.

4. **Worker traits & rare candidates** — Already on the roadmap, but worth
   raising in priority now that candidates have visible personas: a "night owl"
   badge on a rare candidate the player pays extra for creates hiring
   excitement. Deterministic trait roll at candidate creation keeps it pure.

5. **Random events with choices** — "An investor offers $X for 2× salaries for
   10 min — accept?" Small decision moments break the idle monotony and are
   cheap: an event def table, a timed modifier in `tick`, one dialog. Reuse the
   Gabriel dialog surface so events feel like story moments.

## Retention & UX

6. **Offline earnings doubler placement (ad-ready, ad-free today)** — The
   "Welcome back" modal should already contain the future rewarded-ad button as
   a free "×2 with Gabriel's blessing, once per day" button. It trains the
   habit loop the monetization plan depends on, and measures engagement with
   the placement before any SDK is integrated.

7. **Goal arrow / next-best-action hint** — After the tutorial, new players
   still face six tabs. A small persistent Gabriel chip ("Next: unlock To-Do
   App — $75") computed from a simple heuristic (cheapest affordable
   progression step) would smooth the first hour. The tutorial engine's
   predicate style generalizes directly to this.

8. **PWA push notification opt-in at the right moment** — Ask after the first
   offline-earnings modal ("Want a ping when your team fills the vault?").
   Highest-leverage re-engagement channel on mobile PWA; must never fire on
   first launch (per the monetization doc's own guidance).

9. **Number formatting locale-awareness** — `format.ts` is hardcoded to
   US-style `$1.2M`. With FR now a first-class language, French players should
   see `1,2 M$` (or keep `$` but localized separators via `Intl.NumberFormat`).
   Small, contained, and the i18n layer makes it a natural next step.

## Monetization (builds on the new VsCoin ledger)

10. **VsCoin starter bundle as the first IAP** — The `grantVsCoin(source)`
    ledger was designed so a Merchant-of-Record webhook can call
    `grantVsCoin(state, n, 'iap:starter')` and be fully auditable/restorable.
    A small VsCoin bundle + the existing exclusive sinks (aura, diamond
    penthouse, golden sprint) is a complete, respectful first catalog without
    designing anything new.

11. **Cosmetic-first premium catalog** — Expand VsCoin sinks with zero-power
    items before any power items: app icon colors, office pets (cat on a desk),
    map weather, avatar outfits/accessories (the customizer already exists).
    Cosmetics monetize whales without hurting balance, and every item doubles
    as a mission/story reward candidate.

12. **Piggy-bank vault** — A % of earnings accrues to a capped vault opened
    with VsCoin (later: ad/IAP). Top-converting mechanic of the genre, and it
    reuses `grantVsCoin`/`spendVsCoin` and the boost-badge UI patterns.

## Polish

12b. **Bespoke per-country city scenes** — The 2026-08 expansion ships one
    parameterized city renderer (`cityMap.ts` `COUNTRY_THEMES`: palette
    overrides + skyline silhouette + 2–3 landmarks per country). The natural
    next step is fully bespoke scenes per country — different street grids,
    river shapes and site architecture (a Swiss lakeside, a Riyadh desert
    highway, a Shanghai waterfront). The extension point is documented above
    `COUNTRY_THEMES`; each scene is pure data+draw code with no engine impact.

13. **Story recap journal** — Seen beats are already persisted; a "Your story"
    list (Stats tab or the founder office card) lets players re-read beats and
    shows newcomers how much narrative is ahead. Trivial to build
    (`state.story.seen` × i18n lookup), big perceived-content win.

14. **Sound design pass** — `fx.ts` has a tiny synth; story beats, mission
    claims, and VsCoin grants deserve distinct chimes (angelic arpeggio for
    Gabriel). Cheap dopamine, no assets needed.

15. **Confetti/FX on mission claim & tutorial completion** — The claim flow
    currently toasts; routing it through `fx.payoutBurst`-style particles at
    the button position would make VsCoin feel premium.

## Tech

16. **Migrate the remaining UI strings into the i18n layer** — The foundation
    is proven (story/tutorial/missions/settings run through it). Sweep
    `ui.ts`'s tab labels, section titles, toasts and engine error strings
    (map error codes → i18n keys at the toast boundary) to reach full FR
    coverage; add a CI check that `en` keys stay sorted/complete.

17. **Playwright smoke test in CI** — `scripts/smoke-test.mjs` exists but is
    not wired into the deploy workflow. Running it against the built preview on
    every push to master would catch "engine green but UI broken" regressions
    (the class this update's tab/modal work is most exposed to).

18. **Balance simulation harness** — A small script that plays a greedy bot
    through `tick()` (hire when affordable, buy best ROI upgrade…) and prints
    time-to-milestone tables would turn curve tuning (company costs,
    projectScale) from guesswork into a 30-second check. The engine's purity
    makes this nearly free to build, and it would validate the "~1 week to
    Orbital HQ" pacing target.

## Workforce & shop follow-ups (post-v9)

19. **Story/mission touchpoints for the builder economy** — A Gabriel beat
    when the floor gift is claimed (`floorGiftClaimed`, durable) and/or a
    small mission chain on `builders.count` across countries would tie the
    new systems into the narrative + VsCoin faucets. Skipped in the v9
    slice to keep scope; both triggers are already durable state.

20. **Tab bar label i18n needs a skeleton rebuild on language change** —
    The new Shop/VsCoin tabs kept hardcoded EN labels like the existing
    seven because `buildSkeleton()` runs once at boot; switching language
    mid-session cannot re-label tabs without a rebuild hook. Fold into #16.

21. **Construction art pass** — The in-progress floor renders as a dimmed
    floor block + progress bar; a proper scaffolding/crane illustration
    (art-svg conventions, `officeScene.ts`) and a builder persona on site
    would sell the fantasy. Same for sites under construction on the city
    map (currently a 🏗️ label prefix).

22. **Builder idle visibility** — Show idle vs busy builders somewhere
    persistent (HUD chip or Office header is count-only today); consider a
    per-action "which builder" attribution purely cosmetically (engine
    keeps occupancy derived).
