/**
 * cityMap.ts — the city map scene (chantier 1 of the design system).
 *
 * Hand-drawn cartoon SVG of the Valley, viewed top-down in fake 2.5D.
 * Fully self-contained: no imports, no DOM, no randomness — pure string
 * building so the 2 Hz re-render can cheaply reuse the memoised output.
 *
 * The same geometry is drawn for every theme; only the palette changes.
 * All colours flow through a ThemePalette — the drawing code only ever
 * references palette fields plus the two global tones INK and GOLD
 * (and CREAM for plaque text, per the design system).
 */

export interface SiteView {
  id: string; // 'garage' | 'loft' | 'paloalto' | 'campus' | 'tower' | 'seattle' | 'nyc' | 'orbital'
  status: 'free' | 'owned' | 'active';
  label: string; // company name if owned/active, site name otherwise
}

// ---------------------------------------------------------------------------
// Global tones (design system)
// ---------------------------------------------------------------------------

const INK = '#2d2440';
const GOLD = '#ffc93c';
const CREAM = '#fff8ec';

// ---------------------------------------------------------------------------
// Theme palettes
// ---------------------------------------------------------------------------

interface ThemePalette {
  id: string; // used to prefix gradient IDs (cm-<id>-…)
  // ground
  grass: string;
  grassDark: string;
  grassLight: string;
  path: string;
  // roads
  road: string;
  roadDash: string;
  sidewalk: string;
  // water
  river: string;
  riverDeep: string;
  riverGlint: string;
  bridge: string;
  bridgeDark: string;
  // vegetation
  treeA: string;
  treeADark: string;
  treeB: string;
  treeBDark: string;
  trunk: string;
  // buildings
  roofA: string; // warm red
  roofB: string; // blue
  roofC: string; // amber
  roofD: string; // teal/green
  wall: string;
  brick: string;
  brickDark: string;
  glass: string;
  glassDark: string;
  window: string;
  door: string;
  // vehicles & props
  carA: string;
  carB: string;
  carC: string;
  carD: string;
  pool: string;
  court: string;
  sand: string;
  boat: string;
  sail: string;
  cloud: string;
  // "for sale" desaturated model look
  freeFill: string;
  freeRoof: string;
  freeDetail: string;
  // theme extras
  lampGlow: string | null; // lit street lamps (dusk)
  overlay: { from: string; to: string; opacity: number } | null; // warm cast (dusk)
  satTint: string | null; // green drone tint (satellite)
}

const DAYLIGHT: ThemePalette = {
  id: 'daylight',
  grass: '#8ed86f',
  grassDark: '#7ac95e',
  grassLight: '#9fe27f',
  path: '#e8d9b0',
  road: '#aab6c5',
  roadDash: '#ffffff',
  sidewalk: '#f3ead6',
  river: '#4fc3f7',
  riverDeep: '#3bb1ea',
  riverGlint: '#c9efff',
  bridge: '#d8a35c',
  bridgeDark: '#b9833f',
  treeA: '#4fbf5e',
  treeADark: '#3da44c',
  treeB: '#2e9c4e',
  treeBDark: '#25803e',
  trunk: '#8a5a35',
  roofA: '#ff6f61',
  roofB: '#38b6ff',
  roofC: '#ffb02e',
  roofD: '#2fbf7f',
  wall: '#fff3dd',
  brick: '#d96f4e',
  brickDark: '#c05a3c',
  glass: '#c4e8ff',
  glassDark: '#8cc6ee',
  window: '#bfe9ff',
  door: '#7a4b2c',
  carA: '#ff5d55',
  carB: '#38b6ff',
  carC: '#ffb02e',
  carD: '#9b6ef3',
  pool: '#59c9f2',
  court: '#e88f5a',
  sand: '#f0dfae',
  boat: '#ff8a2a',
  sail: '#ffffff',
  cloud: '#ffffff',
  freeFill: '#e7e2d6',
  freeRoof: '#d9d2c2',
  freeDetail: '#cfc8b8',
  lampGlow: null,
  overlay: null,
  satTint: null,
};

const DUSK: ThemePalette = {
  id: 'dusk',
  grass: '#5e7a68',
  grassDark: '#53685f',
  grassLight: '#6d8877',
  path: '#b3a189',
  road: '#5f5b7d',
  roadDash: '#e8def0',
  sidewalk: '#8d829b',
  river: '#3a5f9e',
  riverDeep: '#31518a',
  riverGlint: '#ff9838',
  bridge: '#8a6a4f',
  bridgeDark: '#6f523c',
  treeA: '#3f7a55',
  treeADark: '#336546',
  treeB: '#2e5f45',
  treeBDark: '#24503a',
  trunk: '#6b4a30',
  roofA: '#c65a52',
  roofB: '#3d7fb8',
  roofC: '#c98c33',
  roofD: '#2e8f68',
  wall: '#e8d3bd',
  brick: '#a85a44',
  brickDark: '#8f4936',
  glass: '#4a5a8c',
  glassDark: '#3a4a77',
  window: '#ffd166', // every window is lit at golden hour
  door: '#5a3a24',
  carA: '#d95550',
  carB: '#3d8fd1',
  carC: '#d9962e',
  carD: '#8a5fd1',
  pool: '#3a6f9e',
  court: '#a86a48',
  sand: '#c9b287',
  boat: '#d97a2e',
  sail: '#f0e0d0',
  cloud: '#ffe4d6',
  freeFill: '#9a93a8',
  freeRoof: '#8a8398',
  freeDetail: '#7d7690',
  lampGlow: '#ffd166',
  overlay: { from: '#ff9838', to: '#7a4fd1', opacity: 0.18 },
  satTint: null,
};

const SATELLITE: ThemePalette = {
  id: 'satellite',
  grass: '#7e9a6d',
  grassDark: '#719062',
  grassLight: '#89a478',
  path: '#b5ab8c',
  road: '#9aa0a8',
  roadDash: '#d7dade',
  sidewalk: '#b7bcc2',
  river: '#52788c',
  riverDeep: '#48697c',
  riverGlint: '#7fa3b5',
  bridge: '#8f8a80',
  bridgeDark: '#7a7568',
  treeA: '#5d7a52',
  treeADark: '#4f6a46',
  treeB: '#4a6a48',
  treeBDark: '#3d5a3c',
  trunk: '#6f6a56',
  roofA: '#a06a5f',
  roofB: '#6f8496',
  roofC: '#a68a55',
  roofD: '#6f9480',
  wall: '#c9c4b2',
  brick: '#96685a',
  brickDark: '#84584c',
  glass: '#8fa4ad',
  glassDark: '#7d929c',
  window: '#a8bcc2',
  door: '#6a5a48',
  carA: '#8f959c',
  carB: '#7d8a94',
  carC: '#9c9480',
  carD: '#84808f',
  pool: '#6a92a4',
  court: '#9a7d60',
  sand: '#b5ab8c',
  boat: '#9a8f7d',
  sail: '#d5d0c2',
  cloud: '#e8e8e4',
  freeFill: '#b5b0a2',
  freeRoof: '#a8a294',
  freeDetail: '#9a948a',
  lampGlow: null,
  overlay: null,
  satTint: '#3ecf6e',
};

const PALETTES: Record<string, ThemePalette> = {
  daylight: DAYLIGHT,
  dusk: DUSK,
  satellite: SATELLITE,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

function truncLabel(s: string): string {
  return s.length > 16 ? s.slice(0, 16) + '…' : s;
}

/** Soft drop shadow under an object (design-system rule). */
function shadow(cx: number, cy: number, rx: number, ry: number): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity=".12" stroke="none"/>`;
}

/** Gold ground ring for the active site. */
function activeRing(cx: number, cy: number, rx: number, ry: number): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${GOLD}" stroke-width="3"/>`;
}

/** Cel-shading glaze: darker face on the right/bottom of a shape. */
function shadeRect(x: number, y: number, w: number, h: number, o = 0.1): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}" opacity="${o}" stroke="none"/>`;
}

/** Cel highlight (top/left rim light). */
function liteRect(x: number, y: number, w: number, h: number, P: ThemePalette): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.cloud}" opacity=".22" stroke="none"/>`;
}

/** Company plaque under an owned/active building. */
function plaque(cx: number, y: number, label: string, active: boolean): string {
  const t = truncLabel(label);
  const w = Math.min(150, Math.max(48, t.length * 6.6 + 18));
  const bg = active ? GOLD : INK;
  const fg = active ? INK : CREAM;
  return (
    `<g>` +
    `<rect x="${(cx - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="17" rx="8.5" fill="${bg}"/>` +
    `<text x="${cx}" y="${y + 12.5}" text-anchor="middle" font-family="inherit" font-weight="800" font-size="10" fill="${fg}" stroke="none">${esc(t)}</text>` +
    `</g>`
  );
}

/** Wooden FOR SALE sign planted in front of a free lot. */
function forSaleSign(x: number, y: number, P: ThemePalette): string {
  return (
    `<g>` +
    `<rect x="${x - 2}" y="${y - 26}" width="4" height="26" rx="1.5" fill="${P.trunk}"/>` +
    `<rect x="${x - 28}" y="${y - 46}" width="56" height="21" rx="3" fill="${P.bridge}"/>` +
    `<rect x="${x - 24}" y="${y - 43}" width="48" height="2.5" rx="1" fill="${P.bridgeDark}" stroke="none"/>` +
    `<text x="${x}" y="${y - 30}" text-anchor="middle" font-family="inherit" font-weight="800" font-size="10" fill="${INK}" stroke="none">FOR SALE</text>` +
    `</g>`
  );
}

/** Gold pennant above the active site (waved by CSS via .map-active-flag). */
function activeFlag(x: number, y: number): string {
  return (
    `<g class="map-active-flag"><g transform="translate(${x} ${y})">` +
    `<line x1="0" y1="0" x2="0" y2="-20" stroke-width="2.5"/>` +
    `<path d="M0,-20 L17,-14.5 L0,-9 Z" fill="${GOLD}"/>` +
    `</g></g>`
  );
}

// --- vegetation ------------------------------------------------------------

/** Round fluffy tree (variant A). */
function treeRound(x: number, y: number, s: number, P: ThemePalette): string {
  const r = 10 * s;
  return (
    `<g>` +
    `<ellipse cx="${x}" cy="${y}" rx="${(r * 0.9).toFixed(1)}" ry="${(3 * s).toFixed(1)}" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="${(x - 2 * s).toFixed(1)}" y="${(y - 9 * s).toFixed(1)}" width="${4 * s}" height="${9 * s}" rx="${1.5 * s}" fill="${P.trunk}"/>` +
    `<circle cx="${x}" cy="${(y - 15 * s).toFixed(1)}" r="${r}" fill="${P.treeA}"/>` +
    `<path d="M${x},${(y - 15 * s - r).toFixed(1)} A${r},${r} 0 0 1 ${x},${(y - 15 * s + r).toFixed(1)} Z" fill="${P.treeADark}" stroke="none"/>` +
    `<circle cx="${(x - 4 * s).toFixed(1)}" cy="${(y - 19 * s).toFixed(1)}" r="${3 * s}" fill="${P.cloud}" opacity=".3" stroke="none"/>` +
    `</g>`
  );
}

/** Pointy pine (variant B). */
function treePine(x: number, y: number, s: number, P: ThemePalette): string {
  const h = 24 * s;
  const w = 13 * s;
  return (
    `<g>` +
    `<ellipse cx="${x}" cy="${y}" rx="${(w * 0.7).toFixed(1)}" ry="${(2.5 * s).toFixed(1)}" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="${(x - 1.5 * s).toFixed(1)}" y="${(y - 6 * s).toFixed(1)}" width="${3 * s}" height="${6 * s}" fill="${P.trunk}"/>` +
    `<polygon points="${x},${(y - h).toFixed(1)} ${(x - w / 2).toFixed(1)},${(y - 5 * s).toFixed(1)} ${(x + w / 2).toFixed(1)},${(y - 5 * s).toFixed(1)}" fill="${P.treeB}"/>` +
    `<polygon points="${x},${(y - h).toFixed(1)} ${(x + w / 2).toFixed(1)},${(y - 5 * s).toFixed(1)} ${x},${(y - 5 * s).toFixed(1)}" fill="${P.treeBDark}" stroke="none"/>` +
    `</g>`
  );
}

/** Low round bush (variant C). */
function bush(x: number, y: number, s: number, P: ThemePalette): string {
  return (
    `<g>` +
    `<ellipse cx="${x}" cy="${y}" rx="${7 * s}" ry="${5 * s}" fill="${P.treeA}"/>` +
    `<ellipse cx="${(x + 2.5 * s).toFixed(1)}" cy="${(y + 1 * s).toFixed(1)}" rx="${3.5 * s}" ry="${2.5 * s}" fill="${P.treeADark}" stroke="none"/>` +
    `</g>`
  );
}

