/**
 * officeScene.ts — wallpaper decor for the Office tab (chantier 2 of the
 * design system).
 *
 * The Office tab shows the company building in vertical cut (Tiny Tower
 * style): roof band, floors (wall band + desk grid), lobby band. Each
 * purchased wallpaper reskins the whole building. This module provides:
 *
 *   - officeWallVars(id)        → inline CSS custom properties string
 *   - wallDecor(id, floorIndex) → 3–5 standalone <svg> items for a wall band
 *   - roofDecor(id) / lobbyDecor(id)
 *
 * Pure string building — no DOM, no timers, no randomness. Everything is
 * memoised because the 2 Hz re-render asks for these on every rebuild.
 * Small animations are CSS-driven: this module only tags groups with
 * `os-anim-bob`, `os-anim-twinkle` and `os-anim-neon` classes.
 *
 * Design-system rules: ink outlines #2d2440, cel shading, ellipse drop
 * shadows under grounded objects, no SVG filters, gradient IDs prefixed
 * `os-<wallpaper>-<item>`.
 */

// ---------------------------------------------------------------------------
// Global tones & tiny helpers
// ---------------------------------------------------------------------------

const INK = '#2d2440';

/** Standard outline attributes for ~50 px objects. */
const S = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
/** Finer outline for small interior details. */
const S1 = `stroke="${INK}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"`;

/** Wrap a decor item into a standalone, sized <svg>. */
function item(w: number, h: number, body: string, defs = ''): string {
  const d = defs ? `<defs>${defs}</defs>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d}${body}</svg>`;
}

/** Soft drop shadow under a grounded object (design-system rule). */
function shadow(cx: number, cy: number, rx: number, ry = 3): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity=".12"/>`;
}

/** Two-stop linear gradient (vertical by default). */
function lg(id: string, from: string, to: string, horiz = false): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
  );
}

/** Colored stroke with an ink outline underneath (chunky tube look). */
function tube(d: string, color: string, w: number): string {
  const cap = 'stroke-linecap="round" stroke-linejoin="round"';
  return (
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2.4}" ${cap}/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" ${cap}/>`
  );
}

/** Neon tube: soft wide glow pass + bright core pass. No filters. */
function neonPath(d: string, color: string, w = 2, fill = 'none'): string {
  const cap = 'stroke-linecap="round" stroke-linejoin="round"';
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w + 4}" ${cap} opacity=".25"/>` +
    `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${w}" ${cap}/>`
  );
}

// ---------------------------------------------------------------------------
// CSS custom properties per wallpaper
// ---------------------------------------------------------------------------

const VAR_KEYS = [
  '--wall-bg',
  '--wall-text',
  '--wall-accent',
  '--floor-surface',
  '--tile-bg',
  '--tile-border',
  '--tile-text',
  '--sep-color',
  '--roof-bg',
  '--lobby-bg',
] as const;

type VarKey = (typeof VAR_KEYS)[number];
type WallVars = Record<VarKey, string>;

const VARS: Record<string, WallVars> = {
  // Bare Concrete — bright, friendly raw-concrete startup den.
  concrete: {
    '--wall-bg':
      'repeating-linear-gradient(90deg, rgba(45,36,64,.07) 0 2px, rgba(255,255,255,0) 2px 68px), linear-gradient(180deg, #d2d8e1, #b9c1cd)',
    '--wall-text': '#2d2440',
    '--wall-accent': '#ff8a2a',
    '--floor-surface':
      'repeating-linear-gradient(90deg, rgba(45,36,64,.06) 0 2px, rgba(255,255,255,0) 2px 90px), linear-gradient(180deg, #aeb8c6, #9ca7b7)',
    '--tile-bg': 'rgba(255,255,255,.55)',
    '--tile-border': 'rgba(45,36,64,.28)',
    '--tile-text': '#3d3557',
    '--sep-color': '#8e99a9',
    '--roof-bg': 'linear-gradient(180deg, #a3aebc, #939eae)',
    '--lobby-bg': 'linear-gradient(180deg, #c6cdd7, #b0b9c6)',
  },
  // Startup White — clean incubator, big daylight.
  startup: {
    '--wall-bg': 'linear-gradient(180deg, #ffffff, #edf3f9)',
    '--wall-text': '#2d2440',
    '--wall-accent': '#38b6ff',
    '--floor-surface':
      'repeating-linear-gradient(45deg, rgba(45,36,64,.045) 0 6px, rgba(255,255,255,0) 6px 12px), linear-gradient(180deg, #e9edf3, #dde3eb)',
    '--tile-bg': 'rgba(255,255,255,.78)',
    '--tile-border': 'rgba(56,182,255,.45)',
    '--tile-text': '#43436b',
    '--sep-color': '#c8d3e0',
    '--roof-bg': 'linear-gradient(180deg, #e0e8f1, #cfd9e6)',
    '--lobby-bg': 'linear-gradient(180deg, #f7fafd, #e5ecf4)',
  },
  // Urban Jungle — living wall, warm parquet, soft green light.
  jungle: {
    '--wall-bg':
      'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 14px, rgba(255,255,255,0) 14px 28px), linear-gradient(180deg, #4cae6d, #35804e)',
    '--wall-text': '#f0ffe6',
    '--wall-accent': '#a5e880',
    '--floor-surface':
      'repeating-linear-gradient(90deg, rgba(45,36,64,.12) 0 1.5px, rgba(255,255,255,0) 1.5px 34px), linear-gradient(180deg, #e6c592, #d3ab73)',
    '--tile-bg': 'rgba(255,252,240,.6)',
    '--tile-border': 'rgba(38,110,66,.5)',
    '--tile-text': '#3e5030',
    '--sep-color': '#2f6b43',
    '--roof-bg': 'linear-gradient(180deg, #72c087, #519f6a)',
    '--lobby-bg': 'linear-gradient(180deg, #58a970, #3f8a55)',
  },
  // Sunset Loft — red brick, golden hour through big windows.
  sunset: {
    '--wall-bg':
      'repeating-linear-gradient(0deg, rgba(45,36,64,.20) 0 1.5px, rgba(255,255,255,0) 1.5px 12px), repeating-linear-gradient(90deg, rgba(45,36,64,.12) 0 1.5px, rgba(255,255,255,0) 1.5px 26px), linear-gradient(180deg, #cb6c4f, #a84f3d)',
    '--wall-text': '#ffe9d5',
    '--wall-accent': '#ffb37b',
    '--floor-surface':
      'repeating-linear-gradient(90deg, rgba(24,14,34,.28) 0 1.5px, rgba(255,255,255,0) 1.5px 30px), linear-gradient(180deg, #8c5c3b, #6f462c)',
    '--tile-bg': 'rgba(255,214,170,.2)',
    '--tile-border': 'rgba(255,178,120,.42)',
    '--tile-text': '#ffd9bc',
    '--sep-color': '#7a3f30',
    '--roof-bg': 'linear-gradient(180deg, #b3583f, #95452f)',
    '--lobby-bg': 'linear-gradient(180deg, #b05a41, #8f4632)',
  },
  // Neon Arcade — the one truly dark skin. Own the contrast.
  neon: {
    '--wall-bg': 'linear-gradient(180deg, #251647, #180e31)',
    '--wall-text': '#eaddff',
    '--wall-accent': '#ff4fd8',
    '--floor-surface':
      'repeating-linear-gradient(90deg, rgba(255,79,216,.13) 0 1.5px, rgba(255,255,255,0) 1.5px 26px), repeating-linear-gradient(0deg, rgba(56,232,255,.10) 0 1.5px, rgba(255,255,255,0) 1.5px 18px), linear-gradient(180deg, #191036, #110b26)',
    '--tile-bg': 'rgba(64,38,110,.55)',
    '--tile-border': 'rgba(255,79,216,.45)',
    '--tile-text': '#d8c6ff',
    '--sep-color': '#0d0820',
    '--roof-bg': 'linear-gradient(180deg, #2b1852, #1d1140)',
    '--lobby-bg': 'linear-gradient(180deg, #2d1a54, #1c1038)',
  },
  // Zen Garden — shoji cream, tatami, raked sand.
  zen: {
    '--wall-bg':
      'repeating-linear-gradient(90deg, rgba(139,105,66,.5) 0 2px, rgba(255,255,255,0) 2px 30px), repeating-linear-gradient(0deg, rgba(139,105,66,.35) 0 2px, rgba(255,255,255,0) 2px 24px), linear-gradient(180deg, #f8f1de, #efe4c9)',
    '--wall-text': '#4c3f2a',
    '--wall-accent': '#7fb069',
    '--floor-surface':
      'repeating-linear-gradient(90deg, rgba(139,115,66,.13) 0 8px, rgba(255,255,255,0) 8px 16px), linear-gradient(180deg, #e9deb7, #dccf9f)',
    '--tile-bg': 'rgba(255,251,235,.66)',
    '--tile-border': 'rgba(139,115,66,.45)',
    '--tile-text': '#5f5138',
    '--sep-color': '#b9a87e',
    '--roof-bg': 'linear-gradient(180deg, #d9cca7, #c6b78d)',
    '--lobby-bg': 'linear-gradient(180deg, #f1e8d1, #e2d5b4)',
  },
  // Gold Executive — mahogany wainscot, marble, unapologetic bling.
  gold: {
    '--wall-bg':
      'linear-gradient(180deg, #f4e6cf 0%, #f4e6cf 22%, #d8b24f 22%, #d8b24f 27%, #7a4226 27%, #5c2f19 100%)',
    '--wall-text': '#ffe9b3',
    '--wall-accent': '#ffc93c',
    '--floor-surface':
      'repeating-linear-gradient(105deg, rgba(160,140,110,.2) 0 2px, rgba(255,255,255,0) 2px 42px), linear-gradient(180deg, #f6ecd9, #e9dcc0)',
    '--tile-bg': 'rgba(255,255,255,.6)',
    '--tile-border': 'rgba(202,162,77,.7)',
    '--tile-text': '#6b4a1f',
    '--sep-color': '#caa24d',
    '--roof-bg': 'linear-gradient(180deg, #e4c886, #d0ac5f)',
    '--lobby-bg': 'linear-gradient(180deg, #8a4c2c, #6b3a20)',
  },
};

// ---------------------------------------------------------------------------
// Decor items — Bare Concrete
// ---------------------------------------------------------------------------

function concreteWall(): string[] {
  const bulb = item(
    26,
    60,
    `<line x1="13" y1="0" x2="13" y2="24" stroke="#4a4468" stroke-width="1.5"/>` +
      `<rect x="9" y="24" width="8" height="8" rx="2" fill="#6a7486" ${S}/>` +
      `<circle cx="13" cy="41" r="12" fill="#ffe9a8" opacity=".4"/>` +
      `<circle cx="13" cy="41" r="9" fill="#fff3c4" ${S}/>` +
      `<path d="M10 41 q3 -4.5 6 0" fill="none" stroke="#e8b93c" stroke-width="1.2" stroke-linecap="round"/>`
  );
  const pipes = item(
    84,
    60,
    `<rect x="1" y="5" width="82" height="8" rx="4" fill="#9db0c4" ${S}/>` +
      `<line x1="6" y1="7.5" x2="78" y2="7.5" stroke="#ffffff" stroke-width="1.5" opacity=".5" stroke-linecap="round"/>` +
      `<rect x="16" y="3" width="6" height="12" rx="2" fill="#7f92a8" ${S}/>` +
      `<rect x="44" y="3" width="6" height="12" rx="2" fill="#7f92a8" ${S}/>` +
      `<rect x="63" y="11" width="9" height="32" rx="3" fill="#9db0c4" ${S}/>` +
      `<circle cx="67.5" cy="32" r="6" fill="#ff5d55" ${S}/>` +
      `<path d="M63.5 32 h8 M67.5 28 v8" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="67.5" cy="32" r="1.5" fill="#e04840" ${S1}/>`
  );
  const extinguisher = item(
    24,
    36,
    shadow(12, 33, 9) +
      `<path d="M7 12 c-4 4 -4 12 0 16" fill="none" stroke="#4a4468" stroke-width="2" stroke-linecap="round"/>` +
      `<rect x="11" y="8" width="3" height="4" fill="#6a7486" ${S1}/>` +
      `<path d="M8 8 h9 M8 5 h7" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<rect x="7" y="12" width="11" height="20" rx="4" fill="#ff5d55" ${S}/>` +
      `<path d="M13 13 c3 1 4 5 4 9 c0 4 -1 7 -3 9 h2 c2 -2 3 -5 3 -9 c0 -5 -2 -8 -6 -9 z" fill="#d94840" stroke="none"/>` +
      `<rect x="9" y="19" width="7" height="5" fill="#fff8ec" ${S1}/>`
  );
  const movingBox = item(
    42,
    32,
    shadow(21, 29, 17) +
      `<rect x="5" y="12" width="32" height="17" fill="#dfa35f" ${S}/>` +
      `<rect x="29" y="13" width="7" height="15" fill="#c9894a" stroke="none"/>` +
      `<path d="M5 12 L11 3 L23 5 L21 12 z" fill="#e8b57a" ${S}/>` +
      `<path d="M37 12 L33 4 L24 6 L26 12 z" fill="#cf9350" ${S}/>` +
      `<rect x="19" y="12" width="4" height="17" fill="#f0e0b0" opacity=".85" ${S1}/>` +
      `<path d="M9 18 h7 M9 22 h11" stroke="#4a4468" stroke-width="1.2" stroke-linecap="round"/>`
  );
  const cables = item(
    38,
    20,
    shadow(19, 17, 15) +
      `<ellipse cx="18" cy="11" rx="13" ry="6" fill="none" stroke="#5a6a7f" stroke-width="2.5"/>` +
      `<ellipse cx="18" cy="13" rx="10" ry="5" fill="none" stroke="#4a5a6f" stroke-width="2.5"/>` +
      `<path d="M30 11 c4 0 5 2 3 4" fill="none" stroke="#5a6a7f" stroke-width="2" stroke-linecap="round"/>` +
      `<rect x="32" y="13" width="4" height="5" rx="1" fill="#ffb02e" ${S1}/>`
  );
  const ladder = item(
    36,
    54,
    shadow(18, 51, 15) +
      `<polygon points="7,50 11,50 16,6 13,6" fill="#ffb02e" ${S}/>` +
      `<polygon points="29,50 25,50 20,6 23,6" fill="#ffb02e" ${S}/>` +
      `<rect x="13" y="16" width="10" height="3" fill="#e8a01f" ${S1}/>` +
      `<rect x="12" y="26" width="12" height="3" fill="#e8a01f" ${S1}/>` +
      `<rect x="11" y="36" width="14" height="3" fill="#e8a01f" ${S1}/>` +
      `<rect x="10" y="44" width="16" height="3" fill="#e8a01f" ${S1}/>` +
      `<rect x="13" y="3" width="10" height="5" rx="2" fill="#ffc93c" ${S}/>`
  );
  return [bulb, pipes, extinguisher, movingBox, cables, ladder];
}

