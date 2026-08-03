---
name: add-timed-action
description: Register a new timed action (training, promotion, desk upgrade, ...) in Idle Silicon Valley so it ticks, survives offline simulation, and gets VsCoin fast-forward + UI treatment for free. Use when adding any mechanic that takes wall-clock time to complete.
---

# Adding a timed action

All time-consuming mechanics run through the generic timed-action system in
`src/game/engine.ts` (`TimedAction` in `types.ts`). They advance only inside
`tick()`, which means offline simulation and time-skips handle them with zero
extra code, and every one of them is fast-forwardable with VsCoin.

Existing kinds: `training`, `promotion`, `desk-upgrade`, `floor-build` (all
on `CompanyState.timedActions`) and `company-build` (on
`CountryState.timedActions` — a company under construction has no
CompanyState to carry it; its completion runs through
`completeCountryTimedAction`, its countdown through the country-level loop
at the end of `tickCountry`, and `fastForwardAction` searches country-level
actions first).

**Builder gating:** every in-flight timed action occupies one builder from
the per-country pool (`CountryState.builders`). Availability is DERIVED —
`freeBuilders(country)` = `builders.count` − in-flight actions (company +
country level) — never stored. Any new start function must check
`freeBuilders(country) <= 0` and return the `'error.noFreeBuilders'` key id
(the UI toasts engine errors through `lookup()`, so i18n key ids work as
error returns).

## Checklist

1. **types.ts** — add your kind to the `TimedActionKind` union. If the action
   needs payload (levels granted, target tier, target desk def), extend the
   optional payload fields on `TimedAction` — keep them JSON-serializable.
2. **data.ts** — add the duration/cost constants (base + growth curve). No
   numbers anywhere else.
3. **engine.ts**:
   - Start function: validate (`string | null` error return, incl. the
     `freeBuilders` gate), charge costs, push `{ id: state.nextEntityId++,
     kind, targetId, remainingSec, totalSec, ...payload }` onto
     `company.timedActions` (or `country.timedActions` if no company exists
     yet). If the target is a worker who leaves the floor, or a desk that
     becomes unusable, `autoSeat(company)` after starting.
   - Completion: add a case to `completeTimedAction()` (company-level) or
     extend `completeCountryTimedAction()` (country-level) — apply the
     effect on durable state, push a `TickEvents` entry if the UI reacts.
   - Do NOT touch the countdown loops in `tickCountry()` — they are generic.
   - "Nothing produces while it is being worked on": if the action occupies
     a desk or worker, make sure their output is zero for the duration
     (see `stationUnderUpgrade` / `workerBusy`).
4. **Fast-forward is free**: `fastForwardCost()` / `fastForwardAction()`
   already cover every kind (VsCoin, scaled to remaining time,
   `FASTFORWARD_SEC_PER_VSCOIN` in data.ts). Nothing to add.
5. **UI (`src/ui/ui.ts`)** — render the in-flight state with
   `timedActionsFor(company, targetId)`: progress bar from
   `remainingSec/totalSec` + fast-forward button
   `data-action="fast-forward:<actionId>"`.
6. **i18n** — action label keys in EN + FR (add-translation skill).
7. **Tests** — in the feature's test file: start → tick to completion applies
   the effect; `simulateOffline()` over the duration behaves identically to
   live ticking; fast-forward completes instantly, charges VsCoin, and the
   first-ever fast-forward is free (tutorial freebie).

## Invariants

- Never mutate `remainingSec` outside `tick()`/`fastForwardAction()`.
- Effects fire exactly once, in `completeTimedAction()`, on durable state.
- A worker can be the target of at most one timed action at a time
  (`workerBusy()` guards this).
