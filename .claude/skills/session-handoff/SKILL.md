---
name: session-handoff
description: The docs/session-state.md contract for Idle Silicon Valley - how to record progress so any future session can resume with zero re-briefing. Use at the end of every work unit, when context/session budget runs low, and when resuming after "continue".
---

# Session handoff contract

Sessions can be cut off at any moment. `docs/session-state.md` makes that a
non-event. It is committed with **every** work unit.

## Required sections (keep this exact structure)

1. **Phase list** — every phase/work item with `done / in-progress /
   not-started`.
2. **In-progress unit** — what it is and exactly what remains of it.
3. **Decisions & assumptions** — open questions and the calls already made
   (mirror durable ones into `docs/decisions.md`).
4. **Next action** — file + function + intent, precise enough to start
   typing immediately.
5. **Build health** — last known result of `npm test` and `npm run build`
   (green/red + failing test names if red).

## Rules

- Work in units of ≤ 45 min, each ending: tests green, build green,
  session-state updated, one commit, one push. Never end a unit
  mid-refactor; finish or revert.
- At ~80% of session/context budget: stop taking new work, land or revert
  the current unit, push, write a crisp handoff.
- Never leave uncommitted work at the end of a turn.

## Resume protocol

On `continue`: read `docs/session-state.md`, then `git log --oneline -20`
on the working branch, then execute the recorded next action without
re-asking the user anything.