function concreteRoof(): string[] {
  const ac = item(
    40,
    34,
    shadow(20, 31, 16) +
      `<rect x="6" y="26" width="4" height="4" fill="#7f92a8" ${S1}/>` +
      `<rect x="30" y="26" width="4" height="4" fill="#7f92a8" ${S1}/>` +
      `<rect x="4" y="6" width="32" height="22" rx="3" fill="#b7c2d0" ${S}/>` +
      `<circle cx="14" cy="17" r="7" fill="#8fa0b5" ${S}/>` +
      `<path d="M14 12 a5 5 0 0 1 4 7 M14 22 a5 5 0 0 1 -4 -7" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="14" cy="17" r="1.5" fill="#6a7486" ${S1}/>` +
      `<path d="M25 11 h8 M25 15 h8 M25 19 h8 M25 23 h8" stroke="#7f92a8" stroke-width="1.5" stroke-linecap="round"/>`
  );
  const antenna = item(
    24,
    38,
    shadow(12, 35, 8) +
      `<rect x="9" y="30" width="6" height="5" fill="#8fa0b5" ${S1}/>` +
      `<line x1="12" y1="30" x2="12" y2="5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M5 11 h14 M7 17 h10 M8.5 23 h7" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="12" cy="4" r="2" fill="#ff5d55" ${S1}/>`
  );
  const vent = item(
    28,
    30,
    shadow(14, 28, 10) +
      `<rect x="9" y="11" width="10" height="16" fill="#9db0c4" ${S}/>` +
      `<ellipse cx="14" cy="9" rx="11" ry="5" fill="#8fa0b5" ${S}/>` +
      `<ellipse cx="11" cy="8" rx="4" ry="1.5" fill="#c5d1de" stroke="none"/>`
  );
  return [ac, antenna, vent];
}

function concreteLobby(): string[] {
  const door = item(
    44,
    52,
    `<rect x="6" y="2" width="32" height="46" fill="#b7c2d0" ${S}/>` +
      `<rect x="10" y="6" width="24" height="38" fill="#cfe8f8" opacity=".92" ${S1}/>` +
      `<line x1="14" y1="38" x2="28" y2="10" stroke="#ffffff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>` +
      `<rect x="12" y="25" width="20" height="3" rx="1.5" fill="#6a7486" ${S1}/>` +
      `<rect x="8" y="48" width="28" height="4" rx="2" fill="#8fa0b5" ${S1}/>`
  );
  const trestleDesk = item(
    52,
    34,
    shadow(26, 31, 22) +
      `<polygon points="8,17 12,17 16,30 12,30" fill="#c9894a" ${S1}/>` +
      `<polygon points="12,17 8,17 4,30 8,30" fill="#b9833f" ${S1}/>` +
      `<polygon points="40,17 44,17 48,30 44,30" fill="#c9894a" ${S1}/>` +
      `<polygon points="44,17 40,17 36,30 40,30" fill="#b9833f" ${S1}/>` +
      `<rect x="4" y="12" width="44" height="5" rx="2" fill="#dfa35f" ${S}/>` +
      `<rect x="21" y="2" width="12" height="9" rx="1" fill="#4a4468" ${S1}/>` +
      `<rect x="23" y="4" width="8" height="5" fill="#9fd8ff" stroke="none"/>` +
      `<rect x="20" y="10" width="14" height="2" rx="1" fill="#6a7486" ${S1}/>`
  );
  const boxStack = item(
    36,
    40,
    shadow(18, 38, 15) +
      `<rect x="4" y="22" width="28" height="15" fill="#dfa35f" ${S}/>` +
      `<rect x="16" y="22" width="4" height="15" fill="#f0e0b0" opacity=".85" ${S1}/>` +
      `<rect x="8" y="8" width="20" height="14" fill="#e8b57a" ${S}/>` +
      `<path d="M12 13 h7 M12 16 h10" stroke="#4a4468" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="M8 26 h5 M8 30 h8" stroke="#4a4468" stroke-width="1.2" stroke-linecap="round"/>`
  );
  const cactusMug = item(
    22,
    28,
    shadow(11, 26, 8) +
      `<rect x="5" y="18" width="11" height="8" rx="2" fill="#38b6ff" ${S}/>` +
      `<path d="M16 20 a3 3 0 0 1 0 5" fill="none" stroke="${INK}" stroke-width="1.5"/>` +
      `<rect x="8" y="7" width="5" height="12" rx="2.5" fill="#2fbf6b" ${S1}/>` +
      `<rect x="3" y="9" width="3" height="6" rx="1.5" fill="#2fbf6b" ${S1}/>` +
      `<rect x="5" y="12" width="3" height="2.5" fill="#2fbf6b" stroke="none"/>` +
      `<path d="M9.5 10 h1 M11.5 13 h1 M9.5 16 h1" stroke="#1f7a44" stroke-width="1" stroke-linecap="round"/>`
  );
  return [door, trestleDesk, boxStack, cactusMug];
}

// ---------------------------------------------------------------------------
// Decor items — Startup White
// ---------------------------------------------------------------------------

function startupWall(): string[] {
  const window_ = item(
    64,
    56,
    `<rect x="2" y="2" width="60" height="50" rx="4" fill="#f6f9fc" ${S}/>` +
      `<rect x="6" y="6" width="52" height="42" rx="2" fill="url(#os-startup-winsky)" ${S1}/>` +
      `<ellipse cx="20" cy="18" rx="9" ry="4" fill="#ffffff" opacity=".95"/>` +
      `<ellipse cx="27" cy="20" rx="7" ry="3.5" fill="#ffffff" opacity=".95"/>` +
      `<ellipse cx="44" cy="33" rx="8" ry="4" fill="#ffffff" opacity=".9"/>` +
      `<rect x="30.5" y="6" width="3" height="42" fill="#f6f9fc" ${S1}/>` +
      `<rect x="6" y="25.5" width="52" height="3" fill="#f6f9fc" ${S1}/>` +
      `<rect x="0" y="52" width="64" height="4" rx="2" fill="#e4ebf3" ${S}/>`,
    lg('os-startup-winsky', '#6ec6f5', '#cdefff')
  );
  const poster = item(
    32,
    54,
    `<rect x="3" y="2" width="26" height="36" rx="2" fill="#38b6ff" ${S}/>` +
      `<rect x="6" y="5" width="20" height="30" fill="#ffffff" ${S1}/>` +
      `<path d="M16 9 q4.5 4 2.5 12 h-5 q-2 -8 2.5 -12 z" fill="#ff5d55" ${S1}/>` +
      `<circle cx="16" cy="15" r="1.8" fill="#9fd8ff" ${S1}/>` +
      `<path d="M13 19 l-2.5 4 h3 z M19 19 l2.5 4 h-3 z" fill="#38b6ff" ${S1}/>` +
      `<path d="M15 21.5 q1 3.5 1 4.5 q0 -1 1 -4.5 z" fill="#ffb02e" ${S1}/>` +
      `<text x="16" y="32.5" text-anchor="middle" font-size="4.6" font-weight="800" fill="${INK}">SHIP IT</text>`
  );
  const whiteboard = item(
    58,
    54,
    `<rect x="3" y="2" width="52" height="38" rx="3" fill="#ffffff" ${S}/>` +
      `<path d="M8 11 c6 -4 10 4 16 0" fill="none" stroke="#38b6ff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="41" cy="13" r="5" fill="none" stroke="#ff5d55" stroke-width="1.5"/>` +
      `<path d="M30 28 h13 M43 28 l-4 -3 M43 28 l-4 3" fill="none" stroke="#2fbf6b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="8" y="28" width="4" height="7" fill="#ffb02e" opacity=".9"/>` +
      `<rect x="14" y="24" width="4" height="11" fill="#ffb02e" opacity=".9"/>` +
      `<rect x="20" y="20" width="4" height="15" fill="#ffb02e" opacity=".9"/>` +
      `<rect x="10" y="40" width="38" height="3" rx="1.5" fill="#d5dde8" ${S1}/>` +
      `<rect x="24" y="37.5" width="8" height="2.5" rx="1" fill="#ff5d55" ${S1}/>`
  );
  const coffee = item(
    46,
    48,
    shadow(23, 45, 20) +
      `<rect x="4" y="26" width="38" height="17" rx="2" fill="#f0f4f8" ${S}/>` +
      `<line x1="4" y1="31" x2="42" y2="31" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
      `<rect x="10" y="8" width="18" height="18" rx="2" fill="#4a4468" ${S}/>` +
      `<rect x="12" y="10" width="14" height="4" rx="1" fill="#6a6490" ${S1}/>` +
      `<rect x="17" y="20" width="4" height="3" fill="#2d2440" stroke="none"/>` +
      `<circle cx="24.5" cy="17" r="1.4" fill="#2fbf6b" stroke="none"/>` +
      `<rect x="31" y="19" width="8" height="7" rx="1.5" fill="#ff8a2a" ${S1}/>` +
      `<path d="M39 20.5 a2.5 2.5 0 0 1 0 4.5" fill="none" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M34 16 q1.5 -2 0 -4 M37 16 q1.5 -2 0 -4" fill="none" stroke="#b9c7d6" stroke-width="1.2" stroke-linecap="round"/>`
  );
  const plant = item(
    30,
    44,
    shadow(15, 41, 11) +
      `<path d="M14 28 C7 21 7 10 13 5 C16 10 16 21 14 28 z" fill="#269257" ${S1}/>` +
      `<path d="M16 28 C23 21 23 10 17 5 C14 10 14 21 16 28 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M15 28 C11 20 12 12 15 8 C18 12 19 20 15 28 z" fill="#3ecf7a" ${S1}/>` +
      `<polygon points="9,31 21,31 19,40 11,40" fill="#f0f4f8" ${S}/>` +
      `<rect x="8" y="28" width="14" height="4" rx="2" fill="#ffffff" ${S}/>`
  );
  const beanbag = item(
    38,
    24,
    shadow(19, 21, 16) +
      `<path d="M6 20 C4 10 12 4 19 4 C27 4 34 10 32 20 Q19 24 6 20 z" fill="#38b6ff" ${S}/>` +
      `<path d="M10 12 Q19 16 29 11" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".4"/>` +
      `<ellipse cx="14" cy="8.5" rx="4" ry="2" fill="#9fd8ff" opacity=".8"/>`
  );
  return [window_, poster, whiteboard, coffee, plant, beanbag];
}

