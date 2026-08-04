# Decisions & assumptions

Autonomous-build decision log. Each entry: the call made and why, so it can
be revisited cheaply.

1. **Beta reset (approved in brief).** `SAVE_VERSION = 8`; any save below 8
   is discarded on load with a friendly translated notice, no migration
   chain. `importSave` of a pre-v8 export throws a translated-at-UI error.
   `CLAUDE.md` + `bump-save-version` skill updated; strict migration does
   not need to return after 1.0 unless decided anew.
2. **Country layer owns the economy.** `CountryState` = money, totalEarned,
   projectsCompleted (per-country stats), companies, activeCompanyId, debt
   bookkeeping, used parody names. Global on `GameState`: lifetime
   totalEarned/projectsCompleted (missions + story feed on these), VsCoin
   (+ledger), missions, story, tutorial, cosmetics, avatar, settings, boosts.
   Boosts stay global (they're premium/marketing rewards; making them
   per-country would punish travel).
3. **Default starting country is `us`** (the game is *Idle Silicon Valley*);
   the tutorial's first real step is the country choice, which rebuilds the
   starting country while no progress exists. Skipping the tutorial keeps US.
4. **Worker `training` field replaced** by the generic timed-action system
   (`CompanyState.timedActions`). A worker is "busy" (off the floor, no
   desk) while targeted by a training or promotion action. ~~Desk upgrades
   do NOT evict the seated worker~~ — reversed by decision 16.
5. **Promotion keeps skill level** and is cheaper than a fresh hire at the
   target tier — the reward for the training grind (see balance.md).
6. **Soft cap = plateau, not decline**: at the per-project reward cap both
   reward and work growth freeze. Declining income reads as a bug.
