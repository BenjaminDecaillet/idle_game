/**
 * itemArt.ts — item illustrations for the shop and office (chantier 3 of the
 * design system).
 *
 *   - stationArt(id, size)  → square illustration for a workstation
 *   - upgradeArt(id, size)  → square illustration for an upgrade
 *   - projectArt(id, size)  → square icon for a project
 *   - upgradeProp(id)       → standalone office prop for one owned upgrade,
 *                             bottom-aligned in the 64 px wall band (h ≤ 56)
 *
 * Pure string building — no DOM, no timers, no randomness, no imports.
 * Everything is memoised (key `kind:id:size`) because the 2 Hz re-render asks
 * for these on every rebuild. Unknown ids fall back to a friendly "?" carton.
 *
 * Design-system rules: ink outlines #2d2440 with round joins/caps, cel
 * shading (base tone + darker face + light rim), ellipse drop shadows
 * opacity .12, no SVG filters, gradient IDs prefixed `ia-…` and globally
 * unique per asset (the SVGs are inline and share the DOM).
 */

const INK = '#2d2440';

/** Standard outline attributes for main shapes. */
const S = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
/** Finer outline for small interior details. */
const S1 = `stroke="${INK}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"`;

/** Square icon shell: object drawn in a 44×44 box, no card background. */
function icon(size: number, body: string, defs = ''): string {
  const d = defs ? `<defs>${defs}</defs>` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d}${body}</svg>`;
}

/** Standalone prop shell (natural size, placed bottom-aligned in the band). */
function prop(w: number, h: number, body: string, defs = ''): string {
  const d = defs ? `<defs>${defs}</defs>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d}${body}</svg>`;
}

/** Soft drop shadow under a grounded object (design-system rule). */
function shadow(cx: number, cy: number, rx: number, ry = 2.6): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity=".12"/>`;
}

/** Two-stop linear gradient (vertical by default). */
function lg(id: string, from: string, to: string, horiz = false): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
  );
}

/** Chunky colored stroke with an ink outline underneath. */
function tube(d: string, color: string, w: number): string {
  const cap = 'stroke-linecap="round" stroke-linejoin="round"';
  return (
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2.2}" ${cap}/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" ${cap}/>`
  );
}

/** Glowing line: wide soft pass + bright core pass. No filters. */
function glowLine(d: string, color: string, w = 1.6): string {
  const cap = 'stroke-linecap="round" stroke-linejoin="round"';
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w + 3}" ${cap} opacity=".25"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" ${cap}/>`
  );
}

// ---------------------------------------------------------------------------
// Workstations
// ---------------------------------------------------------------------------

function stBasic(size: number): string {
  return icon(
    size,
    shadow(21, 40, 15) +
      // wooden stool on the right
      `<path d="M34.5 31 L33.5 39 M39.5 31 L40.5 39" fill="none" stroke="#8a5a35" stroke-width="2" stroke-linecap="round"/>` +
      `<ellipse cx="37" cy="29.5" rx="4.5" ry="2" fill="#c9894a" ${S1}/>` +
      // desk
      `<rect x="6" y="28" width="3" height="11" fill="#b9833f" ${S1}/>` +
      `<rect x="27" y="28" width="3" height="11" fill="#b9833f" ${S1}/>` +
      `<rect x="3" y="24" width="30" height="4.5" rx="1.8" fill="url(#ia-st-basic-top)" ${S}/>` +
      `<path d="M7 26.4 h9 M20 26.4 h8" fill="none" stroke="#8a5a35" stroke-width="1" opacity=".5" stroke-linecap="round"/>` +
      // open laptop
      `<rect x="10" y="11" width="13" height="10" rx="1.2" fill="#4a4468" ${S}/>` +
      `<rect x="12" y="13" width="9" height="6" rx=".5" fill="#9fd8ff" ${S1}/>` +
      `<path d="M13.5 15 h3 M13.5 17 h5" fill="none" stroke="#38b6ff" stroke-width="1" stroke-linecap="round"/>` +
      `<polygon points="8.5,24 24.5,24 23,21 10,21" fill="#6a7486" ${S}/>` +
      // mug of coffee
      `<rect x="26.5" y="19.5" width="5" height="4.5" rx="1" fill="#ff5d55" ${S1}/>` +
      `<path d="M31.5 20.6 a1.8 1.8 0 0 1 0 2.6" fill="none" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M29 17.5 q1 -1.5 0 -3" fill="none" stroke="#b9c7d6" stroke-width="1" stroke-linecap="round"/>`,
    lg('ia-st-basic-top', '#e8b57a', '#cf9350')
  );
}

function stStanding(size: number): string {
  return icon(
    size,
    shadow(22, 40, 15) +
      // anti-fatigue mat
      `<rect x="13" y="36.5" width="18" height="3.5" rx="1.75" fill="#38b6ff" ${S1}/>` +
      // feet + telescopic columns (adjustment visible)
      `<rect x="8" y="37" width="9" height="2.5" rx="1.2" fill="#4a4468" ${S1}/>` +
      `<rect x="27" y="37" width="9" height="2.5" rx="1.2" fill="#4a4468" ${S1}/>` +
      `<rect x="11.2" y="17" width="2.6" height="8" fill="#9db0c4" ${S1}/>` +
      `<rect x="30.2" y="17" width="2.6" height="8" fill="#9db0c4" ${S1}/>` +
      `<rect x="10.4" y="23" width="4.2" height="14" fill="#6a7486" ${S1}/>` +
      `<rect x="29.4" y="23" width="4.2" height="14" fill="#6a7486" ${S1}/>` +
      // control paddle
      `<rect x="15.5" y="19" width="3" height="4.5" rx="1" fill="#ffb02e" ${S1}/>` +
      // raised top
      `<rect x="5" y="14" width="34" height="3.6" rx="1.6" fill="url(#ia-st-standing-top)" ${S}/>` +
      // monitor on a stand
      `<rect x="20.5" y="10.8" width="3" height="3.2" fill="#6a7486" ${S1}/>` +
      `<rect x="13" y="2" width="18" height="9.5" rx="1.4" fill="#4a4468" ${S}/>` +
      `<rect x="15" y="4" width="14" height="5.5" fill="#9fd8ff" ${S1}/>` +
      `<path d="M17 6 h4 M17 8 h7" fill="none" stroke="#38b6ff" stroke-width="1" stroke-linecap="round"/>` +
      // succulent
      `<path d="M34.7 10 C33 8.5 32.5 6.5 33.2 5 C34.7 6 35.3 8 34.7 10 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M34.9 10 C36.6 8.5 37.1 6.5 36.4 5 C34.9 6 34.3 8 34.9 10 z" fill="#7ac95e" ${S1}/>` +
      `<polygon points="32,10 37.5,10 36.8,13.8 32.7,13.8" fill="#e8734f" ${S1}/>`,
    lg('ia-st-standing-top', '#f6f9fc', '#d5dde8')
  );
}