function startupRoof(): string[] {
  const ac = item(
    38,
    32,
    shadow(19, 29, 15) +
      `<rect x="6" y="24" width="4" height="4" fill="#b9c4d2" ${S1}/>` +
      `<rect x="28" y="24" width="4" height="4" fill="#b9c4d2" ${S1}/>` +
      `<rect x="4" y="5" width="30" height="21" rx="3" fill="#f0f4f8" ${S}/>` +
      `<circle cx="13" cy="15" r="6.5" fill="#d5dde8" ${S}/>` +
      `<path d="M13 10.5 a4.5 4.5 0 0 1 3.5 6.5 M13 19.5 a4.5 4.5 0 0 1 -3.5 -6.5" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="M23 10 h7 M23 14 h7 M23 18 h7 M23 22 h7" stroke="#b9c4d2" stroke-width="1.5" stroke-linecap="round"/>`
  );
  const wifiMast = item(
    26,
    38,
    shadow(13, 35, 9) +
      `<rect x="10" y="28" width="6" height="7" fill="#d5dde8" ${S1}/>` +
      `<line x1="13" y1="28" x2="13" y2="12" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="13" cy="10" r="2" fill="#38b6ff" ${S1}/>` +
      `<path d="M8 8 a7 7 0 0 1 10 0" fill="none" stroke="#38b6ff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M5.5 5 a10.5 10.5 0 0 1 15 0" fill="none" stroke="#38b6ff" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`
  );
  const skylight = item(
    40,
    22,
    shadow(20, 19, 16) +
      `<rect x="4" y="8" width="32" height="9" rx="2" fill="#e4ebf3" ${S}/>` +
      `<polygon points="4,8 20,2 36,8" fill="#cfe8f8" ${S}/>` +
      `<line x1="14" y1="4.5" x2="20" y2="2.5" stroke="#ffffff" stroke-width="1.5" opacity=".7" stroke-linecap="round"/>`
  );
  return [ac, wifiMast, skylight];
}

function startupLobby(): string[] {
  const door = item(
    48,
    52,
    `<rect x="4" y="2" width="40" height="46" rx="3" fill="#38b6ff" ${S}/>` +
      `<rect x="8" y="6" width="15" height="38" fill="#cfe8f8" opacity=".92" ${S1}/>` +
      `<rect x="25" y="6" width="15" height="38" fill="#cfe8f8" opacity=".92" ${S1}/>` +
      `<rect x="20" y="20" width="2.5" height="10" rx="1" fill="#f6f9fc" ${S1}/>` +
      `<rect x="25.5" y="20" width="2.5" height="10" rx="1" fill="#f6f9fc" ${S1}/>` +
      `<rect x="8" y="48" width="32" height="4" rx="2" fill="#4a4468" ${S1}/>` +
      `<text x="24" y="51.4" text-anchor="middle" font-size="3.4" font-weight="800" fill="#ffffff">HELLO</text>`
  );
  const desk = item(
    54,
    38,
    shadow(27, 35, 23) +
      `<rect x="6" y="16" width="42" height="19" rx="3" fill="#ffffff" ${S}/>` +
      `<circle cx="27" cy="25" r="4" fill="none" stroke="#38b6ff" stroke-width="2"/>` +
      `<rect x="4" y="13" width="46" height="5" rx="2" fill="#f6f9fc" ${S}/>` +
      `<rect x="31" y="2" width="13" height="9" rx="1" fill="#4a4468" ${S1}/>` +
      `<rect x="33" y="4" width="9" height="5" fill="#9fd8ff" stroke="none"/>` +
      `<rect x="36" y="11" width="3" height="2" fill="#6a7486" ${S1}/>` +
      `<circle cx="13" cy="10" r="2.8" fill="#2fbf6b" ${S1}/>` +
      `<rect x="11" y="12" width="4" height="2" fill="#ff5d55" ${S1}/>`
  );
  const scooter = item(
    46,
    40,
    shadow(23, 37, 19) +
      `<circle cx="9" cy="33" r="4" fill="#4a4468" ${S}/>` +
      `<circle cx="33" cy="33" r="4" fill="#4a4468" ${S}/>` +
      `<circle cx="9" cy="33" r="1.2" fill="#b9c4d2" stroke="none"/>` +
      `<circle cx="33" cy="33" r="1.2" fill="#b9c4d2" stroke="none"/>` +
      `<rect x="8" y="29" width="21" height="3" rx="1.5" fill="#38b6ff" ${S}/>` +
      tube('M31 30 L39 8', '#8fa0b5', 2.5) +
      tube('M34 7 L44 7', '#8fa0b5', 2.5) +
      `<circle cx="44" cy="7" r="1.4" fill="#ff5d55" ${S1}/>`
  );
  const succulent = item(
    22,
    24,
    shadow(11, 21, 8) +
      `<path d="M11 12 C7 10 5 6 6 2 C10 4 12 8 11 12 z" fill="#5eb549" ${S1}/>` +
      `<path d="M11 12 C15 10 17 6 16 2 C12 4 10 8 11 12 z" fill="#7ac95e" ${S1}/>` +
      `<path d="M11 13 C9 9 10 5 11 3 C12 5 13 9 11 13 z" fill="#8fd876" ${S1}/>` +
      `<polygon points="6,13 16,13 15,20 7,20" fill="#ffffff" ${S}/>` +
      `<path d="M6 16 h10" stroke="#d5dde8" stroke-width="1" opacity=".8"/>`
  );
  return [door, desk, scooter, succulent];
}

// ---------------------------------------------------------------------------
// Decor items — Urban Jungle
// ---------------------------------------------------------------------------

function jungleWall(): string[] {
  const monstera = item(
    46,
    58,
    shadow(23, 55, 17) +
      `<path d="M22 42 C20 32 14 26 10 18" fill="none" stroke="#269257" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M24 42 C26 30 32 24 36 16" fill="none" stroke="#269257" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M23 42 L23 16" fill="none" stroke="#269257" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M10 18 C2 14 2 4 10 5 C18 3 18 14 10 18 z" fill="#2fbf6b" ${S}/>` +
      `<path d="M10 17 L5 9 M10 17 L14 9" stroke="#1f7a44" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="M36 16 C28 12 28 2 36 3 C44 1 44 12 36 16 z" fill="#269257" ${S}/>` +
      `<path d="M36 15 L31 7 M36 15 L40 7" stroke="#1a6338" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="M23 16 C14 12 15 1 23 2 C31 0 32 12 23 16 z" fill="#3ecf7a" ${S}/>` +
      `<path d="M23 15 L18 6 M23 15 L28 6 M23 15 L23 4" stroke="#1f7a44" stroke-width="1.2" stroke-linecap="round"/>` +
      `<polygon points="14,42 32,42 29,54 17,54" fill="#d96f4e" ${S}/>` +
      `<rect x="13" y="39" width="20" height="4" rx="2" fill="#e8825f" ${S}/>`
  );
  const macrame = item(
    28,
    56,
    `<line x1="14" y1="0" x2="14" y2="10" stroke="#d9c48a" stroke-width="2"/>` +
      `<circle cx="14" cy="10" r="1.8" fill="#d9c48a" ${S1}/>` +
      `<path d="M14 10 L7 24 M14 10 L21 24 M14 10 L14 25" stroke="#d9c48a" stroke-width="1.5" stroke-linecap="round"/>` +
      `<polygon points="6,22 22,22 20,32 8,32" fill="#e8734f" ${S}/>` +
      `<path d="M9 22 C7 16 11 13 14 12 C17 13 21 16 19 22" fill="none" stroke="#2fbf6b" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M9 32 C7 40 11 48 8 54" fill="none" stroke="#2fbf6b" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M19 32 C21 38 17 46 20 52" fill="none" stroke="#269257" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="8" cy="38" r="2" fill="#2fbf6b" ${S1}/>` +
      `<circle cx="10" cy="46" r="2" fill="#3ecf7a" ${S1}/>` +
      `<circle cx="20" cy="36" r="2" fill="#269257" ${S1}/>` +
      `<circle cx="18" cy="44" r="2" fill="#2fbf6b" ${S1}/>`
  );
  const wateringCan = item(
    36,
    26,
    shadow(18, 23, 14) +
      `<path d="M11 14 L3 6 L6 4 L13 11 z" fill="#8fb5c9" ${S}/>` +
      `<circle cx="4.5" cy="5" r="3" fill="#6f99b5" ${S1}/>` +
      `<path d="M3 3.5 l-1.5 -1.5 M4.5 2.5 v-2 M6 3.5 l1.5 -1.5" stroke="#6f99b5" stroke-width="1.2" stroke-linecap="round"/>` +
      `<rect x="10" y="8" width="17" height="13" rx="3" fill="#8fb5c9" ${S}/>` +
      `<path d="M22 8 v13 h4 a3 3 0 0 0 1 -13 z" fill="#6f99b5" stroke="none"/>` +
      `<rect x="10" y="8" width="17" height="13" rx="3" fill="none" ${S}/>` +
      `<path d="M13 8 Q18 -1 26 8 Q18 3 13 8 z" fill="#8fb5c9" ${S1}/>`
  );
  const parrot = item(
    32,
    58,
    shadow(16, 55, 12) +
      `<rect x="14.5" y="21" width="3" height="32" fill="#b9833f" ${S1}/>` +
      `<ellipse cx="16" cy="53" rx="9" ry="3" fill="#8a5a35" ${S}/>` +
      `<rect x="4" y="18" width="24" height="3" rx="1.5" fill="#b9833f" ${S1}/>` +
      `<g class="os-anim-bob">` +
      `<path d="M9 18 L4 29 L8 28 L11 19 z" fill="#38b6ff" ${S1}/>` +
      `<path d="M8 18 C4 12 6 4 12 3 C17 2 19 7 17 12 C16 16 13 18 8 18 z" fill="#ff5d55" ${S}/>` +
      `<path d="M9 9 C13 8 15 11 13 15 C10 16 8 13 9 9 z" fill="#ffb02e" ${S1}/>` +
      `<circle cx="13.5" cy="6" r="1.1" fill="${INK}"/>` +
      `<path d="M16.5 5.5 q4 1 .5 4 l-2 -2 z" fill="#ffc93c" ${S1}/>` +
      `<path d="M9 18 v2.5 M12 18 v2.5" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
      `</g>`
  );
  const liana = item(
    22,
    58,
    `<path d="M8 0 C6 14 14 22 10 36 C8 44 13 50 10 56" fill="none" stroke="#269257" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M13 0 C13 10 9 16 12 26" fill="none" stroke="#2fbf6b" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>` +
      `<path d="M8 10 q-7 -1 -7.5 -7 q6.5 1 7.5 7 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M10 22 q7 -1 7.5 -7 q-6.5 1 -7.5 7 z" fill="#3ecf7a" ${S1}/>` +
      `<path d="M10 36 q-7 -1 -7.5 -7 q6.5 1 7.5 7 z" fill="#269257" ${S1}/>` +
      `<path d="M10 48 q7 -1 7.5 -7 q-6.5 1 -7.5 7 z" fill="#2fbf6b" ${S1}/>`
  );
  const fern = item(
    36,
    36,
    shadow(18, 33, 13) +
      `<path d="M18 22 C10 17 6 10 4 3" fill="none" stroke="#2fbf6b" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M18 22 C26 17 30 10 32 3" fill="none" stroke="#269257" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M18 22 C15 13 16 7 18 2" fill="none" stroke="#3ecf7a" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M18 22 C12 20 8 16 6 12 M18 22 C24 20 28 16 30 12" fill="none" stroke="#2fbf6b" stroke-width="2" stroke-linecap="round" opacity=".8"/>` +
      `<polygon points="11,24 25,24 23,33 13,33" fill="#fff8ec" ${S}/>` +
      `<rect x="10" y="21" width="16" height="4" rx="2" fill="#f6ecd9" ${S}/>`
  );
  return [monstera, macrame, wateringCan, parrot, liana, fern];
}

function jungleRoof(): string[] {
  const solar = item(
    44,
    30,
    shadow(22, 27, 18) +
      `<line x1="12" y1="18" x2="10" y2="26" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<line x1="38" y1="18" x2="40" y2="26" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<polygon points="6,6 38,6 42,18 10,18" fill="#3d6bb5" ${S}/>` +
      `<path d="M14 6 L17 18 M22 6 L25 18 M30 6 L33 18 M8 12 L40 12" stroke="#9fd8ff" stroke-width="1" opacity=".8"/>`
  );
  const beehive = item(
    28,
    34,
    shadow(14, 31, 11) +
      `<rect x="5" y="18" width="18" height="9" fill="#ffb02e" ${S}/>` +
      `<rect x="6" y="10" width="16" height="8" fill="#ffc93c" ${S}/>` +
      `<rect x="4" y="6" width="20" height="4" rx="1" fill="#b9833f" ${S}/>` +
      `<rect x="11" y="23" width="6" height="4" fill="#6b4a30" ${S1}/>` +
      `<circle cx="25.5" cy="9" r="1.6" fill="#ffc93c" stroke="${INK}" stroke-width=".8"/>` +
      `<path d="M24.8 8.6 h1.4" stroke="${INK}" stroke-width=".6"/>` +
      `<path d="M20 4 q3 -2 5 2" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="1.5 1.5" opacity=".4"/>`
  );
  const planter = item(
    48,
    22,
    shadow(24, 20, 20) +
      `<circle cx="12" cy="9" r="5" fill="#2fbf6b" ${S1}/>` +
      `<circle cx="22" cy="7" r="5.5" fill="#269257" ${S1}/>` +
      `<circle cx="33" cy="9" r="5" fill="#3ecf7a" ${S1}/>` +
      `<circle cx="17" cy="6" r="1" fill="#ff6fa9" stroke="none"/>` +
      `<circle cx="28" cy="5" r="1" fill="#ffc93c" stroke="none"/>` +
      `<rect x="4" y="11" width="40" height="8" rx="2" fill="#b9833f" ${S}/>`
  );
  return [solar, beehive, planter];
}

