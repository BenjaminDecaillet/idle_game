import type { PersonaLook } from './persona';

/**
 * Painted, semi-realistic character bust portraits — the "gacha card art"
 * counterpart to the flat cartoon personas in persona.ts (visual direction:
 * Idle Angels-style painted busts: realistic head proportions, layered skin
 * shading, glossy hair with strand highlights, detailed irises, key + rim
 * lighting over a dark vignetted card background).
 *
 * Same hard constraints as every asset in this game:
 *  - NO SVG <filter> (feGaussianBlur & co are too expensive on mobile) —
 *    every "soft" edge here is faked with layered radial/linear gradients
 *    and low-opacity overlay shapes.
 *  - Every gradient/clipPath id is prefixed with a variant-unique uid
 *    (`pb` + FNV-1a hash of all visual inputs) because many portraits are
 *    inlined into the same DOM at once.
 *  - Pure string building: no DOM, no Math.random(), no Date. Deterministic
 *    output for a given (look, accessory, size) — and memoised, since there
 *    are finitely many variants.
 *
 * Canvas is a 64x64 viewBox: head skull spans x 22.2..41.8, top of skull at
 * y 11.8, chin at y 38.5, neck to y ~44, shoulders fill the bottom edge.
 */

export type BustAccessory =
  | 'none'
  | 'cap'
  | 'cap-back'
  | 'glasses'
  | 'sunglasses'
  | 'headphones'
  | 'beret'
  | 'crown'
  | 'halo';

/* ----------------------------------------------------------------------
 * Small color helpers (all palettes in persona.ts are #rrggbb).
 * ---------------------------------------------------------------------- */

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

/** Linear mix of two #rrggbb colors, t in [0,1] toward `b`. */
function mix(a: string, b: string, t: number): string {
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const v = Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t);
    out += Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  }
  return out;
}

