# Session state — 2026-08-03 wrap (delivery fix + top-tier features)

Session complete; nothing in flight. Contract:
`.claude/skills/session-handoff/SKILL.md`.

## 1. What shipped (all merged to master, all deploys green)

| Slice | PR |
|---|---|
| Beta force-refresh + Settings build stamp | #7 |
| Backlog re-baseline | #8 |
| Prestige — "IPO & open-source the dream" (no save wipe) | #9 |
| Gabriel goal-hint chip (`src/game/goals.ts`) | #10 |
| Offline-earnings doubler (ad-ready placement) | #11 |
| Story journal on the Stats tab | #12 |
| FR locale number formatting (`format.ts` → `src/ui/`) | #13 |
| Builders-guild beat + builders mission chain | #14 |
| CI on PRs: vitest + build + Chromium smoke | #15 |

Test suite: 496 green (24 files). Design notes: decisions.md #17–#19;
balance: balance.md Phase P. SAVE_VERSION still 9 — every change this
session was additive with `migrate()` hygiene (no beta reset).

## 2. In-progress unit

None. Phase C stopped at the agreed top-tier boundary — Benjamin's
go-ahead is required before starting the next tier (session brief §Phase C).

## 3. Next session (after go-ahead) — see improvements.md top tier

1. Daily contracts (rotating missions)
2. i18n sweep of remaining UI strings (+ tab-label rebuild hook)
3. Worker traits & rare candidates
4. Random events with choices
5. Piggy-bank vault

## 4. Standing decisions to remember

- `BETA_FORCE_REFRESH` + `BETA_FREE_IAP` (both in `src/game/data.ts`)
  must be flipped before real-user testing (improvements.md "Beta exit
  checklist", decisions.md #17).
- Offline doubler credits the ACTIVE country's wallet and counts into
  lifetime totals (veto-able, decisions.md-adjacent, see PR #11).
- The sandbox network policy blocks `benjamindecaillet.github.io`;
  verify live deploys on-device via the Settings build stamp, or rely on
  the CI smoke test.

## 5. How to verify on Benjamin's device

Open the PWA, fully close it once, reopen: the new service worker
installs and the app reloads itself. From then on every deploy lands
within ~1 min of the app being focused. Settings tab (bottom of Stats)
shows `Build <sha> · <date>` — compare with the latest master commit.