/** Curvy palm for the Palo Alto forecourt. */
function palm(x: number, y: number, P: ThemePalette, flip = false): string {
  const d = flip ? -1 : 1;
  const tx = x + d * 4;
  const ty = y - 26;
  return (
    `<g>` +
    `<ellipse cx="${x}" cy="${y}" rx="7" ry="2.5" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<path d="M${x},${y} C${x + d * 3},${y - 10} ${x + d * 1},${y - 18} ${tx},${ty}" fill="none" stroke="${P.trunk}" stroke-width="3.5"/>` +
    `<path d="M${tx},${ty} Q${tx - 12},${ty - 8} ${tx - 15},${ty + 3} Q${tx - 7},${ty - 1} ${tx},${ty} Z" fill="${P.treeA}"/>` +
    `<path d="M${tx},${ty} Q${tx + 12},${ty - 8} ${tx + 15},${ty + 3} Q${tx + 7},${ty - 1} ${tx},${ty} Z" fill="${P.treeADark}"/>` +
    `<path d="M${tx},${ty} Q${tx - 4},${ty - 13} ${tx - 11},${ty - 12} Q${tx - 4},${ty - 5} ${tx},${ty} Z" fill="${P.treeA}"/>` +
    `<path d="M${tx},${ty} Q${tx + 4},${ty - 13} ${tx + 11},${ty - 12} Q${tx + 4},${ty - 5} ${tx},${ty} Z" fill="${P.treeA}"/>` +
    `</g>`
  );
}

// --- props -----------------------------------------------------------------

/** Street lamp; head glows when the palette says so (dusk). */
function lamp(x: number, y: number, P: ThemePalette): string {
  const head = P.lampGlow ?? P.sidewalk;
  const glow = P.lampGlow
    ? `<circle cx="${x}" cy="${y - 21}" r="6.5" fill="${P.lampGlow}" opacity=".35" stroke="none"/>`
    : '';
  return (
    `<g>` +
    glow +
    `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 18}" stroke-width="2.5"/>` +
    `<circle cx="${x}" cy="${y - 21}" r="3" fill="${head}"/>` +
    `</g>`
  );
}

/** Tiny parked car seen from the front-top. */
function parkedCar(x: number, y: number, color: string, P: ThemePalette): string {
  return (
    `<g>` +
    `<rect x="${x}" y="${y}" width="22" height="12" rx="4" fill="${color}"/>` +
    `<rect x="${x + 4}" y="${y + 2.5}" width="14" height="4.5" rx="2" fill="${P.window}" stroke-width="1.5"/>` +
    `<circle cx="${x + 4.5}" cy="${y + 12}" r="2.5" fill="${INK}"/>` +
    `<circle cx="${x + 17.5}" cy="${y + 12}" r="2.5" fill="${INK}"/>` +
    `</g>`
  );
}

/** Animated car body (~34 px long, faces +x). Wrapped by the caller. */
function carSprite(color: string, P: ThemePalette): string {
  return (
    `<ellipse cx="17" cy="7" rx="18" ry="3.5" fill="${INK}" opacity=".18" stroke="none"/>` +
    `<path d="M7,-8 L10.5,-15 L24,-15 L28,-8 Z" fill="${color}"/>` +
    `<path d="M11.5,-13.5 L22.5,-13.5 L25.5,-8.5 L9,-8.5 Z" fill="${P.window}" stroke-width="1.5"/>` +
    `<line x1="17" y1="-13.5" x2="17" y2="-8.5" stroke-width="1.5"/>` +
    `<rect x="0" y="-8" width="34" height="10" rx="4" fill="${color}"/>` +
    `<rect x="2" y="-6.5" width="29" height="2.5" rx="1.2" fill="${CREAM}" opacity=".25" stroke="none"/>` +
    `<circle cx="8" cy="3" r="3.6" fill="${INK}"/>` +
    `<circle cx="8" cy="3" r="1.4" fill="${CREAM}" stroke="none"/>` +
    `<circle cx="26" cy="3" r="3.6" fill="${INK}"/>` +
    `<circle cx="26" cy="3" r="1.4" fill="${CREAM}" stroke="none"/>` +
    `<rect x="32" y="-6" width="3" height="3.5" rx="1.2" fill="${GOLD}" stroke-width="1"/>`
  );
}

/** Small non-interactive filler house. */
function fillerHouse(x: number, y: number, w: number, roof: string, P: ThemePalette): string {
  const h = 20;
  const peak = y - h - 12;
  return (
    `<g>` +
    shadow(x + w / 2, y + 1, w * 0.62, 4) +
    `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${P.wall}"/>` +
    shadeRect(x + w - 6, y - h, 6, h) +
    `<polygon points="${x - 3},${y - h} ${x + w / 2},${peak} ${x + w + 3},${y - h}" fill="${roof}"/>` +
    `<polygon points="${x + w / 2},${peak} ${x + w + 3},${y - h} ${x + w / 2},${y - h}" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="${x + w / 2 - 4}" y="${y - 12}" width="8" height="12" fill="${P.door}"/>` +
    `<rect x="${x + 4}" y="${y - 15}" width="8" height="7" fill="${P.window}" stroke-width="1.5"/>` +
    `</g>`
  );
}

// ---------------------------------------------------------------------------
// Scene sections (shared geometry, palette-driven colours)
// ---------------------------------------------------------------------------

function defsSection(P: ThemePalette): string {
  let g =
    `<defs>` +
    `<linearGradient id="cm-${P.id}-glass" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${P.glass}"/>` +
    `<stop offset="1" stop-color="${P.glassDark}"/>` +
    `</linearGradient>`;
  if (P.overlay) {
    g +=
      `<linearGradient id="cm-${P.id}-ov" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${P.overlay.from}"/>` +
      `<stop offset="1" stop-color="${P.overlay.to}"/>` +
      `</linearGradient>`;
  }
  g += `</defs>`;
  return g;
}

// --- ground ----------------------------------------------------------------

function groundSection(P: ThemePalette): string {
  return (
    `<rect x="0" y="0" width="360" height="740" fill="${P.grass}" stroke="none"/>` +
    // mottled grass patches, no stroke — just texture
    `<g stroke="none">` +
    `<ellipse cx="60" cy="250" rx="70" ry="40" fill="${P.grassDark}" opacity=".5"/>` +
    `<ellipse cx="290" cy="420" rx="80" ry="45" fill="${P.grassDark}" opacity=".45"/>` +
    `<ellipse cx="120" cy="60" rx="80" ry="38" fill="${P.grassLight}" opacity=".5"/>` +
    `<ellipse cx="60" cy="470" rx="60" ry="30" fill="${P.grassLight}" opacity=".4"/>` +
    `<ellipse cx="180" cy="360" rx="55" ry="28" fill="${P.grassDark}" opacity=".35"/>` +
    // south district (seattle / nyc / orbital)
    `<ellipse cx="90" cy="640" rx="60" ry="30" fill="${P.grassDark}" opacity=".35"/>` +
    `<ellipse cx="300" cy="690" rx="70" ry="34" fill="${P.grassLight}" opacity=".4"/>` +
    `<ellipse cx="40" cy="706" rx="50" ry="26" fill="${P.grassDark}" opacity=".4"/>` +
    `<ellipse cx="230" cy="548" rx="46" ry="22" fill="${P.grassLight}" opacity=".35"/>` +
    `</g>`
  );
}

// --- river (the Bay) ---------------------------------------------------------

const RIVER_PATH =
  'M232,-8 C224,58 206,104 214,152 C220,192 244,224 278,244 C312,262 340,276 366,296';

function riverSection(P: ThemePalette): string {
  let g =
    `<g fill="none">` +
    `<path d="${RIVER_PATH}" stroke="${INK}" stroke-width="40"/>` +
    `<path d="${RIVER_PATH}" stroke="${P.river}" stroke-width="36"/>` +
    `<path d="${RIVER_PATH}" stroke="${P.riverDeep}" stroke-width="14" opacity=".55"/>` +
    // little glints
    `<g stroke="${P.riverGlint}" stroke-width="3" opacity=".9">` +
    `<path d="M222,86 q6,3 12,1"/>` +
    `<path d="M212,166 q7,3 13,0"/>` +
    `<path d="M268,232 q8,4 14,3"/>` +
    `<path d="M318,272 q8,4 14,4"/>` +
    `</g>`;
  if (P.overlay) {
    // long golden-hour reflection running down the lower reach
    g += `<path d="M262,226 C296,248 330,266 358,290" stroke="${P.riverGlint}" stroke-width="5" opacity=".8" stroke-dasharray="12 7"/>`;
  }
  g += `</g>`;
  // sailboat on the upper reach
  g +=
    `<g>` +
    `<path d="M214,72 L232,72 L227,79 L219,79 Z" fill="${P.boat}"/>` +
    `<line x1="223" y1="72" x2="223" y2="54" stroke-width="2"/>` +
    `<path d="M223,54 L234,70 L223,70 Z" fill="${P.sail}"/>` +
    `<path d="M222,54 L214,68 L222,68 Z" fill="${P.sail}" opacity=".85"/>` +
    `</g>`;
  // duck family near the mouth
  g +=
    `<g>` +
    `<path d="M322,290 q5,3 10,0" fill="none" stroke="${P.riverGlint}" stroke-width="1.5" opacity=".8"/>` +
    `<ellipse cx="332" cy="288" rx="5" ry="3.5" fill="${P.sail}"/>` +
    `<circle cx="336.5" cy="284.5" r="2.5" fill="${P.sail}"/>` +
    `<path d="M339,284.5 l3.5,1 -3.5,1 Z" fill="${P.boat}" stroke-width="1"/>` +
    `<ellipse cx="344" cy="296" rx="3.5" ry="2.5" fill="${P.sail}"/>` +
    `<circle cx="347" cy="293.5" r="1.8" fill="${P.sail}" stroke-width="1.5"/>` +
    `</g>`;
  return g;
}

// --- roads -------------------------------------------------------------------

const MAIN_ROAD =
  'M166,456 C154,404 184,360 182,322 C180,284 158,248 168,210 C176,178 200,152 206,114 C210,86 202,44 204,-6';

const SOUTH_ROAD = 'M45,470 C54,528 34,586 48,648 C56,690 42,716 46,746';

function roadsSection(P: ThemePalette): string {
  const streets = [
    'M162,428 L104,428', // to the garage
    'M170,292 L98,292', // to Palo Alto
    'M200,152 L142,152', // to the campus
    'M180,390 L246,390', // to the loft
    'M38,648 L364,648', // south cross street (seattle / nyc / orbital)
  ];
  let g = `<g fill="none">`;
  // side streets (casing + tarmac)
  for (const d of streets) {
    g += `<path d="${d}" stroke="${INK}" stroke-width="20"/>`;
  }
  // bridge road to the tower district (crosses the river)
  const towerRoad = 'M166,212 C212,222 248,234 294,246';
  g += `<path d="${towerRoad}" stroke="${INK}" stroke-width="20"/>`;
  for (const d of streets) {
    g += `<path d="${d}" stroke="${P.road}" stroke-width="16"/>`;
  }
  g += `<path d="${towerRoad}" stroke="${P.road}" stroke-width="16"/>`;
  // main winding avenue
  g +=
    `<path d="${MAIN_ROAD}" stroke="${INK}" stroke-width="30"/>` +
    `<path d="${MAIN_ROAD}" stroke="${P.road}" stroke-width="26"/>` +
    `<path d="${MAIN_ROAD}" stroke="${P.roadDash}" stroke-width="2.5" stroke-dasharray="10 14" opacity=".9"/>`;
  // south avenue winding down into the new district (tucks under the boulevard)
  g +=
    `<path d="${SOUTH_ROAD}" stroke="${INK}" stroke-width="30"/>` +
    `<path d="${SOUTH_ROAD}" stroke="${P.road}" stroke-width="26"/>` +
    `<path d="${SOUTH_ROAD}" stroke="${P.roadDash}" stroke-width="2.5" stroke-dasharray="10 14" opacity=".9"/>` +
    `</g>`;
  // bridge deck over the river
  g +=
    `<g>` +
    `<path d="M230,227 L270,241" stroke="${INK}" stroke-width="24" fill="none"/>` +
    `<path d="M230,227 L270,241" stroke="${P.bridge}" stroke-width="20" fill="none"/>` +
    `<path d="M229,220.5 L271,235" stroke="${P.bridgeDark}" stroke-width="3" fill="none"/>` +
    `<path d="M229,233.5 L271,248" stroke="${P.bridgeDark}" stroke-width="3" fill="none"/>` +
    `<line x1="234" y1="221" x2="234" y2="234" stroke-width="2"/>` +
    `<line x1="250" y1="226.5" x2="250" y2="239.5" stroke-width="2"/>` +
    `<line x1="266" y1="232" x2="266" y2="245" stroke-width="2"/>` +
    `</g>`;
  // the straight boulevard along the bottom — the animated cars' track
  g +=
    `<rect x="-4" y="446" width="368" height="6" fill="${P.sidewalk}" stroke="none"/>` +
    `<rect x="-4" y="492" width="368" height="6" fill="${P.sidewalk}" stroke="none"/>` +
    `<rect x="-4" y="452" width="368" height="40" fill="${P.road}"/>` +
    `<line x1="-4" y1="471" x2="364" y2="471" stroke="${P.roadDash}" stroke-width="2.5" stroke-dasharray="14 12" opacity=".9"/>`;
  // crosswalk east of the junction
  let zebra = `<g fill="${P.roadDash}" stroke-width="1" opacity=".95">`;
  for (let i = 0; i < 5; i++) {
    zebra += `<rect x="${208 + i * 9}" y="456" width="5" height="32" rx="1.5"/>`;
  }
  zebra += `</g>`;
  g += zebra;
  // crosswalk on the Palo Alto street
  let zebra2 = `<g fill="${P.roadDash}" stroke-width="1" opacity=".95">`;
  for (let i = 0; i < 4; i++) {
    zebra2 += `<rect x="112" y="${285 + i * 4.5}" width="10" height="2.6" rx="1"/>`;
  }
  zebra2 += `</g>`;
  g += zebra2;
  return g;
}

