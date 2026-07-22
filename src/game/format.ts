const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 1234 -> "1.23K", 5 -> "5", 1234567 -> "1.23M" */
export function formatNumber(value: number): string {
  if (!isFinite(value)) return '∞';
  const negative = value < 0;
  let v = Math.abs(value);
  if (v < 1000) {
    const s = v < 10 && v % 1 !== 0 ? v.toFixed(1) : Math.floor(v).toString();
    return negative ? `-${s}` : s;
  }
  let tier = 0;
  while (v >= 1000 && tier < SUFFIXES.length - 1) {
    v /= 1000;
    tier++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const s = `${v.toFixed(digits)}${SUFFIXES[tier]}`;
  return negative ? `-${s}` : s;
}

export function formatMoney(value: number): string {
  return `$${formatNumber(value)}`;
}

export function formatRate(value: number): string {
  return `${formatNumber(value)}/s`;
}

/** 3672 -> "1h 1m", 90 -> "1m 30s" */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