function stDual(size: number): string {
  return icon(
    size,
    shadow(22, 40.5, 16) +
      // legs
      `<rect x="7" y="28" width="3.5" height="11" fill="#3a3148" ${S1}/>` +
      `<rect x="33.5" y="28" width="3.5" height="11" fill="#3a3148" ${S1}/>` +
      // cyan LED strip under the top
      `<line x1="8" y1="29.6" x2="36" y2="29.6" stroke="#38e8ff" stroke-width="4" opacity=".22" stroke-linecap="round"/>` +
      `<line x1="8" y1="29.6" x2="36" y2="29.6" stroke="#38e8ff" stroke-width="1.6" stroke-linecap="round"/>` +
      // dark desk
      `<rect x="4" y="24.5" width="36" height="4" rx="1.6" fill="url(#ia-st-dual-top)" ${S}/>` +
      // twin angled monitors
      `<rect x="11" y="22.3" width="3" height="2.2" fill="#3a3148" ${S1}/>` +
      `<rect x="30" y="22.3" width="3" height="2.2" fill="#3a3148" ${S1}/>` +
      `<polygon points="5.5,8.5 20,10 20,21 5.5,22.5" fill="#4a4468" ${S}/>` +
      `<polygon points="7.5,10.3 18.3,11.5 18.3,19.7 7.5,20.7" fill="#1c2f4a" ${S1}/>` +
      `<path d="M9.5 13 h4 M9.5 15.5 h6 M9.5 18 h3" fill="none" stroke="#38e8ff" stroke-width="1" stroke-linecap="round"/>` +
      `<polygon points="38.5,8.5 24,10 24,21 38.5,22.5" fill="#4a4468" ${S}/>` +
      `<polygon points="36.5,10.3 25.7,11.5 25.7,19.7 36.5,20.7" fill="#1c2f4a" ${S1}/>` +
      `<path d="M27.5 13 h4 M27.5 15.5 h6 M27.5 18 h3.5" fill="none" stroke="#ff4fd8" stroke-width="1" stroke-linecap="round"/>` +
      // mechanical keyboard
      `<rect x="15" y="21.8" width="14" height="3.4" rx="1" fill="#6a6490" ${S1}/>` +
      `<path d="M17 23.5 h1.6 M20 23.5 h1.6 M23 23.5 h1.6 M26 23.5 h1.6" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      // headset on its stand
      `<line x1="40.6" y1="24.5" x2="40.6" y2="14" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M37.9 17 a2.7 2.7 0 0 1 5.4 0" fill="none" stroke="#ff4fd8" stroke-width="1.8"/>` +
      `<rect x="36.9" y="16.6" width="2.2" height="3.4" rx="1" fill="#4a4468" ${S1}/>` +
      `<rect x="41.4" y="16.6" width="2.2" height="3.4" rx="1" fill="#4a4468" ${S1}/>`,
    lg('ia-st-dual-top', '#4a4468', '#3a3148')
  );
}

function stCorner(size: number): string {
  return icon(
    size,
    // stylised city window panel behind the desk
    `<rect x="2.5" y="2" width="13" height="11" rx="1.2" fill="url(#ia-st-corner-sky)" ${S1}/>` +
      `<path d="M3.2 12.3 v-4 h2.6 v-2.5 h2.4 v2.5 h2.4 v-4 h2.4 v4 h1.8 v4 z" fill="#553a60" opacity=".85"/>` +
      `<path d="M9 2.5 v10 M3 7.2 h12" fill="none" stroke="${INK}" stroke-width="1" opacity=".6"/>` +
      shadow(22, 41, 17) +
      // corner return, mahogany
      `<polygon points="31,24.5 41,27.5 41,32 31,28.5" fill="#6b3a20" ${S1}/>` +
      `<rect x="37.5" y="32" width="3" height="7" fill="#5c2f19" ${S1}/>` +
      // paneled front
      `<rect x="5" y="28" width="26" height="11" rx="1" fill="#7a4226" ${S}/>` +
      `<rect x="8" y="30.5" width="8" height="6" rx="1" fill="none" stroke="#5c2f19" stroke-width="1.2"/>` +
      `<rect x="20" y="30.5" width="8" height="6" rx="1" fill="none" stroke="#5c2f19" stroke-width="1.2"/>` +
      `<path d="M6.5 29.4 h23" fill="none" stroke="#ffc93c" stroke-width="1" opacity=".7" stroke-linecap="round"/>` +
      `<rect x="3" y="24" width="30" height="4.4" rx="1.6" fill="url(#ia-st-corner-wood)" ${S}/>` +
      // curved ultrawide monitor
      `<rect x="20.5" y="17.8" width="3" height="4.2" fill="#3a3148" ${S1}/>` +
      `<rect x="17.5" y="22" width="9" height="2" rx="1" fill="#3a3148" ${S1}/>` +
      `<path d="M11 7.5 Q22 4.5 33 7.5 L32.4 17.5 Q22 15 11.6 17.5 z" fill="#4a4468" ${S}/>` +
      `<path d="M13 9.3 Q22 6.8 31 9.3 L30.6 15.8 Q22 13.6 13.4 15.8 z" fill="#1c2f4a" ${S1}/>` +
      `<path d="M15.5 13.5 l3 -1.5 l2.5 1 l4.5 -2.5" fill="none" stroke="#2fbf6b" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>` +
      // banker's lamp
      `<rect x="4.5" y="21.8" width="7" height="2" rx="1" fill="#caa24d" ${S1}/>` +
      `<line x1="8" y1="21.8" x2="8" y2="17" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<ellipse cx="8" cy="17.8" rx="4.2" ry="1.3" fill="#ffe9a8" opacity=".7"/>` +
      `<path d="M3.5 17 q4.5 -5.5 9 0 z" fill="#1f7a44" ${S1}/>` +
      // trophy
      `<rect x="26.5" y="21.8" width="6" height="2.2" rx="1" fill="#b9833f" ${S1}/>` +
      `<rect x="28.6" y="19.4" width="1.8" height="2.6" fill="#e8a01f" ${S1}/>` +
      `<path d="M27 13.5 h5 v2.6 a2.5 2.5 0 0 1 -5 0 z" fill="#ffc93c" ${S1}/>` +
      `<path d="M27 14.2 a1.6 1.6 0 1 0 .3 2.8 M32 14.2 a1.6 1.6 0 1 1 -.3 2.8" fill="none" stroke="#e8a01f" stroke-width="1.1"/>`,
    lg('ia-st-corner-wood', '#8a4a26', '#5c2f19') + lg('ia-st-corner-sky', '#ffd98a', '#ff9a5c')
  );
}

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

function upCoffee(size: number): string {
  return icon(
    size,
    shadow(22, 40, 14) +
      // steam curls
      `<path d="M16.5 4.5 q1.5 -1.5 .3 -3.2" fill="none" stroke="#b9c7d6" stroke-width="1.3" stroke-linecap="round"/>` +
      `<path d="M22 4.5 q-1.5 -1.8 .2 -3.4" fill="none" stroke="#b9c7d6" stroke-width="1.3" stroke-linecap="round"/>` +
      // gleaming chrome body
      `<rect x="9" y="33.5" width="26" height="4" rx="1.6" fill="#9db0c4" ${S}/>` +
      `<rect x="11" y="9" width="22" height="17" rx="2.5" fill="url(#ia-up-coffee-chrome)" ${S}/>` +
      `<rect x="28.5" y="10.5" width="3.5" height="14" rx="1.5" fill="#8fa0b5" opacity=".55"/>` +
      `<rect x="13" y="5.5" width="18" height="4.5" rx="1.6" fill="#d5dde8" ${S}/>` +
      `<line x1="14.2" y1="12" x2="14.2" y2="22" stroke="#ffffff" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>` +
      // pressure gauge + buttons
      `<circle cx="17.5" cy="16" r="2.6" fill="#fff8ec" ${S1}/>` +
      `<path d="M17.5 16 L19 14.8" fill="none" stroke="#ff5d55" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="24.2" cy="13" r="1.2" fill="#2fbf6b" ${S1}/>` +
      `<circle cx="27.6" cy="13" r="1.2" fill="#ff5d55" ${S1}/>` +
      // group head + portafilter handle
      `<rect x="19" y="26" width="9" height="3" rx="1" fill="#8fa0b5" ${S1}/>` +
      `<path d="M28 27.5 h6.5" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M28.4 27.5 h5.7" fill="none" stroke="#6a7486" stroke-width="1.2" stroke-linecap="round"/>` +
      // red cup
      `<rect x="18.5" y="29.5" width="7" height="4.5" rx="1.2" fill="#ff5d55" ${S1}/>` +
      `<path d="M25.5 30.6 a1.7 1.7 0 0 1 0 2.4" fill="none" stroke="${INK}" stroke-width="1"/>`,
    lg('ia-up-coffee-chrome', '#f2f6fa', '#b9c4d2')
  );
}