// --- neighbourhood filler (parks, houses, courts, parking…) -------------------

function fillerSection(P: ThemePalette): string {
  let g = '';
  // pocket park between the campus and the river
  g +=
    `<path d="M156,52 Q170,84 160,120" fill="none" stroke="${P.path}" stroke-width="5" opacity=".9"/>` +
    treeRound(162, 62, 0.9, P) +
    treePine(180, 100, 0.9, P) +
    treeRound(156, 126, 0.8, P);
  // picnic table
  g +=
    `<g>` +
    `<rect x="168" y="118" width="14" height="4" rx="1.5" fill="${P.bridge}"/>` +
    `<line x1="171" y1="122" x2="171" y2="127" stroke-width="2"/>` +
    `<line x1="179" y1="122" x2="179" y2="127" stroke-width="2"/>` +
    `</g>`;
  // west-side filler cottages (below Palo Alto)
  g += fillerHouse(12, 358, 38, P.roofC, P) + fillerHouse(58, 352, 30, P.roofD, P);
  g += fillerHouse(126, 356, 32, P.roofA, P);
  g += treePine(16, 244, 0.85, P) + bush(48, 322, 1, P) + treeRound(112, 328, 0.75, P);
  // riverside basketball court
  g +=
    `<g>` +
    `<rect x="246" y="276" width="54" height="40" rx="3" fill="${P.court}"/>` +
    `<line x1="273" y1="276" x2="273" y2="316" stroke-width="1.5" opacity=".7"/>` +
    `<circle cx="273" cy="296" r="6" fill="none" stroke-width="1.5" opacity=".7"/>` +
    `<rect x="248" y="290" width="8" height="12" fill="none" stroke-width="1.5" opacity=".7"/>` +
    `<rect x="292" y="290" width="8" height="12" fill="none" stroke-width="1.5" opacity=".7"/>` +
    `<circle cx="251" cy="296" r="2" fill="${P.roadDash}" stroke-width="1"/>` +
    `<circle cx="295" cy="296" r="2" fill="${P.roadDash}" stroke-width="1"/>` +
    `</g>`;
  g += treeRound(316, 330, 0.8, P) + bush(238, 268, 0.9, P);
  // trees & bench between the court and the boulevard
  g +=
    treeRound(206, 254, 0.85, P) +
    bush(196, 440, 0.9, P) +
    treePine(342, 336, 0.9, P) +
    treeRound(346, 430, 0.9, P) +
    treePine(318, 438, 0.85, P);
  // fire hydrant by the boulevard
  g +=
    `<g>` +
    `<rect x="216" y="436" width="6" height="8" rx="2.5" fill="${P.carA}"/>` +
    `<rect x="214.5" y="438.5" width="9" height="2.5" rx="1" fill="${P.carA}" stroke-width="1.5"/>` +
    `</g>`;
  // bottom strip: parking lot with slots + parked cars
  g +=
    `<g>` +
    `<rect x="208" y="496" width="134" height="24" fill="${P.road}"/>` +
    `<g stroke="${P.roadDash}" stroke-width="1.5" opacity=".8">` +
    `<line x1="234" y1="498" x2="234" y2="518"/>` +
    `<line x1="262" y1="498" x2="262" y2="518"/>` +
    `<line x1="290" y1="498" x2="290" y2="518"/>` +
    `<line x1="318" y1="498" x2="318" y2="518"/>` +
    `</g>` +
    parkedCar(210, 501, P.carB, P) +
    parkedCar(238, 501, P.carD, P) +
    parkedCar(294, 501, P.carC, P) +
    `</g>`;
  // food truck parked on the bottom strip
  g +=
    `<g>` +
    shadow(172, 519, 24, 4) +
    `<rect x="150" y="498" width="42" height="20" rx="4" fill="${P.carC}"/>` +
    shadeRect(184, 498, 8, 20) +
    `<rect x="156" y="502" width="18" height="8" rx="1.5" fill="${P.window}" stroke-width="1.5"/>` +
    `<rect x="154" y="499" width="24" height="3.5" rx="1.5" fill="${P.carA}" stroke-width="1.5"/>` +
    `<circle cx="184" cy="507" r="3.5" fill="${P.sail}" stroke-width="1.5"/>` +
    `<circle cx="158" cy="518" r="3" fill="${INK}"/>` +
    `<circle cx="184" cy="518" r="3" fill="${INK}"/>` +
    `</g>`;
  g += bush(20, 508, 1.1, P) + bush(120, 506, 0.9, P) + treeRound(70, 514, 0.7, P);
  // downtown filler towers around the SF tower (non interactive)
  g +=
    `<g>` +
    shadow(248, 237, 16, 4) +
    `<rect x="236" y="152" width="24" height="84" fill="${P.glassDark}"/>` +
    shadeRect(252, 152, 8, 84) +
    `<rect x="240" y="158" width="5" height="72" fill="${P.window}" opacity=".85" stroke-width="1"/>` +
    `<rect x="248" y="158" width="5" height="72" fill="${P.window}" opacity=".7" stroke-width="1"/>` +
    shadow(338, 237, 14, 4) +
    `<rect x="326" y="170" width="24" height="66" fill="${P.brick}"/>` +
    shadeRect(342, 170, 8, 66) +
    `<rect x="330" y="176" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="340" y="176" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="330" y="188" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="340" y="188" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="330" y="200" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="340" y="200" width="6" height="6" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="352" y="192" width="14" height="44" fill="${P.wall}"/>` +
    `<rect x="355" y="198" width="8" height="5" fill="${P.window}" stroke-width="1"/>` +
    `<rect x="355" y="208" width="8" height="5" fill="${P.window}" stroke-width="1"/>` +
    `</g>`;
  // street lamps
  g +=
    lamp(44, 448, P) +
    lamp(130, 448, P) +
    lamp(250, 448, P) +
    lamp(330, 448, P) +
    lamp(190, 344, P) +
    lamp(152, 250, P) +
    lamp(218, 132, P);
  // south district greenery + lamps along the cross street
  g +=
    treeRound(24, 566, 0.85, P) +
    treePine(232, 556, 0.8, P) +
    bush(22, 668, 1, P) +
    treeRound(346, 664, 0.85, P) +
    treePine(342, 726, 0.9, P) +
    bush(90, 730, 0.9, P);
  g += lamp(76, 640, P) + lamp(222, 640, P) + lamp(316, 640, P);
  return g;
}

// ---------------------------------------------------------------------------
// Country themes (per-country skin over the shared city geometry)
// ---------------------------------------------------------------------------
//
// HOW TO ADD A COUNTRY (full checklist: the add-country skill):
//  1. Add a `COUNTRY_THEMES` entry keyed by the country id ('ch', 'us', …).
//  2. `palette` — Partial<ThemePalette> merged over the base theme palette
//     (daylight / dusk / satellite). Stick to terrain & vegetation tones plus
//     gentle road/sidewalk tints; never restructure geometry, and keep the
//     river and roads readable against the ground.
//  3. `skyline(P)` — a flat distant-silhouette band in the top strip
//     (y 0–60), wrapped in stroke="none" opacity=".35", 1–2 colours. The
//     river and clouds are drawn over it, which is fine.
//  4. `landmarks(P)` — 2–3 small signature props in the verified free zones:
//       SE meadow      x 256–334, y 662–734 (below the cross street, right
//                      of the orbital pad, clear of the corner trees x≥336)
//       mid-map pocket x 202–226, y 308–376 (between the main avenue ~x198
//                      and the loft lot x228, above the loft street y380)
//     Everywhere else is taken: the tower district fills the NE (x236–366,
//     y66–246), Palo Alto fills x22–136 / y172–312, and owned-site plaques
//     can stretch wide (e.g. Palo Alto's covers x0–150 / y312–329).
//     Flat shapes, ≤ 6 colours each, ink outline inherited from the wrapper
//     group (only soft shadows / silhouettes opt out with stroke="none").
//     A prop drawn at natural size may be fitted into the narrow pocket with
//     a literal translate+scale wrapper — still deterministic.
//  Everything must be deterministic: literal coordinates, no randomness.

interface CountryTheme {
  id: string;
  palette: Partial<ThemePalette>;
  skyline: (P: ThemePalette) => string;
  landmarks: (P: ThemePalette) => string;
}

// --- ch: Alps ridge, chalet + flag, alpine cow ------------------------------

function chSkyline(): string {
  const cap = (px: number, py: number) =>
    `<path d="M${px - 8},${py + 6} L${px},${py} L${px + 8},${py + 6} L${px + 5},${py + 4.5} L${px + 2},${py + 7.5} L${px - 2},${py + 5} L${px - 5},${py + 7.5} Z" fill="#eef4fb"/>`;
  return (
    `<g stroke="none" opacity=".35">` +
    `<path d="M0,60 L0,36 L34,14 L64,38 L102,6 L138,32 L174,12 L212,38 L252,8 L292,34 L326,16 L360,34 L360,60 Z" fill="#4e5f82"/>` +
    cap(34, 14) +
    cap(102, 6) +
    cap(174, 12) +
    cap(252, 8) +
    cap(326, 16) +
    `</g>`
  );
}

function chLandmarks(P: ThemePalette): string {
  // chalet with Swiss flag on the ridge — SE meadow
  let g =
    `<g>` +
    shadow(292, 726, 36, 6) +
    `<rect x="266" y="700" width="52" height="24" fill="${P.trunk}"/>` +
    shadeRect(306, 700, 12, 24) +
    `<rect x="272" y="708" width="10" height="14" fill="${P.window}"/>` +
    `<rect x="287" y="708" width="10" height="14" fill="${P.door}"/>` +
    `<rect x="302" y="708" width="10" height="14" fill="${P.window}"/>` +
    `<rect x="268" y="704" width="48" height="2.5" rx="1" fill="${CREAM}" stroke-width="1"/>` +
    `<g stroke-width="1">` +
    `<circle cx="274" cy="707" r="1.6" fill="#e63946"/>` +
    `<circle cx="285" cy="707" r="1.6" fill="#e63946"/>` +
    `<circle cx="299" cy="707" r="1.6" fill="#e63946"/>` +
    `<circle cx="310" cy="707" r="1.6" fill="#e63946"/>` +
    `</g>` +
    `<polygon points="258,702 292,676 326,702" fill="#6f4a2e"/>` +
    `<polygon points="292,676 326,702 292,702" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<line x1="292" y1="676" x2="292" y2="660" stroke-width="2"/>` +
    `<rect x="292" y="660" width="12" height="12" fill="#e63946"/>` +
    `<g fill="${CREAM}" stroke="none"><rect x="296.5" y="662.5" width="3" height="7"/><rect x="294.5" y="664.5" width="7" height="3"/></g>` +
    `</g>`;
  // grazing cow — mid-map pocket (drawn at natural size, fitted by transform)
  g +=
    `<g transform="translate(214 370) scale(.65) translate(-292 -118)">` +
    shadow(296, 117, 15, 3.5) +
    `<rect x="288" y="108" width="3.5" height="8" rx="1.5" fill="${CREAM}"/>` +
    `<rect x="302" y="108" width="3.5" height="8" rx="1.5" fill="${CREAM}"/>` +
    `<ellipse cx="296" cy="104" rx="13" ry="8" fill="${CREAM}"/>` +
    `<path d="M290,99 q6,-3 9,2 q-1,5 -7,4 q-4,-2 -2,-6 Z" fill="#6b4a30" stroke="none"/>` +
    `<path d="M301,107 q4,-2 6,1 q0,4 -5,3 Z" fill="#6b4a30" stroke="none"/>` +
    `<path d="M307,100 q4,2 3,7" fill="none" stroke-width="1.5"/>` +
    `<circle cx="282" cy="99" r="5.5" fill="${CREAM}"/>` +
    `<ellipse cx="280" cy="102" rx="3.5" ry="2.5" fill="#e8b4ab"/>` +
    `<path d="M278,94.5 q-3,-2.5 -1.5,-5" fill="none" stroke-width="1.5"/>` +
    `<path d="M286,94.5 q1,-3.5 4,-3.5" fill="none" stroke-width="1.5"/>` +
    `<line x1="283" y1="104.5" x2="283" y2="108" stroke-width="1.5"/>` +
    `<circle cx="283" cy="110" r="2" fill="${GOLD}" stroke-width="1"/>` +
    `</g>`;
  return g;
}

// --- ca: pine ridge + CN-Tower spire, maples, moose sign, canoe -------------

