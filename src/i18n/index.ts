import { en } from './en';
import { fr } from './fr';

/**
 * Tiny dependency-free i18n layer.
 *
 * - `en.ts` is the source of truth for keys; `fr.ts` is type-checked against
 *   it, so a missing translation is a compile error.
 * - The current language is module-level UI state (src/game stays pure and
 *   language-agnostic — game modules reference content by id, the UI maps
 *   ids to keys like `story.<id>.title`).
 * - `t()` is fully typed for static keys; `lookup()` covers dynamic
 *   id-derived keys and falls back to English, then to the key itself.
 *
 * The rest of the UI can migrate by moving its literals into en/fr and
 * calling t() — no further infrastructure needed.
 */

export type Lang = 'en' | 'fr';
/** What the save stores: an explicit language or browser auto-detection. */
export type LangSetting = 'auto' | Lang;

export type StringKey = keyof typeof en;

const TABLES: Record<Lang, Record<string, string>> = { en, fr };

let current: Lang = 'en';

export function currentLang(): Lang {
  return current;
}

export function setCurrentLang(lang: Lang): void {
  current = lang;
}

/** Resolve a persisted language setting against the browser language. */
export function resolveLang(setting: LangSetting, browserLang = ''): Lang {
  if (setting === 'en' || setting === 'fr') return setting;
  return browserLang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  let out = s;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Translate a statically-known key (typo = compile error). */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  return interpolate(TABLES[current][key] ?? en[key], params);
}

/** Translate a dynamically-built key (e.g. `story.${id}.title`). */
export function lookup(key: string, params?: Record<string, string | number>): string {
  const s = TABLES[current][key] ?? TABLES.en[key] ?? key;
  return interpolate(s, params);
}
