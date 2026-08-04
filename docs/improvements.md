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

19. ~~**Bespoke per-country city scenes**~~ — first wave shipped: Swiss
    lakeside, Saudi desert highway and Shanghai waterfront via a
    `backdrop` theme hook, interactive geometry untouched (decisions.md
    #37). The other five countries can follow with the same hook —
    pure content work.

## Tech

21. ~~**Balance simulation harness**~~ — shipped: greedy bot through
    tick() with always-on CI pacing guards + `npm run balance:sim`
    tables (balance.md Phase H, decisions.md #36).

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