function caSkyline(): string {
  return (
    `<g stroke="none" opacity=".35">` +
    `<path d="M0,60 L0,42 L10,26 L20,42 L30,30 L40,44 L52,24 L64,42 L74,32 L86,44 L98,26 L110,42 L122,30 L134,44 L148,24 L160,42 L172,32 L184,44 L196,28 L208,42 L220,32 L232,44 L246,26 L258,42 L270,32 L282,44 L316,44 L316,30 L328,44 L340,26 L352,42 L360,36 L360,60 Z" fill="#2d5b4c"/>` +
    `<path d="M295,60 L298.5,12 L301.5,12 L305,60 Z" fill="#54677a"/>` +
    `<rect x="292" y="20" width="16" height="7" rx="3.5" fill="#54677a"/>` +
    `<rect x="299" y="2" width="2" height="12" fill="#54677a"/>` +
    `</g>`
  );
}

function caLandmarks(P: ThemePalette): string {
  const maple = (x: number, y: number, s: number) =>
    `<g>` +
    `<ellipse cx="${x}" cy="${y}" rx="${(9 * s).toFixed(1)}" ry="${(3 * s).toFixed(1)}" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="${(x - 2 * s).toFixed(1)}" y="${(y - 10 * s).toFixed(1)}" width="${4 * s}" height="${10 * s}" rx="${1.5 * s}" fill="${P.trunk}"/>` +
    `<circle cx="${x}" cy="${(y - 18 * s).toFixed(1)}" r="${11 * s}" fill="#e34f33"/>` +
    `<path d="M${x},${(y - 29 * s).toFixed(1)} A${11 * s},${11 * s} 0 0 1 ${x},${(y - 7 * s).toFixed(1)} Z" fill="#c73e26" stroke="none"/>` +
    `<circle cx="${(x - 4 * s).toFixed(1)}" cy="${(y - 22 * s).toFixed(1)}" r="${3 * s}" fill="#ff8a70" opacity=".5" stroke="none"/>` +
    `</g>`;
  // two red maples — SE meadow
  let g = maple(282, 706, 1) + maple(316, 684, 0.75);
  // moose road sign — mid-map pocket
  g +=
    `<g>` +
    shadow(214, 365, 8, 2.5) +
    `<line x1="214" y1="364" x2="214" y2="348" stroke-width="2.5"/>` +
    `<rect x="206" y="329" width="16" height="16" rx="2.5" transform="rotate(45 214 337)" fill="#ffcf3f"/>` +
    `<g fill="${INK}" stroke="none">` +
    `<rect x="209" y="335" width="10" height="4.5" rx="1.5"/>` +
    `<rect x="210" y="339" width="2" height="4"/>` +
    `<rect x="216" y="339" width="2" height="4"/>` +
    `<rect x="217.5" y="332" width="3.5" height="4"/>` +
    `</g>` +
    `<g stroke-width="1.2" fill="none"><path d="M218,331.5 q-1,-3 -3,-3.5"/><path d="M220.5,331.5 q1,-3 3,-3.5"/></g>` +
    `</g>`;
  return g;
}

// --- it: hills + dome + leaning campanile, fountain, trattoria, Vespa -------

function itSkyline(): string {
  return (
    `<g stroke="none" opacity=".35">` +
    `<path d="M0,60 L0,46 Q42,28 88,42 Q134,54 176,40 Q220,26 262,40 Q312,52 360,42 L360,60 Z" fill="#7d9a4e"/>` +
    `<rect x="108" y="42" width="28" height="8" fill="#a58a68"/>` +
    `<path d="M108,42 Q108,24 122,24 Q136,24 136,42 Z" fill="#a58a68"/>` +
    `<rect x="120" y="16" width="4" height="8" fill="#a58a68"/>` +
    `<circle cx="122" cy="14.5" r="1.6" fill="#a58a68"/>` +
    `<g transform="rotate(4 160 46)">` +
    `<rect x="155" y="16" width="10" height="30" fill="#a58a68"/>` +
    `<rect x="153.5" y="11.5" width="13" height="5" fill="#a58a68"/>` +
    `</g>` +
    `</g>`
  );
}

function itLandmarks(P: ThemePalette): string {
  // piazza fountain — SE meadow
  let g =
    `<g>` +
    shadow(292, 706, 26, 5) +
    `<ellipse cx="292" cy="698" rx="24" ry="9" fill="#cfd4dc"/>` +
    `<ellipse cx="292" cy="696" rx="19" ry="6.5" fill="${P.pool}"/>` +
    `<rect x="288" y="678" width="8" height="16" rx="2" fill="#cfd4dc"/>` +
    `<ellipse cx="292" cy="678" rx="8" ry="3" fill="#bfc6d1"/>` +
    `<g stroke="${P.riverGlint}" stroke-width="1.8" fill="none" opacity=".9">` +
    `<path d="M292,674 q-6,6 -8,16"/>` +
    `<path d="M292,674 q6,6 8,16"/>` +
    `<line x1="292" y1="671" x2="292" y2="675"/>` +
    `</g>` +
    `</g>`;
  // mint Vespa — SE meadow, by the fountain
  g +=
    `<g transform="translate(3 4)">` +
    shadow(319, 726, 12, 3) +
    `<circle cx="310" cy="722" r="4" fill="${INK}"/>` +
    `<circle cx="310" cy="722" r="1.5" fill="${CREAM}" stroke="none"/>` +
    `<circle cx="328" cy="722" r="4" fill="${INK}"/>` +
    `<circle cx="328" cy="722" r="1.5" fill="${CREAM}" stroke="none"/>` +
    `<path d="M306,708 q-3,8 4,13 l8,0 0,-3 -6,0 q-4,-6 -2,-10 Z" fill="#69c3b4"/>` +
    `<path d="M321,710 q10,1 9,10 l-9,2 q-6,-1 -6,-6 Z" fill="#69c3b4"/>` +
    `<rect x="318" y="705" width="9" height="4" rx="2" fill="${INK}"/>` +
    `<line x1="306" y1="708" x2="303" y2="703" stroke-width="2"/>` +
    `<circle cx="302.5" cy="701.5" r="1.5" fill="${GOLD}" stroke-width="1"/>` +
    `</g>`;
  // trattoria kiosk with striped awning — mid-map pocket
  g +=
    `<g>` +
    shadow(214, 376, 15, 3.5) +
    `<rect x="202" y="352" width="24" height="22" fill="${P.wall}"/>` +
    shadeRect(220, 352, 6, 22) +
    `<rect x="205" y="360" width="8" height="14" fill="${P.door}"/>` +
    `<rect x="216" y="360" width="7" height="7" fill="${P.window}"/>` +
    `<path d="M200,352 L204,345 L224,345 L228,352 Z" fill="#d0342c"/>` +
    `<g fill="${CREAM}" stroke="none" opacity=".9">` +
    `<path d="M206.6,345 L203.6,352 L208.2,352 L210.8,345 Z"/>` +
    `<path d="M215,345 L213.4,352 L218,352 L219.2,345 Z"/>` +
    `</g>` +
    `</g>`;
  return g;
}

// --- fr: Haussmann rooftops + Eiffel lattice, café terrace, Arc -------------

function frSkyline(): string {
  return (
    `<g stroke="none" opacity=".35" fill="#5f6b85">` +
    `<path d="M0,60 L0,42 L6,36 L20,36 L26,42 L26,44 L34,44 L34,40 L40,34 L54,34 L60,40 L60,44 L70,44 L98,44 L104,38 L118,38 L124,44 L132,44 L132,40 L138,34 L152,34 L158,40 L158,44 L168,44 L174,38 L188,38 L194,44 L246,44 L252,38 L266,38 L272,44 L282,44 L288,36 L302,36 L308,44 L318,44 L324,38 L338,38 L344,44 L360,44 L360,60 Z"/>` +
    `<rect x="10" y="31" width="3" height="5"/>` +
    `<rect x="44" y="29" width="3" height="5"/>` +
    `<rect x="143" y="29" width="3" height="5"/>` +
    `<rect x="293" y="31" width="3" height="5"/>` +
    `<path d="M70,60 C77,46 81,32 83,16 L87,16 C89,32 93,46 100,60 L94,60 C90,48 88,42 85,34 C82,42 80,48 76,60 Z"/>` +
    `<rect x="76" y="38" width="18" height="3" rx="1.5"/>` +
    `<rect x="80" y="24" width="10" height="2.5" rx="1"/>` +
    `<rect x="84" y="10" width="2" height="6"/>` +
    `</g>`
  );
}

function frLandmarks(P: ThemePalette): string {
  // café terrace — SE meadow
  let g =
    `<g>` +
    shadow(290, 712, 30, 5) +
    `<line x1="268" y1="710" x2="268" y2="692" stroke-width="2"/>` +
    `<line x1="312" y1="710" x2="312" y2="692" stroke-width="2"/>` +
    `<rect x="262" y="684" width="56" height="9" rx="2" fill="#c0392b"/>` +
    `<path d="M262,693 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 a3.5,3.5 0 0 0 7,0 Z" fill="#c0392b"/>` +
    `<g fill="${CREAM}" stroke="none" opacity=".85">` +
    `<rect x="269" y="685" width="6" height="7"/>` +
    `<rect x="283" y="685" width="6" height="7"/>` +
    `<rect x="297" y="685" width="6" height="7"/>` +
    `</g>` +
    `<line x1="276" y1="704" x2="276" y2="710" stroke-width="2"/>` +
    `<circle cx="276" cy="702" r="5" fill="${CREAM}"/>` +
    `<line x1="300" y1="708" x2="300" y2="714" stroke-width="2"/>` +
    `<circle cx="300" cy="706" r="5" fill="${CREAM}"/>` +
    `<rect x="285" y="700" width="5" height="4" rx="1" fill="${P.bridge}"/>` +
    `<rect x="308" y="704" width="5" height="4" rx="1" fill="${P.bridge}"/>` +
    `<circle cx="276" cy="701.5" r="1.3" fill="#c0392b" stroke-width="1"/>` +
    `</g>`;
  // Arc-style monument with tricolour — mid-map pocket (fitted by transform)
  g +=
    `<g transform="translate(214 374) scale(.7) translate(-300 -134)">` +
    shadow(300, 134, 18, 4) +
    `<path d="M286,132 L286,102 Q286,94 293,94 L307,94 Q314,94 314,102 L314,132 L306,132 L306,114 Q306,107 300,107 Q294,107 294,114 L294,132 Z" fill="#d6cdbc"/>` +
    `<rect x="284" y="88" width="32" height="6" rx="1.5" fill="#c4b9a4"/>` +
    `<g stroke-width="1" opacity=".35"><line x1="290" y1="100" x2="290" y2="128"/><line x1="310" y1="100" x2="310" y2="128"/></g>` +
    `<line x1="300" y1="88" x2="300" y2="79" stroke-width="1.5"/>` +
    `<g stroke-width="1">` +
    `<rect x="300" y="79" width="3.4" height="7" fill="#2b4d9b"/>` +
    `<rect x="303.4" y="79" width="3.3" height="7" fill="${CREAM}"/>` +
    `<rect x="306.7" y="79" width="3.3" height="7" fill="#c0392b"/>` +
    `</g>` +
    `</g>`;
  return g;
}

// --- de: gabled roofs + TV-tower sphere, beer garden, castle turret ---------

function deSkyline(): string {
  return (
    `<g stroke="none" opacity=".35">` +
    `<path d="M0,60 L0,44 L10,34 L20,44 L20,40 L32,40 L32,44 L42,32 L52,44 L64,44 L64,38 L74,28 L84,38 L84,44 L98,44 L106,34 L114,44 L128,44 L128,38 L138,30 L148,38 L148,44 L162,44 L170,36 L178,44 L192,44 L200,34 L208,44 L220,44 L228,36 L236,44 L252,44 L260,32 L270,44 L284,44 L292,36 L300,44 L310,44 L336,44 L344,34 L352,44 L360,44 L360,60 Z" fill="#6b7488"/>` +
    `<path d="M318,60 L321,16 L323,16 L326,60 Z" fill="#7d879a"/>` +
    `<circle cx="322" cy="14" r="6.5" fill="#7d879a"/>` +
    `<rect x="321" y="0" width="2" height="8" fill="#7d879a"/>` +
    `</g>`
  );
}

function deLandmarks(P: ThemePalette): string {
  // beer garden with Bavarian parasol — SE meadow
  let g =
    `<g>` +
    shadow(288, 722, 26, 5) +
    `<line x1="288" y1="706" x2="288" y2="678" stroke-width="2"/>` +
    `<path d="M268,685 Q288,667 308,685 Z" fill="#3a6fb0"/>` +
    `<g fill="${CREAM}" stroke="none" opacity=".85">` +
    `<path d="M275,679.5 Q281,671.5 288,670.5 L288,685 L275,685 Z"/>` +
    `<path d="M296,673.5 Q301,677 304,682.5 L296,685 Z"/>` +
    `</g>` +
    `<rect x="271" y="706" width="34" height="9" rx="2" fill="${P.bridge}"/>` +
    `<rect x="269" y="718" width="38" height="4" rx="2" fill="${P.bridgeDark}"/>` +
    `<line x1="276" y1="715" x2="276" y2="718" stroke-width="2"/>` +
    `<line x1="300" y1="715" x2="300" y2="718" stroke-width="2"/>` +
    `<rect x="277" y="699" width="5" height="7" rx="1" fill="${GOLD}"/>` +
    `<rect x="276.5" y="697" width="6" height="2.5" rx="1" fill="${CREAM}"/>` +
    `<rect x="294" y="699" width="5" height="7" rx="1" fill="${GOLD}"/>` +
    `<rect x="293.5" y="697" width="6" height="2.5" rx="1" fill="${CREAM}"/>` +
    `</g>`;
  // fairy-tale castle turret — mid-map pocket (fitted by transform)
  g +=
    `<g transform="translate(214 374) scale(.7) translate(-299 -136)">` +
    shadow(299, 136, 14, 3.5) +
    `<rect x="284" y="112" width="9" height="22" fill="${CREAM}"/>` +
    `<polygon points="282,112 288.5,99 295,112" fill="#4a6fa5"/>` +
    `<rect x="292" y="100" width="16" height="34" fill="${CREAM}"/>` +
    shadeRect(303, 100, 5, 34) +
    `<polygon points="288,100 300,76 312,100" fill="#4a6fa5"/>` +
    `<polygon points="300,76 312,100 300,100" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="297" y="106" width="6" height="8" rx="3" fill="${P.window}"/>` +
    `<rect x="286.5" y="117" width="4" height="6" rx="2" fill="${P.window}"/>` +
    `<rect x="296" y="124" width="8" height="10" rx="4" fill="${P.door}"/>` +
    `<line x1="300" y1="76" x2="300" y2="68" stroke-width="1.5"/>` +
    `<path d="M300,68 l8,2.5 -8,2.5 Z" fill="#4a6fa5"/>` +
    `</g>`;
  return g;
}

