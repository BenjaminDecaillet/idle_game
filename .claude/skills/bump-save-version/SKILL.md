---
name: bump-save-version
description: Change GameState safely in Idle Silicon Valley - bump SAVE_VERSION, extend migrate(), keep old saves loading. Use whenever adding/removing/renaming any field in GameState or nested state types.
---

# Changing GameState (save-compatible)

Old saves MUST keep loading. The migration is **merge-onto-fresh**, not
versioned steps: `migrate()` in `src/game/save.ts` spreads the parsed save
over `createInitialState()`, so missing top-level fields get defaults for
free — but only if you follow all steps:

1. **types.ts** — add the field to `GameState` (or nested type).
2. **engine.ts** — set its default in `createInitialState()` (and
   `createCompany()` for per-company fields). Bump `SAVE_VERSION` (top of
   engine.ts) and append a `// vN: what changed` comment line.
3. **save.ts `migrate()`**:
   - Nested object → explicit merge: `field: { ...fresh.field, ...(parsed.field ?? {}) }`
     (see `settings`, `tutorial`, `player` — including `player.look`'s
     two-level merge).
   - Array → `Array.isArray(parsed.x) ? parsed.x : []` guard.
   - Id references into data.ts → hygiene pass dropping unknown ids (see
     wallpapers, story beats, missionsClaimed).
   - Numeric → range/finite check with fallback (see `vsCoin`, player look).
   - Behavioral defaults for veterans: pre-v4 saves get `tutorial.done=true`
     + `backfillStory()` — mirror this pattern if a new feature should not
     spam long-time players on first load after update.
4. **tests** — in the feature's test file: (a) old save without the field
   migrates to defaults, (b) corrupt values are repaired, (c) valid values
   survive a JSON round-trip. Copy the patterns in `tests/player.test.ts`
   ("save migration v6") or `tests/missions.test.ts` ("save migration v5").

Also remember:
- New projects/upgrades/sites/wallpapers in `data.ts` appear in old saves
  automatically (project list re-sync + id hygiene) — no version bump needed
  for pure data additions.
- `importSave()` runs the same `migrate()`; nothing extra to do.
- `npm test` + `npm run build` green before commit.