function jungleLobby(): string[] {
  const door = item(
    46,
    52,
    `<rect x="6" y="2" width="34" height="46" rx="3" fill="#8a5a35" ${S}/>` +
      `<rect x="10" y="6" width="26" height="38" fill="#cde8d4" opacity=".92" ${S1}/>` +
      `<circle cx="32" cy="26" r="1.6" fill="#ffc93c" ${S1}/>` +
      `<path d="M6 6 C14 2 26 4 40 5" fill="none" stroke="#269257" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M14 4.5 q-1 -4 -4.5 -4.5 q1 4 4.5 4.5 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M28 4.5 q1 -4 4.5 -4.5 q-1 4 -4.5 4.5 z" fill="#3ecf7a" ${S1}/>` +
      `<rect x="9" y="48" width="28" height="4" rx="2" fill="#7ac95e" ${S1}/>`
  );
  const liveEdgeDesk = item(
    54,
    36,
    shadow(27, 33, 23) +
      `<rect x="10" y="17" width="4" height="15" fill="#8a5a35" ${S1}/>` +
      `<rect x="40" y="17" width="4" height="15" fill="#8a5a35" ${S1}/>` +
      `<path d="M4 12 C10 9 44 9 50 12 L48 17 L6 17 z" fill="#c9894a" ${S}/>` +
      `<path d="M9 14.5 C18 13 36 13 45 14.5" fill="none" stroke="#8a5a35" stroke-width="1" opacity=".6"/>` +
      `<polygon points="34,6 42,6 41,12 35,12" fill="#e8734f" ${S1}/>` +
      `<path d="M36 5 q-4 -1 -4.5 -5 q4.5 1 4.5 5 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M40 5 q4 -1 4.5 -5 q-4.5 1 -4.5 5 z" fill="#269257" ${S1}/>`
  );
  const plantStand = item(
    34,
    48,
    shadow(17, 45, 13) +
      `<polygon points="8,6 11,6 15,44 12,44" fill="#b9833f" ${S1}/>` +
      `<polygon points="26,6 23,6 19,44 22,44" fill="#b9833f" ${S1}/>` +
      `<rect x="7" y="14" width="20" height="3" fill="#c9894a" ${S1}/>` +
      `<rect x="6" y="26" width="22" height="3" fill="#c9894a" ${S1}/>` +
      `<rect x="5" y="38" width="24" height="3" fill="#c9894a" ${S1}/>` +
      `<rect x="13" y="9" width="7" height="5" rx="1" fill="#e8734f" ${S1}/>` +
      `<path d="M16.5 9 q-3 -2 -2 -6 q3 2 2 6 z" fill="#2fbf6b" ${S1}/>` +
      `<rect x="9" y="21" width="7" height="5" rx="1" fill="#38b6ff" ${S1}/>` +
      `<circle cx="12.5" cy="19.5" r="2.4" fill="#3ecf7a" ${S1}/>` +
      `<rect x="19" y="33" width="7" height="5" rx="1" fill="#ffb02e" ${S1}/>` +
      `<path d="M22 33 C20 30 24 28 22.5 25" fill="none" stroke="#269257" stroke-width="1.5" stroke-linecap="round"/>`
  );
  const terrarium = item(
    36,
    40,
    shadow(18, 37, 14) +
      `<rect x="8" y="28" width="4" height="8" fill="#8a5a35" ${S1}/>` +
      `<rect x="24" y="28" width="4" height="8" fill="#8a5a35" ${S1}/>` +
      `<rect x="5" y="7" width="26" height="4" rx="2" fill="#6a7486" ${S}/>` +
      `<rect x="6" y="11" width="24" height="17" rx="2" fill="#bfe9d8" opacity=".88" ${S}/>` +
      `<path d="M10 25 q2 -6 1 -9 M14 25 q3 -4 2 -8" fill="none" stroke="#269257" stroke-width="1.4" stroke-linecap="round"/>` +
      `<ellipse cx="24" cy="24" rx="3.2" ry="2.4" fill="#7ac95e" ${S1}/>` +
      `<circle cx="22.8" cy="22.6" r=".6" fill="${INK}"/>` +
      `<circle cx="25.2" cy="22.6" r=".6" fill="${INK}"/>` +
      `<path d="M7 26.5 h22" stroke="#b9833f" stroke-width="1.6" stroke-linecap="round"/>`
  );
  return [door, liveEdgeDesk, plantStand, terrarium];
}

// ---------------------------------------------------------------------------
// Decor items — Sunset Loft
// ---------------------------------------------------------------------------

function sunsetWall(): string[] {
  const window_ = item(
    72,
    58,
    `<rect x="2" y="2" width="68" height="52" rx="2" fill="#4a4468" ${S}/>` +
      `<rect x="6" y="6" width="60" height="44" fill="url(#os-sunset-winsky)" ${S1}/>` +
      `<circle cx="36" cy="27" r="8" fill="#fff3c4" opacity=".85"/>` +
      `<circle cx="36" cy="27" r="5.5" fill="#fff8ec"/>` +
      `<path d="M6 50 v-8 h7 v-5 h6 v5 h8 v-9 h6 v9 h7 v-6 h7 v6 h6 v-4 h7 v4 h6 v8 z" fill="#553a60" opacity=".9"/>` +
      `<rect x="25.5" y="6" width="3" height="44" fill="#4a4468" ${S1}/>` +
      `<rect x="46.5" y="6" width="3" height="44" fill="#4a4468" ${S1}/>` +
      `<rect x="6" y="26.5" width="60" height="3" fill="#4a4468" ${S1}/>` +
      `<rect x="0" y="54" width="72" height="4" rx="2" fill="#6b4a30" ${S}/>`,
    `<linearGradient id="os-sunset-winsky" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#ff9a5c"/><stop offset="1" stop-color="#d96a9e"/></linearGradient>`
  );
  const bulbColors = ['#ffc93c', '#ff8a5c', '#ff6fa9'];
  const bulbXY: Array<[number, number]> = [
    [10, 7],
    [25, 9],
    [40, 7],
    [55, 8],
    [70, 6],
    [84, 6],
  ];
  const garland = item(
    92,
    28,
    `<path d="M2 4 Q24 14 46 6 T90 6" fill="none" stroke="#4a4468" stroke-width="1.5"/>` +
      bulbXY
        .map(([x, y], i) => {
          const c = bulbColors[i % 3];
          return (
            `<g class="os-anim-twinkle">` +
            `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 5}" stroke="#4a4468" stroke-width="1.2"/>` +
            `<circle cx="${x}" cy="${y + 9}" r="6" fill="${c}" opacity=".3"/>` +
            `<circle cx="${x}" cy="${y + 9}" r="3.5" fill="${c}" ${S1}/>` +
            `</g>`
          );
        })
        .join('')
  );
  const vinyls = item(
    48,
    48,
    `<rect x="3" y="3" width="20" height="20" fill="#6b4a30" ${S}/>` +
      `<rect x="6" y="6" width="14" height="14" fill="#ff8a5c" ${S1}/>` +
      `<circle cx="13" cy="13" r="4" fill="#3a3148" ${S1}/>` +
      `<circle cx="13" cy="13" r="1.4" fill="#ffc93c" stroke="none"/>` +
      `<rect x="27" y="9" width="18" height="18" fill="#6b4a30" ${S}/>` +
      `<rect x="30" y="12" width="12" height="12" fill="#38b6ff" ${S1}/>` +
      `<circle cx="36" cy="18" r="3.4" fill="#3a3148" ${S1}/>` +
      `<circle cx="36" cy="18" r="1.2" fill="#ff6fa9" stroke="none"/>` +
      `<rect x="12" y="27" width="16" height="16" fill="#6b4a30" ${S}/>` +
      `<rect x="15" y="30" width="10" height="10" fill="#2fbf7f" ${S1}/>` +
      `<circle cx="20" cy="35" r="3" fill="#3a3148" ${S1}/>` +
      `<circle cx="20" cy="35" r="1" fill="#fff8ec" stroke="none"/>`
  );
  const armchair = item(
    44,
    38,
    shadow(22, 35, 18) +
      `<path d="M8 30 V12 a8 8 0 0 1 8 -8 h12 a8 8 0 0 1 8 8 v18 z" fill="#d96f4e" ${S}/>` +
      `<rect x="12" y="20" width="20" height="8" rx="3" fill="#e8825f" ${S1}/>` +
      `<rect x="4" y="16" width="8" height="14" rx="3.5" fill="#c95a3f" ${S}/>` +
      `<rect x="32" y="16" width="8" height="14" rx="3.5" fill="#c95a3f" ${S}/>` +
      `<path d="M32 15 h9 l-1 9 h-8 z" fill="#ffc93c" ${S1}/>` +
      `<path d="M33 24 v2 M36 24 v2 M39 24 v2" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<rect x="10" y="30" width="3" height="5" fill="#6b4a30" ${S1}/>` +
      `<rect x="31" y="30" width="3" height="5" fill="#6b4a30" ${S1}/>`
  );
  const lamp = item(
    28,
    58,
    shadow(14, 55, 10) +
      `<line x1="14" y1="18" x2="14" y2="52" stroke="#6b4a30" stroke-width="2"/>` +
      `<ellipse cx="14" cy="52.5" rx="8" ry="2.5" fill="#6b4a30" ${S}/>` +
      `<ellipse cx="14" cy="21" rx="7" ry="3" fill="#ffe9a8" opacity=".55"/>` +
      `<polygon points="6,6 22,6 25,18 3,18" fill="#ffb02e" ${S}/>` +
      `<path d="M10 6 L8.5 18 M18 6 L19.5 18" stroke="#e8a01f" stroke-width="1.2"/>` +
      `<line x1="19" y1="20" x2="19" y2="24" stroke="#4a4468" stroke-width="1.2"/>` +
      `<circle cx="19" cy="25" r="1.2" fill="#ffc93c" ${S1}/>`
  );
  return [window_, garland, vinyls, armchair, lamp];
}

function sunsetRoof(): string[] {
  const deckchair = item(
    44,
    26,
    shadow(22, 23, 18) +
      `<path d="M10 4 L6 23 M34 4 L38 23 M14 20 L10 23 M30 20 L34 23" stroke="#6b4a30" stroke-width="2" stroke-linecap="round"/>` +
      `<polygon points="10,4 34,4 30,20 14,20" fill="#ff8a5c" ${S}/>` +
      `<polygon points="15,4 19,4 17.5,20 14.5,20" fill="#fff8ec" opacity=".9"/>` +
      `<polygon points="25,4 29,4 28.5,20 25.5,20" fill="#fff8ec" opacity=".9"/>`
  );
  const parasol = item(
    36,
    38,
    shadow(18, 35, 12) +
      `<line x1="18" y1="6" x2="18" y2="34" stroke="#6b4a30" stroke-width="2"/>` +
      `<path d="M2 16 C6 4 30 4 34 16 Q30 13 26 16 Q22 13 18 16 Q14 13 10 16 Q6 13 2 16 z" fill="#ff6fa9" ${S}/>` +
      `<path d="M18 5 L10 16 M18 5 L26 16" stroke="#e05a92" stroke-width="1.2"/>` +
      `<circle cx="18" cy="4" r="1.8" fill="#ffc93c" ${S1}/>`
  );
  const drinkTable = item(
    26,
    24,
    shadow(13, 21, 10) +
      `<rect x="10" y="4" width="4" height="6" fill="#ffd166" opacity=".95" ${S1}/>` +
      `<line x1="12.5" y1="4" x2="14.5" y2="1" stroke="#ff5d55" stroke-width="1.2" stroke-linecap="round"/>` +
      `<ellipse cx="13" cy="10.5" rx="10" ry="3.5" fill="#6b4a30" ${S}/>` +
      `<line x1="13" y1="14" x2="13" y2="19" stroke="#6b4a30" stroke-width="2"/>` +
      `<ellipse cx="13" cy="19.5" rx="5" ry="1.8" fill="#6b4a30" ${S1}/>`
  );
  return [deckchair, parasol, drinkTable];
}