/** FNV-1a — same scheme persona.ts uses for seeds. */
function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Round to 2 decimals so computed coordinates stay compact in the SVG. */
function N(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Safe modulo into [0,m) — tolerates negative / non-finite input. */
function wrap(n: number, m: number): number {
  const t = Math.trunc(Number.isFinite(n) ? n : 0) % m;
  return t < 0 ? t + m : t;
}

/* ----------------------------------------------------------------------
 * Derived paint palette: every shade is computed from the three input hex
 * colors so all 9 skins / 14 hair colors produce coherent shading.
 * ---------------------------------------------------------------------- */

/** Deterministic iris palette; index derived from hair color + eye style. */
const IRIS_COLORS = ['#5b3b1f', '#7a5230', '#33628f', '#2f6f55', '#4a4f86', '#5d6b33'];

interface Pal {
  skin: string;
  skinLight: string;
  skinShadow: string;
  skinDeep: string;
  blush: string;
  freckle: string;
  lipUpper: string;
  lipLower: string;
  lipLine: string;
  mouthIn: string;
  teeth: string;
  hair: string;
  hairDark: string;
  hairLight: string;
  fhLight: string;
  shirtLight: string;
  shirtDark: string;
  iris: string;
  irisLight: string;
  irisDark: string;
  brow: string;
  lash: string;
  rim: string;
}

function palette(look: PersonaLook): Pal {
  const { skin, hair, shirt } = look;
  const iris = IRIS_COLORS[wrap(hashKey(hair) + look.eyeStyle, IRIS_COLORS.length)];
  return {
    skin,
    skinLight: mix(skin, '#fff3e2', 0.42),
    skinShadow: mix(skin, '#8a4550', 0.34),
    skinDeep: mix(skin, '#57293c', 0.52),
    blush: mix(skin, '#e0606a', 0.5),
    freckle: mix(skin, '#5f3320', 0.55),
    lipUpper: mix(skin, '#9c4652', 0.55),
    lipLower: mix(skin, '#c9707d', 0.42),
    lipLine: mix(skin, '#4a1f2e', 0.62),
    mouthIn: '#57262f',
    teeth: '#f6f0e6',
    hair,
    hairDark: mix(hair, '#191024', 0.52),
    hairLight: mix(hair, '#ffefd2', 0.38),
    fhLight: mix(hair, '#ffefd2', 0.28),
    shirtLight: mix(shirt, '#ffffff', 0.32),
    shirtDark: mix(shirt, '#151024', 0.45),
    iris,
    irisLight: mix(iris, '#eaf4ff', 0.45),
    irisDark: mix(iris, '#0c0a14', 0.55),
    brow: mix(hair, '#241428', 0.3),
    lash: '#241722',
    rim: '#b9d2ff',
  };
}

/* ----------------------------------------------------------------------
 * Shared geometry
 * ---------------------------------------------------------------------- */

/** Realistic skull: rounded cranium, tapered cheeks, defined jaw + chin. */
const HEAD_D =
  'M22.2 24.5 q0 -12.7 9.8 -12.7 q9.8 0 9.8 12.7 ' +
  'q0 6.2 -2.9 10.2 q-2.7 3.8 -6.9 3.8 q-4.2 0 -6.9 -3.8 q-2.9 -4 -2.9 -10.2 z';

/** Mirror wrapper around the face axis (x = 32) for symmetric parts. */
function mirrored(inner: string): string {
  return `<g transform="translate(64 0) scale(-1 1)">${inner}</g>`;
}

function strand(d: string, col: string, w: number, o: number): string {
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
}

/* ----------------------------------------------------------------------
 * Eyes
 * ---------------------------------------------------------------------- */

/** One open eye. mode: 0 neutral, 1 friendly (squinted warm), 2 wide alert. */
function openEye(uid: string, p: Pal, cx: number, side: -1 | 1, mode: number): string {
  const cy = 26.3;
  const hw = mode === 2 ? 2.6 : 2.35;
  const up = mode === 2 ? 2.45 : 1.95;
  const dn = mode === 1 ? 1.1 : 1.55;
  const irisR = mode === 2 ? 1.32 : 1.52;
  const icx = N(cx + side * 0.12);
  const icy = mode === 2 ? N(cy - 0.42) : N(cy - 0.12);
  const id = `${uid}-e${side < 0 ? 'l' : 'r'}`;
  const shape = `M${N(cx - hw)} ${cy} Q${cx} ${N(cy - up)} ${N(cx + hw)} ${cy} Q${cx} ${N(cy + dn)} ${N(cx - hw)} ${cy} Z`;
  // Friendly eyes get the lower lid pushed up over the iris (warm squint).
  const squint =
    mode === 1
      ? `<path d="M${N(cx - hw)} ${N(cy + 0.1)} Q${cx} ${N(cy + 1.8)} ${N(cx + hw)} ${N(cy + 0.1)} L${N(cx + hw)} ${N(cy + 2.2)} L${N(cx - hw)} ${N(cy + 2.2)} Z" fill="${p.skin}" opacity="0.92"/>`
      : '';
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#f4eee6"/>
    <g clip-path="url(#${id})">
      <path d="M${N(cx - hw)} ${N(cy - 0.3)} Q${cx} ${N(cy - up - 0.5)} ${N(cx + hw)} ${N(cy - 0.3)} L${N(cx + hw)} ${N(cy - up - 1)} L${N(cx - hw)} ${N(cy - up - 1)} Z" fill="${p.skinShadow}" opacity="0.25"/>
      <circle cx="${icx}" cy="${icy}" r="${irisR}" fill="url(#${uid}-irisg)"/>
      <circle cx="${icx}" cy="${icy}" r="${irisR}" fill="none" stroke="${p.irisDark}" stroke-width="0.22" opacity="0.8"/>
      <circle cx="${icx}" cy="${icy}" r="0.66" fill="#191019"/>
      <circle cx="${N(icx - 0.5)}" cy="${N(icy - 0.5)}" r="0.36" fill="#ffffff" opacity="0.95"/>
      <circle cx="${N(icx + 0.44)}" cy="${N(icy + 0.4)}" r="0.17" fill="#ffffff" opacity="0.55"/>
      ${squint}
    </g>
    <path d="M${N(cx - hw - 0.25)} ${N(cy + 0.05)} Q${cx} ${N(cy - up - 0.35)} ${N(cx + hw + 0.25)} ${N(cy - 0.05)}" fill="none" stroke="${p.lash}" stroke-width="0.55" stroke-linecap="round" opacity="0.9"/>
    <path d="M${N(cx + side * (hw + 0.2))} ${N(cy - 0.15)} l${N(side * 0.7)} -0.55" stroke="${p.lash}" stroke-width="0.5" stroke-linecap="round" opacity="0.85" fill="none"/>
    <path d="M${N(cx - hw + 0.5)} ${N(cy + dn + 0.35)} Q${cx} ${N(cy + dn + 0.85)} ${N(cx + hw - 0.3)} ${N(cy + dn + 0.1)}" fill="none" stroke="${p.skinShadow}" stroke-width="0.4" opacity="0.4"/>
    <path d="M${N(cx - hw + 0.3)} ${N(cy - up - 0.55)} Q${cx} ${N(cy - up - 1.15)} ${N(cx + hw - 0.1)} ${N(cy - up - 0.45)}" fill="none" stroke="${p.skinShadow}" stroke-width="0.5" opacity="0.4"/>`;
}

/** Closed eye — content soft lid with lashes (also used for the wink). */
function closedEye(p: Pal, cx: number, side: -1 | 1): string {
  const cy = 26.4;
  return `<path d="M${N(cx - 2.3)} ${N(cy - 0.3)} Q${cx} ${N(cy + 1.6)} ${N(cx + 2.3)} ${N(cy - 0.3)}" fill="none" stroke="${p.skinShadow}" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>
    <path d="M${N(cx - 2.3)} ${N(cy - 0.4)} Q${cx} ${N(cy + 1.5)} ${N(cx + 2.3)} ${N(cy - 0.4)}" fill="none" stroke="${p.lash}" stroke-width="0.65" stroke-linecap="round" opacity="0.9"/>
    <path d="M${N(cx - 1.5)} ${N(cy + 0.55)} l-0.35 0.75 M${cx} ${N(cy + 0.85)} l0 0.8 M${N(cx + 1.5)} ${N(cy + 0.55)} l0.35 0.75" stroke="${p.lash}" stroke-width="0.42" stroke-linecap="round" opacity="0.8" fill="none"/>
    <path d="M${N(cx - 1.9)} ${N(cy - 1.5)} Q${cx} ${N(cy - 2.2)} ${N(cx + 1.9)} ${N(cy - 1.4)}" fill="none" stroke="${p.skinShadow}" stroke-width="0.5" opacity="0.4"/>
    <path d="M${N(cx + side * 2.4)} ${N(cy - 0.5)} l${N(side * 0.6)} -0.4" stroke="${p.lash}" stroke-width="0.45" stroke-linecap="round" opacity="0.8" fill="none"/>`;
}

function eyesArt(uid: string, p: Pal, eyeStyle: number): string {
  const L = 27.7;
  const R = 36.3;
  switch (eyeStyle) {
    case 3: // content closed
      return closedEye(p, L, -1) + closedEye(p, R, 1);
    case 4: // wink: left open, right closed
      return openEye(uid, p, L, -1, 0) + closedEye(p, R, 1);
    default:
      return openEye(uid, p, L, -1, eyeStyle) + openEye(uid, p, R, 1, eyeStyle);
  }
}

/* ----------------------------------------------------------------------
 * Brows, nose, mouth, facial hair, blemish
 * ---------------------------------------------------------------------- */

function browsArt(p: Pal, style: number): string {
  let d: string;
  let extra = '';
  if (style === 1) {
    // raised arch
    d = 'M24.9 22.7 Q26.9 20.2 30.2 21.2 L30.3 22.1 Q27.4 21.4 25.2 23.4 Z';
  } else if (style === 2) {
    // furrowed: inner end angled down, glabella creases
    d = 'M25 22.1 Q27.6 21.6 30.2 23.3 L30 24.1 Q27.5 22.8 25.1 23 Z';
    extra = `<path d="M31.3 23.3 l-0.35 1.6 M32.7 23.3 l0.35 1.6" stroke="${p.skinShadow}" stroke-width="0.45" opacity="0.4" fill="none"/>`;
  } else {
    // straight-soft
    d = 'M24.9 22.9 Q27.5 21.4 30.2 22.1 L30.2 23 Q27.6 22.5 25.2 23.7 Z';
  }
  const one =
    `<path d="${d}" fill="${p.brow}" opacity="0.92"/>` +
    `<path d="${d}" fill="none" stroke="${p.hairLight}" stroke-width="0.2" opacity="0.3"/>`;
  return one + mirrored(one) + extra;
}

function noseArt(p: Pal): string {
  return `<path d="M31.1 25.9 Q30.5 29 30.2 30.7 Q30 31.7 30.7 32.1" fill="none" stroke="${p.skinShadow}" stroke-width="0.6" stroke-linecap="round" opacity="0.42"/>
    <path d="M32.9 25.9 Q33.3 28.8 33.6 30.6" fill="none" stroke="${p.skinLight}" stroke-width="0.7" stroke-linecap="round" opacity="0.4"/>
    <path d="M30.1 31.9 Q30.6 32.7 31.4 32.7 M33.9 31.9 Q33.4 32.7 32.6 32.7" fill="none" stroke="${p.skinDeep}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/>
    <ellipse cx="32" cy="30.9" rx="0.9" ry="0.55" fill="#ffffff" opacity="0.22"/>
    <path d="M30.7 32.8 Q32 33.5 33.3 32.8" fill="none" stroke="${p.skinShadow}" stroke-width="0.7" opacity="0.25"/>`;
}

function mouthArt(p: Pal, style: number): string {
  const naso = `<path d="M28.6 32.4 Q27.6 33.7 27.9 35.2 M35.4 32.4 Q36.4 33.7 36.1 35.2" stroke="${p.skinShadow}" stroke-width="0.5" opacity="0.22" fill="none" stroke-linecap="round"/>`;
  const underLip = (y: number): string =>
    `<path d="M30.2 ${y} Q32 ${N(y + 0.8)} 33.8 ${y}" stroke="${p.skinShadow}" stroke-width="0.6" opacity="0.28" fill="none"/>`;
  const upperLip = `<path d="M28.8 34 Q30.3 32.9 31.6 33.25 Q32 32.95 32.4 33.25 Q33.7 32.9 35.2 34 Q32 35 28.8 34 Z" fill="${p.lipUpper}" opacity="0.8"/>`;
  switch (style) {
    case 0: // soft smile
      return (
        naso +
        upperLip +
        `<path d="M29.2 34.3 Q32 36 34.8 34.3 Q34 36.5 32 36.5 Q30 36.5 29.2 34.3 Z" fill="${p.lipLower}" opacity="0.85"/>
         <path d="M28.7 33.9 Q32 35.8 35.3 33.9" fill="none" stroke="${p.lipLine}" stroke-width="0.6" stroke-linecap="round" opacity="0.85"/>
         <ellipse cx="32" cy="35.45" rx="1.3" ry="0.45" fill="#ffffff" opacity="0.3"/>` +
        underLip(37)
      );
    case 1: // big grin with teeth
      return (
        naso +
        `<path d="M28.4 33.6 Q32 34.4 35.6 33.6 Q35 37.2 32 37.2 Q29 37.2 28.4 33.6 Z" fill="${p.mouthIn}"/>
         <path d="M28.8 33.8 Q32 34.5 35.2 33.8 L35 35.3 Q32 35.9 29 35.3 Z" fill="${p.teeth}"/>
         <path d="M28.3 33.5 Q32 34.4 35.7 33.5" fill="none" stroke="${p.lipLine}" stroke-width="0.55" stroke-linecap="round" opacity="0.9"/>
         <path d="M29 36.6 Q32 38.5 35 36.6 Q33.8 38.3 32 38.3 Q30.2 38.3 29 36.6 Z" fill="${p.lipLower}" opacity="0.75"/>
         <ellipse cx="32" cy="37.4" rx="1.2" ry="0.4" fill="#ffffff" opacity="0.25"/>`
      );
    case 2: // neutral
      return (
        upperLip +
        `<path d="M29.3 34.3 Q32 34.95 34.7 34.3" fill="none" stroke="${p.lipLine}" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/>
         <path d="M29.7 34.6 Q32 35.9 34.3 34.6 Q33.3 36.2 32 36.2 Q30.7 36.2 29.7 34.6 Z" fill="${p.lipLower}" opacity="0.8"/>
         <ellipse cx="32" cy="35.3" rx="1.1" ry="0.4" fill="#ffffff" opacity="0.25"/>` +
        underLip(36.8)
      );
    case 3: // slightly open
      return (
        `<path d="M30.1 33.9 Q32 33.3 33.9 33.9 Q33.6 35.9 32 35.9 Q30.4 35.9 30.1 33.9 Z" fill="${p.mouthIn}"/>
         <path d="M30.4 34 Q32 33.6 33.6 34 L33.5 34.7 Q32 34.4 30.5 34.7 Z" fill="${p.teeth}" opacity="0.9"/>
         <path d="M30 33.8 Q32 33.15 34 33.8" fill="none" stroke="${p.lipLine}" stroke-width="0.55" stroke-linecap="round" opacity="0.8"/>
         <path d="M30.4 36 Q32 36.9 33.6 36 Q32.9 36.9 32 36.9 Q31.1 36.9 30.4 36 Z" fill="${p.lipLower}" opacity="0.8"/>` +
        underLip(37.2)
      );
    case 4: // open laugh with tongue
      return (
        naso +
        `<path d="M28.6 33.4 Q32 34.2 35.4 33.4 Q35 38 32 38 Q29 38 28.6 33.4 Z" fill="${p.mouthIn}"/>
         <path d="M29 33.6 Q32 34.3 35 33.6 L34.85 34.75 Q32 35.3 29.15 34.75 Z" fill="${p.teeth}"/>
         <path d="M30.3 36.2 Q32 37.7 33.7 36.2 Q33.4 38 32 38 Q30.6 38 30.3 36.2 Z" fill="#c2606b"/>
         <path d="M28.5 33.3 Q32 34.2 35.5 33.3" fill="none" stroke="${p.lipLine}" stroke-width="0.55" stroke-linecap="round" opacity="0.9"/>`
      );
    default: // smirk
      return (
        `<path d="M29.1 34.6 Q31.8 35 34.4 33.7 Q35.1 33.35 35.5 33.95" fill="none" stroke="${p.lipLine}" stroke-width="0.6" stroke-linecap="round" opacity="0.85"/>
         <path d="M29.5 34.8 Q31.6 36 33.6 34.6 Q32.7 36.2 31.4 36.2 Q30.3 36.2 29.5 34.8 Z" fill="${p.lipLower}" opacity="0.8"/>
         <path d="M35.2 32.6 Q36 33.3 35.9 34.3" fill="none" stroke="${p.skinShadow}" stroke-width="0.5" opacity="0.35"/>
         <ellipse cx="31.6" cy="35.3" rx="1" ry="0.38" fill="#ffffff" opacity="0.25"/>` +
        underLip(36.9)
      );
  }
}

function facialHairArt(uid: string, p: Pal, style: number): string {
  const fh = `url(#${uid}-fhg)`;
  switch (style) {
    case 1: // moustache
      return `<path d="M28.7 33.4 Q30.3 31.9 32 32.7 Q33.7 31.9 35.3 33.4 Q35 34.5 33.8 34.6 Q32.9 34 32 34 Q31.1 34 30.2 34.6 Q29 34.5 28.7 33.4 Z" fill="${fh}"/>
        ${strand('M29.6 33.2 Q30.8 32.4 31.7 32.9', p.fhLight, 0.4, 0.4)}
        ${strand('M32.5 32.9 Q33.6 32.5 34.5 33.3', p.fhLight, 0.4, 0.4)}`;
    case 2: // full beard (mass hugging the jaw, mouth painted on top)
      return `<path d="M23.2 28.6 q-0.6 6.6 3.2 10.9 q2.6 2.9 5.6 3.2 q3 -0.3 5.6 -3.2 q3.8 -4.3 3.2 -10.9 q-1.5 2.9 -4.3 3.9 l-0.6 -0.7 q-1.7 1 -3.9 1 q-2.2 0 -3.9 -1 l-0.6 0.7 q-2.8 -1 -4.3 -3.9 z" fill="${fh}"/>
        <path d="M28.7 33.3 Q30.3 31.9 32 32.6 Q33.7 31.9 35.3 33.3 Q35 34.4 33.8 34.5 Q32.9 34 32 34 Q31.1 34 30.2 34.5 Q29 34.4 28.7 33.3 Z" fill="${fh}" opacity="0.95"/>
        ${strand('M26.3 32.6 Q25.9 36 27.6 38.9', p.fhLight, 0.5, 0.3)}
        ${strand('M29.4 35.4 Q29.4 38.4 30.6 40.6', p.fhLight, 0.45, 0.3)}
        ${strand('M32 36.6 Q32 39.2 32 41.4', p.fhLight, 0.45, 0.32)}
        ${strand('M34.6 35.4 Q34.6 38.4 33.4 40.6', p.fhLight, 0.45, 0.3)}
        ${strand('M37.7 32.6 Q38.1 36 36.4 38.9', p.fhLight, 0.5, 0.3)}`;
    case 3: // goatee + thin moustache
      return `<path d="M28.9 36.2 Q32 38.6 35.1 36.2 Q35.7 40.6 32 41.2 Q28.3 40.6 28.9 36.2 Z" fill="${fh}"/>
        <path d="M29.2 33.4 Q30.6 32.4 32 33 Q33.4 32.4 34.8 33.4 Q34.6 34.2 33.6 34.3 Q32 33.6 30.4 34.3 Q29.4 34.2 29.2 33.4 Z" fill="${fh}"/>
        ${strand('M31 37.6 Q31.4 39.2 32 39.9', p.fhLight, 0.4, 0.35)}
        ${strand('M33 37.6 Q32.9 38.9 32.5 39.7', p.fhLight, 0.4, 0.3)}`;
    default:
      return '';
  }
}

function blemishArt(p: Pal, style: number): string {
  if (style === 1) {
    const f = (x: number, y: number, r: number): string =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.freckle}" opacity="0.55"/>`;
    return (
      f(26.4, 30.1, 0.3) + f(27.8, 30.9, 0.28) + f(25.7, 31.2, 0.24) + f(28.7, 29.9, 0.22) +
      f(37.6, 30.1, 0.3) + f(36.2, 30.9, 0.28) + f(38.3, 31.2, 0.24) + f(35.3, 29.9, 0.22) +
      f(30.9, 29.3, 0.22) + f(33.1, 29.3, 0.22)
    );
  }
  if (style === 2) {
    return `<ellipse cx="26.6" cy="30.6" rx="2.5" ry="1.5" fill="${p.blush}" opacity="0.18"/>
      <ellipse cx="26.6" cy="30.6" rx="1.6" ry="1" fill="${p.blush}" opacity="0.24"/>
      <ellipse cx="37.4" cy="30.6" rx="2.5" ry="1.5" fill="${p.blush}" opacity="0.18"/>
      <ellipse cx="37.4" cy="30.6" rx="1.6" ry="1" fill="${p.blush}" opacity="0.24"/>`;
  }
  return '';
}

/* ----------------------------------------------------------------------
 * Hair — 8 painted silhouettes. Each returns a back layer (behind the
 * torso) and a front layer (over the face), plus strand highlights.
 * ---------------------------------------------------------------------- */

/** Bumpy "cloud" outline used for the afro (deterministic arc chain). */
function bumpyBlob(cx: number, cy: number, R: number, n: number): string {
  let d = '';
  const ar = N(R * 0.42);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = N(cx + R * Math.cos(a));
    const y = N(cy + R * Math.sin(a));
    d += i === 0 ? `M${x} ${y}` : ` A${ar} ${ar} 0 0 1 ${x} ${y}`;
  }
  return d + ' Z';
}

