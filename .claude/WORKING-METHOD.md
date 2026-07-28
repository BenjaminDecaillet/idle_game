# Working method — Idle Silicon Valley

Operating guide for cost-efficient Claude Code sessions in this repo. You're on a **Max subscription**, so the currency is rate-limit headroom (5-hour and 7-day windows), not dollars — but the levers are identical.

## Model tier per task

- **Sonnet (default start):** content additions in `data.ts`, i18n strings, missions/story beats via the skills, test updates, small UI tweaks. It handles this repo's routine work well.
- **Opus/strong tier:** engine/`tick()` changes, save migrations, prestige-style features, balance design, debugging progression bugs, anything touching `persona.ts` determinism. Switch with `/model` mid-session when a routine task turns into one of these; switch back down after.
- **Never** start a big-model session just to *find* something — that's the `explore` agent's job (haiku) from whatever session you're in.

## /clear vs /compact vs keep going

- **/clear between unrelated tasks — default habit.** It's free. `/compact` is itself an expensive request: it re-reads everything it summarizes, so compacting a large context costs a large request's worth of your limit.
- **/compact only** when you genuinely need continuity mid-task and context is near the limit. CLAUDE.md already contains repo-specific compact instructions (what to preserve), so plain `/compact` does the right thing.
- Long session drifting? `/clear` and re-state the task in two sentences — cheaper than dragging 100k tokens of history under every subsequent message.

## Cache behaviour → session structure

Prompt cache lifetime is **1 hour on a subscription**. The first message after a longer idle gap reprocesses your entire context as fresh input. Concrete habit: **work in focused bursts; when you step away for more than ~an hour, treat the session as finished** — `/clear` (or just close it) and start the next task fresh rather than sending "one more thing" into a cold, huge context. Never leave a fat session idling overnight to poke at in the morning.

## Effort / thinking

Reasoning tokens bill as **output** (the expensive kind). Lower `/effort` for mechanical passes: bulk i18n additions, renames, applying a spec you already wrote, updating test expectations. Raise it back for design and debugging. Note: Fable always uses extended thinking (effort can be lowered, thinking can't be disabled); on Opus/Sonnet you can also disable thinking in `/config` for pure-mechanical sessions.

## Delegation pattern (this repo's agents, all pre-routed to haiku)

Delegate **"go find out X / go run Y and report back"**:
- `explore` — any search or "how does X work" question; keeps 40–80 KB art-file reads out of your main context.
- `test-runner` — `npm test` / `npm run build`; only failures come back.
- `mechanic` — precisely specified mechanical edits; `test-writer` — well-specified new tests.

Keep in the **main thread**: anything needing your approval mid-task (subagents can't ask you questions), design/balance decisions, multi-file features where steps depend on judgment. Fire independent subagents in parallel in one message.

## Prompt hygiene

- Name files and functions: "raise Intern baseRate in `data.ts`" beats "make early game faster" — vague goals trigger broad scanning.
- Use **plan mode** (Shift+Tab) before engine/save-format/multi-file changes; approving a plan is far cheaper than reworking a wrong implementation.
- **Escape early** the moment a direction looks wrong; `/rewind` to a checkpoint instead of steering a long bad run.
- Give verification targets ("test with a v6 save export", "screenshot at 390 px") so the agent self-checks instead of round-tripping.
- Don't paste `package-lock.json`, screenshots directories, or whole art files into context — reads of these are deny-listed in `.claude/settings.json` for a reason.

## Status line (local CLI only)

`.claude/settings.json` configures a status line showing model, context-window %, and your 5 h/7 d rate-limit usage. It only renders in the local CLI/desktop app (requires `jq`); remote/web sessions don't display it.
