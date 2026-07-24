/**
 * icons.ts — UI icons (tabs, HUD, badges, actions).
 *
 * Hand-drawn cartoon SVG mini-illustrations per the design system:
 * saturated fills + ink (#2d2440) rounded outlines, simple cel-shading,
 * one small white highlight, no SVG filters. Gradient IDs are prefixed
 * `ic-<name>-…` because everything is inlined in a shared DOM.
 *
 * Pure string building — no imports, no DOM, no randomness. Output is
 * memoised by `name:size` so the 2 Hz re-render reuses cached markup.
 */

export type IconName =
  | 'map'
  | 'projects'
  | 'team'
  | 'office'
  | 'upgrades'
  | 'stats'
  | 'coin'
  | 'boost'
  | 'salary'
  | 'income-up'
  | 'income-down'
  | 'clock'
  | 'energy'
  | 'check'
  | 'star'
  | 'hire'
  | 'fire-worker'
  | 'train'
  | 'dice'
  | 'megaphone'
  | 'pencil'
  | 'floor-up'
  | 'lock'
  | 'sound-on'
  | 'sound-off'
  | 'sparkles'
  | 'speed'
  | 'save-export'
  | 'save-import'
  | 'trash';

// ---------------------------------------------------------------------------
// Palette (design system tokens + local cel tones)
// ---------------------------------------------------------------------------

const INK = '#2d2440';
const CREAM = '#fff8ec';
const GOLD = '#ffc93c';
const GOLD_DEEP = '#f0a818';
const GREEN = '#2fbf6b';
const GREEN_DEEP = '#1f9e53';
const RED = '#ff5d55';
const RED_DEEP = '#e03b33';
const BLUE = '#38b6ff';
const BLUE_DEEP = '#1e8fd6';
const ORANGE = '#ff8a2a';
const CYAN = '#4ad7e8';
const SKIN = '#ffd9a8';
const SKIN_DEEP = '#f4c890';
const WOOD = '#c98a4b';

/** Shared ink outline attributes (~1.6 for a 24 viewBox, rounded). */
const O =
  `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

/** Vertical two-stop linearGradient with a per-icon prefixed ID. */
function lg(id: string, from: string, to: string): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${from}"/>` +
    `<stop offset="1" stop-color="${to}"/></linearGradient>`
  );
}