function sunsetLobby(): string[] {
  const door = item(
    46,
    52,
    `<rect x="6" y="2" width="34" height="46" rx="2" fill="#4a4468" ${S}/>` +
      `<rect x="10" y="6" width="26" height="18" fill="#ffb98a" opacity=".9" ${S1}/>` +
      `<line x1="23" y1="6" x2="23" y2="24" stroke="#4a4468" stroke-width="2"/>` +
      `<rect x="10" y="27" width="26" height="17" fill="#5a5470" ${S1}/>` +
      `<circle cx="14" cy="31" r=".9" fill="#8a84a0"/><circle cx="32" cy="31" r=".9" fill="#8a84a0"/>` +
      `<circle cx="14" cy="40" r=".9" fill="#8a84a0"/><circle cx="32" cy="40" r=".9" fill="#8a84a0"/>` +
      `<rect x="31" y="21" width="3" height="12" rx="1.5" fill="#caa24d" ${S1}/>` +
      `<rect x="8" y="48" width="30" height="4" rx="2" fill="#d96f4e" ${S1}/>` +
      `<path d="M11 50 l3 -1.5 3 1.5 3 -1.5 3 1.5 3 -1.5 3 1.5 3 -1.5 3 1.5" fill="none" stroke="#ffc93c" stroke-width="1"/>`
  );
  const recordDesk = item(
    56,
    38,
    shadow(28, 35, 24) +
      `<rect x="8" y="21" width="4" height="14" fill="#6b4a30" ${S1}/>` +
      `<rect x="44" y="21" width="4" height="14" fill="#6b4a30" ${S1}/>` +
      `<rect x="4" y="14" width="48" height="7" rx="2" fill="#8a5a35" ${S}/>` +
      `<rect x="12" y="6" width="18" height="8" rx="1" fill="#c9894a" ${S}/>` +
      `<circle cx="19" cy="9.5" r="3" fill="#3a3148" ${S1}/>` +
      `<circle cx="19" cy="9.5" r="1" fill="#ffc93c" stroke="none"/>` +
      `<line x1="26" y1="7.5" x2="22.5" y2="10" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="M38 8 a4 3.5 0 0 1 8 0 z" fill="#2fbf7f" ${S1}/>` +
      `<line x1="42" y1="11" x2="42" y2="14" stroke="#6b4a30" stroke-width="1.5"/>` +
      `<ellipse cx="42" cy="12.5" rx="2.5" ry="1" fill="#ffe9a8" opacity=".6"/>`
  );
  const bicycle = item(
    56,
    36,
    shadow(28, 33, 24) +
      `<circle cx="14" cy="24" r="9" fill="none" stroke="#4a4468" stroke-width="2"/>` +
      `<circle cx="42" cy="24" r="9" fill="none" stroke="#4a4468" stroke-width="2"/>` +
      `<path d="M14 24 L23 24 M14 24 L18 18 M42 24 L38 18" stroke="#4a4468" stroke-width="1" opacity=".5"/>` +
      tube('M14 24 L28 12 L42 24 M28 12 L24 8 M28 24 L14 24', '#ff5d55', 2) +
      tube('M42 24 L40 9 L44 8', '#ff5d55', 2) +
      `<rect x="21" y="6.5" width="7" height="2.5" rx="1.2" fill="#6b4a30" ${S1}/>` +
      `<rect x="34" y="10" width="11" height="7" rx="1" fill="#d9a05f" ${S1}/>` +
      `<circle cx="37" cy="9.5" r="1.4" fill="#ff6fa9" ${S1}/>` +
      `<circle cx="41" cy="9" r="1.4" fill="#ffc93c" ${S1}/>` +
      `<circle cx="28" cy="24" r="2" fill="#6a7486" ${S1}/>`
  );
  const kilim = item(
    40,
    12,
    `<rect x="2" y="3" width="36" height="7" rx="2" fill="#d96f4e" ${S1}/>` +
      `<path d="M6 6.5 l3 -2 3 2 3 -2 3 2 3 -2 3 2 3 -2 3 2 3 -2 3 2" fill="none" stroke="#ffc93c" stroke-width="1.2"/>` +
      `<path d="M2 5 h-1 M2 8 h-1 M38 5 h1 M38 8 h1" stroke="#ffc93c" stroke-width="1"/>`
  );
  return [door, recordDesk, bicycle, kilim];
}

// ---------------------------------------------------------------------------
// Decor items — Neon Arcade
// ---------------------------------------------------------------------------

function neonWall(): string[] {
  const heartD =
    'M11 17 h5 v3 h4 v-3 h5 v7 h-2 v3 h-3 v3 h-3 v-3 h-3 v-3 h-3 z';
  const heart = item(
    36,
    54,
    `<line x1="18" y1="0" x2="18" y2="10" stroke="#4a4468" stroke-width="1.5"/>` +
      `<rect x="4" y="10" width="28" height="28" rx="3" fill="#171030" ${S}/>` +
      `<g class="os-anim-neon">${neonPath(heartD, '#ff4fd8', 2, 'rgba(255,79,216,.18)')}</g>`
  );
  const boltD = 'M14 8 L6 30 L12 30 L9 46 L20 22 L14 22 L18 8 z';
  const bolt = item(
    26,
    54,
    `<line x1="13" y1="0" x2="13" y2="8" stroke="#4a4468" stroke-width="1.5"/>` +
      `<g class="os-anim-neon">${neonPath(boltD, '#38e8ff', 2, 'rgba(56,232,255,.15)')}</g>`
  );
  const shipIt = item(
    72,
    50,
    `<line x1="18" y1="0" x2="18" y2="10" stroke="#4a4468" stroke-width="1.5"/>` +
      `<line x1="54" y1="0" x2="54" y2="10" stroke="#4a4468" stroke-width="1.5"/>` +
      `<g class="os-anim-neon">` +
      `<text x="36" y="28" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="1" fill="none" stroke="#fff06e" stroke-width="4.5" stroke-linejoin="round" opacity=".25">SHIP IT</text>` +
      `<text x="36" y="28" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="1" fill="none" stroke="#fff06e" stroke-width="1.4" stroke-linejoin="round">SHIP IT</text>` +
      neonPath('M14 36 H58', '#ff4fd8', 2) +
      `</g>`
  );
  const arcade = item(
    42,
    58,
    shadow(21, 55, 17) +
      `<polygon points="6,10 36,10 38,54 4,54" fill="#3a2a6e" ${S}/>` +
      `<rect x="6" y="3" width="30" height="8" rx="2" fill="url(#os-neon-arcm)" ${S}/>` +
      `<circle cx="21" cy="7" r="1.6" fill="#fff06e" ${S1}/>` +
      `<rect x="10" y="15" width="22" height="14" rx="2" fill="url(#os-neon-arcscr)" ${S1}/>` +
      `<rect x="14" y="18" width="3" height="2" fill="#7dffd8"/><rect x="20" y="18" width="3" height="2" fill="#7dffd8"/><rect x="26" y="18" width="3" height="2" fill="#7dffd8"/>` +
      `<rect x="17" y="22" width="3" height="2" fill="#ff4fd8"/><rect x="23" y="22" width="3" height="2" fill="#ff4fd8"/>` +
      `<rect x="20" y="26" width="3" height="2" fill="#fff06e"/>` +
      `<polygon points="9,33 33,33 34,42 8,42" fill="#4a3a8a" ${S1}/>` +
      `<line x1="15" y1="38" x2="15" y2="34" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="15" cy="33.5" r="2" fill="#ff4fd8" ${S1}/>` +
      `<circle cx="24" cy="38" r="1.8" fill="#38e8ff" ${S1}/>` +
      `<circle cx="29" cy="38" r="1.8" fill="#fff06e" ${S1}/>` +
      `<line x1="6" y1="46" x2="36" y2="46" stroke="#ff4fd8" stroke-width="1.2" opacity=".6"/>`,
    lg('os-neon-arcm', '#ff4fd8', '#7a3af0', true) + lg('os-neon-arcscr', '#16224d', '#0d1330')
  );
  const vending = item(
    38,
    58,
    shadow(19, 55, 15) +
      `<rect x="5" y="4" width="28" height="50" rx="3" fill="#241a4d" ${S}/>` +
      `<rect x="9" y="8" width="14" height="30" rx="2" fill="url(#os-neon-vend)" ${S1}/>` +
      `<rect x="11" y="11" width="4" height="6" rx="1" fill="#ff5d55" ${S1}/><rect x="17" y="11" width="4" height="6" rx="1" fill="#38e8ff" ${S1}/>` +
      `<rect x="11" y="20" width="4" height="6" rx="1" fill="#fff06e" ${S1}/><rect x="17" y="20" width="4" height="6" rx="1" fill="#ff4fd8" ${S1}/>` +
      `<rect x="11" y="29" width="4" height="6" rx="1" fill="#7dffd8" ${S1}/><rect x="17" y="29" width="4" height="6" rx="1" fill="#ff5d55" ${S1}/>` +
      `<rect x="26" y="8" width="4" height="22" rx="1.5" fill="#38e8ff" opacity=".8"/>` +
      `<rect x="26" y="33" width="4" height="2.5" fill="#0d0820" ${S1}/>` +
      `<rect x="9" y="42" width="14" height="7" rx="1" fill="#101a3d" ${S1}/>` +
      `<rect x="8" y="54" width="5" height="2.5" fill="#171030"/><rect x="25" y="54" width="5" height="2.5" fill="#171030"/>`,
    lg('os-neon-vend', '#1c2c5e', '#101a3d')
  );
  const cyberPlant = item(
    32,
    44,
    shadow(16, 41, 12) +
      `<path d="M16 30 L10 16 L12 8" fill="none" stroke="#38e8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M16 30 L22 14 L20 6" fill="none" stroke="#ff4fd8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M16 30 V10" fill="none" stroke="#7dffd8" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="12" cy="8" r="1.5" fill="#38e8ff"/><circle cx="20" cy="6" r="1.5" fill="#ff4fd8"/><circle cx="16" cy="10" r="1.5" fill="#7dffd8"/>` +
      `<polygon points="10,30 22,30 20,40 12,40" fill="#171030" ${S}/>` +
      `<line x1="10" y1="30" x2="22" y2="30" stroke="#ff4fd8" stroke-width="1.5" stroke-linecap="round"/>`
  );
  return [heart, bolt, shipIt, arcade, vending, cyberPlant];
}

function neonRoof(): string[] {
  const holo = item(
    40,
    40,
    shadow(20, 37, 12) +
      `<rect x="14" y="34" width="12" height="3" rx="1" fill="#171030" ${S1}/>` +
      `<rect x="18" y="24" width="4" height="10" fill="#4a4468" ${S1}/>` +
      `<g class="os-anim-neon">` +
      `<rect x="4" y="2" width="32" height="22" rx="2" fill="url(#os-neon-holo)" stroke="#38e8ff" stroke-width="1.5"/>` +
      `<rect x="12" y="8" width="4" height="4" fill="#fff06e"/><rect x="24" y="8" width="4" height="4" fill="#fff06e"/>` +
      `<path d="M13 17 q7 5 14 0" fill="none" stroke="#fff06e" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M6 6 h28 M6 13 h28 M6 20 h28" stroke="#ffffff" stroke-width=".8" opacity=".18"/>` +
      `</g>`,
    `<linearGradient id="os-neon-holo" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#38e8ff" stop-opacity=".45"/><stop offset="1" stop-color="#ff4fd8" stop-opacity=".45"/></linearGradient>`
  );
  const dish = item(
    36,
    30,
    shadow(18, 27, 13) +
      `<polygon points="14,18 22,18 20,26 16,26" fill="#4a4468" ${S1}/>` +
      `<g transform="rotate(-25 16 12)">` +
      `<ellipse cx="16" cy="12" rx="11" ry="7.5" fill="#8f86c9" ${S}/>` +
      `<ellipse cx="16" cy="12" rx="6.5" ry="4.2" fill="#6f66ab" ${S1}/>` +
      `</g>` +
      `<line x1="16" y1="12" x2="27" y2="4" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="27" cy="4" r="1.8" fill="#ff4fd8" ${S1}/>`
  );
  const beacon = item(
    22,
    38,
    shadow(11, 35, 8) +
      `<rect x="8" y="30" width="6" height="5" fill="#4a4468" ${S1}/>` +
      `<line x1="11" y1="30" x2="11" y2="10" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="11" cy="8" r="2" fill="#ff4fd8" ${S1}/>` +
      `<circle cx="11" cy="8" r="4.5" fill="none" stroke="#ff4fd8" stroke-width="1.2" opacity=".6"/>` +
      `<circle cx="11" cy="8" r="7" fill="none" stroke="#38e8ff" stroke-width="1.2" opacity=".4"/>`
  );
  return [holo, dish, beacon];
}

