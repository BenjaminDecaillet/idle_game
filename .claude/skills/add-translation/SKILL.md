---
name: add-translation
description: Add or change i18n strings (EN/FR) in Idle Silicon Valley, or migrate hardcoded UI strings into the i18n layer. Use for any user-facing text work.
---

# i18n layer — adding/changing strings

The layer lives in `src/i18n/`: `en.ts` (source of truth), `fr.ts`
(type-checked complete: `Record<keyof typeof en, string>` — a missing or extra
FR key fails `tsc`), `index.ts` (runtime).

## Rules

- Add every key to BOTH `en.ts` and `fr.ts`. Key namespaces:
  `ui.*` (chrome/buttons), `tutorial.<stepId>.text`, `story.<beatId>.title/.text`,
  `mission.<metric>`, `look.<field>`. Follow the existing section comments.
- Placeholders: `{name}` style, replaced via `t(key, { name: value })`.
- **Statically known key** → `t('ui.claim')` (typo = compile error).
  **Dynamically built key** (`` `story.${id}.title` ``) → `lookup()` (falls
  back EN → key itself). Prefer `t()` whenever the key is a literal or a
  template over a closed union (those still type-check, e.g.
  `` t(`mission.${def.metric}`) ``).
- The current language is UI-layer module state (`setCurrentLang`), resolved
  from `state.settings.language` ('auto' | 'en' | 'fr') via `resolveLang()`
  against `navigator.language`. `src/game/**` must stay language-agnostic:
  game modules expose ids/error strings, the UI maps them to text.
- French style: tutoiement for Gabriel (tutorial), vouvoiement for missions/
  settings labels, apostrophes typographiques (’), « guillemets » optional.

## Migrating an existing hardcoded UI string

1. Add `ui.<something>` to both tables.
2. Replace the literal in `src/ui/**` with `t('ui.<something>')`.
3. If it's an engine error message shown via toast, don't translate the
   engine — map the returned string at the toast call-site (or leave EN;
   engine errors are exempt until the error-code refactor in
   docs/improvements.md #16).

Tests: `tests/narrative.test.ts` asserts EN/FR key-set equality and full
story/tutorial coverage. Run `npm test` + `npm run build`.