// --- sa: dunes + arched skyscraper, palm oasis, camel, tent -----------------

function saSkyline(): string {
  return (
    `<g stroke="none" opacity=".35">` +
    `<path d="M0,60 L0,48 Q46,32 96,46 Q150,58 204,44 Q258,32 308,46 Q336,52 360,46 L360,60 Z" fill="#d3a960"/>` +
    `<rect x="40" y="26" width="11" height="34" fill="#8a7a96"/>` +
    `<path d="M58,60 L58,18 Q66,4 74,18 L74,60 L69,60 L69,24 Q66,17 63,24 L63,60 Z" fill="#8a7a96"/>` +
    `<rect x="86" y="20" width="12" height="40" fill="#8a7a96"/>` +
    `<rect x="102" y="30" width="9" height="30" fill="#8a7a96"/>` +
    `</g>`
  );
}

function saLandmarks(P: ThemePalette): string {
  // palm oasis — SE meadow
  let g = palm(264, 716, P) + palm(280, 720, P, true) + bush(272, 722, 0.8, P);
  // camel — SE meadow
  g +=
    `<g>` +
    shadow(313, 720, 14, 3.5) +
    `<rect x="305" y="709" width="3" height="10" rx="1.2" fill="#c89a5f"/>` +
    `<rect x="316" y="709" width="3" height="10" rx="1.2" fill="#c89a5f"/>` +
    `<circle cx="308" cy="700" r="4.5" fill="#c89a5f"/>` +
    `<circle cx="316" cy="700" r="4.5" fill="#c89a5f"/>` +
    `<ellipse cx="312" cy="706" rx="10" ry="5.5" fill="#c89a5f"/>` +
    `<rect x="309" y="700" width="6" height="6" rx="1" fill="#b03a2e"/>` +
    `<path d="M319,704 q4,-1 4,-8 l3.5,0 q0,9 -5,11 Z" fill="#c89a5f"/>` +
    `<ellipse cx="325" cy="694.5" rx="3.5" ry="2.5" fill="#c89a5f"/>` +
    `<path d="M302,704 q-3,2 -2,6" fill="none" stroke-width="1.5"/>` +
    `</g>`;
  // striped desert tent — mid-map pocket (fitted by transform)
  g +=
    `<g transform="translate(214 374) scale(.65) translate(-300 -134)">` +
    shadow(300, 134, 20, 4) +
    `<path d="M282,132 L296,104 Q300,100 304,104 L318,132 Z" fill="${CREAM}"/>` +
    `<path d="M285,126 L315,126 L318,132 L282,132 Z" fill="#b03a2e" stroke-width="1"/>` +
    `<path d="M295,132 L300,116 L305,132 Z" fill="${P.door}"/>` +
    `<line x1="300" y1="101" x2="300" y2="94" stroke-width="1.5"/>` +
    `<path d="M300,94 l7,2 -7,2 Z" fill="#b03a2e"/>` +
    `</g>`;
  return g;
}

// --- cn: karst mist + pagoda + pearl tower, paifang gate, lanterns ----------

function cnSkyline(): string {
  return (
    `<g stroke="none" opacity=".35">` +
    `<rect x="0" y="52" width="360" height="8" rx="4" fill="#7e94a6" opacity=".5"/>` +
    `<path d="M0,60 L0,44 Q8,16 20,44 Q26,24 38,46 Q48,12 62,44 Q70,26 80,46 L80,60 Z" fill="#7e94a6"/>` +
    `<path d="M310,60 L310,46 Q318,20 330,46 Q338,26 350,48 Q354,36 360,44 L360,60 Z" fill="#7e94a6"/>` +
    `<path d="M106,50 L134,50 L120,42 Z" fill="#8c4a3e"/>` +
    `<path d="M109,42 L131,42 L120,34 Z" fill="#8c4a3e"/>` +
    `<path d="M112,34 L128,34 L120,27 Z" fill="#8c4a3e"/>` +
    `<rect x="119" y="21" width="2" height="6" fill="#8c4a3e"/>` +
    `<path d="M282,60 L284.5,20 L286.5,20 L289,60 Z" fill="#8c4a3e"/>` +
    `<circle cx="285.5" cy="26" r="6" fill="#8c4a3e"/>` +
    `<circle cx="285.5" cy="12" r="3.5" fill="#8c4a3e"/>` +
    `<rect x="284.8" y="2" width="1.4" height="7" fill="#8c4a3e"/>` +
    `</g>`
  );
}

function cnLandmarks(): string {
  // red paifang gate — SE meadow
  let g =
    `<g>` +
    shadow(294, 724, 34, 5) +
    `<rect x="268" y="688" width="7" height="34" fill="#c0392b"/>` +
    `<rect x="313" y="688" width="7" height="34" fill="#c0392b"/>` +
    `<path d="M258,688 L274,688 L272,682 L261,682 Z" fill="#3d5a66"/>` +
    `<path d="M314,688 L330,688 L327,682 L316,682 Z" fill="#3d5a66"/>` +
    `<rect x="262" y="686" width="64" height="6" rx="2" fill="#c0392b"/>` +
    `<rect x="270" y="674" width="48" height="5" rx="2" fill="#c0392b"/>` +
    `<rect x="288" y="676" width="12" height="9" rx="1" fill="${GOLD}"/>` +
    `<path d="M262,674 Q268,670 294,670 Q320,670 326,674 L318,664 Q294,660 270,664 Z" fill="#3d5a66"/>` +
    `<path d="M262,674 q-5,-1 -7,-6" fill="none" stroke-width="2"/>` +
    `<path d="M326,674 q5,-1 7,-6" fill="none" stroke-width="2"/>` +
    `</g>`;
  // lantern pair — mid-map pocket
  const lantern = (x: number) =>
    `<g>` +
    `<ellipse cx="${x}" cy="374" rx="5" ry="2" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<line x1="${x}" y1="373" x2="${x}" y2="347" stroke-width="2"/>` +
    `<line x1="${x}" y1="347" x2="${x + 6}" y2="349" stroke-width="2"/>` +
    `<ellipse cx="${x + 6}" cy="355" rx="4.5" ry="5.5" fill="#e04a3a"/>` +
    `<rect x="${x + 4}" y="348.5" width="4" height="2.5" rx="1" fill="${GOLD}" stroke-width="1"/>` +
    `<rect x="${x + 4}" y="360" width="4" height="2" rx="1" fill="${GOLD}" stroke-width="1"/>` +
    `<line x1="${x + 6}" y1="362" x2="${x + 6}" y2="366" stroke="${GOLD}" stroke-width="1.5"/>` +
    `</g>`;
  g += lantern(202) + lantern(214);
  return g;
}

const COUNTRY_THEMES: Record<string, CountryTheme> = {
  // The Valley itself — the reference look, no extra dressing.
  us: { id: 'us', palette: {}, skyline: () => '', landmarks: () => '' },
  ch: {
    id: 'ch',
    palette: {
      grass: '#7ecb7f',
      grassDark: '#6cb96e',
      grassLight: '#90d791',
      treeA: '#42a866',
      treeADark: '#358c55',
      treeB: '#2b7f52',
      treeBDark: '#226844',
    },
    skyline: chSkyline,
    landmarks: chLandmarks,
  },
  ca: {
    id: 'ca',
    palette: {
      grass: '#79c47d',
      grassDark: '#68b16c',
      grassLight: '#8bd18e',
      treeA: '#3aa15e',
      treeADark: '#2f884f',
      treeB: '#1e7a49',
      treeBDark: '#17633c',
    },
    skyline: caSkyline,
    landmarks: caLandmarks,
  },
  it: {
    id: 'it',
    palette: {
      grass: '#9ccb69',
      grassDark: '#8bb958',
      grassLight: '#add87a',
      treeA: '#6ca94e',
      treeADark: '#5a903f',
      treeB: '#55893c',
      treeBDark: '#467232',
    },
    skyline: itSkyline,
    landmarks: itLandmarks,
  },
  fr: {
    id: 'fr',
    palette: { road: '#a4aec6', sidewalk: '#f0e8dc' },
    skyline: frSkyline,
    landmarks: frLandmarks,
  },
  de: {
    id: 'de',
    palette: { road: '#9fa8b4', sidewalk: '#ece5d2' },
    skyline: deSkyline,
    landmarks: deLandmarks,
  },
  sa: {
    id: 'sa',
    palette: {
      grass: '#e3cd96',
      grassDark: '#d6bc7f',
      grassLight: '#efdcab',
      path: '#cdb083',
      sand: '#f2e2b0',
      court: '#d69a62',
      sidewalk: '#f0e3c2',
      treeA: '#57a555',
      treeADark: '#478c47',
      treeB: '#3f8a4c',
      treeBDark: '#347241',
      trunk: '#9a6b3d',
    },
    skyline: saSkyline,
    landmarks: saLandmarks,
  },
  cn: {
    id: 'cn',
    palette: {
      grass: '#7ed964',
      grassDark: '#6cc951',
      grassLight: '#91e378',
      treeA: '#3cbd58',
      treeADark: '#31a04a',
      treeB: '#279a4d',
      treeBDark: '#1f7f3f',
    },
    skyline: cnSkyline,
    landmarks: cnLandmarks,
  },
};

// ---------------------------------------------------------------------------
// The eight interactive sites
// ---------------------------------------------------------------------------

interface SiteFrame {
  open: string; // opening <g> for the whole site
  bOpen: string; // opening <g> for the building (pale + dashed when free)
  close: string; // '</g>'
  free: boolean;
  active: boolean;
  owned: boolean;
  F: (c: string) => string; // wall-ish fills
  R: (c: string) => string; // roof fills
  D: (c: string) => string; // detail fills (windows, doors, props)
}

function siteFrame(P: ThemePalette, s: SiteView): SiteFrame {
  const free = s.status === 'free';
  return {
    open: `<g class="map-site map-site-${s.status}" data-action="site:${s.id}">`,
    bOpen: `<g${free ? ' opacity=".75" stroke-dasharray="5 4"' : ''}>`,
    close: `</g>`,
    free,
    active: s.status === 'active',
    owned: s.status === 'owned',
    F: (c) => (free ? P.freeFill : c),
    R: (c) => (free ? P.freeRoof : c),
    D: (c) => (free ? P.freeDetail : c),
  };
}

// --- site: garage -------------------------------------------------------------

