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
  id: string; // 'garage' | 'loft' | 'paloalto' | 'campus' | 'tower'
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
    `<rect x="0" y="0" width="360" height="520" fill="${P.grass}" stroke="none"/>` +
    // mottled grass patches, no stroke — just texture
    `<g stroke="none">` +
    `<ellipse cx="60" cy="250" rx="70" ry="40" fill="${P.grassDark}" opacity=".5"/>` +
    `<ellipse cx="290" cy="420" rx="80" ry="45" fill="${P.grassDark}" opacity=".45"/>` +
    `<ellipse cx="120" cy="60" rx="80" ry="38" fill="${P.grassLight}" opacity=".5"/>` +
    `<ellipse cx="60" cy="470" rx="60" ry="30" fill="${P.grassLight}" opacity=".4"/>` +
    `<ellipse cx="180" cy="360" rx="55" ry="28" fill="${P.grassDark}" opacity=".35"/>` +
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

function roadsSection(P: ThemePalette): string {
  const streets = [
    'M162,428 L104,428', // to the garage
    'M170,292 L98,292', // to Palo Alto
    'M200,152 L142,152', // to the campus
    'M180,390 L246,390', // to the loft
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
    `<path d="${MAIN_ROAD}" stroke="${P.roadDash}" stroke-width="2.5" stroke-dasharray="10 14" opacity=".9"/>` +
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
  return g;
}

// ---------------------------------------------------------------------------
// The five interactive sites
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

// ---------------------------------------------------------------------------
// Theme overlays, clouds, animated cars
// ---------------------------------------------------------------------------

function overlaySection(P: ThemePalette): string {
  let g = '';
  if (P.overlay) {
    g += `<rect x="0" y="0" width="360" height="520" fill="url(#cm-${P.id}-ov)" opacity="${P.overlay.opacity}" stroke="none"/>`;
  }
  if (P.satTint) {
    // drone/spy view: tint + coordinate grid + viewfinder corners + HUD tag
    g += `<rect x="0" y="0" width="360" height="520" fill="${P.satTint}" opacity=".05" stroke="none"/>`;
    let grid = `<g stroke="${INK}" stroke-width="1" opacity=".08">`;
    for (let x = 40; x < 360; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="520"/>`;
    for (let y = 40; y < 520; y += 40) grid += `<line x1="0" y1="${y}" x2="360" y2="${y}"/>`;
    grid += `</g>`;
    g += grid;
    g +=
      `<g fill="none" stroke="${INK}" stroke-width="2.5" opacity=".4">` +
      `<path d="M8,26 L8,8 L26,8"/>` +
      `<path d="M334,8 L352,8 L352,26"/>` +
      `<path d="M352,494 L352,512 L334,512"/>` +
      `<path d="M26,512 L8,512 L8,494"/>` +
      `</g>`;
    g += `<text x="16" y="502" font-family="inherit" font-weight="800" font-size="10" fill="${INK}" opacity=".5" stroke="none">SAT-VIEW 37.4°N</text>`;
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

function renderMap(P: ThemePalette, sites: SiteView[]): string {
  const byId = new Map(sites.map((s) => [s.id, s]));
  const sv = (id: string): SiteView => byId.get(id) ?? { id, status: 'free', label: '' };
  const parts: string[] = [];
  parts.push(
    `<svg class="city-map" viewBox="0 0 360 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="City map">`,
  );
  parts.push(defsSection(P));
  // everything inherits the cartoon ink outline from this wrapper
  parts.push(
    `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">`,
  );
  parts.push(groundSection(P)); // ground
  parts.push(riverSection(P)); // river
  parts.push(roadsSection(P)); // roads + bridge
  parts.push(fillerSection(P)); // parks, houses, courts, parking, lamps
  parts.push(siteCampus(P, sv('campus'))); // site: campus
  parts.push(siteTower(P, sv('tower'))); // site: tower
  parts.push(sitePaloAlto(P, sv('paloalto'))); // site: paloalto
  parts.push(siteLoft(P, sv('loft'))); // site: loft
  parts.push(siteGarage(P, sv('garage'))); // site: garage
  parts.push(overlaySection(P)); // dusk cast / satellite HUD
  parts.push(cloudsSection(P)); // clouds (CSS-animated)
  parts.push(carsSection(P)); // cars (CSS-animated)
  parts.push(`</g></svg>`);
  return parts.join('');
}

let memoKey: string | null = null;
let memoSvg = '';

/** Full SVG (string) of the city map. Memoised on (themeId, sites). */
export function cityMapSvg(themeId: string, sites: SiteView[]): string {
  const key = themeId + JSON.stringify(sites);
  if (key === memoKey) return memoSvg;
  const palette = PALETTES[themeId] ?? DAYLIGHT;
  memoSvg = renderMap(palette, sites);
  memoKey = key;
  return memoSvg;
}