/** Small white highlight stroke. */
function hi(d: string, w = 1.4, op = 0.75): string {
  return `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** Four-point sparkle star. */
function spark4(cx: number, cy: number, r: number, fill: string): string {
  const q = r * 0.22;
  const d =
    `M${cx} ${cy - r} Q${cx + q} ${cy - q} ${cx + r} ${cy} ` +
    `Q${cx + q} ${cy + q} ${cx} ${cy + r} Q${cx - q} ${cy + q} ${cx - r} ${cy} ` +
    `Q${cx - q} ${cy - q} ${cx} ${cy - r} Z`;
  return `<path d="${d}" fill="${fill}" ${O} stroke-width="1.3"/>`;
}

/** Shipping crate parts shared by save-export / save-import. */
function crate(n: string): { defs: string; inside: string; front: string } {
  return {
    defs: lg(`ic-${n}-box`, '#e8b478', '#d9a066'),
    inside: `<rect x="5.4" y="11.8" width="13.2" height="3" rx="0.8" fill="#9a6633" ${O}/>`,
    front:
      `<rect x="4.6" y="13.8" width="14.8" height="6.6" rx="1.2" fill="url(#ic-${n}-box)" ${O}/>` +
      `<path d="M12 13.8v6.6" fill="none" stroke="${WOOD}" stroke-width="1.4"/>` +
      hi('M6.2 15.4h3.6'),
  };
}

// ---------------------------------------------------------------------------
// Drawings — each returns the inner SVG body for a 24×24 viewBox
// ---------------------------------------------------------------------------

const DRAW: Record<IconName, () => string> = {
  map: () =>
    lg('ic-map-paper', '#eef7d8', '#cfe8a8') +
    `<path d="M3.2 5.2 9 3.6l6 1.6 5.8-1.6v15L15 20.4 9 18.8l-5.8 1.6Z" fill="url(#ic-map-paper)" ${O}/>` +
    `<path d="M9 3.6l6 1.6v15L9 18.8Z" fill="#c4e094"/>` +
    `<path d="M9 3.6v15.2M15 5.2v15.2" fill="none" stroke="${INK}" stroke-width="1" opacity="0.4"/>` +
    `<path d="M4.8 16.8C7.6 13 10.6 15.6 12.6 11.6c1.4-2.8 3.6-2.6 5-4.4" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M4.8 16.8C7.6 13 10.6 15.6 12.6 11.6c1.4-2.8 3.6-2.6 5-4.4" fill="none" stroke="#ffb02e" stroke-width="1" stroke-dasharray="2 1.8" stroke-linecap="round"/>` +
    `<path d="M3.2 5.2 9 3.6l6 1.6 5.8-1.6v15L15 20.4 9 18.8l-5.8 1.6Z" fill="none" ${O}/>` +
    `<path d="M17.6 14.6c-2.1-2.5-3.1-4-3.1-5.7a3.1 3.1 0 1 1 6.2 0c0 1.7-1 3.2-3.1 5.7Z" fill="${RED}" ${O}/>` +
    `<circle cx="17.6" cy="8.8" r="1.1" fill="${CREAM}" stroke="${INK}" stroke-width="1"/>` +
    hi('M4.7 6.1l3.2-.9'),

  projects: () =>
    lg('ic-projects-board', '#5cc1ff', BLUE) +
    `<rect x="5" y="3.6" width="14" height="17" rx="2.4" fill="url(#ic-projects-board)" ${O}/>` +
    `<path d="M16.6 4.4h.6a1.8 1.8 0 0 1 1.8 1.8v12.6" fill="none" stroke="${BLUE_DEEP}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<rect x="7.2" y="6.6" width="9.6" height="11.6" rx="1.2" fill="${CREAM}" stroke="${INK}" stroke-width="1.3"/>` +
    `<rect x="9.2" y="2.2" width="5.6" height="3.4" rx="1.4" fill="${GOLD}" ${O}/>` +
    `<path d="M9.3 12.4l1.8 1.8 3.6-3.9" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M9.4 16.4h5.2" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>` +
    hi('M6.1 6.4v3'),

  team: () =>
    `<path d="M11.4 19.6c0-3 1.8-4.7 4.4-4.7s4.4 1.7 4.4 4.7Z" fill="#ff6fa9" ${O}/>` +
    `<circle cx="15.8" cy="8.6" r="3.3" fill="${SKIN_DEEP}" ${O}/>` +
    `<circle cx="14.9" cy="8.3" r="0.5" fill="${INK}"/>` +
    `<circle cx="16.9" cy="8.3" r="0.5" fill="${INK}"/>` +
    `<path d="M15.1 9.8q.8.8 1.6 0" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<path d="M3.6 20c0-3.2 2-5 5-5s5 1.8 5 5Z" fill="${BLUE}" ${O}/>` +
    `<circle cx="8.6" cy="9.4" r="3.6" fill="${SKIN}" ${O}/>` +
    `<circle cx="7.5" cy="9.1" r="0.55" fill="${INK}"/>` +
    `<circle cx="9.7" cy="9.1" r="0.55" fill="${INK}"/>` +
    `<path d="M7.6 10.7q1 1 2 0" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` +
    hi('M6.6 7.2a2.6 2.6 0 0 1 1.6-.9', 1.2),

  office: () =>
    lg('ic-office-wall', '#6fa7ff', '#4f8df9') +
    `<ellipse cx="12" cy="20.8" rx="7.6" ry="1.3" fill="${INK}" opacity="0.12"/>` +
    `<path d="M8 3.4V1.8" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<circle cx="8" cy="1.7" r="0.8" fill="${GOLD}" stroke="${INK}" stroke-width="1"/>` +
    `<rect x="6.4" y="5" width="11.2" height="15.4" rx="0.8" fill="url(#ic-office-wall)" ${O}/>` +
    `<rect x="14.8" y="5.4" width="2.4" height="14.6" fill="#3b6fd6"/>` +
    `<rect x="5.4" y="3.2" width="13.2" height="2.2" rx="1" fill="#3b6fd6" ${O}/>` +
    `<rect x="8.3" y="6.9" width="2.7" height="2.3" rx="0.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="13.1" y="6.9" width="2.7" height="2.3" rx="0.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="8.3" y="10.2" width="2.7" height="2.3" rx="0.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="13.1" y="10.2" width="2.7" height="2.3" rx="0.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="8.3" y="13.5" width="2.7" height="2.3" rx="0.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="13.1" y="13.5" width="2.7" height="2.3" rx="0.4" fill="#ffe07a" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="10.7" y="16.6" width="2.6" height="3.8" rx="0.6" fill="#e06a00" stroke="${INK}" stroke-width="1.2"/>` +
    hi('M7.4 6.2v3.4', 1.2, 0.6),

  upgrades: () =>
    lg('ic-upgrades-potion', '#b477ff', '#8b46e4') +
    `<rect x="10.3" y="3.4" width="3.4" height="6" fill="#e9defc" ${O}/>` +
    `<circle cx="12" cy="14.8" r="6.6" fill="url(#ic-upgrades-potion)" ${O}/>` +
    `<rect x="9.7" y="2" width="4.6" height="2.6" rx="0.9" fill="${WOOD}" ${O}/>` +
    `<circle cx="10.4" cy="12" r="0.9" fill="#ffffff" opacity="0.75"/>` +
    `<circle cx="13.8" cy="13.2" r="0.6" fill="#ffffff" opacity="0.7"/>` +
    `<circle cx="12.4" cy="17.2" r="0.7" fill="#ffffff" opacity="0.45"/>` +
    `<path d="M20 3.8v3.2M18.4 5.4h3.2" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M4.2 6.6v2.6M2.9 7.9h2.6" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round"/>` +
    hi('M8.2 13.4a4.6 4.6 0 0 1 2.2-2.7', 1.5, 0.85),

  stats: () =>
    lg('ic-stats-gold', '#ffe07a', GOLD) +
    `<rect x="4.4" y="14" width="3.6" height="6" rx="0.7" fill="${BLUE}" ${O}/>` +
    `<rect x="9.7" y="10.6" width="3.6" height="9.4" rx="0.7" fill="${GREEN}" ${O}/>` +
    `<rect x="15" y="7" width="3.6" height="13" rx="0.7" fill="url(#ic-stats-gold)" ${O}/>` +
    `<path d="M3.4 20.4h17.2" fill="none" ${O}/>` +
    `<path d="M4.6 11.6 10.2 8.2l3.6 1.8 4.8-4.6" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M4.6 11.6 10.2 8.2l3.6 1.8 4.8-4.6" fill="none" stroke="${RED}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M20.4 3.4l-.5 3.7-3.1-2.2Z" fill="${RED}" ${O} stroke-width="1.3"/>` +
    hi('M16 8.4v2.8', 1.2),

  coin: () =>
    lg('ic-coin-face', '#ffe07a', GOLD) +
    `<circle cx="12" cy="12" r="8.6" fill="url(#ic-coin-face)" ${O}/>` +
    `<circle cx="12" cy="12" r="6.2" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.4"/>` +
    `<path d="M12 8.1v7.8" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<path d="M14.2 9.7c-.6-.9-3.5-1-4.2.1-.6 1.1.5 1.7 1.7 2 1.2.3 2.6.9 2.1 2.2-.5 1.3-3.5 1.2-4.3.1" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` +
    hi('M7.2 8.6a5.6 5.6 0 0 1 2.6-2.2', 1.5, 0.85),

  boost: () =>
    lg('ic-boost-body', '#ffb35c', ORANGE) +
    `<g transform="rotate(45 12 12)">` +
    `<path d="M10.7 17.9c-.6 1.9-.2 3.4 1.3 4.8 1.5-1.4 1.9-2.9 1.3-4.8Z" fill="${CYAN}" ${O} stroke-width="1.4"/>` +
    `<path d="M11.4 18.4c-.2 1-.1 1.9.6 2.8.7-.9.8-1.8.6-2.8Z" fill="#ffffff" opacity="0.85"/>` +
    `<path d="M8.4 12.4 6.1 16.6l2.7-.7Z" fill="${RED}" ${O} stroke-width="1.4"/>` +
    `<path d="M15.6 12.4l2.3 4.2-2.7-.7Z" fill="${RED}" ${O} stroke-width="1.4"/>` +
    `<path d="M12 2.6c2.8 1.8 4 4.6 4 8 0 2.4-.6 4.4-1.6 6h-4.8C8.6 15 8 13 8 10.6c0-3.4 1.2-6.2 4-8Z" fill="url(#ic-boost-body)" ${O}/>` +
    `<circle cx="12" cy="9.4" r="1.9" fill="#bfeaff" ${O} stroke-width="1.4"/>` +
    hi('M9.6 7.2c.3-1.6.9-2.9 1.8-4') +
    `</g>`,

  salary: () =>
    lg('ic-salary-bill', '#49d183', GREEN) +
    `<rect x="2.8" y="7" width="18.4" height="10" rx="1.6" fill="url(#ic-salary-bill)" ${O}/>` +
    `<rect x="4.7" y="8.7" width="14.6" height="6.6" rx="0.9" fill="none" stroke="${GREEN_DEEP}" stroke-width="1.2"/>` +
    `<circle cx="12" cy="12" r="3.1" fill="${CREAM}" stroke="${INK}" stroke-width="1.3"/>` +
    `<path d="M12 10.2v3.6" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M13.2 11c-.3-.5-1.8-.5-2.1 0-.3.6.3.9 1 1 .6.2 1.3.4 1 1-.3.6-1.9.6-2.2.1" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
    hi('M4.6 8h3', 1.2),

  'income-up': () =>
    `<path d="M12 3.6 19.2 11h-3.7v8.8H8.5V11H4.8Z" fill="${GREEN}"/>` +
    `<path d="M12 3.6 19.2 11h-3.7v8.8H12Z" fill="${GREEN_DEEP}"/>` +
    `<path d="M12 3.6 19.2 11h-3.7v8.8H8.5V11H4.8Z" fill="none" ${O}/>` +
    hi('M10 11.2v6.6'),

  'income-down': () =>
    `<path d="M12 20.4 4.8 13h3.7V4.2h7V13h3.7Z" fill="${RED}"/>` +
    `<path d="M12 20.4 19.2 13h-3.7V4.2H12Z" fill="${RED_DEEP}"/>` +
    `<path d="M12 20.4 4.8 13h3.7V4.2h7V13h3.7Z" fill="none" ${O}/>` +
    hi('M10 5.8v6.4'),

  clock: () =>
    `<circle cx="7.2" cy="4.6" r="2" fill="${GOLD}" ${O} stroke-width="1.4"/>` +
    `<circle cx="16.8" cy="4.6" r="2" fill="${GOLD}" ${O} stroke-width="1.4"/>` +
    `<path d="M7 19.3l-1.7 2.1M17 19.3l1.7 2.1" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<circle cx="12" cy="13" r="7.6" fill="${BLUE}" ${O}/>` +
    `<circle cx="12" cy="13" r="5.6" fill="${CREAM}" stroke="${INK}" stroke-width="1.2"/>` +
    `<path d="M12 13V9.7M12 13l2.5 1.6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<circle cx="12" cy="13" r="0.7" fill="${INK}"/>` +
    hi('M6.3 10.2a6.3 6.3 0 0 1 2.3-2.7', 1.3, 0.8),

  energy: () =>
    lg('ic-energy-bolt', '#ffe07a', '#ffb02e') +
    `<path d="M13.2 2.4h3l-2.5 6.9h5.2L8.4 21.8l1.6-8.6H5.1Z" fill="url(#ic-energy-bolt)" ${O}/>` +
    `<path d="M13.7 9.3h4l-8 10.6 1.4-7.3" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>` +
    hi('M12.6 4.6 9 9.6', 1.5, 0.85),

  check: () =>
    lg('ic-check-badge', '#49d183', GREEN) +
    `<circle cx="12" cy="12" r="8.6" fill="url(#ic-check-badge)" ${O}/>` +
    `<circle cx="12" cy="12" r="6.9" fill="none" stroke="${GREEN_DEEP}" stroke-width="1.2"/>` +
    `<path d="M8 12.4l2.7 2.8 5.4-6" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M8 12.4l2.7 2.8 5.4-6" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>` +
    hi('M6.6 8.2a6.4 6.4 0 0 1 2-1.7', 1.3, 0.8),

  star: () =>
    lg('ic-star-gold', '#ffe07a', GOLD) +
    `<path d="M12 3.2l2.6 5.6 6.2.8-4.6 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.6-4.2 6.2-.8Z" fill="url(#ic-star-gold)"/>` +
    `<path d="M12 3.2l2.6 5.6 6.2.8-4.6 4.2 1.2 6-5.4-3Z" fill="${GOLD_DEEP}"/>` +
    `<path d="M12 3.2l2.6 5.6 6.2.8-4.6 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.6-4.2 6.2-.8Z" fill="none" ${O}/>` +
    hi('M9.4 9.6 10.8 7', 1.3, 0.85),

  hire: () =>
    `<rect x="17.6" y="10" width="4.8" height="4.4" rx="0.9" fill="${ORANGE}" ${O}/>` +
    `<rect x="12.6" y="9.8" width="5.6" height="4.2" rx="2" fill="${SKIN_DEEP}" ${O}/>` +
    `<rect x="1.6" y="10.4" width="4.8" height="4.4" rx="0.9" fill="${BLUE}" ${O}/>` +
    `<rect x="5.8" y="10.6" width="7" height="4.2" rx="2.1" fill="${SKIN}" ${O}/>` +
    `<path d="M8.4 11.2v1.5M10 11.2v1.5M11.6 11.2v1.5" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<path d="M10.6 7.4l-.7-1.5M13.4 7.3l.7-1.5M12 6.8V5.2" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>` +
    hi('M6.8 13.4c.5.4 1.1.5 1.7.4', 1.2),

  'fire-worker': () =>
    `<rect x="4.6" y="3.6" width="9.2" height="16.8" rx="1" fill="${WOOD}" ${O}/>` +
    `<rect x="6.4" y="5.4" width="5.6" height="15" fill="#8a5a30" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="11" cy="12.8" r="0.7" fill="${GOLD}" stroke="${INK}" stroke-width="0.9"/>` +
    `<path d="M10.4 9.6h5.4V6.9L21.6 12l-5.8 5.1v-2.7h-5.4Z" fill="${RED}" ${O}/>` +
    `<path d="M15.8 14.4v2.7L21.6 12h-2.4Z" fill="${RED_DEEP}"/>` +
    `<path d="M10.4 9.6h5.4V6.9L21.6 12l-5.8 5.1v-2.7h-5.4Z" fill="none" ${O}/>` +
    hi('M5.6 5v3'),

  train: () =>
    lg('ic-train-cap', '#6aa6ff', '#4f8df9') +
    `<path d="M7.6 10.6v3.6c0 1.8 8.8 1.8 8.8 0v-3.6Z" fill="#3b6fd6" ${O}/>` +
    `<path d="M12 4.6l9.2 4.2L12 13 2.8 8.8Z" fill="url(#ic-train-cap)" ${O}/>` +
    `<path d="M21.2 8.8v5.2" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="21.2" cy="15.2" r="1.2" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="12" cy="4.7" r="0.7" fill="${GOLD}" stroke="${INK}" stroke-width="0.9"/>` +
    hi('M6.2 8 10.6 6'),

  dice: () =>
    lg('ic-dice-face', '#ff7a6e', RED) +
    `<g transform="rotate(-8 12 12)">` +
    `<rect x="4.8" y="4.8" width="14.4" height="14.4" rx="3.4" fill="url(#ic-dice-face)" ${O}/>` +
    `<path d="M19.2 9.4v6.4a3.4 3.4 0 0 1-3.4 3.4H9.4" fill="none" stroke="${RED_DEEP}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<circle cx="8.5" cy="8.5" r="1.6" fill="#ffffff" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="12" cy="12" r="1.6" fill="#ffffff" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="15.5" cy="15.5" r="1.6" fill="#ffffff" stroke="${INK}" stroke-width="1.1"/>` +
    hi('M6.4 7.4a2.4 2.4 0 0 1 1.6-1.6', 1.3) +
    `</g>`,

  megaphone: () =>
    lg('ic-megaphone-cone', '#ffb35c', ORANGE) +
    `<path d="M8 13.3l1.2 4.6a1.3 1.3 0 0 0 2.5-.7l-1-3.7Z" fill="#e06a00" ${O} stroke-width="1.4"/>` +
    `<path d="M3.4 9.6h3.2L17 4.8v13.2L6.6 13.2H3.4Z" fill="url(#ic-megaphone-cone)" ${O}/>` +
    `<ellipse cx="17" cy="11.4" rx="1.7" ry="6.7" fill="#e06a00" ${O} stroke-width="1.4"/>` +
    `<path d="M20.4 6.4l1.7-1.2M20.9 11.4h2M20.4 16.4l1.7 1.2" fill="none" stroke="${GOLD}" stroke-width="1.7" stroke-linecap="round"/>` +
    hi('M7.6 9 13 6.7'),

  pencil: () =>
    `<g transform="rotate(45 12 12)">` +
    `<rect x="9.4" y="1" width="5.2" height="2.8" rx="1" fill="#ff8fae" ${O} stroke-width="1.4"/>` +
    `<rect x="9.4" y="3.2" width="5.2" height="11.2" fill="${GOLD}"/>` +
    `<rect x="9.4" y="3.2" width="1.7" height="11.2" fill="#ffe07a"/>` +
    `<rect x="12.9" y="3.2" width="1.7" height="11.2" fill="${GOLD_DEEP}"/>` +
    `<rect x="9.4" y="3.2" width="5.2" height="11.2" fill="none" ${O}/>` +
    `<path d="M9.4 14.4h5.2L12 19.2Z" fill="#f2d2a0" ${O} stroke-width="1.4"/>` +
    `<path d="M11.2 17.6 12 19.2l.8-1.6Z" fill="${INK}"/>` +
    `</g>` +
    `<path d="M3 20.6q1.5-1.4 3 0t3 0" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" opacity="0.75"/>` +
    hi('M9.2 10.2l2.6-2.6', 1.2),

  'floor-up': () =>
    lg('ic-floor-up-steel', '#ffe07a', GOLD) +
    `<rect x="3.6" y="19.2" width="9.6" height="1.6" rx="0.8" fill="#9aa0b4" ${O} stroke-width="1.3"/>` +
    `<rect x="7.2" y="7.2" width="2.8" height="12.2" fill="url(#ic-floor-up-steel)" ${O} stroke-width="1.4"/>` +
    `<path d="M7.2 9.4l2.8 2.6M10 9.4l-2.8 2.6M7.2 13l2.8 2.6M10 13l-2.8 2.6" fill="none" stroke="#c9922a" stroke-width="1" stroke-linecap="round"/>` +
    `<rect x="3.4" y="7.4" width="3.2" height="2.8" rx="0.5" fill="#8f94a8" ${O} stroke-width="1.3"/>` +
    `<rect x="4.2" y="4.8" width="17" height="2.4" rx="1" fill="${GOLD}" ${O}/>` +
    `<path d="M18.6 7.2v5.6" fill="none" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M18.6 12.6a2 2 0 1 1-2 2" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` +
    hi('M5.6 5.6h6'),

  lock: () =>
    lg('ic-lock-body', '#ffe07a', GOLD) +
    `<path d="M8.2 10.4V7.9a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="M8.2 10.4V7.9a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="${GOLD_DEEP}" stroke-width="2.1" stroke-linecap="round"/>` +
    `<rect x="5.6" y="10.2" width="12.8" height="9.6" rx="2.4" fill="url(#ic-lock-body)" ${O}/>` +
    `<path d="M6.6 17.7h10.8" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="12" cy="13.9" r="1.5" fill="${INK}"/>` +
    `<rect x="11.3" y="14.6" width="1.4" height="2.7" rx="0.7" fill="${INK}"/>` +
    hi('M6.9 12v2.6'),

  'sound-on': () =>
    lg('ic-sound-on-cone', '#5cc1ff', BLUE) +
    `<rect x="3.4" y="9.4" width="3.6" height="5.2" rx="0.8" fill="${BLUE_DEEP}" ${O} stroke-width="1.4"/>` +
    `<path d="M7 9.6l5.2-4.4v13.6L7 14.4Z" fill="url(#ic-sound-on-cone)" ${O}/>` +
    `<path d="M15.4 9.3a4.3 4.3 0 0 1 0 5.4" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M18 7a7.9 7.9 0 0 1 0 10" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/>` +
    hi('M8.4 10.2l2.4-2', 1.2),

  'sound-off': () =>
    lg('ic-sound-off-cone', '#5cc1ff', BLUE) +
    `<rect x="3.4" y="9.4" width="3.6" height="5.2" rx="0.8" fill="${BLUE_DEEP}" ${O} stroke-width="1.4"/>` +
    `<path d="M7 9.6l5.2-4.4v13.6L7 14.4Z" fill="url(#ic-sound-off-cone)" ${O}/>` +
    hi('M8.4 10.2l2.4-2', 1.2) +
    `<path d="M4.8 4.6 19.6 19.4" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M4.8 4.6 19.6 19.4" fill="none" stroke="${RED}" stroke-width="1.9" stroke-linecap="round"/>`,

  sparkles: () =>
    lg('ic-sparkles-gold', '#ffe07a', GOLD) +
    spark4(9.8, 12.6, 6.6, 'url(#ic-sparkles-gold)') +
    spark4(17.8, 6.2, 3.1, GOLD) +
    spark4(17.4, 17.6, 2.7, '#ffe07a') +
    `<circle cx="8.2" cy="10.8" r="1" fill="#ffffff" opacity="0.9"/>`,

  speed: () =>
    lg('ic-speed-chev', '#8ae9f4', CYAN) +
    `<path d="M4.6 4.8 11.8 12l-7.2 7.2v-4.6L7.2 12 4.6 9.4Z" fill="url(#ic-speed-chev)" ${O}/>` +
    `<path d="M11.8 4.8 19 12l-7.2 7.2v-4.6L14.4 12l-2.6-2.6Z" fill="url(#ic-speed-chev)" ${O}/>` +
    `<path d="M11.8 12l-7.2 7.2M19 12l-7.2 7.2" fill="none" stroke="#1fb3c6" stroke-width="0.9" opacity="0.6"/>` +
    `<path d="M20.4 9.4h1.8M20.4 14.6h1.8" fill="none" stroke="${CYAN}" stroke-width="1.6" stroke-linecap="round"/>` +
    hi('M5.6 6.6l2.2 2.2', 1.2, 0.9),

  'save-export': (() => {
    const c = crate('save-export');
    return () =>
      c.defs +
      lg('ic-save-export-arrow', '#57d68d', GREEN) +
      c.inside +
      `<path d="M12 2.4 16.8 7.6h-2.9V14h-3.8V7.6H7.2Z" fill="url(#ic-save-export-arrow)" ${O}/>` +
      c.front;
  })(),

  'save-import': (() => {
    const c = crate('save-import');
    return () =>
      c.defs +
      lg('ic-save-import-arrow', '#63c4ff', BLUE) +
      c.inside +
      `<path d="M12 15.4 7.2 10.2h2.9V3.8h3.8v6.4h2.9Z" fill="url(#ic-save-import-arrow)" ${O}/>` +
      c.front;
  })(),

  trash: () =>
    lg('ic-trash-body', '#ff7a6e', RED) +
    `<rect x="9.8" y="2.4" width="4.4" height="2" rx="0.9" fill="${RED_DEEP}" ${O} stroke-width="1.4"/>` +
    `<path d="M6 8.4h12l-1 10.8a1.9 1.9 0 0 1-1.9 1.7H8.9A1.9 1.9 0 0 1 7 19.2Z" fill="url(#ic-trash-body)" ${O}/>` +
    `<path d="M9.6 10.6l.3 7.6M12 10.6v7.6M14.4 10.6l-.3 7.6" fill="none" stroke="#ffd0cd" stroke-width="1.4" stroke-linecap="round"/>` +
    `<rect x="4.4" y="4.2" width="15.2" height="2.8" rx="1.4" fill="${RED}" ${O}/>` +
    hi('M5.8 5.4h3.4'),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();

/** UI icon as an inline SVG string. Unknown name → simple ink dot, never throw. */
export function icon(name: IconName, size = 20): string {
  const key = `${name}:${size}`;
  const hitS = cache.get(key);
  if (hitS !== undefined) return hitS;
  const draw = (DRAW as Record<string, (() => string) | undefined>)[name];
  const body = draw ? draw() : `<circle cx="12" cy="12" r="3.2" fill="${INK}"/>`;
  const out =
    `<svg class="icon icon-${name}" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  cache.set(key, out);
  return out;
}