function siteGarage(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, R, D } = siteFrame(P, s);
  let g = open + shadow(72, 434, 58, 9);
  if (active) g += activeRing(72, 437, 63, 11);
  g += bOpen;
  // driveway from the garage door down to the street
  g += `<rect x="88" y="431" width="32" height="17" fill="${D(P.path)}"/>`;
  // lawn flowers
  g +=
    `<g stroke-width="1">` +
    `<circle cx="36" cy="440" r="1.8" fill="${D(P.carA)}"/>` +
    `<circle cx="46" cy="444" r="1.8" fill="${D(P.carC)}"/>` +
    `<circle cx="58" cy="441" r="1.8" fill="${D(P.carD)}"/>` +
    `</g>`;
  // house body
  g += `<rect x="28" y="388" width="56" height="44" fill="${F(P.wall)}"/>`;
  g += shadeRect(74, 388, 10, 44);
  g += `<polygon points="23,390 56,362 89,390" fill="${R(P.roofA)}"/>`;
  g += `<polygon points="56,362 89,390 56,390" fill="${INK}" opacity=".12" stroke="none"/>`;
  g += `<rect x="34" y="370" width="7" height="12" fill="${F(P.brick)}"/>`; // chimney
  // attached garage with tilting door
  g += `<rect x="84" y="400" width="38" height="32" fill="${F(P.wall)}"/>`;
  g += shadeRect(114, 400, 8, 32);
  g += `<polygon points="80,402 103,384 126,402" fill="${R(P.roofC)}"/>`;
  g +=
    `<rect x="90" y="408" width="26" height="24" rx="1.5" fill="${D(P.sand)}"/>` +
    `<line x1="92" y1="414" x2="114" y2="414" stroke-width="1.5" opacity=".55"/>` +
    `<line x1="92" y1="420" x2="114" y2="420" stroke-width="1.5" opacity=".55"/>` +
    `<line x1="92" y1="426" x2="114" y2="426" stroke-width="1.5" opacity=".55"/>` +
    `<circle cx="103" cy="429.5" r="1.3" fill="${INK}" stroke="none"/>`;
  // front door + window
  g +=
    `<rect x="58" y="410" width="14" height="22" fill="${D(P.door)}"/>` +
    `<circle cx="61.5" cy="421" r="1.2" fill="${GOLD}" stroke="none"/>` +
    `<rect x="35" y="398" width="17" height="14" fill="${D(P.window)}"/>` +
    `<line x1="43.5" y1="398" x2="43.5" y2="412" stroke-width="1.5"/>` +
    `<line x1="35" y1="405" x2="52" y2="405" stroke-width="1.5"/>`;
  // surfboard leaning on the wall
  g +=
    `<g transform="rotate(-10 22 414)">` +
    `<ellipse cx="22" cy="414" rx="5" ry="17" fill="${D(P.carB)}"/>` +
    `<line x1="22" y1="400" x2="22" y2="428" stroke="${CREAM}" stroke-width="1.5" opacity=".7"/>` +
    `</g>`;
  // mailbox
  g +=
    `<g>` +
    `<line x1="128" y1="432" x2="128" y2="419" stroke-width="2.5"/>` +
    `<rect x="121" y="411" width="14" height="8" rx="3" fill="${D(P.carA)}"/>` +
    `<line x1="134" y1="409" x2="134" y2="413" stroke="${GOLD}" stroke-width="2"/>` +
    `</g>`;
  // lawnmower
  g +=
    `<g>` +
    `<rect x="98" y="438" width="14" height="6.5" rx="2" fill="${D(P.roofD)}"/>` +
    `<line x1="111" y1="439" x2="118" y2="433" stroke-width="2"/>` +
    `<circle cx="101" cy="445.5" r="2.4" fill="${INK}"/>` +
    `<circle cx="109" cy="445.5" r="2.4" fill="${INK}"/>` +
    `</g>`;
  g += bush(20, 438, 0.85, P);
  g += close; // building group
  if (free) g += forSaleSign(40, 452, P);
  else g += plaque(72, 438, s.label, active);
  if (active) g += activeFlag(56, 358);
  return g + close;
}

// --- site: loft ----------------------------------------------------------------

