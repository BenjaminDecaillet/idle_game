# Session state — beta delivery fix, backlog refresh & top-tier features

Session of 2026-08-03 (autonomous). Contract:
`.claude/skills/session-handoff/SKILL.md`. Backlog: `docs/improvements.md`
(re-baselined this session). Prestige numbers: `docs/balance.md` (Phase P
section, to be added by the balance-designer pass).

## 1. Slice table

| Slice | Branch | Status |
|---|---|---|
| A1 beta force-refresh + build stamp (PR #7) | `fix/beta-force-refresh` | merged (master `27ad222`) |
| B1 backlog re-baseline + plan/session docs | `docs/backlog-refresh` | merged (PR #8) |
| C1–C2 prestige (engine + story epilogue + UI) | `feat/prestige` | merged (PR #9) |
| C3 goal hint chip | `feat/goal-hint` | merged (PR #10) |
| C4 offline doubler placement | `feat/offline-doubler` | in progress |
| C5 story recap journal | `feat/story-journal` | pending |
| C6 locale number formatting | `feat/locale-format` | pending |
| C7 builder story beats + missions | `feat/builder-story` | pending |
| C8 CI: PR checks + smoke test | `ci/pr-checks` | pending |

Slices C3+ are cut in priority order; at ~80% budget stop starting new ones.

## 2. In-progress unit

C4 offline doubler on `feat/offline-doubler`: engine
`offlineDoublerReady`/`claimOfflineDoubler` (+2 additive GameState
fields with migrate hygiene, no save bump), Welcome-back modal button
(`double-offline` action, `pendingOfflineEarnings` on UI),
`OFFLINE_DOUBLER_COOLDOWN_SEC = 20h` in data.ts. Doubled amount counts
into lifetime totals (missions/reputation) and credits the ACTIVE
country's wallet (decision, veto-able). i18n-writer (ui.doubler* —
required for compile) + test-writer (tests/offline-doubler.test.ts)
running. **Exact next step:** full test-runner run, commit, PR,
self-merge, verify deploy.

## 3. Decisions (autonomous, veto-able)

- Root cause of the "features never arrive" bug: client-side PWA shell
  staleness (no SW update flow; resumed PWAs never re-check), NOT a deploy
  failure — deploy run #9 shipped `fb02a1c` fine. Fix behind
  `BETA_FORCE_REFRESH` (decisions.md #17).
- Benjamin approved via question batch: prestige IS in this session's top
  tier; force-refresh = silent save-then-reload (no toast).
- Verification of the deployed site ran against a local production build +
  the green deploy run for the same sha — the sandbox network policy
  blocks `benjamindecaillet.github.io` (proxy CONNECT 403) and the Pages
  artifact blob store. Live-URL check must happen on Benjamin's device
  (Settings build stamp makes it one glance).
- No PR-level CI exists (deploy.yml on master push is the only gate);
  merged PR #7 on green local test+build. Backlog #7 adds PR checks.
- Single tiny i18n pair (`ui.build`) added directly instead of via the
  i18n-writer agent; batches still go through the agent.

## 4. Open questions

None blocking. Phase C stop-point: after top-tier items, report and wait
for go-ahead (per the session brief).

## 5. Build health / how to verify

- master `27ad222`: `npm test` 398/398 green, `npm run build` green,
  deploy run for `27ad222` should be green (verify in Actions).
- Browser-verified on the built bundle (Playwright + local
  `vite preview`, scripts in the session scratchpad): Shop tab, VsCoin
  tab, live construction countdown (25m 1s → 24m 58s), build stamp
  "Build fb02a1c · 2026-08-03 15:15Z", zero console errors.
- On-device: open the deployed PWA twice (one cold start to fetch the new
  worker, it reloads itself once active); thereafter every deploy lands
  within ~1 min of the app being focused. Check Settings → build stamp.