interface HairLayers {
  back: string;
  front: string;
  /** Whether a soft hairline shadow should be cast on the forehead. */
  fringeShadow: boolean;
}

function hairArt(uid: string, p: Pal, style: number): HairLayers {
  const g = `url(#${uid}-hairg)`;
  const hi = p.hairLight;
  switch (style) {
    case 0: {
      // short crop
      const front = `<path d="M22.3 23.5 q-0.4 -12.4 9.7 -12.9 q10.1 0.5 9.7 12.9 l-1.8 -0.7 q0.5 -3.8 -1.1 -6.2 q-2.3 1.9 -5.1 2 q-4.4 0.2 -6.6 -2.4 q-1.9 2.5 -1.3 6.6 l-1.8 0.7 z" fill="${g}"/>
        <path d="M22.9 23 l1.7 0.4 l-0.3 3.3 q-1.2 -0.4 -1.6 -1.4 z" fill="${g}"/>
        <path d="M41.1 23 l-1.7 0.4 l0.3 3.3 q1.2 -0.4 1.6 -1.4 z" fill="${g}"/>
        ${strand('M25.5 14.6 Q28.5 12 32 11.7', hi, 0.6, 0.42)}
        ${strand('M27.5 13.2 Q30.3 11.7 32.9 11.9', hi, 0.5, 0.32)}
        ${strand('M36 13.4 Q38.3 14.7 39.4 17', hi, 0.55, 0.3)}
        ${strand('M24.4 16.4 Q25.6 14.2 27.8 13', hi, 0.5, 0.28)}
        ${strand('M31 10.7 Q31.6 9.1 33 8.7', p.hair, 0.5, 0.8)}
        ${strand('M36.8 11.6 Q38 10.7 39.2 10.8', p.hair, 0.45, 0.7)}`;
      return { back: '', front, fringeShadow: true };
    }
    case 1: {
      // side part with a swept fringe
      const front = `<path d="M22.3 24.6 q-0.8 -13.7 9.9 -13.9 q10.8 -0.2 9.6 14.9 l-1.7 -0.8 q0.8 -4.6 -0.6 -7.6 q-6.8 1.8 -11.6 -1.4 q-2.6 2.2 -2.4 8.1 l-1.6 0.7 z" fill="${g}"/>
        <path d="M27.4 14 q5.4 3.4 12 1.6 l-0.9 -2.5 q-6 1.4 -11.1 0.9 z" fill="${g}" opacity="0.9"/>
        ${strand('M27.3 13.9 Q33.5 15.9 38.3 15.1', hi, 0.6, 0.42)}
        ${strand('M27.8 12.5 Q33 14.3 37.4 13.7', hi, 0.5, 0.3)}
        ${strand('M26 14.4 Q24.3 16.6 24 20.3', hi, 0.55, 0.35)}
        ${strand('M39.5 16.6 Q40.7 19.2 40.6 23', hi, 0.5, 0.3)}
        ${strand('M27 13.6 Q26.4 12 26.8 10.9', p.hair, 0.45, 0.75)}`;
      return { back: '', front, fringeShadow: true };
    }
    case 2: {
      // pulled back into a bun
      const front = `<circle cx="32" cy="9.7" r="3.3" fill="${g}"/>
        <path d="M29.4 11.6 q2.6 1.4 5.2 0 l0.3 1 q-2.9 1.5 -5.8 0 z" fill="${p.hairDark}" opacity="0.7"/>
        ${strand('M30 8 Q31.7 6.9 33.8 7.7', hi, 0.5, 0.45)}
        <path d="M22.3 24 q-0.5 -12.6 9.7 -12.9 q10.2 0.3 9.7 12.9 l-1.75 -0.4 q0.65 -6.6 -3 -8.7 q-2.3 1.5 -4.95 1.5 q-2.65 0 -4.95 -1.5 q-3.65 2.1 -3 8.7 l-1.75 0.4 z" fill="${g}"/>
        ${strand('M24.6 17.6 Q27.6 14.5 32 13.9', hi, 0.55, 0.4)}
        ${strand('M39.4 17.6 Q36.4 14.5 32 13.9', hi, 0.55, 0.32)}
        ${strand('M25.5 20.6 Q28.9 16.7 32 16.2', hi, 0.45, 0.25)}
        ${strand('M31.4 13.4 Q31.7 12.4 31.7 11.6', p.hair, 0.4, 0.7)}`;
      return { back: '', front, fringeShadow: true };
    }
    case 3: {
      // curly helmet: base cap + bumpy rim of curls
      const c = (x: number, y: number, r: number): string =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${g}"/>`;
      const front = `<path d="M22.3 23.8 q-0.6 -12.8 9.7 -13.3 q10.3 0.5 9.7 13.3 l-1.8 -0.5 q0.4 -4.4 -1.3 -7 q-2.4 2 -5.3 2.1 q-4.5 0.2 -6.8 -2.5 q-2 2.6 -1.4 7 l-1.8 0.9 z" fill="${g}"/>
        ${c(22.6, 20.6, 2)}${c(22.7, 16.2, 2.1)}${c(24.9, 12.5, 2.3)}${c(28.4, 10.3, 2.4)}
        ${c(32, 9.6, 2.5)}${c(35.6, 10.3, 2.4)}${c(39.1, 12.5, 2.3)}${c(41.3, 16.2, 2.1)}${c(41.4, 20.6, 2)}
        ${strand('M27.3 11.5 A1.6 1.6 0 0 1 29.6 10.3', hi, 0.5, 0.45)}
        ${strand('M31 8.9 A1.7 1.7 0 0 1 33.3 8.9', hi, 0.5, 0.42)}
        ${strand('M23.9 14.8 A1.5 1.5 0 0 1 25.7 13.4', hi, 0.5, 0.35)}
        ${strand('M36.6 11.4 A1.5 1.5 0 0 1 38.3 12.6', hi, 0.45, 0.3)}
        ${strand('M21.9 18.2 A1.4 1.4 0 0 1 23 16.7', hi, 0.45, 0.3)}`;
      return { back: '', front, fringeShadow: true };
    }
    case 4: {
      // long flowing hair, mass behind the torso + framing locks in front
      const back = `<path d="M32 10.4 q-10.6 0 -12.4 10.4 q-1.4 8 -0.6 14.6 q0.6 5.4 -1.6 10.4 q5.2 4.4 10.4 3 l8.4 0 q5.2 1.4 10.4 -3 q-2.2 -5 -1.6 -10.4 q0.8 -6.6 -0.6 -14.6 q-1.8 -10.4 -12.4 -10.4 z" fill="${p.hairDark}"/>`;
      const front = `<path d="M22.3 25 q-1.3 -14.4 9.7 -14.4 q11 0 9.7 14.4 l-1.6 -0.3 q0.7 -6.2 -2.6 -9 q-2.4 1.9 -5.5 1.9 q-3.1 0 -5.5 -1.9 q-3.3 2.8 -2.6 9 l-1.6 0.3 z" fill="${g}"/>
        <path d="M22.4 19.5 q-2.8 5.5 -2.2 12.5 q0.5 6.5 -1.2 12.5 q2.6 2.4 5.8 1.6 q-1.4 -6.6 -0.9 -13.1 q0.3 -4.9 -0.3 -9.4 z" fill="${g}"/>
        <path d="M41.6 19.5 q2.8 5.5 2.2 12.5 q-0.5 6.5 1.2 12.5 q-2.6 2.4 -5.8 1.6 q1.4 -6.6 0.9 -13.1 q-0.3 -4.9 0.3 -9.4 z" fill="${g}"/>
        ${strand('M26.4 12.7 Q29.4 10.9 32.6 10.9', hi, 0.6, 0.45)}
        ${strand('M23.8 16.6 Q25.3 13.3 28.4 11.9', hi, 0.5, 0.32)}
        ${strand('M21.6 23 Q20.4 30 21.2 36.8 Q21.6 41 20.8 44.6', hi, 0.55, 0.35)}
        ${strand('M23.7 22.4 Q22.7 29.5 23.4 36.4', hi, 0.45, 0.25)}
        ${strand('M42.4 23 Q43.6 30 42.8 36.8 Q42.4 41 43.2 44.6', hi, 0.55, 0.35)}
        ${strand('M40.3 22.4 Q41.3 29.5 40.6 36.4', hi, 0.45, 0.25)}
        ${strand('M37 11.6 Q39.4 12.6 40.6 15.2', hi, 0.5, 0.3)}
        ${strand('M30.4 10 Q31 8.6 32.4 8.2', p.hair, 0.5, 0.8)}`;
      return { back, front, fringeShadow: true };
    }
    case 5: {
      // mohawk: shaved-stubble sides + spiky crest
      const front = `<path d="M22.2 24.5 q0 -10 5.5 -12 l1.6 2 q-4.6 2.6 -4.6 10 z" fill="${p.hairDark}" opacity="0.25"/>
        <path d="M41.8 24.5 q0 -10 -5.5 -12 l-1.6 2 q4.6 2.6 4.6 10 z" fill="${p.hairDark}" opacity="0.25"/>
        <path d="M27.5 15.6 q-0.8 -2.8 0 -5.6 l1.3 1.2 l0.5 -3.6 l1.6 1.8 l1.1 -3.4 l1.1 3.4 l1.6 -1.8 l0.5 3.6 l1.3 -1.2 q0.8 2.8 0 5.6 q-4.5 -1.7 -9 0 z" fill="${g}"/>
        ${strand('M29.4 13.2 Q29.1 10.4 29.9 8.2', hi, 0.55, 0.45)}
        ${strand('M32 12.6 Q32 9.5 32 6.9', hi, 0.55, 0.5)}
        ${strand('M34.6 13.2 Q34.9 10.4 34.1 8.2', hi, 0.55, 0.4)}`;
      return { back: '', front, fringeShadow: false };
    }
    case 6: {
      // afro: big bumpy halo with the face carved out
      const blob = bumpyBlob(32, 16, 12.6, 10);
      const front = `<path fill-rule="evenodd" d="${blob} M32 17 a8.6 11 0 1 0 0.02 0 z" fill="${g}"/>
        ${strand('M24.4 9.4 A9.5 9.5 0 0 1 31.2 6.3', hi, 0.7, 0.35)}
        ${strand('M22 14.6 A10.6 10.6 0 0 1 24.9 9.9', hi, 0.55, 0.28)}
        ${strand('M34.4 6.5 A9.8 9.8 0 0 1 39.7 9.7', hi, 0.55, 0.22)}
        ${strand('M26.6 11.2 A1.6 1.6 0 0 1 28.8 10.4', p.hairDark, 0.5, 0.5)}
        ${strand('M33.6 8.4 A1.6 1.6 0 0 1 35.8 9', p.hairDark, 0.5, 0.5)}
        ${strand('M39 13.2 A1.6 1.6 0 0 1 40.4 15', p.hairDark, 0.5, 0.5)}
        ${strand('M23.3 18.6 A1.6 1.6 0 0 1 23.9 16.4', p.hairDark, 0.5, 0.5)}`;
      return { back: '', front, fringeShadow: true };
    }
    default: {
      // balding: bare crown, side fringe, brave comb-over strands
      const patch = `<path d="M22.2 23 q-0.3 4.8 1.9 8.1 q1.3 -0.1 2.1 -0.9 q-1.9 -2.9 -1.7 -7 q-1.1 -0.7 -2.3 -0.2 z" fill="${g}"/>`;
      const front = `${patch}${mirrored(patch)}
        <ellipse cx="30" cy="14.6" rx="4.8" ry="2.4" fill="#ffffff" opacity="0.16"/>
        ${strand('M24.5 14.6 Q31.5 11.2 38.5 14', p.hair, 0.8, 0.75)}
        ${strand('M24.9 16.3 Q31.5 13.3 38.1 15.9', p.hair, 0.6, 0.5)}
        ${strand('M23.3 24.4 Q23 26.6 23.9 28.6', hi, 0.4, 0.4)}
        ${strand('M40.7 24.4 Q41 26.6 40.1 28.6', hi, 0.4, 0.4)}`;
      return { back: '', front, fringeShadow: false };
    }
  }
}