function neonLobby(): string[] {
  const door = item(
    46,
    52,
    `<rect x="6" y="2" width="34" height="46" rx="2" fill="#1c1240" ${S}/>` +
      `<rect x="10" y="17" width="26" height="27" fill="#241a4d" ${S1}/>` +
      `<path d="M13 26 q5 -4 9 0 t8 -1" fill="none" stroke="#ff4fd8" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M14 35 q6 3 10 -1 q4 -3 8 1" fill="none" stroke="#7dffd8" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="32" cy="30" r="1.4" fill="#fff06e" ${S1}/>` +
      `<g class="os-anim-neon">` +
      `<rect x="12" y="5" width="22" height="10" rx="2" fill="#0d0820" ${S1}/>` +
      `<text x="23" y="12.6" text-anchor="middle" font-size="6.5" font-weight="800" fill="none" stroke="#38e8ff" stroke-width="2.6" opacity=".3">OPEN</text>` +
      `<text x="23" y="12.6" text-anchor="middle" font-size="6.5" font-weight="800" fill="none" stroke="#38e8ff" stroke-width=".9">OPEN</text>` +
      `</g>` +
      `<rect x="8" y="48" width="30" height="4" rx="2" fill="#171030" ${S1}/>` +
      `<path d="M12 50 h4 M20 50 h4 M28 50 h4" stroke="#ff4fd8" stroke-width="1" opacity=".7"/>`
  );
  const battlestation = item(
    54,
    38,
    shadow(27, 35, 23) +
      `<rect x="8" y="22" width="5" height="13" fill="#1c1240" ${S1}/>` +
      `<rect x="41" y="22" width="5" height="13" fill="#1c1240" ${S1}/>` +
      `<line x1="10.5" y1="25" x2="10.5" y2="32" stroke="#ff4fd8" stroke-width="1.2" opacity=".8"/>` +
      `<line x1="43.5" y1="25" x2="43.5" y2="32" stroke="#ff4fd8" stroke-width="1.2" opacity=".8"/>` +
      `<rect x="4" y="16" width="46" height="6" rx="2" fill="#241a4d" ${S}/>` +
      `<line x1="5" y1="16.5" x2="49" y2="16.5" stroke="#38e8ff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<rect x="11" y="4" width="15" height="10" rx="1" fill="#101a3d" ${S1}/>` +
      `<rect x="13" y="6" width="11" height="6" fill="#38e8ff" opacity=".5"/>` +
      `<rect x="28" y="6" width="12" height="8" rx="1" fill="#101a3d" ${S1}/>` +
      `<rect x="30" y="8" width="8" height="4" fill="#ff4fd8" opacity=".5"/>` +
      `<rect x="17" y="14" width="5" height="2" fill="#171030" ${S1}/>`
  );
  const robot = item(
    30,
    34,
    shadow(15, 31, 11) +
      `<line x1="15" y1="4" x2="15" y2="1.5" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="15" cy="1.5" r="1.3" fill="#ff4fd8" ${S1}/>` +
      `<rect x="9" y="4" width="12" height="10" rx="3" fill="#5a5470" ${S}/>` +
      `<rect x="11" y="7" width="8" height="4" rx="2" fill="#0d0820" ${S1}/>` +
      `<circle cx="13.5" cy="9" r="1" fill="#7dffd8"/><circle cx="16.5" cy="9" r="1" fill="#7dffd8"/>` +
      `<rect x="7" y="14" width="16" height="14" rx="4" fill="#4a4468" ${S}/>` +
      `<circle cx="15" cy="20" r="2.6" fill="#38e8ff" opacity=".85" ${S1}/>` +
      `<path d="M23 17 q4 -1 4 -5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="11" cy="29" r="2.5" fill="#171030" ${S1}/><circle cx="19" cy="29" r="2.5" fill="#171030" ${S1}/>`
  );
  const gridMat = item(
    40,
    12,
    `<rect x="2" y="3" width="36" height="7" rx="2" fill="#171030" ${S1}/>` +
      `<path d="M8 3 v7 M14 3 v7 M20 3 v7 M26 3 v7 M32 3 v7" stroke="#ff4fd8" stroke-width=".9" opacity=".65"/>` +
      `<path d="M2 6.5 h36" stroke="#38e8ff" stroke-width=".9" opacity=".65"/>`
  );
  return [door, battlestation, robot, gridMat];
}

// ---------------------------------------------------------------------------
// Decor items — Zen Garden
// ---------------------------------------------------------------------------

/** Five-petal blossom cluster used by the cherry branch. */
function bloom(x: number, y: number, r: number): string {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      const px = (x + Math.cos(rad) * r).toFixed(1);
      const py = (y + Math.sin(rad) * r).toFixed(1);
      return `<circle cx="${px}" cy="${py}" r="${(r * 0.9).toFixed(1)}" fill="#ffc4d6" stroke="${INK}" stroke-width=".7"/>`;
    })
    .join('');
  return `${petals}<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="#ffe14f" stroke="${INK}" stroke-width=".6"/>`;
}

function zenWall(): string[] {
  const branch = item(
    64,
    58,
    `<path d="M0 4 C14 8 24 6 34 14 C40 18 46 18 52 24" fill="none" stroke="#6b4a30" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M22 6 C26 10 27 14 26 18 M40 16 C42 20 42 24 40 27" fill="none" stroke="#6b4a30" stroke-width="1.8" stroke-linecap="round"/>` +
      bloom(26, 19, 2.6) +
      bloom(40, 28, 2.4) +
      bloom(52, 25, 2.8) +
      bloom(14, 5, 2.2) +
      bloom(34, 11, 2) +
      `<circle cx="46" cy="20" r="1.5" fill="#ff9ec0" stroke="${INK}" stroke-width=".6"/>` +
      `<circle cx="20" cy="9" r="1.3" fill="#ff9ec0" stroke="${INK}" stroke-width=".6"/>` +
      `<circle cx="30" cy="38" r="1.1" fill="#ffc4d6" opacity=".9"/>` +
      `<circle cx="48" cy="44" r="1" fill="#ffc4d6" opacity=".8"/>` +
      `<circle cx="18" cy="50" r="1.1" fill="#ffc4d6" opacity=".7"/>`
  );
  const lantern = item(
    30,
    48,
    shadow(15, 45, 11) +
      `<rect x="7" y="38" width="16" height="5" rx="1" fill="#b5b5a5" ${S}/>` +
      `<rect x="11" y="30" width="8" height="8" fill="#a8a89a" ${S}/>` +
      `<rect x="6" y="20" width="18" height="10" rx="1" fill="#a8a89a" ${S}/>` +
      `<rect x="9" y="22" width="4" height="6" fill="#ffe9a8" ${S1}/>` +
      `<rect x="17" y="22" width="4" height="6" fill="#ffe9a8" ${S1}/>` +
      `<polygon points="3,20 27,20 22,13 8,13" fill="#8f8f82" ${S}/>` +
      `<circle cx="15" cy="11" r="2.5" fill="#a8a89a" ${S1}/>` +
      `<circle cx="9" cy="37" r="1.2" fill="#7fb069" stroke="none"/>` +
      `<circle cx="21.5" cy="42" r="1" fill="#7fb069" stroke="none"/>`
  );
  const bonsai = item(
    42,
    38,
    shadow(21, 35, 17) +
      `<path d="M19 28 C17 21 25 20 21 13 L24 12 C28 19 20 21 24 28 z" fill="#8a5a35" ${S1}/>` +
      `<ellipse cx="14" cy="13" rx="8" ry="4.5" fill="#2fbf6b" ${S}/>` +
      `<ellipse cx="29" cy="11" rx="7" ry="4" fill="#269257" ${S}/>` +
      `<ellipse cx="21" cy="5.5" rx="6" ry="3.5" fill="#3ecf7a" ${S}/>` +
      `<path d="M21 13 L15 14 M23 12 L28 12" stroke="#6b4a30" stroke-width="1.2" stroke-linecap="round"/>` +
      `<rect x="11" y="28" width="20" height="6" rx="2" fill="#8a5a35" ${S}/>` +
      `<rect x="13" y="34" width="3" height="2" fill="#6b4a30"/><rect x="26" y="34" width="3" height="2" fill="#6b4a30"/>`
  );
  const fountain = item(
    38,
    42,
    shadow(19, 39, 15) +
      `<rect x="28" y="8" width="5" height="24" rx="2" fill="#b5c96a" ${S1}/>` +
      `<path d="M28 16 h5 M28 24 h5" stroke="#8a9a4a" stroke-width="1"/>` +
      `<polygon points="29,9 33,12 22,20 19,17" fill="#b5c96a" ${S}/>` +
      `<path d="M21 19 C20 22 20 24 20 26" fill="none" stroke="#9fd8ff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M6 27 q0 8 13 8 q13 0 13 -8" fill="#a8a89a" ${S}/>` +
      `<ellipse cx="19" cy="27" rx="13" ry="4" fill="#b5b5a5" ${S}/>` +
      `<ellipse cx="19" cy="27" rx="9.5" ry="2.6" fill="#9fd8ff" ${S1}/>` +
      `<path d="M16 26.5 a3.5 1.2 0 0 0 7 0" fill="none" stroke="#ffffff" stroke-width=".8" opacity=".8"/>` +
      `<circle cx="7" cy="37" r="1.6" fill="#8f8f82" ${S1}/><circle cx="31" cy="38" r="1.4" fill="#b5b5a5" ${S1}/>`
  );
  const cushion = item(
    34,
    18,
    shadow(17, 15, 14) +
      `<ellipse cx="17" cy="9" rx="13" ry="6" fill="#8fb573" ${S}/>` +
      `<ellipse cx="17" cy="7" rx="11" ry="4.5" fill="#9fc482" ${S1}/>` +
      `<path d="M8 13 l-1.5 1.5 M13 14.5 l-.8 1.8 M21 14.5 l.8 1.8 M26 13 l1.5 1.5" stroke="${INK}" stroke-width="1" opacity=".35" stroke-linecap="round"/>` +
      `<circle cx="17" cy="7" r="1.2" fill="#6f9455" ${S1}/>`
  );
  const scroll = item(
    24,
    56,
    `<line x1="12" y1="0" x2="12" y2="3" stroke="#6b4a30" stroke-width="1.2"/>` +
      `<rect x="2" y="2" width="20" height="3" rx="1.5" fill="#6b4a30" ${S1}/>` +
      `<rect x="5" y="5" width="14" height="42" fill="#fff8ec" ${S1}/>` +
      `<path d="M16 18 a6 6 0 1 0 1 6" fill="none" stroke="#4a4468" stroke-width="2.5" stroke-linecap="round"/>` +
      `<rect x="14" y="40" width="3.5" height="3.5" fill="#ff5d55"/>` +
      `<rect x="3" y="47" width="18" height="3" rx="1.5" fill="#6b4a30" ${S1}/>`
  );
  return [branch, lantern, bonsai, fountain, cushion, scroll];
}

function zenRoof(): string[] {
  const rocks = item(
    46,
    20,
    `<ellipse cx="23" cy="14" rx="21" ry="5" fill="#e8ddb5" ${S}/>` +
      `<ellipse cx="23" cy="14" rx="16" ry="3.4" fill="none" stroke="#cbbd8f" stroke-width="1"/>` +
      `<ellipse cx="23" cy="14" rx="11" ry="2.2" fill="none" stroke="#cbbd8f" stroke-width="1"/>` +
      `<path d="M14 13 C12 8 17 6 19 9 C20 12 17 14 14 13 z" fill="#8f8f82" ${S}/>` +
      `<path d="M28 13 C27 10 31 8 33 10 C34 12 31 14 28 13 z" fill="#a8a89a" ${S}/>` +
      `<circle cx="16" cy="9.5" r=".8" fill="#c5c5b8" stroke="none"/>`
  );
  const maple = item(
    36,
    38,
    shadow(18, 35, 13) +
      `<path d="M17 34 C17 26 15 22 13 18 L17 20 L19 15 L21 20 L25 18 C21 23 19 27 19 34 z" fill="#6b4a30" ${S1}/>` +
      `<ellipse cx="12" cy="15" rx="9" ry="6.5" fill="#e85a4f" ${S}/>` +
      `<ellipse cx="25" cy="13" rx="8" ry="6" fill="#d94840" ${S}/>` +
      `<ellipse cx="18" cy="7" rx="7" ry="5" fill="#ff7a63" ${S}/>` +
      `<circle cx="31" cy="22" r="1" fill="#e85a4f" opacity=".8"/>` +
      `<circle cx="7" cy="24" r=".9" fill="#ff7a63" opacity=".8"/>`
  );
  const miniLantern = item(
    20,
    26,
    shadow(10, 23, 7) +
      `<rect x="6" y="19" width="8" height="4" rx="1" fill="#b5b5a5" ${S1}/>` +
      `<rect x="4" y="12" width="12" height="7" fill="#a8a89a" ${S}/>` +
      `<rect x="7.5" y="13.5" width="5" height="4" fill="#ffe9a8" ${S1}/>` +
      `<polygon points="2,12 18,12 14,6 6,6" fill="#8f8f82" ${S}/>` +
      `<circle cx="10" cy="4.5" r="1.6" fill="#a8a89a" ${S1}/>`
  );
  return [rocks, maple, miniLantern];
}

