---
name: add-country
description: Full checklist for adding a country to Idle Silicon Valley - data entry, per-country economy wiring, parody-company name pool, city map theme, i18n keys, tests. Use when adding or reworking a playable country.
---

# Adding a country

Each country is a self-contained economy (own money, companies, employees,
projects, floors, cash upgrades) sharing the global layer (VsCoin, missions,
story, cosmetics, avatar). Countries are pure data + one map theme.

## Checklist

1. **types.ts** — add the id to the `CountryId` union.
2. **data.ts** — append a `CountryDef` to `COUNTRIES`:
   - `id`, `emoji` (flag), `currencySymbol` if themed,
   - `parodyCompanyNames`: ≥ 8 region-appropriate parody names —
     recognizable riffs on real companies, never a real trademark verbatim
     (MicroHard, Gogol, Appel…),
   - economy modifiers if any (keep 1.0 unless designed in docs/balance.md).
3. **engine.ts** — nothing: `createCountry()` and all per-country logic are
   generic over `COUNTRIES`.
4. **Map theme (`src/ui/cityMap.ts`)** — add a `CountryTheme` entry:
   palette, skyline silhouette, 2–3 signature landmarks, terrain/vegetation,
   street style. Follow the **art-svg** skill (no filters, deterministic).
   Delegate to the `art-skinner` agent when possible.
5. **i18n** — `country.<id>.name` in EN + FR (add-translation skill).
   Company parody names stay untranslated (proper nouns).
6. **Tests** — extend `tests/countries.test.ts`:
   - new game can start in the country,
   - its companies pull names from the right parody pool,
   - country switch preserves both economies through `simulateOffline()`.
7. **Docs** — note any bespoke-scene wish in `docs/improvements.md`.

## Invariants

- `src/game/**` references countries by id only — no display names, no art.
- Starting-country choice at new game lists every entry of `COUNTRIES`;
  further countries unlock through International Business. No extra wiring
  needed beyond the data entry.
