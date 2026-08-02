# Session state — progression & expansion build

Branch: `feat/idle-sv-progression-and-expansion` (from master).
Contract: see `.claude/skills/session-handoff/SKILL.md`.

## 1. Phase list

| Item | Status |
|---|---|
| P0 docs + agents + skills | done |
| P0 GameState schema rework + beta reset (v8) | done |
| P2 generic timed actions + fast-forward + tutorial freebie | done |
| P1 employees: training ramp, grade caps, promotion, Steve Gates | done |
| P3 upgradable desks | done |
| P4 missions badge UX | done |
| P5 companies: parody names, renames, soft caps, multi-project | done |
| P6 debt | done |
| P7 international expansion (engine, world panel, country map themes, tests) | done |
| P8 close-out: i18n audit, docs, PR | done — PR open |

## 2. In-progress unit

None. All scope shipped; the single PR is open against master.

## 3. Decisions & assumptions

`docs/decisions.md` (14 entries) + `docs/balance.md` are current. i18n
parity is compile-enforced (fr typed against en) and asserted by
`tests/narrative.test.ts` for every beat/step/country.

## 4. Next action

Post-merge follow-ups live in `docs/improvements.md` (notably 12b bespoke
country scenes, #16 remaining hardcoded UI strings sweep, #18 balance
simulation harness to validate the soft-cap/second-company pacing in
docs/balance.md against a greedy bot).

## 5. Build health

`npm test`: 352/352 green (19 files). `npm run build`: green
(tsc + vite + PWA precache). Everything committed and pushed.