function upFiber(size: number): string {
  return icon(
    size,
    shadow(22, 40, 13) +
      // wifi antenna
      `<line x1="15" y1="11" x2="15" y2="4.5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="15" cy="3.5" r="1.6" fill="#38b6ff" ${S1}/>` +
      `<path d="M18.6 1.8 a4.6 4.6 0 0 1 2.3 3.8" fill="none" stroke="#38b6ff" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="M21.4 1 a7.4 7.4 0 0 1 3.6 6" fill="none" stroke="#38b6ff" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>` +
      // glowing fibre loop
      glowLine('M33.5 18 C40 20 41 29 34 33.5', '#38e8ff') +
      // rack
      `<rect x="12" y="36" width="4" height="3" fill="#3a3148" ${S1}/>` +
      `<rect x="28" y="36" width="4" height="3" fill="#3a3148" ${S1}/>` +
      `<rect x="10" y="11" width="24" height="26" rx="2.5" fill="url(#ia-up-fiber-body)" ${S}/>` +
      `<rect x="12.5" y="14" width="19" height="5" rx="1" fill="#3a3148" ${S1}/>` +
      `<rect x="12.5" y="21.5" width="19" height="5" rx="1" fill="#3a3148" ${S1}/>` +
      `<rect x="12.5" y="29" width="19" height="5" rx="1" fill="#3a3148" ${S1}/>` +
      `<path d="M14.5 15.7 h6 M14.5 17.7 h6 M14.5 23.2 h6 M14.5 25.2 h6 M14.5 30.7 h6 M14.5 32.7 h6" fill="none" stroke="#6a6490" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="25.5" cy="16.5" r="1.1" fill="#2fbf6b"/>` +
      `<circle cx="28.8" cy="16.5" r="1.1" fill="#38e8ff"/>` +
      `<circle cx="25.5" cy="24" r="1.1" fill="#38e8ff"/>` +
      `<circle cx="28.8" cy="24" r="1.1" fill="#2fbf6b"/>` +
      `<circle cx="25.5" cy="31.5" r="1.1" fill="#2fbf6b"/>` +
      `<circle cx="28.8" cy="31.5" r="1.1" fill="#2fbf6b"/>` +
      // fibre connector
      `<rect x="31.5" y="32" width="4.5" height="3.2" rx="1" fill="#ffb02e" ${S1}/>`,
    lg('ia-up-fiber-body', '#5d5687', '#4a4468')
  );
}

function upAgile(size: number): string {
  return icon(
    size,
    shadow(22, 41, 15) +
      // rolling frame
      `<line x1="13" y1="36" x2="13" y2="31" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<line x1="31" y1="36" x2="31" y2="31" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="13" cy="38.5" r="2.4" fill="#4a4468" ${S1}/>` +
      `<circle cx="31" cy="38.5" r="2.4" fill="#4a4468" ${S1}/>` +
      `<circle cx="13" cy="38.5" r=".8" fill="#b9c4d2"/>` +
      `<circle cx="31" cy="38.5" r=".8" fill="#b9c4d2"/>` +
      // board with 3 columns
      `<rect x="5" y="5" width="34" height="27" rx="2.2" fill="#fff8ec" ${S}/>` +
      `<path d="M7.2 5 h29.6 a2.2 2.2 0 0 1 2.2 2.2 v2.8 h-34 v-2.8 a2.2 2.2 0 0 1 2.2 -2.2 z" fill="#38b6ff" ${S1}/>` +
      `<path d="M16.3 11.5 v19 M27.6 11.5 v19" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
      // post-its
      `<rect x="8" y="12.5" width="5" height="5" fill="#ffc93c" ${S1}/>` +
      `<rect x="9.5" y="19.5" width="5" height="5" fill="#ff6fa9" ${S1}/>` +
      `<rect x="8" y="26" width="5" height="4.5" fill="#38b6ff" ${S1}/>` +
      `<rect x="19" y="13.5" width="5" height="5" fill="#7ac95e" ${S1}/>` +
      `<rect x="20.5" y="21.5" width="5" height="5" fill="#ffb02e" ${S1}/>` +
      `<rect x="30.5" y="12.5" width="5" height="5" fill="#2fbf6b" ${S1}/>` +
      `<path d="M31.7 15 l1.2 1.2 2 -2.4" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="31.5" y="20.5" width="5" height="4.5" fill="#ff8a5c" ${S1}/>` +
      `<path d="M9 14.2 h3 M10.5 21.2 h3 M20 15.2 h3 M21.5 23.2 h3" fill="none" stroke="${INK}" stroke-width=".8" opacity=".4" stroke-linecap="round"/>` +
      // sprint timer hooked on the side
      `<line x1="38.5" y1="8.5" x2="40.3" y2="11.5" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<rect x="39.7" y="10.8" width="1.6" height="1.6" fill="#6a7486" ${S1}/>` +
      `<circle cx="40.5" cy="15.5" r="3.1" fill="#f0f4f8" ${S1}/>` +
      `<path d="M40.5 15.5 L40.5 13.6 M40.5 15.5 L41.9 16.3" fill="none" stroke="#ff5d55" stroke-width="1" stroke-linecap="round"/>`
  );
}

function upHr(size: number): string {
  return icon(
    size,
    shadow(22, 40, 13) +
      // plant on top
      `<path d="M19.5 9.5 C17.5 7.5 17 5 18 3.5 C19.8 4.8 20.3 7.5 19.5 9.5 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M19.7 9.5 C21.7 7.5 22.2 5 21.2 3.5 C19.4 4.8 18.9 7.5 19.7 9.5 z" fill="#7ac95e" ${S1}/>` +
      `<polygon points="16.5,9.5 22.5,9.5 21.8,13 17.2,13" fill="#e8734f" ${S1}/>` +
      // filing cabinet
      `<rect x="13" y="13" width="19" height="25" rx="2" fill="url(#ia-up-hr-body)" ${S}/>` +
      `<rect x="15" y="15.5" width="15" height="9" rx="1.2" fill="#b7c2d0" ${S1}/>` +
      `<rect x="15" y="26.5" width="15" height="9" rx="1.2" fill="#b7c2d0" ${S1}/>` +
      `<rect x="20" y="17.3" width="5" height="1.8" rx=".9" fill="#6a7486" ${S1}/>` +
      `<rect x="20" y="28.3" width="5" height="1.8" rx=".9" fill="#6a7486" ${S1}/>` +
      `<rect x="20.6" y="31.2" width="3.8" height="1.8" fill="#fff8ec" ${S1}/>` +
      // heart badge on the top drawer
      `<path d="M22.5 24.2 q-2.4 -1.8 -2.4 -3.2 q0 -1.2 1.2 -1.2 q.8 0 1.2 .8 q.4 -.8 1.2 -.8 q1.2 0 1.2 1.2 q0 1.4 -2.4 3.2 z" fill="#ff6fa9" ${S1}/>` +
      // rubber stamp + OK mark
      `<circle cx="8" cy="26.5" r="1.8" fill="#ff5d55" ${S1}/>` +
      `<rect x="7" y="28" width="2" height="3.5" fill="#c9894a" ${S1}/>` +
      `<rect x="4.5" y="31.5" width="7" height="3.5" rx="1" fill="#8a5a35" ${S}/>` +
      `<text x="8" y="39.6" text-anchor="middle" font-size="4.4" font-weight="800" fill="#2fbf6b">OK</text>`,
    lg('ia-up-hr-body', '#9db0c4', '#7f92a8')
  );
}

function upChairs(size: number): string {
  return icon(
    size,
    shadow(22, 41, 13) +
      // five-star base
      `<path d="M22 35.5 L13.5 39 M22 35.5 L30.5 39 M22 35.5 L22 39.5" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<circle cx="13.5" cy="39.5" r="1.7" fill="#4a4468" ${S1}/>` +
      `<circle cx="30.5" cy="39.5" r="1.7" fill="#4a4468" ${S1}/>` +
      `<circle cx="22" cy="40" r="1.7" fill="#4a4468" ${S1}/>` +
      `<rect x="20.8" y="30.5" width="2.4" height="5" fill="#8fa0b5" ${S1}/>` +
      // headrest
      `<rect x="20.9" y="5" width="2.2" height="2.2" fill="#3a3148" ${S1}/>` +
      `<rect x="17.5" y="1.5" width="9" height="4.5" rx="2" fill="#4a4468" ${S}/>` +
      // mesh backrest with lumbar support
      `<path d="M15.5 6.5 C15 12 15.2 18 16.5 26.5 L27.5 26.5 C28.8 18 29 12 28.5 6.5 C24 4.5 20 4.5 15.5 6.5 z" fill="url(#ia-up-chairs-back)" ${S}/>` +
      `<path d="M19.5 7.5 v11 M24.5 7.5 v11" fill="none" stroke="${INK}" stroke-width="1" opacity=".2"/>` +
      `<path d="M17 20.5 C20 22.5 24 22.5 27 20.5" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".45"/>` +
      // armrests
      tube('M15.5 19.5 h-3.5 v7.5', '#6a7486', 1.2) +
      tube('M28.5 19.5 h3.5 v7.5', '#6a7486', 1.2) +
      // seat + cosy cushion
      `<rect x="13.5" y="26.5" width="17" height="4.8" rx="2.3" fill="#4f8df9" ${S}/>` +
      `<path d="M16.5 28.7 h7" fill="none" stroke="#9fd8ff" stroke-width="1.1" opacity=".8" stroke-linecap="round"/>` +
      `<rect x="16.5" y="21.5" width="8" height="6" rx="2.2" fill="#ffb02e" ${S1}/>` +
      `<circle cx="20.5" cy="24.5" r=".7" fill="#e8a01f"/>`,
    lg('ia-up-chairs-back', '#4f8df9', '#3a6fd0')
  );
}

function upMarketing(size: number): string {
  return icon(
    size,
    shadow(18, 41, 14) +
      // billboard with a rising curve
      `<line x1="6" y1="14" x2="6" y2="19" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<line x1="15.5" y1="14" x2="15.5" y2="19" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<rect x="2.5" y="3" width="16.5" height="11.5" rx="1.4" fill="#fff8ec" ${S}/>` +
      `<path d="M5.5 11.5 L8.5 9 L10.5 10.2 L15.5 6" fill="none" stroke="#2fbf6b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M12.8 5.7 h2.9 v2.9" fill="none" stroke="#2fbf6b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      // bright orange megaphone
      `<rect x="4.5" y="22.3" width="3" height="7.4" rx="1.4" fill="#ffb02e" ${S1}/>` +
      `<polygon points="7,23 25,14 25,36 7,29" fill="url(#ia-up-marketing-cone)" ${S}/>` +
      `<line x1="10" y1="24.6" x2="22" y2="18.6" stroke="#ffc93c" stroke-width="1.6" opacity=".85" stroke-linecap="round"/>` +
      `<rect x="24" y="12.5" width="4" height="25" rx="2" fill="#e06a00" ${S}/>` +
      `<rect x="11.5" y="30.5" width="4.5" height="8" rx="1.8" fill="#4a4468" ${S1}/>` +
      // sound waves
      `<path d="M31 20 a7 7 0 0 1 0 10" fill="none" stroke="#ffb02e" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M34.5 16.5 a11.5 11.5 0 0 1 0 17" fill="none" stroke="#ffb02e" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`,
    lg('ia-up-marketing-cone', '#ff8a2a', '#e06a00')
  );
}

