---
name: add-timed-action
description: Register a new timed action (training, promotion, desk upgrade, ...) in Idle Silicon Valley so it ticks, survives offline simulation, and gets VsCoin fast-forward + UI treatment for free. Use when adding any mechanic that takes wall-clock time to complete.
---

# Adding a timed action

All time-consuming mechanics run through the generic timed-action system in
`src/game/engine.ts` (`TimedAction` in `types.ts`, stored on
`CompanyState.timedActions`). They advance only inside `tick()`, which means
offline simulation and time-skips handle them with zero extra code, and every
one of them is fast-forwardable with VsCoin.

## Checklist

1. **types.ts** — add your kind to the `TimedActionKind` union. If the action
   needs payload (levels granted, target tier, target desk def), extend the
   optional payload fields on `TimedAction` — keep them JSON-serializable.
2. **data.ts** — add the duration/cost constants (base + growth curve). No
   numbers anywhere else.
3. **engine.ts**:
   - Start function: validate (`string | null` error return), charge costs,
     push `{ id: state.nextEntityId++, kind, companyId, targetId,
     remainingSec, totalSec, ... }` via `startTimedAction()`. If the target
     is a worker who leaves the floor, `autoSeat(company)` after starting.
   - Completion: add a case to `completeTimedAction()` — apply the effect on
     durable state, push a `TickEvents` entry if the UI should react.
   - Do NOT touch the countdown loop in `tick()` — it is generic.
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