/* ----------------------------------------------------------------------
 * Accessories (painted, resting on the head)
 * ---------------------------------------------------------------------- */

function accessoryDefs(uid: string, acc: BustAccessory): string {
  if (acc === 'cap' || acc === 'cap-back') {
    return `<linearGradient id="${uid}-capg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ea6a5f"/><stop offset="0.5" stop-color="#cf4441"/><stop offset="1" stop-color="#93282c"/>
    </linearGradient>`;
  }
  if (acc === 'sunglasses') {
    return `<linearGradient id="${uid}-sung" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#443c5c"/><stop offset="0.55" stop-color="#241d33"/><stop offset="1" stop-color="#161022"/>
    </linearGradient>`;
  }
  if (acc === 'crown') {
    return `<linearGradient id="${uid}-gold" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#ffe9a3"/><stop offset="0.5" stop-color="#f4c249"/><stop offset="1" stop-color="#c98a14"/>
    </linearGradient>`;
  }
  if (acc === 'beret') {
    return `<linearGradient id="${uid}-berg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#d15570"/><stop offset="1" stop-color="#7e1e3c"/>
    </linearGradient>`;
  }
  return '';
}

function accessoryArt(uid: string, acc: BustAccessory): string {
  switch (acc) {
    case 'cap':
      return `<path d="M22.6 19.4 q-0.9 -9.8 9.4 -9.8 q10.3 0 9.4 9.8 q-9.4 -3.1 -18.8 0 z" fill="url(#${uid}-capg)"/>
        <path d="M27 11.2 Q31.5 9 36.4 10.6" fill="none" stroke="#f3948a" stroke-width="0.5" opacity="0.5"/>
        <path d="M32 9.7 L31 18.1 M26.4 11.4 L26.5 18.9 M37.6 11.4 L37.5 18.9" stroke="#8c2427" stroke-width="0.4" opacity="0.5" fill="none"/>
        <circle cx="32" cy="9.9" r="0.7" fill="#8c2427"/>
        <path d="M21.8 19.6 q10.2 -3.5 20.4 0 q0.7 1.4 -0.6 2.2 q-9.6 -3.2 -19.2 0 q-1.3 -0.8 -0.6 -2.2 z" fill="#93282c"/>
        <path d="M23.4 19.5 q8.6 -2.7 17.2 0" fill="none" stroke="#ea6a5f" stroke-width="0.45" opacity="0.5"/>`;
    case 'cap-back':
      return `<path d="M22.6 19.6 q-0.9 -9.6 9.4 -9.6 q10.3 0 9.4 9.6 q-9.4 -3.1 -18.8 0 z" fill="url(#${uid}-capg)"/>
        <path d="M27 11.4 Q31.5 9.2 36.4 10.8" fill="none" stroke="#f3948a" stroke-width="0.5" opacity="0.5"/>
        <path d="M32 9.9 L31.4 18.2 M26.4 11.6 L26.5 19.1" stroke="#8c2427" stroke-width="0.4" opacity="0.5" fill="none"/>
        <path d="M40.6 13.6 q5.2 -1.2 7 0.7 q0.4 1.4 -1.1 1.8 q-3.5 0.7 -6.3 -0.3 z" fill="#93282c"/>
        <path d="M28.9 18.3 q3.1 -1 6.2 0 l-0.3 1.2 q-2.8 -0.8 -5.6 0 z" fill="#191024" opacity="0.55"/>`;
    case 'glasses':
      return `<g fill="none" stroke="#2a2331" stroke-width="0.7">
          <circle cx="27.7" cy="26.3" r="3.1"/><circle cx="36.3" cy="26.3" r="3.1"/>
          <path d="M30.8 25.9 Q32 25 33.2 25.9"/>
          <path d="M24.6 25.7 L22.4 26.3 M39.4 25.7 L41.6 26.3"/>
        </g>
        <circle cx="27.7" cy="26.3" r="3.1" fill="#ffffff" opacity="0.08"/>
        <circle cx="36.3" cy="26.3" r="3.1" fill="#ffffff" opacity="0.08"/>
        <path d="M25.6 24.9 A2.6 2.6 0 0 1 27.3 23.7 M34.2 24.9 A2.6 2.6 0 0 1 35.9 23.7" stroke="#ffffff" stroke-width="0.55" opacity="0.4" fill="none"/>`;
    case 'sunglasses':
      return `<rect x="24.2" y="24.1" width="7" height="4.7" rx="2.2" fill="url(#${uid}-sung)" stroke="#120d1c" stroke-width="0.45"/>
        <rect x="32.8" y="24.1" width="7" height="4.7" rx="2.2" fill="url(#${uid}-sung)" stroke="#120d1c" stroke-width="0.45"/>
        <path d="M31.2 25.4 Q32 24.8 32.8 25.4" fill="none" stroke="#120d1c" stroke-width="0.8"/>
        <path d="M24.2 25.6 L22.4 26.2 M39.8 25.6 L41.6 26.2" stroke="#120d1c" stroke-width="0.7" fill="none"/>
        <path d="M25.5 25.2 L28 27.9 M26.8 24.9 L28.6 26.8" stroke="#ffffff" stroke-width="0.7" opacity="0.28" fill="none"/>
        <path d="M34.1 25.2 L36.6 27.9" stroke="#ffffff" stroke-width="0.7" opacity="0.22" fill="none"/>`;
    case 'headphones':
      return `<path d="M22.4 18.6 q0.2 -11.2 9.6 -11.2 q9.4 0 9.6 11.2" fill="none" stroke="#332c44" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M23.5 16.2 q1.1 -7.6 8.5 -7.7" fill="none" stroke="#584e78" stroke-width="0.7" opacity="0.7"/>
        <rect x="19.7" y="23.2" width="3.4" height="6.4" rx="1.6" fill="#332c44" stroke="#221c30" stroke-width="0.5"/>
        <rect x="40.9" y="23.2" width="3.4" height="6.4" rx="1.6" fill="#332c44" stroke="#221c30" stroke-width="0.5"/>
        <rect x="20.4" y="24.1" width="1.4" height="4.6" rx="0.7" fill="#584e78" opacity="0.9"/>
        <rect x="42.2" y="24.1" width="1.4" height="4.6" rx="0.7" fill="#584e78" opacity="0.6"/>`;
    case 'beret':
      return `<path d="M22.6 15.8 q-3 -8.4 7.2 -10.6 q10.6 -2.3 12.8 3.6 q1.3 3.5 -1.2 5.9 q-9.4 -4.5 -18.8 1.1 z" fill="url(#${uid}-berg)"/>
        <path d="M22.7 15.6 q9.3 -5.4 18.6 -1 q0.4 0.9 -0.4 1.3 q-8.8 -4 -17.6 1 q-0.8 -0.5 -0.6 -1.3 z" fill="#5e142c" opacity="0.9"/>
        <path d="M26.2 7.5 Q31.5 4.9 36.9 6.3" fill="none" stroke="#e87c96" stroke-width="0.6" opacity="0.5"/>
        <circle cx="33.4" cy="4.6" r="0.75" fill="#5e142c"/><path d="M33.2 5.3 L33 6.6" stroke="#5e142c" stroke-width="0.5" fill="none"/>`;
    case 'crown':
      return `<path d="M25.8 13.4 l-1.2 -6.2 l3.7 2.8 l3.7 -4.8 l3.7 4.8 l3.7 -2.8 l-1.2 6.2 z" fill="url(#${uid}-gold)" stroke="#a86a08" stroke-width="0.5" stroke-linejoin="round"/>
        <rect x="25.4" y="13.2" width="13.2" height="2.1" rx="0.7" fill="url(#${uid}-gold)" stroke="#a86a08" stroke-width="0.5"/>
        <circle cx="28.3" cy="11.2" r="0.55" fill="#e14b6a"/><circle cx="32" cy="9.6" r="0.6" fill="#3f8fd9"/><circle cx="35.7" cy="11.2" r="0.55" fill="#2fa06a"/>
        <path d="M26 13.9 L37 13.9" stroke="#ffe9a3" stroke-width="0.45" opacity="0.7" fill="none"/>`;
    case 'halo':
      return `<ellipse cx="32" cy="7.2" rx="5.6" ry="1.6" fill="none" stroke="#ffe9a8" stroke-width="2" opacity="0.18"/>
        <ellipse cx="32" cy="7.2" rx="5.3" ry="1.5" fill="none" stroke="#ffe9a8" stroke-width="1.1" opacity="0.5"/>
        <ellipse cx="32" cy="7.2" rx="5.1" ry="1.4" fill="none" stroke="#ffd76a" stroke-width="0.65" opacity="0.95"/>
        <ellipse cx="30" cy="6.7" rx="1.4" ry="0.4" fill="#fff7dd" opacity="0.6"/>`;
    default:
      return '';
  }
}