// ---------------------------------------------------------------------------
// Projects — 12 mini icons, readable at 40 px
// ---------------------------------------------------------------------------

function prLanding(size: number): string {
  return icon(
    size,
    shadow(22, 38.5, 13) +
      `<rect x="6" y="7" width="30" height="23" rx="2.5" fill="#ffffff" ${S}/>` +
      `<path d="M8.5 7 h25 a2.5 2.5 0 0 1 2.5 2.5 v3 h-30 v-3 a2.5 2.5 0 0 1 2.5 -2.5 z" fill="#38b6ff" ${S1}/>` +
      `<circle cx="10.5" cy="9.8" r=".9" fill="#fff8ec"/>` +
      `<circle cx="13.1" cy="9.8" r=".9" fill="#fff8ec"/>` +
      `<circle cx="15.7" cy="9.8" r=".9" fill="#fff8ec"/>` +
      `<rect x="9" y="15" width="11" height="7" rx="1" fill="#ff6fa9" ${S1}/>` +
      `<path d="M23 16.5 h10 M23 19.5 h7" fill="none" stroke="#b9c7d6" stroke-width="1.4" stroke-linecap="round"/>` +
      `<rect x="23" y="22" width="8" height="3.5" rx="1.6" fill="#ff8a2a" ${S1}/>` +
      // paintbrush
      `<path d="M39 18 L30 27" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>` +
      `<path d="M39 18 L30 27" fill="none" stroke="#ffb02e" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M29.8 27.2 L27.9 29.1" fill="none" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M29.7 27.3 L28.1 28.9" fill="none" stroke="#9db0c4" stroke-width="3.2"/>` +
      `<path d="M28.3 28.7 C26 29.5 24.5 31.5 24 34 C26.5 33.5 28.5 32 29.3 29.7 z" fill="#ff6fa9" ${S1}/>` +
      `<circle cx="22.8" cy="35.5" r="1.2" fill="#ff6fa9"/>`
  );
}

function prTodo(size: number): string {
  return icon(
    size,
    shadow(22, 39.5, 12) +
      `<rect x="11" y="7" width="22" height="30" rx="2.5" fill="#fff8ec" ${S}/>` +
      `<rect x="17.5" y="4.5" width="9" height="5" rx="2" fill="#ffb02e" ${S1}/>` +
      `<rect x="14" y="13.5" width="5" height="5" rx="1.2" fill="#2fbf6b" ${S1}/>` +
      `<path d="M15.2 16 l1.3 1.3 2.2 -2.6" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M21.5 16 h8.5" fill="none" stroke="#b9c7d6" stroke-width="1.5" stroke-linecap="round"/>` +
      `<rect x="14" y="20.5" width="5" height="5" rx="1.2" fill="#2fbf6b" ${S1}/>` +
      `<path d="M15.2 23 l1.3 1.3 2.2 -2.6" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M21.5 23 h8.5" fill="none" stroke="#b9c7d6" stroke-width="1.5" stroke-linecap="round"/>` +
      `<rect x="14" y="27.5" width="5" height="5" rx="1.2" fill="#ffffff" ${S1}/>` +
      `<path d="M21.5 30 h6.5" fill="none" stroke="#b9c7d6" stroke-width="1.5" stroke-linecap="round"/>`
  );
}