function zenLobby(): string[] {
  const shojiLattice = (x: number): string =>
    `<rect x="${x}" y="4" width="18" height="42" fill="#f7f0dd" ${S}/>` +
    `<path d="M${x + 6} 4 v42 M${x + 12} 4 v42 M${x} 14 h18 M${x} 25 h18 M${x} 36 h18" stroke="#8a6942" stroke-width="1.2"/>`;
  const door = item(
    48,
    52,
    shojiLattice(6) +
      shojiLattice(24) +
      `<circle cx="21" cy="26" r="1.3" fill="#8a6942" ${S1}/>` +
      `<circle cx="27" cy="26" r="1.3" fill="#8a6942" ${S1}/>` +
      `<rect x="4" y="46" width="40" height="3" rx="1" fill="#8a6942" ${S1}/>` +
      `<rect x="8" y="49" width="32" height="3" rx="1.5" fill="#dccf9f" ${S1}/>`
  );
  const lowDesk = item(
    52,
    30,
    shadow(26, 27, 22) +
      `<rect x="10" y="19" width="4" height="8" fill="#6b4a30" ${S1}/>` +
      `<rect x="38" y="19" width="4" height="8" fill="#6b4a30" ${S1}/>` +
      `<rect x="6" y="14" width="40" height="5" rx="2" fill="#8a5a35" ${S}/>` +
      `<path d="M20 14 q4 -7 8 0 z" fill="#caa24d" ${S1}/>` +
      `<circle cx="24" cy="6" r="1" fill="#caa24d" ${S1}/>` +
      `<rect x="36" y="9" width="5" height="5" rx="1" fill="#4a4468" ${S1}/>` +
      `<path d="M38.5 9 C37 6 40 4 39.5 1.5" fill="none" stroke="#6b4a30" stroke-width="1.2" stroke-linecap="round"/>` +
      bloom(40, 2, 1.6)
  );
  const maneki = item(
    28,
    36,
    shadow(14, 33, 10) +
      `<path d="M7 32 C5 22 8 15 14 15 C20 15 23 22 21 32 z" fill="#fff8ec" ${S}/>` +
      `<circle cx="23" cy="15" r="3.2" fill="#fff8ec" ${S}/>` +
      `<path d="M25.5 12 a5 5 0 0 1 1 -3.5" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
      `<polygon points="8,8 9.5,2.5 13,6.5" fill="#fff8ec" ${S1}/>` +
      `<polygon points="20,8 18.5,2.5 15,6.5" fill="#fff8ec" ${S1}/>` +
      `<polygon points="9.3,6.5 10,4.5 11.7,6.2" fill="#ff9ec0" stroke="none"/>` +
      `<polygon points="18.7,6.5 18,4.5 16.3,6.2" fill="#ff9ec0" stroke="none"/>` +
      `<circle cx="14" cy="11" r="7" fill="#fff8ec" ${S}/>` +
      `<path d="M10.5 10.5 q1.2 -1.5 2.4 0 M15.1 10.5 q1.2 -1.5 2.4 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="M13.2 13 q.8 1 1.6 0" fill="none" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/>` +
      `<circle cx="14" cy="12.4" r=".7" fill="#ff9ec0" stroke="none"/>` +
      `<path d="M7.5 12.5 h-3 M7.6 14 l-2.8 1 M20.5 12.5 h3 M20.4 14 l2.8 1" stroke="${INK}" stroke-width=".7" opacity=".6"/>` +
      `<path d="M9 19 h10" stroke="#ff5d55" stroke-width="2.5" stroke-linecap="round"/>` +
      `<circle cx="14" cy="21" r="1.7" fill="#ffc93c" ${S1}/>` +
      `<ellipse cx="14" cy="27" rx="4" ry="4.6" fill="#ffe9c4" stroke="none"/>`
  );
  const pine = item(
    26,
    36,
    shadow(13, 33, 9) +
      `<polygon points="13,3 19,12 7,12" fill="#2fbf6b" ${S}/>` +
      `<polygon points="13,8 21,19 5,19" fill="#269257" ${S}/>` +
      `<rect x="11.5" y="19" width="3" height="5" fill="#6b4a30" ${S1}/>` +
      `<polygon points="7,25 19,25 17,32 9,32" fill="#4a4468" ${S}/>` +
      `<rect x="6" y="23" width="14" height="3" rx="1.5" fill="#5a5470" ${S1}/>`
  );
  return [door, lowDesk, maneki, pine];
}

// ---------------------------------------------------------------------------
// Decor items — Gold Executive
// ---------------------------------------------------------------------------

function goldWall(): string[] {
  const chandelier = item(
    52,
    56,
    `<line x1="26" y1="0" x2="26" y2="8" stroke="#caa24d" stroke-width="2"/>` +
      `<circle cx="26" cy="5" r="1.5" fill="none" stroke="#caa24d" stroke-width="1"/>` +
      tube('M26 8 V19', '#caa24d', 3) +
      tube('M26 18 C12 18 8 25 8 31', '#caa24d', 2.5) +
      tube('M26 18 C40 18 44 25 44 31', '#caa24d', 2.5) +
      tube('M26 18 C19 20 17 25 17 29', '#caa24d', 2.5) +
      tube('M26 18 C33 20 35 25 35 29', '#caa24d', 2.5) +
      `<rect x="5" y="30" width="6" height="4" rx="1" fill="#ffc93c" ${S1}/>` +
      `<rect x="14" y="28" width="6" height="4" rx="1" fill="#ffc93c" ${S1}/>` +
      `<rect x="32" y="28" width="6" height="4" rx="1" fill="#ffc93c" ${S1}/>` +
      `<rect x="41" y="30" width="6" height="4" rx="1" fill="#ffc93c" ${S1}/>` +
      `<path d="M8 25.5 q2 3 0 4.5 q-2 -1.5 0 -4.5 z" fill="#ffe9a8" ${S1}/>` +
      `<path d="M17 23.5 q2 3 0 4.5 q-2 -1.5 0 -4.5 z" fill="#ffe9a8" ${S1}/>` +
      `<path d="M35 23.5 q2 3 0 4.5 q-2 -1.5 0 -4.5 z" fill="#ffe9a8" ${S1}/>` +
      `<path d="M44 25.5 q2 3 0 4.5 q-2 -1.5 0 -4.5 z" fill="#ffe9a8" ${S1}/>` +
      `<circle cx="26" cy="22" r="3" fill="#ffc93c" ${S1}/>` +
      `<polygon points="26,26 28,29.5 26,33 24,29.5" fill="#cde8f8" opacity=".92" ${S1}/>` +
      `<polygon points="13,35 14.5,37.5 13,40 11.5,37.5" fill="#cde8f8" opacity=".9" stroke="${INK}" stroke-width=".7"/>` +
      `<polygon points="39,35 40.5,37.5 39,40 37.5,37.5" fill="#cde8f8" opacity=".9" stroke="${INK}" stroke-width=".7"/>`
  );
  const sconce = item(
    24,
    56,
    `<rect x="9" y="8" width="6" height="16" rx="3" fill="#caa24d" ${S}/>` +
      tube('M12 20 q8 2 8 8', '#caa24d', 2.2) +
      `<circle cx="20" cy="23" r="6.5" fill="#ffe9a8" opacity=".35"/>` +
      `<rect x="17" y="26" width="6" height="4" rx="1" fill="#ffc93c" ${S1}/>` +
      `<path d="M20 21 q2.5 3.5 0 5.5 q-2.5 -2 0 -5.5 z" fill="#ffe9a8" ${S1}/>` +
      `<circle cx="12" cy="12" r="1.2" fill="#ffe08a" stroke="none"/>`
  );
  const unicorn = item(
    36,
    54,
    shadow(18, 51, 14) +
      `<rect x="8" y="41" width="20" height="9" rx="1" fill="#f0e2c8" ${S}/>` +
      `<path d="M11 45 q4 2 7 0 q4 -2 7 0" fill="none" stroke="#d9c8a8" stroke-width="1"/>` +
      `<rect x="6" y="37" width="24" height="4" rx="1" fill="#ffffff" ${S}/>` +
      `<path d="M13 37 C12 27 16 22 21 19 C22 15 24 12 27 12 C30 12 31 14 30 17 L26 20 C24 26 22 30 23 37 z" fill="#ffc93c" ${S}/>` +
      `<polygon points="27,12 33,2 29,13" fill="#ffe08a" ${S1}/>` +
      `<polygon points="24,13 22.5,10 26,11.5" fill="#ffc93c" ${S1}/>` +
      `<path d="M21 19 C18 22 17 27 17 32 C19 28 21 24 23 21 z" fill="#e8a01f" ${S1}/>` +
      `<circle cx="27.5" cy="15" r=".9" fill="${INK}"/>` +
      `<circle cx="30" cy="16.5" r=".5" fill="#8a5a35"/>`
  );
  const aquarium = item(
    52,
    38,
    shadow(26, 35, 22) +
      `<rect x="6" y="30" width="40" height="5" rx="1" fill="#6f3a22" ${S}/>` +
      `<rect x="8" y="8" width="36" height="22" fill="url(#os-gold-aqua)" ${S}/>` +
      `<path d="M14 30 C13 24 16 20 14 14 M20 30 q2 -5 1 -9" fill="none" stroke="#2fbf7f" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M27 15 a3.5 2.6 0 1 0 0 .1 z M27 16.3 l4 2.6 v-5.2 z" fill="#ff8a2a" stroke="${INK}" stroke-width=".8"/>` +
      `<path d="M37 23 a3 2.2 0 1 0 0 .1 z M37 24.1 l-3.4 2.2 v-4.4 z" fill="#ffb02e" stroke="${INK}" stroke-width=".8" transform="rotate(180 36 23.5)"/>` +
      `<circle cx="24" cy="12" r="1" fill="#ffffff" opacity=".65"/><circle cx="40" cy="16" r=".8" fill="#ffffff" opacity=".6"/><circle cx="33" cy="10.5" r=".7" fill="#ffffff" opacity=".55"/>` +
      `<path d="M10 27.5 h32" stroke="#e8d9b0" stroke-width="2" opacity=".9"/>` +
      `<rect x="6" y="4" width="40" height="4" rx="1" fill="#caa24d" ${S}/>` +
      `<rect x="6" y="28.5" width="40" height="3" rx="1" fill="#caa24d" ${S1}/>`,
    lg('os-gold-aqua', '#7fd4f0', '#3a9ed6')
  );
  const palmPot = item(
    36,
    54,
    shadow(18, 51, 13) +
      `<path d="M18 36 C8 30 4 20 8 9 C13 17 16 27 18 36 z" fill="#269257" ${S}/>` +
      `<path d="M18 36 C28 30 32 20 28 9 C23 17 20 27 18 36 z" fill="#2fbf7f" ${S}/>` +
      `<path d="M18 36 C13 26 13 16 18 8 C23 16 23 26 18 36 z" fill="#3ecf7a" ${S}/>` +
      `<polygon points="11,38 25,38 23,50 13,50" fill="#caa24d" ${S}/>` +
      `<rect x="10" y="35" width="16" height="4" rx="2" fill="#ffc93c" ${S}/>` +
      `<line x1="14" y1="41" x2="14" y2="47" stroke="#ffe08a" stroke-width="1.5" opacity=".8"/>`
  );
  const column = item(
    26,
    56,
    shadow(13, 53, 10) +
      `<rect x="3" y="4" width="20" height="5" rx="1" fill="#ffc93c" ${S}/>` +
      `<rect x="5" y="9" width="16" height="3" fill="#f0e2c8" ${S1}/>` +
      `<rect x="6" y="12" width="14" height="34" fill="#f6ecd9" ${S}/>` +
      `<path d="M10 13 v32 M13 13 v32 M16 13 v32" stroke="#d9c8a8" stroke-width="1.2"/>` +
      `<rect x="5" y="46" width="16" height="3" fill="#f0e2c8" ${S1}/>` +
      `<rect x="3" y="49" width="20" height="4" rx="1" fill="#ffc93c" ${S}/>`
  );
  return [chandelier, sconce, unicorn, aquarium, palmPot, column];
}

