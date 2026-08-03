---
name: bump-save-version
description: Change GameState safely in Idle Silicon Valley - bump SAVE_VERSION and handle saves under the beta reset policy. Use whenever adding/removing/renaming any field in GameState or nested state types.
---

# Changing GameState (beta policy)

**Current policy: BETA RESET.** The game is in beta; a one-time save reset
was approved with the v8 progression/expansion update. `loadGame()` discards
any save whose `version` is below the current `SAVE_VERSION` and returns a
fresh game with `betaReset: true`, which the UI surfaces as a friendly
translated notice (`ui.betaResetTitle` / `ui.betaResetText`). There is **no
cross-version migration chain**, and this rule does not need to return to
strict migration after 1.0 unless explicitly decided anew.

`migrate()` still exists — but only as a **same-version hygiene pass**
(merge-onto-fresh): it fills defaults for fields added in later same-version
builds, repairs corrupt values, and drops unknown content ids.

## Steps when changing GameState

1. **types.ts** — add/change the field on `GameState` (or nested type:
   `CountryState`, `CompanyState`, `WorkerState`, `TimedAction`, ...).
2. **engine.ts** — set its default in `createInitialState()` /
   `createCountry()` / `createCompany()` as appropriate.
3. **Decide the save impact:**
   - *Additive & defaultable* (new optional-ish field): do NOT bump
     `SAVE_VERSION`. Add a hygiene default in `migrate()` (or
     `migrateCountry()` for country/company/worker fields) so same-version
     saves written before the field existed get the default.
   - *Breaking* (restructure, semantics change): bump `SAVE_VERSION` (top of
     engine.ts, append a `// vN: what changed` comment). All older saves
     will be discarded on load — make sure the beta-reset notice text still
     describes the update fairly.
4. **save.ts hygiene patterns** (for the same-version merge):
   - Nested object → explicit merge: `field: { ...fresh.field, ...(parsed.field ?? {}) }`.
   - Array → `Array.isArray(parsed.x) ? parsed.x : []` guard.
   - Id references into data.ts → drop unknown ids (see wallpapers, story
     beats, missionsClaimed, countries).
   - Numeric → range/finite check with fallback (see `vsCoin`, player look).
   - Keep the `nextEntityId > every stored id` pass up to date when new
     entity kinds get ids (workers, desks, companies, timed actions).
5. **tests** — in `tests/save.test.ts`: (a) same-version save missing the
   field migrates to the default, (b) corrupt values are repaired, (c) valid
   values survive a JSON round-trip; and the beta-reset describe block keeps
   proving pre-current saves are discarded with `betaReset: true`.

Also remember:
- New projects/upgrades/sites/wallpapers/countries in `data.ts` appear in
  existing same-version saves automatically (list re-sync + id hygiene) —
  no version bump for pure data additions.
- `importSave()` rejects pre-current-version exports with
  `'Not a valid save'`.
- `npm test` + `npm run build` green before commit.
