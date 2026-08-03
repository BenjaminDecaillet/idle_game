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
