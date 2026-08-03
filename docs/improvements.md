# Improvement backlog — curated & prioritized

Re-baselined 2026-08-03 against master after the v9 workforce/shop update
(PR #6) and the beta force-refresh fix (PR #7). Ordered globally by
impact ÷ effort with dependencies respected; the top tier is what I'd build
next, in order. Roadmap TODOs that need external accounts or SDKs
(analytics, ads, real IAP, Capacitor) live in `plan.md`/`monetization.md`
and are not repeated here.

**Why this top tier:** prestige converts the finished story arc into the
long-term retention loop the game still lacks — everything else polishes a
game people quit after the arc ends. The next four are small, self-contained
wins that compound the first hour (goal hint), the comeback loop (offline
doubler), perceived content (story journal) and the FR experience
(locale formatting) — each is ≤ half a day and none blocks another. The
tech item (CI smoke + PR checks) protects every future merge and got more
urgent now that deploys auto-refresh every client within a minute.

## Top tier (scheduled: current session, in this order)

1. **Prestige tied to the story epilogue ("Open-source the AGI")** — The
   story ends with the AGI shipped from orbit; prestige is the natural
   sequel and the single biggest retention mechanic missing. Frame the
   reset as "open-source everything and start a new venture with your
   reputation": permanent multiplier from lifetime earnings, keep VsCoin +
   cosmetics + avatar, reset countries/companies. Engine-ready: one action,
   one multiplier in `globalOutputMultiplier`, an epilogue beat, save bump.

2. **Goal arrow / next-best-action hint** — After the tutorial, new players
   face nine tabs. A persistent Gabriel chip ("Next: unlock To-Do App —
   $75") computed from a cheap heuristic (cheapest affordable progression
   step) smooths the first hour. The tutorial engine's predicate style
   generalizes directly.

3. **Offline earnings doubler placement (ad-ready, ad-free today)** — Put
   the future rewarded-ad button in the "Welcome back" modal now as a free
   "×2 with Gabriel's blessing, once per day". Trains the habit loop the
   monetization plan depends on and measures the placement before any SDK.

4. **Story recap journal** — Seen beats are persisted; a "Your story" list
   (Stats tab) lets players re-read beats and shows how much narrative is
   ahead. Trivial (`state.story.seen` × i18n lookup), big perceived-content
   win.

5. **Number formatting locale-awareness** — `format.ts` is hardcoded to
   US-style `$1.2M`. French players should get localized separators via
   `Intl.NumberFormat`. Small, contained, and FR is first-class now.

6. **Story/mission touchpoints for the builder economy** — A Gabriel beat
   on claiming the floor gift (`floorGiftClaimed`, durable) and a small
   mission chain on builders hired across countries tie the v9 systems
   into the narrative + VsCoin faucets. Both triggers are already durable
   state; skipped in the v9 slice purely for scope.

7. **CI: tests on PRs + Playwright smoke test** — Today *nothing* runs on
   PRs (the deploy workflow on master is the only gate) and
   `scripts/smoke-test.mjs` is not wired anywhere. A PR workflow (vitest +
   tsc) plus a smoke run against the built preview would catch "engine
   green but UI broken" regressions before they hit master — which now
   force-refreshes every beta client within a minute of deploy.

## Second tier — gameplay depth

8. **Daily contracts (rotating missions)** — The mission engine is
   metric-driven and can host a "3 contracts today" board seeded from the
   day number (deterministic, day passed in from the UI layer — no
   `Date.now()` in `src/game/**`). The genre's strongest comeback trigger
   and a steady VsCoin trickle that makes premium sinks feel reachable.

9. **Per-company specialization identity** — Companies play identically
   apart from scale. Letting each site favor one specialization (Seattle =
   DevOps contracts +50%) makes founding a build choice and gives the
   spec-match bonus a portfolio-level layer. Pure `data.ts` + one
   multiplier.

10. **Worker traits & rare candidates** — Deterministic trait roll at
    candidate creation (night owl, coffee addict…) with a badge on the
    persona; creates hiring excitement now that candidates have visible
    faces. Engine-pure via the injectable `rand`.

11. **Random events with choices** — "An investor offers $X for 2×
    salaries for 10 min — accept?" Small decision moments break idle
    monotony: an event def table, a timed modifier in `tick`, one dialog on
    the Gabriel surface.

## Second tier — retention & monetization

12. **PWA push notification opt-in at the right moment** — Ask after the
    first offline-earnings modal, never on first launch. Highest-leverage
    re-engagement channel on mobile PWA; needs a tiny backend or
    Notification API + local scheduling first pass.

13. **Piggy-bank vault** — A % of earnings accrues to a capped vault opened
    with VsCoin (later: ad/IAP). Top-converting mechanic of the genre;
    reuses `grantVsCoin`/`spendVsCoin` and the boost-badge UI patterns.

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

17. **Story recap → sound design pass** — `fx.ts` has a tiny synth; story
    beats, mission claims and VsCoin grants deserve distinct chimes
    (angelic arpeggio for Gabriel). Cheap dopamine, no assets.

18. **Confetti/FX on mission claim & tutorial completion** — Route claims
    through `fx.payoutBurst`-style particles at the button position so
    VsCoin feels premium.

19. **Bespoke per-country city scenes** — v8 ships one parameterized
    renderer (`cityMap.ts` `COUNTRY_THEMES`); fully bespoke scenes per
    country (Swiss lakeside, Riyadh desert highway, Shanghai waterfront)
    are pure data+draw with no engine impact. Big effort, art-only.

## Tech

20. **Migrate the remaining UI strings into the i18n layer** — Foundation
    proven; sweep `ui.ts` tab labels (needs a `buildSkeleton()` rebuild
    hook on language change), section titles, toasts and engine error
    strings (map error codes → i18n keys at the toast boundary). Add a CI
    check that `en` keys stay complete. Prereq for DE.

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
