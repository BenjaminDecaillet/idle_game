# Progression & International Expansion — plan

Working branch: `feat/idle-sv-progression-and-expansion`. One PR at the end.
Live status per unit lives in `docs/session-state.md`; design rationale in
`docs/balance.md`; assumptions in `docs/decisions.md`.

## Phases & acceptance criteria

### Phase 0 — Foundations
- [x] Docs scaffolding (this file, balance, decisions, session-state).
- [x] Agents: `balance-designer`, `i18n-writer`, `art-skinner`.
- [x] Skills: `add-country`, `add-timed-action`, `session-handoff`.
- [ ] One-pass `GameState` rework: per-country economies, generic timed
  actions, employee grades/promotion fields, company rename/soft-cap/
  multi-project fields, debt fields. Single `SAVE_VERSION` bump to 8 with
  **beta reset** (pre-v8 saves discarded, friendly EN+FR notice, no
  migration chain). `CLAUDE.md` + `bump-save-version` skill updated.
- Accept: `npm test` + `npm run build` green; fresh game plays; old save
  triggers reset notice.

### Phase 1 — Employees
- Tutorial first hire is intern **"Steve Gates"**, affordable at that point.
- Training duration ramps per completed program (first stays ~2 min).
- Per-tier skill caps; **Promote** timed action (money + time, scaling with
  target grade) moves employee to next tier keeping skill level.
- Accept: caps enforced in level-up + training; promote appears only at cap;
  offline promotion completes identically; tests cover all.

### Phase 2 — Timed actions & fast-forward
- Generic system (training, promotion, desk upgrades, extensible) ticking
  through `tick()` and surviving `simulateOffline()`.
- Every timed action fast-forwardable for VsCoin scaled to remaining time;
  first-ever fast-forward free (tutorial offers it on the tutorial training).
- Accept: `add-timed-action` skill checklist true in practice; tests.

### Phase 3 — Desks
- Upgrade-in-place action per desk (money + time) raising it to the next
  workstation tier. Accept: cheaper than buy-new at same tier; seated worker
  keeps working during upgrade; tests.

### Phase 4 — Missions UX
- Badge dot on Missions tab while any mission is claimable (also after
  offline completion); completion toast live; dot clears when all claimed.

### Phase 5 — Companies
- Only first company player-named; others auto-named from per-country parody
  pools (never a real trademark verbatim).
- Renaming always paid: cash **and** VsCoin, both escalating per rename;
  first cash rename ≥ initial purchase price.
- Per-company income soft caps (reward growth plateaus) calibrated so the
  200k second company is an earned goal.
- Multi-project: slot 2 unlockable at ≥ half floors, slot 3 at max floors;
  upper floors assignable to other projects.

### Phase 6 — Debt
- Wages can push balance below zero; interest accrues; HUD alarm; Gabriel
  warnings; past threshold employees quit until recoverable. No game-over.

### Phase 7 — International expansion
- Starting country chosen at new game (CH, US, CA, IT, FR, DE, SA, CN).
- Owning every site in the current city unlocks International Business:
  world map, unlock further countries, travel freely between unlocked ones.
- Per-country: money, companies, employees, projects, floors, cash upgrades.
  Global: VsCoin (+ledger, +VsCoin upgrades), story, missions, cosmetics,
  avatar, settings.
- One parameterized city-map renderer driven by per-country themes.

### Phase 8 — Close-out
- i18n EN+FR audit; tests for all new pure logic incl. offline parity;
  `docs/plan.md` / `improvements.md` / `specs.md` / skills updated; single PR.
