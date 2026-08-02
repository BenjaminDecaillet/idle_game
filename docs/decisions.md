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
   desk) while targeted by a training or promotion action. Desk upgrades do
   NOT evict the seated worker (friendliness; see balance.md).
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
