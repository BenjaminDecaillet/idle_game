---
name: art-svg
description: Conventions for SVG art in Idle Silicon Valley - cartoon office/city scenes, item art, deterministic employee personas, player avatar, and the painted character-portrait exception. Read before creating or editing any art builder in src/ui/.
---

# SVG art conventions

Two art systems coexist. Rules common to both: **no SVG filters**, **memoised builders**, **unique gradient-id prefixes** per builder.

## Cartoon system (default) — full spec in `docs/design-system.md`

- Hand-drawn cartoon style: ink outlines, cel shading.
- Employee personas are deterministic-per-worker: `src/ui/persona.ts`, FNV-1a hash + `>>>` shifts. Extend with **new** shifts; never change existing ones — that would reshuffle every player's existing workers.
- Player avatar is explicit state (`state.player.look`), validated in `src/game/player.ts` — not hash-derived.

## Painted portraits (exception) — full spec in `docs/portraits.md`

- Used by worker/candidate cards, the customizer preview, and Gabriel dialogs: `src/ui/portraits.ts`.
- Semi-realistic painted style: raster from `public/portraits/` when a file exists, painted SVG placeholder otherwise (`portraitArt.ts`, `gabrielPortrait.ts`).
- Cartoon ink-outline rules do **not** apply here; no-filters / memoised / unique-gradient-id rules still do.

## Working in these files

`officeScene.ts` (77 KB), `cityMap.ts` (62 KB), `persona.ts` (57 KB), `itemArt.ts` (49 KB), `portraitArt.ts` (43 KB) are large: Grep for the builder function you need and Read line ranges — never whole files.