function prApi(size: number): string {
  return icon(
    size,
    shadow(21, 39, 12) +
      `<rect x="17.8" y="8" width="3" height="6.5" rx="1.2" fill="#ffc93c" ${S1}/>` +
      `<rect x="23.2" y="8" width="3" height="6.5" rx="1.2" fill="#ffc93c" ${S1}/>` +
      `<rect x="15" y="14" width="14" height="12" rx="3" fill="#4f8df9" ${S}/>` +
      `<path d="M17.5 16.5 h4" fill="none" stroke="#9fd8ff" stroke-width="1.4" opacity=".9" stroke-linecap="round"/>` +
      `<rect x="17" y="25.5" width="10" height="4" rx="1.5" fill="#3a6fd0" ${S1}/>` +
      `<path d="M22 29.5 C22 33 17.5 33 15.5 35.8" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M22 29.5 C22 33 17.5 33 15.5 35.8" fill="none" stroke="#6a7486" stroke-width="1.6" stroke-linecap="round"/>` +
      // data spark
      `<polygon points="35,11 30,19 33,19 29,27 37,17 33.8,17 37.5,11" fill="#ffc93c" ${S1}/>`
  );
}

function prPayments(size: number): string {
  return icon(
    size,
    shadow(22, 38.5, 14) +
      `<rect x="6" y="11.5" width="32" height="21" rx="3" fill="url(#ia-pr-payments-card)" ${S}/>` +
      `<rect x="6" y="15.5" width="32" height="4" fill="#b9833f" opacity=".8"/>` +
      `<rect x="10" y="21.5" width="6" height="4.5" rx="1" fill="#ffc93c" ${S1}/>` +
      `<path d="M12 21.5 v4.5 M14 21.5 v4.5" fill="none" stroke="${INK}" stroke-width=".7" opacity=".6"/>` +
      `<path d="M10 29 h4 M16 29 h4 M22 29 h4 M28 29 h4" fill="none" stroke="#8a5a35" stroke-width="1.6" stroke-linecap="round"/>` +
      `<circle cx="32.5" cy="23.5" r="2.4" fill="#ff5d55" opacity=".85"/>` +
      `<circle cx="35.2" cy="23.5" r="2.4" fill="#ffb02e" opacity=".85"/>` +
      `<path d="M28.5 31 L35.5 14" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".45" stroke-linecap="round"/>`,
    lg('ia-pr-payments-card', '#ffd76a', '#e8a01f')
  );
}

function prCi(size: number): string {
  return icon(
    size,
    shadow(22, 39.5, 12) +
      // pipeline loop
      `<path d="M11 22 A11 11 0 0 1 33 22" fill="none" stroke="#38b6ff" stroke-width="2.6" stroke-linecap="round"/>` +
      `<polygon points="33,27 30,20.8 36,20.8" fill="#38b6ff" ${S1}/>` +
      `<path d="M33 22 A11 11 0 0 1 11 22" fill="none" stroke="#2fbf6b" stroke-width="2.6" stroke-linecap="round"/>` +
      `<polygon points="11,17 8,23.2 14,23.2" fill="#2fbf6b" ${S1}/>` +
      // gear
      `<rect x="20.8" y="14.6" width="2.4" height="2.6" rx=".8" fill="#8fa0b5" ${S1}/>` +
      `<rect x="20.8" y="26.8" width="2.4" height="2.6" rx=".8" fill="#8fa0b5" ${S1}/>` +
      `<rect x="14.6" y="20.8" width="2.6" height="2.4" rx=".8" fill="#8fa0b5" ${S1}/>` +
      `<rect x="26.8" y="20.8" width="2.6" height="2.4" rx=".8" fill="#8fa0b5" ${S1}/>` +
      `<circle cx="22" cy="22" r="5.2" fill="#8fa0b5" ${S}/>` +
      `<circle cx="22" cy="22" r="2" fill="#f0f4f8" ${S1}/>`
  );
}

function prSearch(size: number): string {
  return icon(
    size,
    shadow(21, 39, 12) +
      `<rect x="8" y="6" width="19" height="26" rx="2" fill="#ffffff" ${S}/>` +
      `<path d="M11.5 11 h12 M11.5 15 h12 M11.5 19 h8 M11.5 23 h6" fill="none" stroke="#b9c7d6" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="M32.6 29.6 L37.5 34.5" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>` +
      `<path d="M32.6 29.6 L37.5 34.5" fill="none" stroke="#ff8a2a" stroke-width="2.4" stroke-linecap="round"/>` +
      `<circle cx="27.5" cy="24.5" r="7" fill="#cfe8f8" fill-opacity=".88" ${S}/>` +
      `<circle cx="27.5" cy="24.5" r="4.6" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".7"/>` +
      `<path d="M23.8 22.4 a4.6 4.6 0 0 1 2.6 -2.3" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>`
  );
}

function prFeed(size: number): string {
  return icon(
    size,
    shadow(22, 40.5, 10) +
      `<rect x="13.5" y="4" width="17" height="35" rx="3.5" fill="#4a4468" ${S}/>` +
      `<rect x="15.5" y="7" width="13" height="28" rx="1.6" fill="url(#ia-pr-feed-screen)" ${S1}/>` +
      `<path d="M19.5 5.6 h5" fill="none" stroke="#6a6490" stroke-width="1.2" stroke-linecap="round"/>` +
      // scrolling cards
      `<rect x="17" y="9" width="10" height="7" rx="1.2" fill="#ffffff" ${S1}/>` +
      `<rect x="18.2" y="10.2" width="4" height="3.4" rx=".8" fill="#38b6ff"/>` +
      `<path d="M23.4 11 h2.6 M18.2 14.6 h6.5" fill="none" stroke="#b9c7d6" stroke-width="1" stroke-linecap="round"/>` +
      `<rect x="17" y="18" width="10" height="7" rx="1.2" fill="#ffffff" ${S1}/>` +
      `<rect x="18.2" y="19.2" width="4" height="3.4" rx=".8" fill="#ff6fa9"/>` +
      `<path d="M23.4 20 h2.6 M18.2 23.6 h6.5" fill="none" stroke="#b9c7d6" stroke-width="1" stroke-linecap="round"/>` +
      `<rect x="17" y="27" width="10" height="6" rx="1.2" fill="#ffffff" ${S1}/>` +
      `<path d="M18.2 29 h7 M18.2 31.2 h5" fill="none" stroke="#b9c7d6" stroke-width="1" stroke-linecap="round"/>` +
      // floating like
      `<path d="M35 13.4 q-3.4 -2.6 -3.4 -4.8 q0 -1.9 1.75 -1.9 q1.15 0 1.65 1.2 q.5 -1.2 1.65 -1.2 q1.75 0 1.75 1.9 q0 2.2 -3.4 4.8 z" fill="#ff5d55" ${S1}/>`,
    lg('ia-pr-feed-screen', '#e8f4ff', '#cfe0f5')
  );
}

