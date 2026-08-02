# Session state — progression & expansion build

Branch: `feat/idle-sv-progression-and-expansion` (from master).
Contract: see `.claude/skills/session-handoff/SKILL.md`.

## 1. Phase list

| Item | Status |
|---|---|
| P0 docs + agents + skills | done |
| P0 GameState schema rework + beta reset (v8) | done |
| P2 generic timed actions + fast-forward + tutorial freebie | done (core engine + team UI; add-timed-action skill matches) |
| P1 employees: training ramp, grade caps, promotion, Steve Gates | done (engine + team UI + tutorial steps) |
| P3 upgradable desks | engine done; office-tab UI not-started |
| P4 missions badge UX | not-started |
| P5 companies: parody names, renames, soft caps, multi-project | engine done; UI (rename costs dialog, slot/floor assignment) not-started |
| P6 debt | engine + story beats done; HUD alarm styling partial (hud-money .negative) |
| P7 international expansion | engine done (unlock/travel/choose-start); world-map UI + per-country city themes not-started |
| P8 close-out: i18n audit, docs, PR | not-started |

Note: the v8 schema pass deliberately landed ALL engine mechanics (timed
actions, promotion, desk upgrades, soft caps, debt, countries) in one go —
the remaining phase work is UI surfaces, story/tutorial polish, dedicated
tests per system, and docs.

## 2. In-progress unit

Schema rework unit — finishing: parallel agents fixed tests per file
(companies/engine/floors last to land), then full `npm test` +
`npm run build`, commit, push.

## 3. Decisions & assumptions

`docs/decisions.md` (14 entries) + `docs/balance.md`. New since:
- Debt never takes the country's last worker; with zero workers debt decays
  (2× interest + 1/s) so recovery is always possible (decisions #8 refined).
- Premium (VsCoin) upgrades are global (`state.globalUpgrades`) per brief.

## 4. Next action

After green: commit `feat(save): rework state for countries, timed actions
and debt (v8 beta reset)` and push. Then Phase 3 UI: desk upgrade buttons in
`renderOfficeShop`/`renderDeskTile` (`src/ui/ui.ts`) wired to
`upgradeDesk`/`fastForward`, plus `tests/desks.test.ts`.

## 5. Build health

`npx tsc --noEmit`: src/ clean; tests being fixed by agents (save,
narrative, qol, player, missions, monetization, customization, progression
confirmed green). Full `npm test` pending the last agent reports.