/* ----------------------------------------------------------------------
 * The bust builder
 * ---------------------------------------------------------------------- */

const memo = new Map<string, string>();

/** Painted semi-realistic bust portrait. Square SVG, width=height=size px. */
export function paintedBust(look: PersonaLook, accessory: BustAccessory, size = 44): string {
  const hairstyle = wrap(look.hairstyle, 8);
  const eyeStyle = wrap(look.eyeStyle, 5);
  const eyebrowStyle = wrap(look.eyebrowStyle, 3);
  const mouthStyle = wrap(look.mouthStyle, 6);
  const facialHair = wrap(look.facialHair, 4);
  const blemish = wrap(look.blemish, 3);
  const key = [
    look.skin, look.hair, look.shirt,
    hairstyle, eyeStyle, eyebrowStyle, mouthStyle, facialHair, blemish, accessory,
  ].join('|');
  const memoKey = `${key}|${size}`;
  const hit = memo.get(memoKey);
  if (hit) return hit;

  const uid = 'pb' + hashKey(key).toString(36);
  const p = palette({ ...look, eyeStyle });
  const hairL = hairArt(uid, p, hairstyle);
  const bgCore = mix('#5a4a7a', look.shirt, 0.28);
  const bgMid = mix('#3a2f52', look.shirt, 0.1);

  const defs = `<defs>
    <radialGradient id="${uid}-bg" cx="0.5" cy="0.4" r="0.8">
      <stop offset="0" stop-color="${bgCore}"/><stop offset="0.55" stop-color="${bgMid}"/><stop offset="1" stop-color="#231a33"/>
    </radialGradient>
    <radialGradient id="${uid}-glow" cx="0.3" cy="0.18" r="0.55">
      <stop offset="0" stop-color="#ffe9c8" stop-opacity="0.22"/><stop offset="1" stop-color="#ffe9c8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}-skin" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="${p.skinLight}"/><stop offset="0.45" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.skinShadow}"/>
    </linearGradient>
    <radialGradient id="${uid}-sheen" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fffdf5" stop-opacity="0.3"/><stop offset="1" stop-color="#fffdf5" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}-hairg" x1="0.15" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="${p.hairLight}"/><stop offset="0.42" stop-color="${p.hair}"/><stop offset="1" stop-color="${p.hairDark}"/>
    </linearGradient>
    <linearGradient id="${uid}-shirtg" x1="0" y1="0" x2="0.65" y2="1">
      <stop offset="0" stop-color="${p.shirtLight}"/><stop offset="0.5" stop-color="${look.shirt}"/><stop offset="1" stop-color="${p.shirtDark}"/>
    </linearGradient>
    <radialGradient id="${uid}-irisg" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="${p.irisLight}"/><stop offset="0.65" stop-color="${p.iris}"/><stop offset="1" stop-color="${p.irisDark}"/>
    </radialGradient>
    <linearGradient id="${uid}-fhg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="${p.hair}"/><stop offset="1" stop-color="${p.hairDark}"/>
    </linearGradient>
    ${accessoryDefs(uid, accessory)}
    <clipPath id="${uid}-frame"><rect x="0" y="0" width="64" height="64" rx="5"/></clipPath>
    <clipPath id="${uid}-head"><path d="${HEAD_D}"/></clipPath>
  </defs>`;

  // Torso: chest skin in the neckline scoop, shirt over the shoulders.
  const torso = `<path d="M23.5 52.5 Q23.5 43.8 32 43.8 Q40.5 43.8 40.5 52.5 Z" fill="url(#${uid}-skin)"/>
    <path d="M26.3 49.2 Q30 51.3 31.9 51.4 M37.7 49.2 Q34 51.3 32.1 51.4" fill="none" stroke="${p.skinShadow}" stroke-width="0.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M9.5 64 Q10.8 51.5 21.5 48.3 Q24.4 47.4 27.3 47 Q28.8 50.4 32 50.4 Q35.2 50.4 36.7 47 Q39.6 47.4 42.5 48.3 Q53.2 51.5 54.5 64 Z" fill="url(#${uid}-shirtg)"/>
    <path d="M27.3 47 Q28.8 50.4 32 50.4 Q35.2 50.4 36.7 47" fill="none" stroke="${p.shirtDark}" stroke-width="0.9" opacity="0.6"/>
    <path d="M22.5 52.5 Q20.9 57.5 21.4 63.4 M41.5 52.5 Q43.1 57.5 42.6 63.4 M32 52.8 L32 55.6" fill="none" stroke="${p.shirtDark}" stroke-width="0.8" opacity="0.3"/>
    <path d="M13.6 60.5 Q15.5 52.8 22 49.8" fill="none" stroke="${p.shirtLight}" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
    <path d="M50.6 62.5 Q49.6 54.5 43.6 50.6" fill="none" stroke="${p.rim}" stroke-width="1.1" stroke-linecap="round" opacity="0.32"/>`;

  // Neck with the jaw's cast shadow.
  const neck = `<path d="M27.7 30.5 L27.7 41.5 Q27.7 44.6 32 44.6 Q36.3 44.6 36.3 41.5 L36.3 30.5 Z" fill="url(#${uid}-skin)"/>
    <path d="M27.7 34 Q32 38 36.3 34 L36.3 40 Q32 42.4 27.7 40 Z" fill="${p.skinDeep}" opacity="0.38"/>
    <path d="M36.3 34 L36.3 41" stroke="${p.rim}" stroke-width="0.7" opacity="0.3" fill="none"/>`;

  const ear = `<ellipse cx="21.9" cy="27" rx="1.6" ry="2.6" fill="url(#${uid}-skin)"/>
    <path d="M21.4 25.6 Q20.5 27 21.5 28.7" fill="none" stroke="${p.skinDeep}" stroke-width="0.5" opacity="0.5"/>`;

  // Layered face shading, clipped to the head.
  const fringeShadow = hairL.fringeShadow
    ? `<path d="M23.8 19.6 Q32 14.8 40.2 19.6" fill="none" stroke="${p.hairDark}" stroke-width="1.7" opacity="0.16"/>`
    : '';
  const shading = `<g clip-path="url(#${uid}-head)">
      <ellipse cx="42.6" cy="26" rx="7" ry="14.5" fill="${p.skinShadow}" opacity="0.24"/>
      <ellipse cx="32" cy="39.2" rx="6.4" ry="2.5" fill="${p.skinShadow}" opacity="0.22"/>
      <ellipse cx="27.7" cy="25.1" rx="3.1" ry="1.9" fill="${p.skinShadow}" opacity="0.13"/>
      <ellipse cx="36.3" cy="25.1" rx="3.1" ry="1.9" fill="${p.skinShadow}" opacity="0.13"/>
      <ellipse cx="26.7" cy="30.3" rx="2.6" ry="1.6" fill="${p.blush}" opacity="0.12"/>
      <ellipse cx="37.3" cy="30.3" rx="2.6" ry="1.6" fill="${p.blush}" opacity="0.12"/>
      ${fringeShadow}
    </g>
    <ellipse cx="28.6" cy="19" rx="5" ry="3.4" fill="url(#${uid}-sheen)"/>
    <ellipse cx="27.2" cy="29.4" rx="2.4" ry="1.4" fill="url(#${uid}-sheen)" opacity="0.6"/>
    <ellipse cx="32" cy="36.4" rx="1.7" ry="0.9" fill="#ffffff" opacity="0.13"/>
    <path d="M30.6 37.4 Q32 38.1 33.4 37.4" fill="none" stroke="${p.skinShadow}" stroke-width="0.5" opacity="0.3"/>`;

  const rimLight = `<path d="M40.6 14.6 Q43.2 19.5 42.6 25.5 Q42.1 31 39.4 35.4" fill="none" stroke="${p.rim}" stroke-width="0.95" stroke-linecap="round" opacity="0.42"/>
    <path d="M24.8 14.4 Q22.5 18.8 22.4 23.8" fill="none" stroke="#ffdfae" stroke-width="0.8" stroke-linecap="round" opacity="0.28"/>`;

  const svg = `<svg class="portrait-svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    ${defs}
    <g clip-path="url(#${uid}-frame)">
      <rect width="64" height="64" fill="url(#${uid}-bg)"/>
      <rect width="64" height="64" fill="url(#${uid}-glow)"/>
      ${hairL.back}
      ${torso}
      ${neck}
      <path d="${HEAD_D}" fill="url(#${uid}-skin)"/>
      ${ear}${mirrored(ear)}
      ${shading}
      ${browsArt(p, eyebrowStyle)}
      ${eyesArt(uid, p, eyeStyle)}
      ${noseArt(p)}
      ${blemishArt(p, blemish)}
      ${facialHairArt(uid, p, facialHair)}
      ${mouthArt(p, mouthStyle)}
      ${hairL.front}
      ${accessoryArt(uid, accessory)}
      ${rimLight}
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="4.3" fill="none" stroke="#120d1e" stroke-width="1.5" opacity="0.55"/>
    </g>
  </svg>`;

  memo.set(memoKey, svg);
  return svg;
}