function prAutoscale(size: number): string {
  return icon(
    size,
    shadow(22, 40, 13) +
      // scale-up arrow
      `<path d="M22 8.5 V3.5 M19.5 6 L22 3.5 L24.5 6" fill="none" stroke="#2fbf6b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      // cloud
      `<path d="M12.5 28.5 h19.5 a5.5 5.5 0 0 0 1.8 -10.7 a8.2 8.2 0 0 0 -16 -1.6 a5.9 5.9 0 0 0 -5.3 12.3 z" fill="#f0f4f8" ${S}/>` +
      `<path d="M14.5 25.5 q8 3 15.5 0" fill="none" stroke="#b9c7d6" stroke-width="1.3" opacity=".8" stroke-linecap="round"/>` +
      `<ellipse cx="17" cy="17.5" rx="3.4" ry="1.6" fill="#ffffff" opacity=".9"/>` +
      // expansion arrows
      `<path d="M13.5 32.5 L8 38 M8 34.5 v3.5 h3.5" fill="none" stroke="#38b6ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M30.5 32.5 L36 38 M36 34.5 v3.5 h-3.5" fill="none" stroke="#38b6ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function prRecsys(size: number): string {
  return icon(
    size,
    shadow(22, 39.5, 12) +
      // antenna
      `<line x1="22" y1="8.5" x2="22" y2="5.2" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="22" cy="4" r="1.7" fill="#ff5d55" ${S1}/>` +
      // head + ears
      `<rect x="6.5" y="14" width="3.5" height="8" rx="1.6" fill="#8fa0b5" ${S1}/>` +
      `<rect x="34" y="14" width="3.5" height="8" rx="1.6" fill="#8fa0b5" ${S1}/>` +
      `<rect x="10" y="8.5" width="24" height="19" rx="4.5" fill="url(#ia-pr-recsys-head)" ${S}/>` +
      `<rect x="13" y="12.5" width="18" height="9" rx="3" fill="#1c2f4a" ${S1}/>` +
      // loving eyes: heart + star
      `<path d="M18 19.4 q-2.4 -1.9 -2.4 -3.4 q0 -1.3 1.2 -1.3 q.8 0 1.2 .8 q.4 -.8 1.2 -.8 q1.2 0 1.2 1.3 q0 1.5 -2.4 3.4 z" fill="#ff6fa9" ${S1}/>` +
      `<polygon points="26.5,13.6 27.4,15.8 29.7,15.8 27.8,17.2 28.5,19.4 26.5,18 24.5,19.4 25.2,17.2 23.3,15.8 25.6,15.8" fill="#ffc93c" ${S1}/>` +
      `<path d="M18.5 24.3 h7" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
      // neck + shoulders
      `<rect x="18" y="27.5" width="8" height="3" rx="1" fill="#8fa0b5" ${S1}/>` +
      `<rect x="14" y="30.5" width="16" height="6.5" rx="2.5" fill="#b7c2d0" ${S}/>` +
      `<circle cx="22" cy="33.7" r="1.2" fill="#38b6ff" ${S1}/>`,
    lg('ia-pr-recsys-head', '#e4ebf3', '#b9c4d2')
  );
}

function prWallet(size: number): string {
  return icon(
    size,
    shadow(22, 40, 13) +
      `<circle cx="22" cy="22" r="14" fill="url(#ia-pr-wallet-coin)" ${S}/>` +
      `<circle cx="22" cy="22" r="10.5" fill="none" stroke="#b9833f" stroke-width="1.4" opacity=".8"/>` +
      // invented crypto glyph (₴-ish S with double serifs — not the real logo)
      `<path d="M26 16.8 C20 14.8 17.5 18 19.5 20.6 C21 22.6 25 21.6 26 24 C27.3 27 22.5 29.5 17.5 27.2" fill="none" stroke="#8a5a35" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M20.5 13.8 v3 M23.5 13.8 v3 M20.5 27.2 v3 M23.5 27.2 v3" fill="none" stroke="#8a5a35" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M13 16.5 a10.8 10.8 0 0 1 5 -4.8" fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>` +
      `<path d="M37 6.5 l.9 2.1 2.1 .9 -2.1 .9 -.9 2.1 -.9 -2.1 -2.1 -.9 2.1 -.9 z" fill="#ffe9a8" ${S1}/>`,
    lg('ia-pr-wallet-coin', '#ffd76a', '#e8a01f')
  );
}

function prMetaverse(size: number): string {
  return icon(
    size,
    shadow(22, 38.5, 13) +
      // straps
      `<path d="M8.5 19.5 C4.8 19.5 4.8 25.5 8.5 25.5" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M8.7 19.7 C5.4 19.7 5.4 25.3 8.7 25.3" fill="none" stroke="#553a60" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M35.5 19.5 C39.2 19.5 39.2 25.5 35.5 25.5" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M35.3 19.7 C38.6 19.7 38.6 25.3 35.3 25.3" fill="none" stroke="#553a60" stroke-width="1.6" stroke-linecap="round"/>` +
      // headset body with nose notch
      `<rect x="19" y="12.6" width="6" height="2.4" rx="1" fill="#553a60" ${S1}/>` +
      `<path d="M11 14.5 h22 a4 4 0 0 1 4 4 v7 a4 4 0 0 1 -4 4 h-6.5 q-1.6 -3.2 -4.5 -3.2 t-4.5 3.2 h-6.5 a4 4 0 0 1 -4 -4 v-7 a4 4 0 0 1 4 -4 z" fill="url(#ia-pr-meta-body)" ${S}/>` +
      `<path d="M12.5 17.3 h6" fill="none" stroke="#c9a2f0" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>` +
      // glowing lenses
      `<circle cx="16" cy="21.5" r="4.6" fill="#38e8ff" opacity=".3"/>` +
      `<circle cx="28" cy="21.5" r="4.6" fill="#38e8ff" opacity=".3"/>` +
      `<circle cx="16" cy="21.5" r="3.1" fill="#38e8ff" ${S1}/>` +
      `<circle cx="28" cy="21.5" r="3.1" fill="#38e8ff" ${S1}/>` +
      `<circle cx="15" cy="20.6" r="1" fill="#d8fbff"/>` +
      `<circle cx="27" cy="20.6" r="1" fill="#d8fbff"/>`,
    lg('ia-pr-meta-body', '#9a5ce8', '#6f3ec2')
  );
}

function prAgi(size: number): string {
  return icon(
    size,
    // luminous halo (layered circles, no filters)
    `<circle cx="22" cy="20.5" r="15" fill="#ffc93c" opacity=".16"/>` +
      `<circle cx="22" cy="20.5" r="11" fill="#ffc93c" opacity=".14"/>` +
      shadow(22, 39.5, 12) +
      // brain lobes
      `<path d="M21 10 C14 8 9.5 13 11 18 C8.5 20 9.5 25 13 26.5 C13.5 30 18 31.5 21 29.5 z" fill="url(#ia-pr-agi-brain)" ${S}/>` +
      `<path d="M23 10 C30 8 34.5 13 33 18 C35.5 20 34.5 25 31 26.5 C30.5 30 26 31.5 23 29.5 z" fill="#ff87b5" ${S}/>` +
      `<line x1="22" y1="10.5" x2="22" y2="29.5" stroke="${INK}" stroke-width="1.2" opacity=".5"/>` +
      `<path d="M14 15.5 q3 1 5 -1 M13.5 21.5 q3.5 1.5 5.5 0 M26 14.5 q2.5 2 5 1 M25.5 21 q3 1.5 5.5 .5" fill="none" stroke="#d1508a" stroke-width="1.2" stroke-linecap="round"/>` +
      // circuit tails
      `<path d="M17 30.5 v3.5 h-4 M22 31 v4.5 M27 30.5 v3.5 h4" fill="none" stroke="#ffb02e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="12" cy="34" r="1.2" fill="#ffc93c" ${S1}/>` +
      `<circle cx="22" cy="36.5" r="1.2" fill="#ffc93c" ${S1}/>` +
      `<circle cx="32" cy="34" r="1.2" fill="#ffc93c" ${S1}/>` +
      `<path d="M36.5 6 l.8 1.9 1.9 .8 -1.9 .8 -.8 1.9 -.8 -1.9 -1.9 -.8 1.9 -.8 z" fill="#fff3c4" ${S1}/>`,
    lg('ia-pr-agi-brain', '#ff9ec4', '#ff6fa9')
  );
}

/** Friendly "?" carton for unknown ids. */
function fallbackIcon(size: number): string {
  return icon(
    size,
    shadow(22, 39.5, 13) +
      `<rect x="9" y="16" width="26" height="20" rx="1.5" fill="#dfa35f" ${S}/>` +
      `<rect x="28" y="17" width="6" height="18" fill="#c9894a"/>` +
      `<path d="M9 16 L14 9 L26 10 L24 16 z" fill="#e8b57a" ${S}/>` +
      `<path d="M35 16 L31 9.5 L25 10.5 L27 16 z" fill="#cf9350" ${S}/>` +
      `<rect x="20" y="16" width="4" height="20" fill="#f0e0b0" opacity=".85" ${S1}/>` +
      `<text x="22" y="30.5" text-anchor="middle" font-size="10" font-weight="800" fill="${INK}">?</text>`
  );
}

// ---------------------------------------------------------------------------
// Office props for owned upgrades (ground-floor wall band, h ≤ 56)
// ---------------------------------------------------------------------------

function ppCoffee(): string {
  return prop(
    48,
    54,
    shadow(24, 51, 20, 2.8) +
      // steam
      `<path d="M13 6.5 q1.4 -1.7 .2 -3.4" fill="none" stroke="#b9c7d6" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="M19 6.5 q-1.4 -1.8 .2 -3.5" fill="none" stroke="#b9c7d6" stroke-width="1.2" stroke-linecap="round"/>` +
      // low cabinet + counter
      `<rect x="4" y="30" width="40" height="20" rx="2" fill="url(#ia-pp-coffee-cab)" ${S}/>` +
      `<line x1="24" y1="32" x2="24" y2="48" stroke="${INK}" stroke-width="1" opacity=".5"/>` +
      `<circle cx="21.5" cy="40" r="1.1" fill="#6b4a30" ${S1}/>` +
      `<circle cx="26.5" cy="40" r="1.1" fill="#6b4a30" ${S1}/>` +
      `<rect x="2.5" y="27" width="43" height="4" rx="1.6" fill="#e8b57a" ${S}/>` +
      // espresso machine
      `<rect x="7" y="10" width="18" height="14" rx="2" fill="url(#ia-pp-coffee-chrome)" ${S}/>` +
      `<rect x="8.5" y="7.5" width="15" height="3.5" rx="1.4" fill="#d5dde8" ${S1}/>` +
      `<line x1="9.6" y1="12.5" x2="9.6" y2="20.5" stroke="#ffffff" stroke-width="1.4" opacity=".7" stroke-linecap="round"/>` +
      `<circle cx="13.5" cy="15.5" r="2.2" fill="#fff8ec" ${S1}/>` +
      `<path d="M13.5 15.5 L14.8 14.5" fill="none" stroke="#ff5d55" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="19.5" cy="13" r="1" fill="#2fbf6b" ${S1}/>` +
      `<circle cx="22" cy="13" r="1" fill="#ff5d55" ${S1}/>` +
      `<rect x="12" y="24" width="8" height="2.6" fill="#8fa0b5" ${S1}/>` +
      `<path d="M20 25.2 h5" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      // red cup on the counter + stack of cups
      `<rect x="28" y="22.8" width="5.5" height="4.2" rx="1" fill="#ff5d55" ${S1}/>` +
      `<path d="M33.5 23.8 a1.6 1.6 0 0 1 0 2.2" fill="none" stroke="${INK}" stroke-width="1"/>` +
      `<rect x="35" y="23.5" width="7" height="3.5" rx="1" fill="#fff8ec" ${S1}/>` +
      `<rect x="35.5" y="20" width="6" height="3.5" rx="1" fill="#f6ecd9" ${S1}/>` +
      `<rect x="36" y="16.5" width="5" height="3.5" rx="1" fill="#fff8ec" ${S1}/>`,
    lg('ia-pp-coffee-cab', '#c9894a', '#a8703a') + lg('ia-pp-coffee-chrome', '#f2f6fa', '#b9c4d2')
  );
}

function ppFiber(): string {
  const units = [7, 14, 21, 28, 35, 42]
    .map(
      (y, i) =>
        `<rect x="6" y="${y}" width="14" height="5" rx="1" fill="#4a4468" ${S1}/>` +
        `<path d="M7.5 ${y + 1.6} h5 M7.5 ${y + 3.4} h5" fill="none" stroke="#6a6490" stroke-width=".9" stroke-linecap="round"/>` +
        `<circle cx="15.5" cy="${y + 2.5}" r=".9" fill="${i % 2 ? '#38e8ff' : '#2fbf6b'}"/>` +
        `<circle cx="18" cy="${y + 2.5}" r=".9" fill="${i % 3 === 1 ? '#ffb02e' : '#2fbf6b'}"/>`
    )
    .join('');
  return prop(
    26,
    56,
    shadow(13, 53.5, 10, 2.4) +
      glowLine('M13 4 C13 1.5 17 1 19.5 2.5', '#38e8ff', 1.3) +
      `<rect x="5" y="49" width="4" height="4" fill="#241d33" ${S1}/>` +
      `<rect x="17" y="49" width="4" height="4" fill="#241d33" ${S1}/>` +
      `<rect x="4" y="4" width="18" height="46" rx="2" fill="#3a3148" ${S}/>` +
      units
  );
}

function ppAgile(): string {
  return prop(
    46,
    56,
    shadow(23, 53.5, 17) +
      // rolling frame
      `<line x1="14" y1="47.5" x2="14" y2="40" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<line x1="32" y1="47.5" x2="32" y2="40" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<line x1="14" y1="44.5" x2="32" y2="44.5" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="14" cy="50.5" r="3" fill="#4a4468" ${S1}/>` +
      `<circle cx="32" cy="50.5" r="3" fill="#4a4468" ${S1}/>` +
      `<circle cx="14" cy="50.5" r="1" fill="#b9c4d2"/>` +
      `<circle cx="32" cy="50.5" r="1" fill="#b9c4d2"/>` +
      // board
      `<rect x="4" y="6" width="38" height="34" rx="2.5" fill="#fff8ec" ${S}/>` +
      `<path d="M6.5 6 h33 a2.5 2.5 0 0 1 2.5 2.5 v3.5 h-38 v-3.5 a2.5 2.5 0 0 1 2.5 -2.5 z" fill="#ff8a2a" ${S1}/>` +
      `<path d="M16.7 13.5 v25 M29.3 13.5 v25" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>` +
      // post-its
      `<rect x="7.5" y="15" width="5.5" height="5.5" fill="#ffc93c" ${S1}/>` +
      `<rect x="9" y="22.5" width="5.5" height="5.5" fill="#ff6fa9" ${S1}/>` +
      `<rect x="7.5" y="30" width="5.5" height="5.5" fill="#38b6ff" ${S1}/>` +
      `<rect x="19.5" y="16" width="5.5" height="5.5" fill="#7ac95e" ${S1}/>` +
      `<rect x="20.5" y="24.5" width="5.5" height="5.5" fill="#ffb02e" ${S1}/>` +
      `<rect x="32" y="15" width="5.5" height="5.5" fill="#2fbf6b" ${S1}/>` +
      `<path d="M33.3 17.7 l1.3 1.3 2.2 -2.6" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="33" y="23" width="5.5" height="5" fill="#ff8a5c" ${S1}/>` +
      `<path d="M8.5 16.8 h3.2 M10 24.3 h3.2 M20.5 17.8 h3.2 M21.5 26.3 h3.2" fill="none" stroke="${INK}" stroke-width=".8" opacity=".4" stroke-linecap="round"/>` +
      // sprint timer
      `<line x1="41.5" y1="10.5" x2="42.5" y2="13.5" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
      `<rect x="41.7" y="13" width="1.6" height="1.6" fill="#6a7486" ${S1}/>` +
      `<circle cx="42.5" cy="17.5" r="3" fill="#f0f4f8" ${S1}/>` +
      `<path d="M42.5 17.5 L42.5 15.7 M42.5 17.5 L43.8 18.3" fill="none" stroke="#ff5d55" stroke-width="1" stroke-linecap="round"/>`
  );
}

function ppHr(): string {
  return prop(
    34,
    56,
    shadow(17, 53.5, 13) +
      // plant
      `<path d="M11.5 9.5 C9.5 7.5 9 4.8 10 3.2 C11.8 4.6 12.3 7.5 11.5 9.5 z" fill="#2fbf6b" ${S1}/>` +
      `<path d="M11.7 9.5 C13.7 7.5 14.2 4.8 13.2 3.2 C11.4 4.6 10.9 7.5 11.7 9.5 z" fill="#7ac95e" ${S1}/>` +
      `<polygon points="8.5,9.5 14.5,9.5 13.8,13.8 9.2,13.8" fill="#e8734f" ${S1}/>` +
      // photo frame
      `<rect x="19.5" y="7.5" width="8.5" height="6.5" rx="1" fill="#b9833f" ${S1}/>` +
      `<rect x="21" y="8.8" width="5.5" height="4" fill="#9fd8ff" ${S1}/>` +
      `<circle cx="22.8" cy="10.2" r=".8" fill="#ffc93c"/>` +
      `<path d="M21.2 12.8 q1.6 -1.8 3.2 0" fill="none" stroke="#2fbf6b" stroke-width="1" stroke-linecap="round"/>` +
      // filing cabinet
      `<rect x="5" y="14" width="24" height="38" rx="2" fill="url(#ia-pp-hr-body)" ${S}/>` +
      `<rect x="7.5" y="16.5" width="19" height="9.5" rx="1.2" fill="#b7c2d0" ${S1}/>` +
      `<rect x="7.5" y="28.5" width="19" height="9.5" rx="1.2" fill="#b7c2d0" ${S1}/>` +
      `<rect x="7.5" y="40.5" width="19" height="9.5" rx="1.2" fill="#b7c2d0" ${S1}/>` +
      `<rect x="13.5" y="18.4" width="7" height="2" rx="1" fill="#6a7486" ${S1}/>` +
      `<rect x="13.5" y="30.4" width="7" height="2" rx="1" fill="#6a7486" ${S1}/>` +
      `<rect x="13.5" y="42.4" width="7" height="2" rx="1" fill="#6a7486" ${S1}/>` +
      `<rect x="14.2" y="21.6" width="5.6" height="2" fill="#fff8ec" ${S1}/>` +
      // heart sticker
      `<path d="M23.5 36.6 q-2.2 -1.7 -2.2 -3 q0 -1.1 1.1 -1.1 q.7 0 1.1 .7 q.4 -.7 1.1 -.7 q1.1 0 1.1 1.1 q0 1.3 -2.2 3 z" fill="#ff6fa9" ${S1}/>`,
    lg('ia-pp-hr-body', '#9db0c4', '#7f92a8')
  );
}

function ppChairs(): string {
  return prop(
    36,
    52,
    shadow(18, 49.5, 13) +
      // base + wheels (profile)
      `<path d="M18 44.5 L8 47.5 M18 44.5 L28 47.5 M18 44.5 v3" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<circle cx="8" cy="48.5" r="2" fill="#4a4468" ${S1}/>` +
      `<circle cx="28" cy="48.5" r="2" fill="#4a4468" ${S1}/>` +
      `<circle cx="18" cy="49" r="2" fill="#4a4468" ${S1}/>` +
      `<rect x="16.8" y="38" width="2.4" height="7" fill="#8fa0b5" ${S1}/>` +
      // headrest
      `<rect x="22" y="11" width="2" height="2.6" fill="#3a3148" ${S1}/>` +
      `<rect x="19.5" y="6.5" width="8.5" height="4.8" rx="2.2" fill="#4a4468" ${S}/>` +
      // curved backrest with lumbar bulge (facing left)
      `<path d="M24 34.5 C22.5 29.5 21.8 26.5 23 22 C24 18 24 15.5 23.2 13 L28 12 C29.2 16.5 29.2 22 28.2 26.5 C27.5 29.5 27.7 32.5 28.6 34.5 z" fill="url(#ia-pp-chairs-back)" ${S}/>` +
      `<ellipse cx="23.4" cy="25.5" rx="1.9" ry="3.1" fill="#3a6fd0" ${S1}/>` +
      // armrest
      tube('M15 34 v-4.6', '#6a7486', 1.2) +
      `<rect x="11.5" y="27.4" width="8" height="2.4" rx="1.2" fill="#6a7486" ${S1}/>` +
      // seat + cushion
      `<rect x="8.5" y="34" width="19" height="4.6" rx="2.2" fill="#4f8df9" ${S}/>` +
      `<rect x="10" y="30" width="9" height="4.8" rx="2.1" fill="#ffb02e" ${S1}/>` +
      `<circle cx="14.5" cy="32.4" r=".7" fill="#e8a01f"/>`,
    lg('ia-pp-chairs-back', '#4f8df9', '#3a6fd0')
  );
}

/** Generic "?" carton prop for unknown upgrade ids. */
function fallbackProp(): string {
  return prop(
    40,
    34,
    shadow(20, 31.5, 15) +
      `<rect x="7" y="12" width="26" height="18" rx="1.5" fill="#dfa35f" ${S}/>` +
      `<rect x="26" y="13" width="6" height="16" fill="#c9894a"/>` +
      `<path d="M7 12 L12 5 L24 6 L22 12 z" fill="#e8b57a" ${S}/>` +
      `<path d="M33 12 L29 5.5 L23 6.5 L25 12 z" fill="#cf9350" ${S}/>` +
      `<rect x="18" y="12" width="4" height="18" fill="#f0e0b0" opacity=".85" ${S1}/>` +
      `<text x="20" y="25.5" text-anchor="middle" font-size="9" font-weight="800" fill="${INK}">?</text>`
  );
}

// ---------------------------------------------------------------------------
// Public API (memoised)
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();

function memo(key: string, build: () => string): string {
  let svg = cache.get(key);
  if (svg === undefined) {
    svg = build();
    cache.set(key, svg);
  }
  return svg;
}

const STATION_ART: Record<string, (size: number) => string> = {
  basic: stBasic,
  standing: stStanding,
  dual: stDual,
  corner: stCorner,
};

const UPGRADE_ART: Record<string, (size: number) => string> = {
  coffee: upCoffee,
  fiber: upFiber,
  agile: upAgile,
  hr: upHr,
  chairs: upChairs,
  marketing: upMarketing,
};

const PROJECT_ART: Record<string, (size: number) => string> = {
  landing: prLanding,
  todo: prTodo,
  api: prApi,
  payments: prPayments,
  ci: prCi,
  search: prSearch,
  feed: prFeed,
  autoscale: prAutoscale,
  recsys: prRecsys,
  wallet: prWallet,
  metaverse: prMetaverse,
  agi: prAgi,
};

const UPGRADE_PROPS: Record<string, () => string> = {
  coffee: ppCoffee,
  fiber: ppFiber,
  agile: ppAgile,
  hr: ppHr,
  chairs: ppChairs,
};

/** Square shop illustration for a workstation. ids: basic|standing|dual|corner */
export function stationArt(id: string, size = 44): string {
  return memo(`st:${id}:${size}`, () => (STATION_ART[id] ?? fallbackIcon)(size));
}

/** Square shop illustration for an upgrade. ids: coffee|fiber|agile|hr|chairs|marketing */
export function upgradeArt(id: string, size = 44): string {
  return memo(`up:${id}:${size}`, () => (UPGRADE_ART[id] ?? fallbackIcon)(size));
}

/** Square icon for a project (12 ids, see data.ts; unknown → "?" carton). */
export function projectArt(id: string, size = 44): string {
  return memo(`pr:${id}:${size}`, () => (PROJECT_ART[id] ?? fallbackIcon)(size));
}

/** Standalone office prop for one owned upgrade (wall band, height ≤ 56 px). */
export function upgradeProp(id: string): string {
  return memo(`pp:${id}`, () => (UPGRADE_PROPS[id] ?? fallbackProp)());
}