7. **Multi-project via floor assignment**: desk i sits on floor
   ⌊i/FLOOR_CAPACITY⌋; each floor can be assigned to any unlocked project
   (default: the company's main project); distinct assigned projects ≤
   unlocked slots. autoSeat stays "best worker → best desk"; a worker's
   project follows their desk's floor.
8. **Debt consequence = employees quit** (one per interval past the crisis
   threshold). Projects don't stall separately — quitting already stalls
   output and self-recovers payroll. Debt is clamped (see balance.md) so a
   24 h offline gap never becomes unrecoverable.
9. **Gabriel debt warnings are one-shot story beats** per severity level
   ('debt-first', 'debt-crisis') on durable conditions (balance < 0 /
   crisis active), plus a persistent HUD alarm while in debt. Re-firing
   every episode would require transient flags, which the story system
   forbids.
10. **International Business unlock** = owning all 8 sites in the active
    country's city (checked per country). Further countries cost cash from
    the active country (global VsCoin stays convenience-only); price
    escalates per unlocked country. +25%/country global output bonus is the
    prestige incentive (see balance.md).
11. **Mission completion surfacing = badge dot + live toast** (brief allowed
    popup OR badge). Badge is derived from durable state
    (`claimableMissions().length > 0`) so offline completions surface for
    free; a popup queue would need new persistent state for no extra value.
12. **Parody company names** are proper nouns and stay untranslated; pools
    are per-country in `COUNTRIES` (data.ts). Auto-assignment picks the
    first unused name; exhausted pools fall back to "<Site> Branch".
13. **Rename charges cash AND VsCoin together** (brief: "a cash price and a
    VsCoin price, both escalating per rename").
14. **New-country start is a clean 50-money start** (same as a new game,
    no angel gift — the tutorial is done); the world output bonus is the
    carry-over that keeps it fun.
15. **The builder pool is the single throttle on all progression** (Phase
    W): every timed action — training, promotion, desk upgrades, floor
    construction, company founding — occupies exactly one builder from the
    per-country pool for its duration. Occupancy is derived from the
    in-flight actions (company- and country-level), never stored, so it
    cannot desync across save/load or offline simulation. The pool starts
    at 1 (Gabriel's named gift, `ui.builderGiftName`) so early trainings
    are never blocked; parallelism is what the ladder sells (cash → VsCoin
    → open-ended VsCoin sink, see balance.md Phase W).
15b. **company-build lives on `CountryState.timedActions`** (Phase W): a
    company under construction has no `CompanyState` to carry its action,
    so country-level actions were preferred over a pending-companies list —
    they reuse the exact countdown/completion/fast-forward machinery
    (tickCountry runs both loops; `completeCountryTimedAction` is the
    country-level sibling of `completeTimedAction`). The action stores
    `siteId` + `price`; the parody name is drawn on completion. Founding
    escalation (`companyCost`) counts pending builds so parallel starts
    can't dodge it; `availableSites` hides sites under construction.
    Completion does NOT switch `activeCompanyId` — a build finishing
    mid-play or offline must not yank the player to another office; the
    map + `companyBuildsDone` toast surface the opening. A country's first
    company stays instant (tutorial + prestige restarts).
16. **Nothing produces while it is being worked on** (Phase W, reverses
    the desk half of decision 4): a desk under renovation is a construction
    site — its employee is auto-unseated on start, autoSeat never seats
    anyone there, and stationMultiplier returns 0 for it (defense in
    depth). Training/promotion targets already produced zero via
    workerBusy + autoSeat. Identical in tick() and simulateOffline() by
    construction — the rules live in engine helpers, not the UI.
17. **Beta force-refresh** (`BETA_FORCE_REFRESH` in `src/game/data.ts`):
    the PWA precaches the whole app shell, so an installed app that is only
    ever *resumed* (never cold-started) can serve a stale build for days —
    this is why merged features "didn't arrive" on devices. While the flag
    is true, `src/main.ts` re-checks for a new service worker on every
    focus and every 60 s, and saves + reloads silently the moment an
    updated worker takes control (never on first install). The Settings
    tab shows a build stamp (`__BUILD_SHA__` · `__BUILD_DATE__`, injected
    in `vite.config.ts` from `GITHUB_SHA`/git) to verify which build a
    device runs. Flip the flag to false before testing with real users:
    updates then wait for the next natural reload instead of interrupting
    a session.
18. **Prestige = IPO & open-source the dream** (Phase P, docs/balance.md):
    reputation is banked in delta form against the never-reset all-time
    `totalEarned` (`totalRep(E) - reputation`), so the preview and the
    award share one formula and fractional log-decades carry over across
    resets. The multiplier (`1 + 0.5·√rep`) slots into
    `globalOutputMultiplier` next to aura/world. The reset keeps every
    global layer (VsCoin+ledger, premium upgrades, cosmetics, avatar,
    settings, story-seen, missions-claimed, lifetime counters, Gabriel's
    gifts, finished tutorial) and wipes countries/companies/boosts,
    restarting in the player's original starting country with the default
    company name. `prestige` is an additive, defaultable field —
    **no SAVE_VERSION bump**; same-version saves get `{count:0,
    reputation:0}` from `migrate()`. Eligibility = `dream-achieved` seen
    (survives the reset) + at least 1 new reputation point — structurally
    prevents churn-prestiging (each point needs ×1.26 all-time growth).
19. **Builder-economy narrative touchpoints** (backlog #6): the
    `builders-guild` beat fires on the durable `floorGiftClaimed` flag
    (placed after `first-upgrade` chronologically), and the `builders`
    mission metric sums `country.builders.count` across countries
    (targets 2/3/5, rewards 2/3/6 VsCoin — in line with the neighbor
    chains; the VsCoin missions deliberately do not refund the
    VsCoin-priced builders #4+, they just soften them).
20. **Per-floor project slots (v10)**: the company-wide `projectSlots`
    cap, its `unlockProjectSlot` action and `PROJECT_SLOT_COSTS` are gone
    — every floor owns its own slot, so a company with N floors works up
    to N distinct projects in parallel (floors are the capacity unit,
    which also prices concurrency via floor costs). `activeProjectId`
    stays as the default for floors assigned `null`, so the hero card and
    "select project" UX keep meaning "the main project". Removing a
    stored field = state-shape change → SAVE_VERSION 10 beta reset,
    bundled with the cost-scaling change below (one wipe, not two).
21. **Company-tier cost scaling (v10, docs/balance.md Phase S)**: capital
    costs (desks, desk upgrades, hires, training, promotions, cash
    upgrades, candidate-reroll base) scale by
    `companyCostScale = outputBonus × projectScale^(1−PROJECT_WORK_SCALE_EXP)
    × (purchasePrice/site.cost)^0.15`; salaries scale by the same income-
    parity base but WITHOUT the founding-escalation term (exponent 0), so
    salary-to-income ratios match the garage at every tier and the debt
    mechanic stays fair. The garage yields exactly 1 → company 1 keeps
    today's numbers. Chosen over a raw purchase-price ratio because
    income only grows as outputBonus×√projectScale; a price-ratio scale
    would have made every late company permanently insolvent.
22. **Beta shop = everything claimable (v10)**: under `BETA_FREE_IAP`
    every VsCoin SKU (not just the starter) is a free unlimited claim —
    no dead "coming soon" buttons during beta. When the flag flips for
    real monetization the same cards become paid SKUs (`iap:<sku>`
    sources); the "coming soon" branch remains only for that off state.
23. **Office-first tab layout (slice B)**: tabs are Map, Office, Shop,
    VsCoin, Stats. Missions folded into the top of the VsCoin tab (they
    are the VsCoin faucet; the SKU packs below are the top-up) rather
    than Stats, and the HUD VsCoin badge + claimable-dot moved with
    them. The Office tab is a drill-down: company list (auto-skipped
    while the country has one company) → building → one floor or the
    staff room. The default tab is Office.
24. **Floor display = engine mapping**: the building view used to sort
    desks best-first for display while the engine maps desk→floor by
    purchase index (`stationFloor`). With floors as management units
    that mismatch would lie about which project a desk feeds, so the
    display now uses purchase order — what you see on a floor is what
    works its project.
25. **Staff room & contracts placement**: the staff room (a pseudo-floor
    atop the building, entered like any floor) holds every upgrade,
    marketing and the wallpaper/decor shop. The company-scoped contract
    portfolio (unlock + main-project selection) stays in the building
    view; each floor's view holds only its own project slot. Hiring is
    a bottom-sheet popup (candidate cards + reroll) reachable from the
    building header and every floor view.
26. **Chiptune theme (slice C)**: "Garage Dreams" is synthesized in
    fx.ts — a 4-bar C–G–Am–F loop at 132 BPM (square lead, triangle
    bass, offbeat blips) driven by a lookahead scheduler from the 60 fps
    update loop, all through one music gain bus that chimes duck. Music
    is OFF by default with its own volume, stored as additive settings
    fields (no save bump). Distinct chimes shipped with it
    (improvements #17): story arpeggio, mission fanfare, VsCoin blips.
    Kept inside the existing Fx class (shared AudioContext, one gesture
    story) rather than a separate module; conventions in the new
    audio-chiptune skill.
27. **Daily contracts (D1)**: a rotating board of 3 delta-progress
    contracts per UTC day, rolled deterministically from the day number
    (mulberry32 seed) out of a fixed pool in data.ts, targets measured
    against a day-start baseline snapshot of the mission metrics
    (`state.daily` — additive field, no save bump). The day number is
    computed in main.ts (floor(now/86 400 000)); src/game/daily.ts never
    reads the clock, matching the offline-doubler pattern. Contracts are
    stored once rolled (not re-derived) so the totalEarned target —
    DAILY_EARN_MINUTES of gross income at roll time — stays stable all
    day and pool retunes never break an in-flight board. Claims go
    through grantVsCoin with source `daily:<id>`; the board renders atop
    the VsCoin tab and feeds its badge.
28. **i18n sweep scope (D2)**: every ui.ts/main.ts chrome string, the tab
    labels (skeleton rebuilds on language change) and all ~44 engine
    error returns moved to keys ('error.*' ids in src/game — the toast
    boundary translates via lookup(), whose raw-string fallback made the
    migration safe to do in one pass). Deliberately NOT translated: SVG
    signage inside art builders ("SHIP IT", "OPEN", "FOR SALE",
    "SAT-VIEW") — it is diegetic set dressing like real-world English
    signage, and per art-svg conventions the art stays deterministic
    and language-free. "Lv"/"MAX"/"×" figure as universal notation.
29. **Worker traits (D3)**: traits are rolled once at candidate creation
    via the existing injectable-rand pattern and copied verbatim on hire
    (durable state, additive fields — no save bump; migrate() drops
    unknown ids). Effects are three pure multipliers (output, salary,
    XP) applied at the ends of the existing chains: `workerRate`, the
    new `workerSalary` (tierSalary × traits — companySalaries and the
    cards use it), and the tick XP gain. Two traits = "rare" candidate
    (golden card, ~2%). Magnitudes deliberately mild (balance.md Phase
    T, expected +4.6% output across all hires) — the feature is hiring
    excitement, not a growth axis. Steve Gates stays traitless so the
    tutorial script stays exact.
30. **Random events (D4)**: offers are ephemeral (not saved — an offer
    lost to an app close is gone, like the briefcase), but everything
    consequential is engine-pure: `rollEventOffer(state, rand)` computes
    the income-scaled offer deterministically and
    `acceptEventOffer` resolves it (upfront charge validated, modifier
    through `grantBoost`). The trade-off lever is a new optional
    `salaryMult` on Boost applied in tick's wage payment and the HUD —
    additive field, no save bump. The dialog reuses the Gabriel story
    modal surface with an Accept/Pass row; story beats keep priority
    (an offer never covers a queued beat). Events don't fire offline by
    design — they're live decision moments, and offline sim must stay
    a pure function of elapsed time.
31. **Piggy vault (D5)**: global `state.vault` (survives prestige like
    VsCoin — the cushion makes the post-IPO garage restart friendlier),
    fed 5% ON TOP of every payout in the tick payout loop and clamped
    once per tick to an income-scaled cap; opened for a flat 5 VsCoin
    into the ACTIVE country's wallet (sink 'vault:open'). Surfaced as a
    HUD piggy chip (60 fps, hidden when empty, tap → Shop) and a Shop
    card with a fill bar. Offline accrual is free — the hook lives in
    the shared payout path. No welcome-back callout yet (would need a
    pre-sim snapshot through loadGame; candidate for the sound/polish
    passes).
32. **Site specialization (second tier #9)**: each paid site favors one
    specialization (loft/tower Frontend, paloalto/nyc Backend, seattle
    DevOps, campus/orbital Data Science; the garage stays generalist) —
    contracts of that specialization earn SITE_SPEC_BONUS (×1.5) there,
    whoever works them, stacking multiplicatively with the personal
    spec-match ×1.5. A site-level bonus on the PROJECT's spec (not the
    worker's) so the choice lives at founding/assignment time: found
    Seattle to run DevOps contracts, staff it however you like.
    Surfaced in the map site sheet (Specialty row) and starred on
    matching contract cards.
33. **Cosmetic catalog = office pets; push opt-in SKIPPED**: the
    cosmetic-first premium item (#14) shipped as four zero-power VsCoin
    pets (4–10 coins) — owned globally like wallpapers, picked per
    company (`petId`, additive state, unknown-id hygiene), rendered as
    a bobbing companion in the lobby band and managed in the staff
    room's pet corner. Push notifications (#12) are SKIPPED for now:
    real web-push needs a push service backend (VAPID keys +
    subscription storage) — external infrastructure per the session's
    skip rule — and a page-open-only Notification fallback is useless
    for re-engagement; revisit with monetization Phase 0's backend
    decisions (docs/monetization.md).
34. **Polish: builder chip + claim confetti (#16, #18)**: a persistent
    HUD chip shows free/total builders at 60 fps (red state when all
    busy; tap → Office) — occupancy stays derived via freeBuilders(),
    nothing stored. Mission/daily/vault claims now burst confetti at
    the clicked button (shared burstAt helper) on top of their chimes.
    The optional "which builder is on it" attribution from #16 was
    dropped as cosmetic bookkeeping that the derived model can't answer
    honestly.
35. **Construction art pass (#15)**: `constructionDecor(seed = 0)` grew
    into a full cartoon site (scaffold, mini tower crane with hanging
    beam, inline hard-hat builder persona — persona.ts has no hard-hat
    variant, so the builder is drawn in the officeScene style — banner,
    cones), deterministic via the hashSeed pattern. On the map,
    `constructionWorks()` replaces the FOR SALE sign with a crane
    silhouette + scaffolding over the plot while a company-build is in
    flight; detection reads the existing '🏗️ ' label prefix inside
    cityMap.ts so ui.ts stays untouched, and colors are neutral safety
    orange/wood so every COUNTRY_THEMES palette works.
36. **Balance harness (#21)**: implemented as a vitest file, not a
    standalone script — the greedy bot doubles as always-on CI pacing
    guards (anchored on its measured curve with ~2× slack, see
    balance.md Phase H) and an opt-in table printer (npm run
    balance:sim). The bot intentionally skips training/promotions:
    keeping it simple keeps it stable and cheap (~1 s for 4
    simulated days), and the guards' job is regression detection, not
    optimal play.