function goldRoof(): string[] {
  const helipad = item(
    52,
    22,
    `<ellipse cx="26" cy="13" rx="24" ry="8" fill="#caa24d" ${S}/>` +
      `<ellipse cx="26" cy="12.5" rx="18" ry="5.8" fill="#ffc93c" ${S1}/>` +
      `<rect x="21.5" y="9" width="2.4" height="8" fill="#6f3a22"/>` +
      `<rect x="28.1" y="9" width="2.4" height="8" fill="#6f3a22"/>` +
      `<rect x="23.9" y="11.8" width="4.2" height="2.4" fill="#6f3a22"/>` +
      `<circle cx="6" cy="12" r="1" fill="#fff8ec" ${S1}/><circle cx="46" cy="12" r="1" fill="#fff8ec" ${S1}/>` +
      `<circle cx="26" cy="19.5" r="1" fill="#fff8ec" ${S1}/>`
  );
  const flag = item(
    28,
    40,
    shadow(14, 37, 9) +
      `<line x1="8" y1="5" x2="8" y2="36" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="8" cy="3.5" r="2" fill="#ffc93c" ${S1}/>` +
      `<path d="M9 7 C16 5 20 9 27 7 L26 17 C19 19 15 15 9 17 z" fill="#ffc93c" ${S}/>` +
      `<text x="17" y="14.6" text-anchor="middle" font-size="7" font-weight="800" fill="#6f3a22">$</text>`
  );
  const dome = item(
    36,
    26,
    shadow(18, 23, 14) +
      `<path d="M6 17 C6 6 30 6 30 17 z" fill="#ffe08a" opacity=".92" ${S}/>` +
      `<path d="M13 8.2 C12 11 12 14 12 17 M23 8.2 C24 11 24 14 24 17 M18 6.8 V17" fill="none" stroke="#caa24d" stroke-width="1.2"/>` +
      `<circle cx="18" cy="5.5" r="1.7" fill="#ffc93c" ${S1}/>` +
      `<rect x="4" y="17" width="28" height="5" rx="1" fill="#f0e2c8" ${S}/>`
  );
  return [helipad, flag, dome];
}

function goldLobby(): string[] {
  const door = item(
    50,
    52,
    `<rect x="5" y="2" width="40" height="46" rx="4" fill="#caa24d" ${S}/>` +
      `<rect x="9" y="6" width="32" height="38" rx="2" fill="#cde8f8" opacity=".88" ${S1}/>` +
      `<line x1="14" y1="38" x2="30" y2="10" stroke="#ffffff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>` +
      `<path d="M12 36 L38 14" stroke="#caa24d" stroke-width="2"/>` +
      `<rect x="23.5" y="6" width="3" height="38" fill="#ffc93c" ${S1}/>` +
      `<rect x="7" y="48" width="36" height="4" rx="1" fill="#8a1f2e" ${S1}/>` +
      `<path d="M9 49 h32 M9 51 h32" stroke="#ffc93c" stroke-width=".8" opacity=".9"/>`
  );
  const marbleDesk = item(
    56,
    40,
    shadow(28, 37, 24) +
      `<rect x="6" y="13" width="44" height="23" rx="2" fill="#f6ecd9" ${S}/>` +
      `<path d="M12 17 C18 21 14 27 22 31 M36 15 C32 22 42 24 38 32" fill="none" stroke="#d9c8a8" stroke-width="1"/>` +
      `<rect x="4" y="8" width="48" height="5" rx="2" fill="#f0e2c8" ${S}/>` +
      `<line x1="7" y1="15.5" x2="49" y2="15.5" stroke="#caa24d" stroke-width="1.5"/>` +
      `<path d="M12 8 q4 -7 8 0 z" fill="#ffc93c" ${S1}/>` +
      `<circle cx="16" cy="1.8" r="1.1" fill="#ffc93c" ${S1}/>` +
      `<rect x="11" y="7" width="10" height="1.6" fill="#caa24d" ${S1}/>` +
      `<rect x="32" y="5" width="13" height="3" rx="0.5" fill="#8a1f2e" ${S1}/>` +
      `<line x1="38.5" y1="5" x2="38.5" y2="8" stroke="#ffc93c" stroke-width=".8"/>`
  );
  const stanchions = item(
    48,
    36,
    shadow(24, 33, 21) +
      `<ellipse cx="10" cy="31" rx="6" ry="2.5" fill="#caa24d" ${S1}/>` +
      `<ellipse cx="38" cy="31" rx="6" ry="2.5" fill="#caa24d" ${S1}/>` +
      `<rect x="8.5" y="10" width="3" height="21" fill="#ffc93c" ${S1}/>` +
      `<rect x="36.5" y="10" width="3" height="21" fill="#ffc93c" ${S1}/>` +
      `<circle cx="10" cy="8.5" r="3" fill="#ffc93c" ${S}/>` +
      `<circle cx="38" cy="8.5" r="3" fill="#ffc93c" ${S}/>` +
      tube('M13 12 C20 21 28 21 35 12', '#8a1f2e', 3) +
      `<circle cx="13" cy="12" r="1.2" fill="#caa24d" ${S1}/>` +
      `<circle cx="35" cy="12" r="1.2" fill="#caa24d" ${S1}/>`
  );
  const orchid = item(
    24,
    40,
    shadow(12, 37, 9) +
      `<path d="M12 26 C10 18 14 12 12 6" fill="none" stroke="#269257" stroke-width="1.5" stroke-linecap="round"/>` +
      bloom(12, 5, 2.4) +
      bloom(15, 12, 2) +
      bloom(9.5, 17, 1.8) +
      `<path d="M12 26 C8 23 5 23 3 25 C6 27 10 27 12 26 z" fill="#2fbf7f" ${S1}/>` +
      `<path d="M12 26 C16 23 19 23 21 25 C18 27 14 27 12 26 z" fill="#269257" ${S1}/>` +
      `<polygon points="7,27 17,27 16,35 8,35" fill="#caa24d" ${S}/>` +
      `<rect x="6" y="25" width="12" height="3" rx="1.5" fill="#ffc93c" ${S1}/>`
  );
  return [door, marbleDesk, stanchions, orchid];
}

// ---------------------------------------------------------------------------
// Registry, deterministic selection & memoisation
// ---------------------------------------------------------------------------

interface WallpaperArt {
  wall: string[];
  roof: string[];
  lobby: string[];
}

const ART_BUILDERS: Record<string, () => WallpaperArt> = {
  concrete: () => ({ wall: concreteWall(), roof: concreteRoof(), lobby: concreteLobby() }),
  startup: () => ({ wall: startupWall(), roof: startupRoof(), lobby: startupLobby() }),
  jungle: () => ({ wall: jungleWall(), roof: jungleRoof(), lobby: jungleLobby() }),
  sunset: () => ({ wall: sunsetWall(), roof: sunsetRoof(), lobby: sunsetLobby() }),
  neon: () => ({ wall: neonWall(), roof: neonRoof(), lobby: neonLobby() }),
  zen: () => ({ wall: zenWall(), roof: zenRoof(), lobby: zenLobby() }),
  gold: () => ({ wall: goldWall(), roof: goldRoof(), lobby: goldLobby() }),
};

function normalizeId(wallpaperId: string): string {
  return ART_BUILDERS[wallpaperId] ? wallpaperId : 'concrete';
}

const artCache = new Map<string, WallpaperArt>();

function artOf(wallpaperId: string): WallpaperArt {
  const id = normalizeId(wallpaperId);
  let art = artCache.get(id);
  if (!art) {
    art = ART_BUILDERS[id]();
    artCache.set(id, art);
  }
  return art;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Deterministically pick 3–5 items from the pool, varied by floor index. */
function pickWallItems(pool: string[], floorIndex: number): string {
  const n = pool.length;
  const fi = ((floorIndex % 9973) + 9973) % 9973; // normalise negatives
  const count = Math.min(3 + (fi % 3), n);
  const start = (fi * 3 + 1) % n;
  let step = 1 + (fi % (n - 1));
  while (gcd(step, n) !== 1) step -= 1; // step 1 is always coprime
  const parts: string[] = [];
  for (let i = 0; i < count; i++) parts.push(pool[(start + i * step) % n]);
  return parts.join('');
}

const varsCache = new Map<string, string>();
const decorCache = new Map<string, string>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inline CSS custom properties for the whole building, e.g.
 * "--wall-bg:linear-gradient(...);--wall-text:#fff;..." (no leading/trailing ;).
 */
export function officeWallVars(wallpaperId: string): string {
  const id = VARS[wallpaperId] ? wallpaperId : 'concrete';
  let out = varsCache.get(id);
  if (out === undefined) {
    const v = VARS[id];
    out = VAR_KEYS.map((k) => `${k}:${v[k]}`).join(';');
    varsCache.set(id, out);
  }
  return out;
}

/**
 * Decor items for one floor's wall band: 3–5 standalone <svg> elements,
 * bottom-aligned in a flex row (band height 64 px). Selection and order vary
 * deterministically with floorIndex.
 */
export function wallDecor(wallpaperId: string, floorIndex: number): string {
  const id = normalizeId(wallpaperId);
  const key = `${id}:${floorIndex}`;
  let out = decorCache.get(key);
  if (out === undefined) {
    out = pickWallItems(artOf(id).wall, floorIndex);
    decorCache.set(key, out);
  }
  return out;
}

/** Decor items for the roof band (height 44 px). */
export function roofDecor(wallpaperId: string): string {
  const id = normalizeId(wallpaperId);
  const key = `${id}:roof`;
  let out = decorCache.get(key);
  if (out === undefined) {
    out = artOf(id).roof.join('');
    decorCache.set(key, out);
  }
  return out;
}

/** Decor items for the lobby band (height 56 px). */
export function lobbyDecor(wallpaperId: string): string {
  const id = normalizeId(wallpaperId);
  const key = `${id}:lobby`;
  let out = decorCache.get(key);
  if (out === undefined) {
    out = artOf(id).lobby.join('');
    decorCache.set(key, out);
  }
  return out;
}

/**
 * Decor for the floor currently under construction (wall band, 64 px):
 * scaffolding with planks and bricks, a hanging warning-stripe banner and a
 * toolbox + paint bucket. Wallpaper-independent and fully deterministic.
 */
export function constructionDecor(): string {
  const key = '__construction';
  let out = decorCache.get(key);
  if (out === undefined) {
    const scaffold = item(
      58,
      60,
      shadow(29, 57, 24) +
        `<rect x="6" y="4" width="4" height="53" rx="1.5" fill="#ff8a2a" ${S1}/>` +
        `<rect x="48" y="4" width="4" height="53" rx="1.5" fill="#ff8a2a" ${S1}/>` +
        tube('M9 36 L49 22', '#b9c4d2', 2) +
        tube('M9 22 L49 36', '#b9c4d2', 2) +
        `<rect x="2" y="16" width="54" height="5" rx="1.5" fill="#d9a05b" ${S1}/>` +
        `<rect x="2" y="37" width="54" height="5" rx="1.5" fill="#d9a05b" ${S1}/>` +
        `<line x1="20" y1="17" x2="20" y2="20" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
        `<line x1="38" y1="38" x2="38" y2="41" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
        `<rect x="12" y="10.5" width="9" height="5.5" rx="1" fill="#e2604f" ${S1}/>` +
        `<rect x="23" y="10.5" width="9" height="5.5" rx="1" fill="#e2604f" ${S1}/>` +
        `<rect x="17" y="31.5" width="9" height="5.5" rx="1" fill="#e2604f" ${S1}/>`
    );
    const banner = item(
      46,
      58,
      `<path d="M10 0 V11 M36 0 V11" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
        `<rect x="4" y="10" width="38" height="16" rx="2" fill="#ffb02e" ${S}/>` +
        `<path d="M7 24.5 l7 -13 h5 l-7 13 z M19 24.5 l7 -13 h5 l-7 13 z M31 24.5 l7 -13 h4 l-7 13 z" fill="${INK}" opacity=".85"/>`
    );
    const tools = item(
      48,
      32,
      shadow(24, 29, 20) +
        tube('M39 13 L44 3', '#d9a05b', 2.5) +
        `<circle cx="44" cy="3" r="1.6" fill="#ff8a2a" stroke="none"/>` +
        `<path d="M29.5 15.5 h14 l-1.6 11.5 h-10.8 z" fill="#f0f4f8" ${S}/>` +
        `<rect x="28" y="12" width="17" height="3.5" rx="1.5" fill="#d5dde8" ${S1}/>` +
        `<path d="M33.5 17 q1 4 -1.5 4.5" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round"/>` +
        `<rect x="3" y="14" width="21" height="13" rx="2" fill="#ff5d55" ${S}/>` +
        `<line x1="3" y1="19" x2="24" y2="19" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
        `<path d="M9 14 v-2.5 a4.5 4.5 0 0 1 9 0 V14" fill="none" ${S1}/>` +
        `<rect x="11.5" y="17" width="4" height="4" rx="1" fill="#ffb02e" ${S1}/>`
    );
    out = scaffold + banner + tools;
    decorCache.set(key, out);
  }
  return out;
}
