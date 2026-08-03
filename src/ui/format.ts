// Number/money/duration formatting for the UI. Locale-aware on top of the
// game's compact suffix style: FR gets a decimal comma, the currency symbol
// after the amount (Swiss/French convention, "1,23 M$") and "j" for days.
// Lives in src/ui (not src/game) because presentation follows the UI
// language — game modules never format for humans.

import { currentLang } from '../i18n';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function localizeDecimals(s: string): string {
  return currentLang() === 'fr' ? s.replace('.', ',') : s;
}

/** 1234 -> "1.23K" (EN) / "1,23K" (FR), 5 -> "5", 1234567 -> "1.23M" */
export function formatNumber(value: number): string {
  if (!isFinite(value)) return '∞';
  const negative = value < 0;
  let v = Math.abs(value);
  if (v < 1000) {
    const s = v < 10 && v % 1 !== 0 ? localizeDecimals(v.toFixed(1)) : Math.floor(v).toString();
    return negative ? `-${s}` : s;
  }
  let tier = 0;
  while (v >= 1000 && tier < SUFFIXES.length - 1) {
    v /= 1000;
    tier++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const s = `${localizeDecimals(v.toFixed(digits))}${SUFFIXES[tier]}`;
  return negative ? `-${s}` : s;
}

/** "$1.23M" (EN) / "1,23M $" symbol-after with a narrow no-break space (FR). */
export function formatMoney(value: number): string {
  const n = formatNumber(value);
  return currentLang() === 'fr' ? `${n} $` : `$${n}`;
}

export function formatRate(value: number): string {
  return `${formatNumber(value)}/s`;
}

/** 3672 -> "1h 1m", 90 -> "1m 30s"; FR uses "j" for days. */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  const dayUnit = currentLang() === 'fr' ? 'j' : 'd';
  return `${d}${dayUnit} ${h % 24}h`;
}