function siteLoft(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  let g = open + shadow(280, 417, 52, 9);
  if (active) g += activeRing(280, 420, 58, 10);
  g += bOpen;
  // brick block, 3 floors
  g += `<rect x="244" y="336" width="72" height="80" fill="${F(P.brick)}"/>`;
  g += shadeRect(302, 336, 14, 80);
  g += `<rect x="240" y="329" width="80" height="9" rx="2" fill="${D(P.brickDark)}"/>`; // parapet
  // brick texture dashes
  g +=
    `<g stroke-width="1" opacity=".3">` +
    `<line x1="250" y1="352" x2="257" y2="352"/><line x1="262" y1="358" x2="269" y2="358"/>` +
    `<line x1="250" y1="380" x2="257" y2="380"/><line x1="284" y1="356" x2="291" y2="356"/>` +
    `<line x1="266" y1="386" x2="273" y2="386"/><line x1="288" y1="382" x2="295" y2="382"/>` +
    `</g>`;
  // rooftop water tank
  g +=
    `<g>` +
    `<line x1="296" y1="329" x2="294" y2="320" stroke-width="2"/>` +
    `<line x1="310" y1="329" x2="312" y2="320" stroke-width="2"/>` +
    `<rect x="293" y="306" width="20" height="15" rx="2" fill="${F(P.wall)}"/>` +
    `<ellipse cx="303" cy="306" rx="10" ry="3" fill="${D(P.brickDark)}"/>` +
    `</g>`;
  // big industrial windows (2 floors x 2)
  const win = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="22" height="17" rx="1.5" fill="${D(P.window)}"/>` +
    `<line x1="${x + 7.3}" y1="${y}" x2="${x + 7.3}" y2="${y + 17}" stroke-width="1.3"/>` +
    `<line x1="${x + 14.6}" y1="${y}" x2="${x + 14.6}" y2="${y + 17}" stroke-width="1.3"/>` +
    `<line x1="${x}" y1="${y + 8.5}" x2="${x + 22}" y2="${y + 8.5}" stroke-width="1.3"/>`;
  g += win(250, 342) + win(280, 342) + win(250, 366) + win(280, 366);
  // ground floor: café with striped awning
  g +=
    `<rect x="248" y="392" width="30" height="22" fill="${D(P.window)}"/>` +
    `<line x1="263" y1="392" x2="263" y2="414" stroke-width="1.3"/>` +
    `<rect x="284" y="394" width="16" height="20" fill="${D(P.door)}"/>` +
    `<circle cx="288" cy="404" r="1.2" fill="${GOLD}" stroke="none"/>`;
  let awning = `<g><rect x="245" y="382" width="37" height="8" fill="${D(P.carA)}"/>`;
  for (let i = 0; i < 4; i++) {
    awning += `<rect x="${249.5 + i * 9}" y="382" width="4.5" height="8" fill="${D(P.sail)}" stroke="none"/>`;
  }
  for (let i = 0; i < 4; i++) {
    awning += `<circle cx="${249.5 + i * 9}" cy="390" r="4" fill="${D(P.carA)}" stroke-width="1.5"/>`;
  }
  awning += `<circle cx="281" cy="390" r="4" fill="${D(P.carA)}" stroke-width="1.5"/></g>`;
  g += awning;
  // hanging café sign with a coffee cup
  g +=
    `<g>` +
    `<line x1="244" y1="394" x2="238" y2="394" stroke-width="2"/>` +
    `<rect x="232" y="394" width="11" height="11" rx="2" fill="${D(P.carC)}"/>` +
    `<circle cx="237" cy="399.5" r="2.6" fill="${CREAM}" stroke-width="1.3"/>` +
    `<path d="M240,398 a2,2 0 0 1 0,3.4" fill="none" stroke-width="1.2"/>` +
    `</g>`;
  // fire escape on the left flank
  g +=
    `<g stroke-width="1.5">` +
    `<rect x="232" y="352" width="13" height="4" fill="${D(P.brickDark)}"/>` +
    `<rect x="232" y="376" width="13" height="4" fill="${D(P.brickDark)}"/>` +
    `<line x1="244" y1="356" x2="233" y2="374"/>` +
    `<line x1="244" y1="380" x2="233" y2="396"/>` +
    `<line x1="233" y1="348" x2="233" y2="352"/>` +
    `<line x1="240" y1="348" x2="240" y2="352"/>` +
    `<line x1="233" y1="372" x2="233" y2="376"/>` +
    `<line x1="240" y1="372" x2="240" y2="376"/>` +
    `</g>`;
  // friendly tags on the right wall
  g +=
    `<g fill="none" stroke-width="2.5">` +
    `<path d="M290,404 q4,-6 8,0 t8,0" stroke="${D(P.carD)}"/>` +
    `<path d="M296,410 l3,-3 3,3" stroke="${D(P.carB)}"/>` +
    `</g>`;
  // rooftop AC unit
  g += `<rect x="252" y="322" width="12" height="8" rx="1.5" fill="${D(P.sidewalk)}"/>`;
  g += close;
  if (free) g += forSaleSign(234, 434, P);
  else g += plaque(280, 424, s.label, active);
  if (active) g += activeFlag(258, 326);
  return g + close;
}

// --- site: paloalto --------------------------------------------------------------

function sitePaloAlto(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, R, D } = siteFrame(P, s);
  const glassFill = free ? P.freeFill : `url(#cm-${P.id}-glass)`;
  let g = open + shadow(75, 302, 54, 9);
  if (active) g += activeRing(75, 305, 60, 10);
  g += bOpen;
  // forecourt plaza with tiles
  g +=
    `<rect x="36" y="296" width="80" height="13" rx="2" fill="${D(P.sidewalk)}"/>` +
    `<g stroke-width="1" opacity=".4">` +
    `<line x1="56" y1="296" x2="56" y2="309"/><line x1="76" y1="296" x2="76" y2="309"/>` +
    `<line x1="96" y1="296" x2="96" y2="309"/>` +
    `</g>`;
  // 4-storey glass office
  g += `<rect x="30" y="216" width="88" height="82" fill="${glassFill}"/>`;
  g += shadeRect(104, 216, 14, 82);
  g += liteRect(32, 218, 8, 78, P);
  g += `<rect x="26" y="208" width="96" height="10" rx="3" fill="${F(P.wall)}"/>`; // parapet
  // floor lines + mullions
  g +=
    `<g stroke-width="1.4" opacity=".55">` +
    `<line x1="30" y1="237" x2="118" y2="237"/>` +
    `<line x1="30" y1="257" x2="118" y2="257"/>` +
    `<line x1="30" y1="277" x2="118" y2="277"/>` +
    `</g>` +
    `<g stroke-width="1" opacity=".35">` +
    `<line x1="48" y1="216" x2="48" y2="298"/>` +
    `<line x1="66" y1="216" x2="66" y2="298"/>` +
    `<line x1="84" y1="216" x2="84" y2="298"/>` +
    `<line x1="102" y1="216" x2="102" y2="298"/>` +
    `</g>`;
  // lit strips behind the glass (theme window colour)
  g +=
    `<g stroke="none" opacity=".5">` +
    `<rect x="34" y="222" width="24" height="11" fill="${D(P.window)}"/>` +
    `<rect x="70" y="242" width="30" height="11" fill="${D(P.window)}"/>` +
    `<rect x="40" y="262" width="26" height="11" fill="${D(P.window)}"/>` +
    `<rect x="76" y="282" width="24" height="11" fill="${D(P.window)}"/>` +
    `</g>`;
  // entrance + canopy
  g +=
    `<rect x="62" y="282" width="26" height="16" fill="${D(P.window)}"/>` +
    `<line x1="75" y1="282" x2="75" y2="298" stroke-width="1.5"/>` +
    `<rect x="57" y="277" width="36" height="6" rx="2" fill="${R(P.roofB)}"/>`;
  // rooftop HVAC boxes
  g +=
    `<rect x="40" y="200" width="14" height="8" rx="1.5" fill="${D(P.sidewalk)}"/>` +
    `<rect x="88" y="201" width="11" height="7" rx="1.5" fill="${D(P.sidewalk)}"/>`;
  // flag mast on the roof
  g +=
    `<g>` +
    `<line x1="114" y1="208" x2="114" y2="172" stroke-width="2"/>` +
    `<path d="M114,172 L136,176 L114,183 Z" fill="${D(P.carA)}"/>` +
    `</g>`;
  // planters + palms
  g +=
    `<rect x="42" y="292" width="12" height="6" rx="1.5" fill="${D(P.brickDark)}"/>` +
    `<rect x="96" y="292" width="12" height="6" rx="1.5" fill="${D(P.brickDark)}"/>` +
    bush(48, 291, 0.6, P) +
    bush(102, 291, 0.6, P);
  g += close;
  // palms frame the lot in full colour (site furniture, not the model)
  g += palm(22, 302, P) + palm(128, 302, P, true);
  if (free) g += forSaleSign(34, 322, P);
  else g += plaque(75, 312, s.label, active);
  if (active) g += activeFlag(92, 200);
  return g + close;
}

// --- site: campus -----------------------------------------------------------------

function siteCampus(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  let g = open + shadow(82, 167, 70, 9);
  if (active) g += activeRing(82, 170, 76, 11);
  g += bOpen;
  // big lawn
  g += `<rect x="8" y="64" width="148" height="114" rx="12" fill="${F(P.grassLight)}"/>`;
  g +=
    `<path d="M30,176 Q60,150 82,162 Q112,174 140,166" fill="none" stroke="${D(P.path)}" stroke-width="4.5" opacity=".9"/>`;
  // pool on the lawn
  g +=
    `<g>` +
    `<ellipse cx="36" cy="86" rx="17" ry="7.5" fill="${D(P.pool)}"/>` +
    `<ellipse cx="32" cy="84.5" rx="6" ry="2.4" fill="${CREAM}" opacity=".5" stroke="none"/>` +
    `<line x1="50" y1="82" x2="50" y2="90" stroke-width="1.6"/>` +
    `<line x1="46" y1="81" x2="46" y2="89" stroke-width="1.6"/>` +
    `</g>`;
  // three low colourful buildings, connected
  g += `<rect x="16" y="110" width="46" height="52" rx="3" fill="${F(P.roofD)}"/>`;
  g += shadeRect(52, 110, 10, 52);
  g += `<rect x="58" y="90" width="52" height="72" rx="3" fill="${F(P.roofB)}"/>`;
  g += shadeRect(98, 90, 12, 72);
  g += `<rect x="112" y="118" width="38" height="44" rx="3" fill="${F(P.roofC)}"/>`;
  g += shadeRect(140, 118, 10, 44);
  g += `<rect x="52" y="132" width="10" height="16" fill="${F(P.wall)}"/>`; // link 1
  g += `<rect x="106" y="134" width="10" height="14" fill="${F(P.wall)}"/>`; // link 2
  // solar panels on the tall block's roof
  const panel = (x: number) =>
    `<polygon points="${x},92 ${x + 12},85 ${x + 12},89 ${x},96" fill="${D(P.glassDark)}"/>` +
    `<line x1="${x + 6}" y1="88.5" x2="${x + 6}" y2="92.5" stroke-width="1" opacity=".6"/>`;
  g += `<g>` + panel(62) + panel(78) + panel(94) + `</g>`;
  // windows
  g +=
    `<g>` +
    `<rect x="22" y="118" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="38" y="118" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="22" y="136" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="38" y="136" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="64" y="100" width="40" height="14" rx="2" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<line x1="77" y1="100" x2="77" y2="114" stroke-width="1.2"/>` +
    `<line x1="91" y1="100" x2="91" y2="114" stroke-width="1.2"/>` +
    `<rect x="64" y="122" width="16" height="11" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="88" y="122" width="16" height="11" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<circle cx="131" cy="130" r="6" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="118" y="144" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="134" y="144" width="10" height="9" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `</g>`;
  // main entrance
  g += `<rect x="77" y="146" width="14" height="16" fill="${D(P.door)}"/>`;
  // the famous inter-floor slide
  g +=
    `<path d="M110,104 C128,104 140,120 138,140 C137,152 130,160 122,166" fill="none" stroke="${D(P.carA)}" stroke-width="7"/>` +
    `<path d="M110,104 C128,104 140,120 138,140 C137,152 130,160 122,166" fill="none" stroke="${CREAM}" stroke-width="2.2" opacity=".55"/>` +
    `<ellipse cx="121" cy="168" rx="7" ry="3" fill="${D(P.sand)}"/>`;
  // colourful bikes by the path
  g +=
    `<g stroke-width="1.6">` +
    `<circle cx="128" cy="172" r="3.6" fill="none" stroke="${D(P.carB)}"/>` +
    `<circle cx="137" cy="172" r="3.6" fill="none" stroke="${D(P.carB)}"/>` +
    `<path d="M128,172 l4,-6 5,6 M132,166 h4" fill="none" stroke="${D(P.carB)}"/>` +
    `<circle cx="146" cy="173" r="3.4" fill="none" stroke="${D(P.carC)}"/>` +
    `<circle cx="154" cy="173" r="3.4" fill="none" stroke="${D(P.carC)}"/>` +
    `<path d="M146,173 l3.5,-5.5 4.5,5.5" fill="none" stroke="${D(P.carC)}"/>` +
    `</g>`;
  // lawn trees
  g += bush(16, 72, 0.7, P) + bush(150, 96, 0.7, P);
  g += close;
  if (free) g += forSaleSign(30, 196, P);
  else g += plaque(82, 180, s.label, active);
  if (active) g += activeFlag(84, 86);
  return g + close;
}

// --- site: tower ------------------------------------------------------------------

function siteTower(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  const glassFill = free ? P.freeFill : `url(#cm-${P.id}-glass)`;
  let g = open + shadow(292, 238, 50, 9);
  if (active) g += activeRing(292, 241, 56, 10);
  g += bOpen;
  // street-level podium
  g += `<rect x="258" y="208" width="68" height="28" rx="2" fill="${F(P.wall)}"/>`;
  g += shadeRect(314, 208, 12, 28);
  g +=
    `<rect x="282" y="218" width="20" height="18" fill="${D(P.window)}"/>` +
    `<line x1="292" y1="218" x2="292" y2="236" stroke-width="1.5"/>` +
    `<rect x="278" y="213" width="28" height="5" rx="2" fill="${D(P.sidewalk)}"/>` +
    `<rect x="264" y="218" width="10" height="8" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<rect x="310" y="218" width="10" height="8" fill="${D(P.window)}" stroke-width="1.5"/>`;
  // ~46-storey shaft (stylised: one ink line per few floors)
  g += `<rect x="266" y="66" width="52" height="146" fill="${glassFill}"/>`;
  g += shadeRect(306, 66, 12, 146);
  g += liteRect(268, 70, 6, 138, P);
  // vertical lit window strips
  g +=
    `<g stroke="none" opacity=".85">` +
    `<rect x="271" y="72" width="6" height="134" fill="${D(P.window)}"/>` +
    `<rect x="283" y="72" width="6" height="134" fill="${D(P.window)}"/>` +
    `<rect x="295" y="72" width="6" height="134" fill="${D(P.window)}"/>` +
    `</g>`;
  // floor slabs
  let floors = `<g stroke-width="0.7" opacity=".4">`;
  for (let y = 72; y <= 208; y += 4) {
    floors += `<line x1="267" y1="${y}" x2="317" y2="${y}"/>`;
  }
  floors += `</g>`;
  g += floors;
  // setback crown + helipad + antenna + glowing logo
  g += `<rect x="274" y="36" width="36" height="32" fill="${glassFill}"/>`;
  g += shadeRect(302, 36, 8, 32);
  g += `<rect x="272" y="30" width="40" height="8" rx="2" fill="${F(P.wall)}"/>`;
  g +=
    `<ellipse cx="284" cy="30" rx="10" ry="3.6" fill="${D(P.road)}"/>` +
    `<ellipse cx="284" cy="30" rx="6" ry="2.2" fill="none" stroke="${P.roadDash}" stroke-width="1.2"/>` +
    `<rect x="282.9" y="28.6" width="2.2" height="2.8" fill="${P.roadDash}" stroke="none"/>`;
  g +=
    `<line x1="304" y1="30" x2="304" y2="10" stroke-width="2"/>` +
    `<circle cx="304" cy="8" r="3" fill="${GOLD}"/>` +
    `<circle cx="304" cy="8" r="6" fill="none" stroke="${GOLD}" stroke-width="1.3" opacity=".5"/>`;
  // luminous logo on the crown face
  g +=
    `<circle cx="292" cy="50" r="6" fill="${GOLD}"/>` +
    `<circle cx="292" cy="50" r="9" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity=".45"/>` +
    `<path d="M289.5,50 l2,2 3.5,-4" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  g += close;
  if (free) g += forSaleSign(254, 262, P);
  else g += plaque(292, 246, s.label, active);
  if (active) g += activeFlag(272, 28);
  return g + close;
}

// --- site: seattle ----------------------------------------------------------------

function siteSeattle(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  const glassFill = free ? P.freeFill : `url(#cm-${P.id}-glass)`;
  let g = open + shadow(140, 602, 58, 9);
  if (active) g += activeRing(140, 605, 64, 10);
  g += bOpen;
  // wet forecourt down to the cross street
  g += `<rect x="96" y="596" width="88" height="10" rx="2" fill="${D(P.sidewalk)}"/>`;
  // main low glass block
  g += `<rect x="96" y="552" width="52" height="44" rx="3" fill="${glassFill}"/>`;
  g += shadeRect(136, 552, 12, 44);
  g += liteRect(98, 554, 6, 40, P);
  g += `<rect x="92" y="545" width="60" height="9" rx="3" fill="${F(P.roofD)}"/>`; // green roof parapet
  // lower annex block
  g += `<rect x="152" y="562" width="34" height="34" rx="3" fill="${glassFill}"/>`;
  g += shadeRect(176, 562, 10, 34);
  g += `<rect x="148" y="556" width="42" height="8" rx="3" fill="${F(P.roofB)}"/>`;
  // glazed link between the blocks
  g += `<rect x="146" y="578" width="8" height="12" fill="${F(P.wall)}"/>`;
  // mullions + floor line on the main block
  g +=
    `<g stroke-width="1" opacity=".35">` +
    `<line x1="109" y1="552" x2="109" y2="596"/>` +
    `<line x1="122" y1="552" x2="122" y2="596"/>` +
    `<line x1="135" y1="552" x2="135" y2="596"/>` +
    `</g>` +
    `<g stroke-width="1.4" opacity=".55"><line x1="96" y1="574" x2="148" y2="574"/></g>`;
  // lit strips behind the glass
  g +=
    `<g stroke="none" opacity=".5">` +
    `<rect x="100" y="558" width="18" height="10" fill="${D(P.window)}"/>` +
    `<rect x="118" y="580" width="22" height="10" fill="${D(P.window)}"/>` +
    `<rect x="156" y="568" width="14" height="9" fill="${D(P.window)}"/>` +
    `<rect x="160" y="584" width="20" height="8" fill="${D(P.window)}"/>` +
    `</g>`;
  // entrance + canopy
  g +=
    `<rect x="114" y="582" width="16" height="14" fill="${D(P.window)}"/>` +
    `<line x1="122" y1="582" x2="122" y2="596" stroke-width="1.5"/>` +
    `<rect x="111" y="578" width="22" height="5" rx="2" fill="${F(P.roofD)}"/>`;
  // rooftop HVAC
  g += `<rect x="100" y="538" width="12" height="7" rx="1.5" fill="${D(P.sidewalk)}"/>`;
  g += close;
  // evergreens frame the lot in full colour (site furniture, not the model)
  g += treePine(86, 610, 0.95, P) + treePine(194, 610, 0.85, P) + treePine(90, 566, 0.7, P);
  // tiny Space Needle silhouette
  g +=
    `<g>` +
    `<ellipse cx="206" cy="600" rx="8" ry="2.5" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<path d="M199,600 C202,586 202,574 206,566" fill="none" stroke-width="2"/>` +
    `<path d="M213,600 C210,586 210,574 206,566" fill="none" stroke-width="2"/>` +
    `<line x1="206" y1="598" x2="206" y2="566" stroke-width="2"/>` +
    `<ellipse cx="206" cy="564" rx="11" ry="4" fill="${P.glassDark}"/>` +
    `<ellipse cx="206" cy="561" rx="11" ry="4" fill="${P.wall}"/>` +
    `<ellipse cx="206" cy="557.5" rx="5" ry="2" fill="${P.wall}"/>` +
    `<line x1="206" y1="556" x2="206" y2="546" stroke-width="1.5"/>` +
    `<circle cx="206" cy="544.5" r="1.5" fill="${GOLD}" stroke-width="1"/>` +
    `</g>`;
  // resident rain clouds + drizzle (it's Seattle)
  g +=
    `<g><g transform="translate(118 532) scale(.8)"><path d="${CLOUD_PATH}" fill="${P.road}" opacity=".95"/></g></g>` +
    `<g><g transform="translate(170 522) scale(.55)"><path d="${CLOUD_PATH}" fill="${P.road}" opacity=".9"/></g></g>` +
    `<g stroke="${P.river}" stroke-width="1.8" opacity=".8">` +
    `<line x1="104" y1="542" x2="101" y2="551"/>` +
    `<line x1="116" y1="544" x2="113" y2="553"/>` +
    `<line x1="128" y1="542" x2="125" y2="551"/>` +
    `<line x1="168" y1="530" x2="165.5" y2="537"/>` +
    `<line x1="177" y1="531" x2="174.5" y2="538"/>` +
    `</g>`;
  if (free) g += forSaleSign(100, 634, P);
  else g += plaque(140, 610, s.label, active);
  if (active) g += activeFlag(102, 540);
  return g + close;
}

// --- site: nyc --------------------------------------------------------------------

function siteNyc(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  let g = open + shadow(292, 616, 46, 8);
  if (active) g += activeRing(292, 617, 52, 9);
  g += bOpen;
  // plaza apron with tiles
  g +=
    `<rect x="254" y="608" width="74" height="10" rx="2" fill="${D(P.sidewalk)}"/>` +
    `<g stroke-width="1" opacity=".4">` +
    `<line x1="274" y1="608" x2="274" y2="618"/><line x1="294" y1="608" x2="294" y2="618"/>` +
    `<line x1="314" y1="608" x2="314" y2="618"/>` +
    `</g>`;
  // flatiron wedge: narrow lit west face + wide shaded east face meet at the prow
  g += `<path d="M250,612 L250,554 Q250,546 257,543 L268,537 L268,612 Z" fill="${F(P.brick)}"/>`;
  g += liteRect(252, 556, 5, 52, P);
  g += `<path d="M268,537 L330,549 L330,612 L268,612 Z" fill="${F(P.brick)}"/>`;
  g += shadeRect(268, 549, 62, 63, 0.12);
  // cornice bands
  g += `<path d="M268,537 L330,549 L330,554 L268,542 Z" fill="${D(P.sand)}"/>`;
  g += `<path d="M251,553 Q251,547 257,544 L267,539" fill="none" stroke="${D(P.sand)}" stroke-width="3"/>`;
  // flagpole on the prow
  g +=
    `<line x1="268" y1="537" x2="268" y2="516" stroke-width="2"/>` +
    `<path d="M268,516 L282,520 L268,525 Z" fill="${D(P.carA)}"/>`;
  // window grid, east face
  let wg = `<g stroke-width="1.5">`;
  for (const wy of [556, 568, 580, 592]) {
    for (const wx of [274, 287, 300, 313]) {
      wg += `<rect x="${wx}" y="${wy}" width="8" height="7" fill="${D(P.window)}"/>`;
    }
  }
  wg += `</g>`;
  g += wg;
  // narrow windows on the west face
  g +=
    `<g stroke-width="1.5">` +
    `<rect x="255" y="556" width="7" height="7" fill="${D(P.window)}"/>` +
    `<rect x="255" y="568" width="7" height="7" fill="${D(P.window)}"/>` +
    `<rect x="255" y="580" width="7" height="7" fill="${D(P.window)}"/>` +
    `<rect x="255" y="592" width="7" height="7" fill="${D(P.window)}"/>` +
    `</g>`;
  // arched ground floor + door at the prow
  g +=
    `<g stroke-width="1.5">` +
    `<rect x="276" y="600" width="10" height="10" rx="3" fill="${D(P.window)}"/>` +
    `<rect x="292" y="600" width="10" height="10" rx="3" fill="${D(P.window)}"/>` +
    `<rect x="308" y="600" width="10" height="10" rx="3" fill="${D(P.window)}"/>` +
    `</g>` +
    `<rect x="256" y="598" width="10" height="14" fill="${D(P.door)}"/>` +
    `<circle cx="258.5" cy="605" r="1.1" fill="${GOLD}" stroke="none"/>`;
  // rooftop water tank on the east roof
  g +=
    `<g>` +
    `<line x1="312" y1="543" x2="312" y2="547" stroke-width="2"/>` +
    `<line x1="320" y1="543" x2="320" y2="548" stroke-width="2"/>` +
    `<rect x="308" y="534" width="16" height="10" rx="2" fill="${F(P.wall)}"/>` +
    `<ellipse cx="316" cy="534" rx="8" ry="2.5" fill="${D(P.brickDark)}"/>` +
    `</g>`;
  g += close;
  // Lady-Liberty-green statuette + yellow cab (site furniture, full colour)
  g +=
    `<g>` +
    `<ellipse cx="341" cy="600" rx="8" ry="2.5" fill="${INK}" opacity=".12" stroke="none"/>` +
    `<rect x="336" y="588" width="10" height="12" rx="1" fill="${P.sidewalk}"/>` +
    `<path d="M341,570 L336.5,588 L345.5,588 Z" fill="${P.roofD}"/>` +
    `<circle cx="341" cy="567" r="2.5" fill="${P.roofD}" stroke-width="1.5"/>` +
    `<g stroke-width="1">` +
    `<line x1="339" y1="565" x2="337.5" y2="562.5"/>` +
    `<line x1="341" y1="564.5" x2="341" y2="561.5"/>` +
    `<line x1="343" y1="565" x2="344.5" y2="562.5"/>` +
    `</g>` +
    `<line x1="343" y1="571" x2="347" y2="562" stroke-width="2"/>` +
    `<circle cx="347.5" cy="560.5" r="1.8" fill="${GOLD}" stroke-width="1"/>` +
    `</g>`;
  g +=
    `<g>` +
    `<rect x="281" y="637" width="6" height="4" rx="1.5" fill="${P.carC}" stroke-width="1"/>` +
    parkedCar(274, 640, P.carC, P) +
    `</g>`;
  if (free) g += forSaleSign(246, 636, P);
  else g += plaque(292, 620, s.label, active);
  if (active) g += activeFlag(300, 543);
  return g + close;
}

// --- site: orbital ----------------------------------------------------------------

function siteOrbital(P: ThemePalette, s: SiteView): string {
  const { open, bOpen, close, free, active, F, D } = siteFrame(P, s);
  let g = open + shadow(188, 720, 64, 8);
  if (active) g += activeRing(188, 700, 74, 28);
  g += bOpen;
  // raised concrete launch platform (top slab + visible rim)
  g += `<ellipse cx="188" cy="700" rx="66" ry="24" fill="${D(P.road)}"/>`;
  g += `<ellipse cx="188" cy="693" rx="66" ry="24" fill="${F(P.sidewalk)}"/>`;
  // hazard ring + humming sci-fi energy ring
  g += `<ellipse cx="188" cy="693" rx="46" ry="15" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="8 6" opacity=".9"/>`;
  g += `<ellipse cx="188" cy="694" rx="58" ry="20" fill="none" stroke="${D(P.pool)}" stroke-width="1.5" stroke-dasharray="2 6" opacity=".6"/>`;
  // scorch mark under the rocket
  g += `<ellipse cx="166" cy="696" rx="13" ry="5" fill="${INK}" opacity=".18" stroke="none"/>`;
  // mission-control bunker at the back edge
  g +=
    `<rect x="134" y="666" width="22" height="14" rx="2" fill="${F(P.wall)}"/>` +
    shadeRect(150, 666, 6, 14) +
    `<rect x="137" y="670" width="12" height="5" fill="${D(P.window)}" stroke-width="1.5"/>` +
    `<line x1="152" y1="666" x2="152" y2="658" stroke-width="1.5"/>` +
    `<circle cx="152" cy="656.5" r="1.4" fill="${GOLD}" stroke-width="1"/>`;
  // the rocket (fins, body, stripe, porthole, nose)
  g +=
    `<path d="M158,668 L148,690 L158,682 Z" fill="${D(P.carA)}"/>` +
    `<path d="M174,668 L184,690 L174,682 Z" fill="${D(P.carA)}"/>` +
    `<rect x="158" y="640" width="16" height="46" rx="5" fill="${D(P.sail)}"/>` +
    shadeRect(169, 644, 5, 38, 0.12) +
    `<path d="M158,644 Q166,618 174,644 Z" fill="${D(P.carA)}"/>` +
    `<rect x="159" y="664" width="14" height="4" fill="${D(P.carA)}" stroke-width="1"/>` +
    `<circle cx="166" cy="656" r="3.5" fill="${D(P.window)}" stroke-width="1.5"/>`;
  // idling thruster glow
  g +=
    `<circle cx="166" cy="689" r="5.5" fill="${GOLD}" opacity=".3" stroke="none"/>` +
    `<circle cx="166" cy="689" r="2.4" fill="${GOLD}" stroke-width="1"/>`;
  // service gantry with warning light
  g +=
    `<rect x="179" y="638" width="7" height="48" fill="${D(P.brickDark)}"/>` +
    `<g stroke-width="1.2" opacity=".6">` +
    `<line x1="179" y1="650" x2="186" y2="644"/>` +
    `<line x1="179" y1="662" x2="186" y2="656"/>` +
    `<line x1="179" y1="674" x2="186" y2="668"/>` +
    `</g>` +
    `<line x1="174" y1="644" x2="179" y2="644" stroke-width="2"/>` +
    `<circle cx="182.5" cy="634" r="4" fill="${GOLD}" opacity=".4" stroke="none"/>` +
    `<circle cx="182.5" cy="634" r="1.8" fill="${GOLD}" stroke-width="1"/>`;
  // deep-space uplink dish
  g +=
    `<rect x="226" y="664" width="5" height="14" rx="1.5" fill="${D(P.sidewalk)}"/>` +
    `<g transform="rotate(-24 228 658)">` +
    `<ellipse cx="228" cy="658" rx="13" ry="5.5" fill="${D(P.glass)}"/>` +
    `<ellipse cx="228" cy="658" rx="8" ry="3" fill="${D(P.glassDark)}" stroke="none"/>` +
    `</g>` +
    `<line x1="228" y1="658" x2="236" y2="650" stroke-width="1.5"/>` +
    `<circle cx="237" cy="649" r="1.5" fill="${GOLD}" stroke-width="1"/>`;
  // blinking pad rim lights
  g +=
    `<g stroke-width="1">` +
    `<circle cx="128" cy="698" r="1.6" fill="${GOLD}"/>` +
    `<circle cx="158" cy="712" r="1.6" fill="${GOLD}"/>` +
    `<circle cx="188" cy="716" r="1.6" fill="${GOLD}"/>` +
    `<circle cx="218" cy="712" r="1.6" fill="${GOLD}"/>` +
    `<circle cx="248" cy="698" r="1.6" fill="${GOLD}"/>` +
    `</g>`;
  g += close;
  if (free) g += forSaleSign(112, 736, P);
  else g += plaque(188, 722, s.label, active);
  if (active) g += activeFlag(250, 688);
  return g + close;
}

// ---------------------------------------------------------------------------
// Theme overlays, clouds, animated cars
// ---------------------------------------------------------------------------

function overlaySection(P: ThemePalette): string {
  let g = '';
  if (P.overlay) {
    g += `<rect x="0" y="0" width="360" height="740" fill="url(#cm-${P.id}-ov)" opacity="${P.overlay.opacity}" stroke="none"/>`;
  }
  if (P.satTint) {
    // drone/spy view: tint + coordinate grid + viewfinder corners + HUD tag
    g += `<rect x="0" y="0" width="360" height="740" fill="${P.satTint}" opacity=".05" stroke="none"/>`;
    let grid = `<g stroke="${INK}" stroke-width="1" opacity=".08">`;
    for (let x = 40; x < 360; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="740"/>`;
    for (let y = 40; y < 740; y += 40) grid += `<line x1="0" y1="${y}" x2="360" y2="${y}"/>`;
    grid += `</g>`;
    g += grid;
    g +=
      `<g fill="none" stroke="${INK}" stroke-width="2.5" opacity=".4">` +
      `<path d="M8,26 L8,8 L26,8"/>` +
      `<path d="M334,8 L352,8 L352,26"/>` +
      `<path d="M352,714 L352,732 L334,732"/>` +
      `<path d="M26,732 L8,732 L8,714"/>` +
      `</g>`;
    g += `<text x="16" y="722" font-family="inherit" font-weight="800" font-size="10" fill="${INK}" opacity=".5" stroke="none">SAT-VIEW 37.4°N</text>`;
  }
  return g;
}

const CLOUD_PATH =
  'M-16,8 Q-19,-2 -8,-4 Q-6,-14 5,-12 Q9,-20 19,-14 Q30,-16 31,-6 Q40,-2 35,8 Z';

function cloudsSection(P: ThemePalette): string {
  const cloud = (cls: string, x: number, y: number, sc: number) =>
    `<g class="map-cloud ${cls}"><g transform="translate(${x} ${y}) scale(${sc})">` +
    `<path d="${CLOUD_PATH}" fill="${P.cloud}" opacity=".85"/>` +
    `</g></g>`;
  return (
    cloud('map-cloud-1', 62, 34, 1) +
    cloud('map-cloud-2', 196, 22, 0.75) +
    cloud('map-cloud-3', 318, 48, 1.1)
  );
}

function carsSection(P: ThemePalette): string {
  return (
    // eastbound lane (top), enters from the left
    `<g class="map-car-a"><g transform="translate(-40 460)">` +
    carSprite(P.carA, P) +
    `</g></g>` +
    // westbound lane (bottom), enters from the right — mirrored
    `<g class="map-car-b"><g transform="translate(400 472)"><g transform="scale(-1 1)">` +
    carSprite(P.carB, P) +
    `</g></g></g>`
  );
}

// ---------------------------------------------------------------------------
// Assembly + memoisation
// ---------------------------------------------------------------------------

function renderMap(P: ThemePalette, sites: SiteView[], theme: CountryTheme): string {
  const byId = new Map(sites.map((s) => [s.id, s]));
  const sv = (id: string): SiteView => byId.get(id) ?? { id, status: 'free', label: '' };
  const parts: string[] = [];
  parts.push(
    `<svg class="city-map" viewBox="0 0 360 740" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="City map">`,
  );
  parts.push(defsSection(P));
  // everything inherits the cartoon ink outline from this wrapper
  parts.push(
    `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">`,
  );
  parts.push(groundSection(P)); // ground
  parts.push(theme.skyline(P)); // country skyline silhouette (distant band)
  parts.push(riverSection(P)); // river
  parts.push(roadsSection(P)); // roads + bridge
  parts.push(fillerSection(P)); // parks, houses, courts, parking, lamps
  parts.push(theme.landmarks(P)); // country signature landmarks
  parts.push(siteCampus(P, sv('campus'))); // site: campus
  parts.push(siteTower(P, sv('tower'))); // site: tower
  parts.push(sitePaloAlto(P, sv('paloalto'))); // site: paloalto
  parts.push(siteLoft(P, sv('loft'))); // site: loft
  parts.push(siteGarage(P, sv('garage'))); // site: garage
  parts.push(siteSeattle(P, sv('seattle'))); // site: seattle
  parts.push(siteNyc(P, sv('nyc'))); // site: nyc
  parts.push(siteOrbital(P, sv('orbital'))); // site: orbital
  parts.push(overlaySection(P)); // dusk cast / satellite HUD
  parts.push(cloudsSection(P)); // clouds (CSS-animated)
  parts.push(carsSection(P)); // cars (CSS-animated)
  parts.push(`</g></svg>`);
  return parts.join('');
}

let memoKey: string | null = null;
let memoSvg = '';

/** Full SVG (string) of the city map. Memoised on (themeId, countryId, sites). */
export function cityMapSvg(themeId: string, sites: SiteView[], countryId = 'us'): string {
  const key = themeId + ':' + countryId + ':' + JSON.stringify(sites);
  if (key === memoKey) return memoSvg;
  const base = PALETTES[themeId] ?? DAYLIGHT;
  const theme = COUNTRY_THEMES[countryId] ?? COUNTRY_THEMES.us;
  // country palette overrides + a merged id so gradient ids stay unique
  // per (theme, country) combination
  const palette: ThemePalette = { ...base, ...theme.palette, id: base.id + '-' + countryId };
  memoSvg = renderMap(palette, sites, theme);
  memoKey = key;
  return memoSvg;
}
