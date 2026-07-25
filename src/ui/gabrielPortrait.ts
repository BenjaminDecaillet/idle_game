/**
 * Gabriel — painted portrait edition. A hand-coded SVG, semi-realistic bust
 * portrait of the same little angelic robot as `gabriel.ts`, but rendered like
 * glossy painted card art (Idle-Angels style): dimensional ceramic shading,
 * layered gradient reflections, a glowing glass face screen, a radiant gold
 * halo and a soft vignetted background with heavenly top light.
 *
 * Pose guide (bust portrait — pose = expression + slight head attitude):
 *   idle  — warm friendly smile, relaxed glowing eyes, big catchlights
 *   point — eager wide eyes, raised brows, excited open smile, leaning in
 *   cheer — starry gold eyes, huge grin, halo extra radiant, sparkles
 *   think — gaze drifting up-left, wavy mouth, one brow up, dimmer lighting
 *
 * All glow/bloom is faked with stacked low-opacity shapes and radial
 * gradients — no SVG filters (too expensive on mobile). Gradient ids are
 * prefixed `gpt-${pose}-` so two poses can coexist in the DOM. Memoised.
 */

import type { GabrielPose } from './gabriel';

const INK = '#2d2440';
const GOLD = '#ffc93c';
const GOLD_DEEP = '#e8a20b';
const GOLD_PALE = '#ffe9a8';

const POSES: ReadonlySet<string> = new Set(['idle', 'point', 'cheer', 'think']);

/** Per-pose lighting mood + head attitude. */
interface Mood {
  /** Heavenly top-light strength (0..1). */
  sky: number;
  /** Halo radiance multiplier. */
  halo: number;
  /** Transform applied to the whole character (head tilt / lean). */
  tilt: string;
  /** Extra plum shade laid over the scene (think = moodier). */
  shade: number;
}

const MOODS: Record<GabrielPose, Mood> = {
  idle: { sky: 0.5, halo: 1, tilt: '', shade: 0 },
  point: { sky: 0.55, halo: 1, tilt: 'rotate(-4 32 44) translate(0 0.7)', shade: 0 },
  cheer: { sky: 0.65, halo: 1.35, tilt: 'rotate(2.5 32 44) translate(0 -0.8)', shade: 0 },
  think: { sky: 0.22, halo: 0.65, tilt: 'rotate(3.5 32 44) translate(0.4 0.4)', shade: 0.14 },
};

const f = (v: number): number => Math.round(v * 100) / 100;

/** Four-point star glint (cheer eyes, background sparkles). */
function star(cx: number, cy: number, r: number, fill: string, extra = ''): string {
  const s = f(r * 0.3);
  return `<path d="M${cx} ${f(cy - r)} L${f(cx + s)} ${f(cy - s)} L${f(cx + r)} ${cy} L${f(cx + s)} ${f(cy + s)} L${cx} ${f(cy + r)} L${f(cx - s)} ${f(cy + s)} L${f(cx - r)} ${cy} L${f(cx - s)} ${f(cy - s)} Z" fill="${fill}" ${extra}/>`;
}

/** Fake bloom: stacked concentric low-opacity discs (no filters). */
function bloom(cx: number, cy: number, r: number, color: string, ops: readonly number[]): string {
  return ops
    .map((o, i) => `<circle cx="${cx}" cy="${cy}" r="${f(r * (1 - i * 0.3))}" fill="${color}" opacity="${f(o)}"/>`)
    .join('');
}

/** All gradients for one pose, ids prefixed `gpt-${pose}-`. */
function defs(pose: GabrielPose, m: Mood): string {
  const p = `gpt-${pose}`;
  return `<defs>
    <radialGradient id="${p}-bg" cx="0.5" cy="0.36" r="0.85">
      <stop offset="0" stop-color="#57487c"/>
      <stop offset="0.55" stop-color="#3a2f57"/>
      <stop offset="1" stop-color="#211a33"/>
    </radialGradient>
    <radialGradient id="${p}-sky" cx="0.5" cy="0" r="0.9">
      <stop offset="0" stop-color="#fff3d0" stop-opacity="${f(m.sky)}"/>
      <stop offset="0.55" stop-color="#ffe9a8" stop-opacity="${f(m.sky * 0.35)}"/>
      <stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}-haloGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${GOLD_PALE}" stop-opacity="${f(0.5 * m.halo)}"/>
      <stop offset="0.55" stop-color="${GOLD}" stop-opacity="${f(0.24 * m.halo)}"/>
      <stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}-haloRing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6d8"/>
      <stop offset="0.5" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DEEP}"/>
    </linearGradient>
    <linearGradient id="${p}-body" x1="0.18" y1="0.04" x2="0.86" y2="1">
      <stop offset="0" stop-color="#fffef8"/>
      <stop offset="0.38" stop-color="#f8ecd2"/>
      <stop offset="0.72" stop-color="#e2cda4"/>
      <stop offset="1" stop-color="#a68e7e"/>
    </linearGradient>
    <radialGradient id="${p}-form" cx="0.36" cy="0.28" r="1.05">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.78" stop-color="#6b5460" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#463349" stop-opacity="0.6"/>
    </radialGradient>
    <linearGradient id="${p}-rim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffdf8a" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#ffdf8a" stop-opacity="0.9"/>
      <stop offset="0.7" stop-color="#fff3c4" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${p}-screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a4a86"/>
      <stop offset="0.55" stop-color="#0f3266"/>
      <stop offset="1" stop-color="#081f42"/>
    </linearGradient>
    <radialGradient id="${p}-screenGlow" cx="0.5" cy="0.52" r="0.62">
      <stop offset="0" stop-color="#55c8ff" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="#2f9fe6" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#2f9fe6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}-eye" cx="0.42" cy="0.36" r="0.75">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#c9f1ff"/>
      <stop offset="1" stop-color="#59c4f2"/>
    </radialGradient>
    <radialGradient id="${p}-bobble" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#fff6d8"/>
      <stop offset="0.6" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DEEP}"/>
    </radialGradient>
    <linearGradient id="${p}-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#211a33" stop-opacity="0"/>
      <stop offset="1" stop-color="#211a33" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="${p}-ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3d0" stop-opacity="${f(m.sky * 0.5)}"/>
      <stop offset="1" stop-color="#fff3d0" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

/** Vignetted plum backdrop, heavenly top light, distant glints. */
function background(pose: GabrielPose): string {
  const p = `gpt-${pose}`;
  return `<rect x="0" y="0" width="64" height="64" fill="url(#${p}-bg)"/>
    <rect x="0" y="0" width="64" height="46" fill="url(#${p}-sky)"/>
    <path d="M23 0 L28.5 0 L18 42 L9 42 Z" fill="url(#${p}-ray)" opacity="0.5"/>
    <path d="M37.5 0 L44 0 L56 38 L47.5 38 Z" fill="url(#${p}-ray)" opacity="0.35"/>
    ${star(9.5, 13, 1.5, '#fff6d8', 'opacity="0.4"')}
    ${star(55, 21, 1.1, '#cfeeff', 'opacity="0.32"')}
    <circle cx="50.5" cy="8.5" r="0.7" fill="#fff6d8" opacity="0.35"/>
    <circle cx="7" cy="34" r="0.55" fill="#cfeeff" opacity="0.25"/>`;
}

/** Radiant halo: soft light disc behind the head + layered gradient rings. */
function halo(pose: GabrielPose, m: Mood): string {
  const p = `gpt-${pose}`;
  const o = m.halo;
  const rays =
    m.halo > 1.2
      ? `<g stroke="${GOLD_PALE}" stroke-width="1.1" stroke-linecap="round" opacity="0.7">
          <path d="M32 2.2 v3.2"/>
          <path d="M20.5 4.4 l1.8 2.6"/>
          <path d="M43.5 4.4 l-1.8 2.6"/>
          <path d="M14 11 l2.9 1.2"/>
          <path d="M50 11 l-2.9 1.2"/>
        </g>`
      : '';
  return `<ellipse cx="32" cy="13" rx="19" ry="13" fill="url(#${p}-haloGlow)"/>
    ${rays}
    <ellipse cx="32" cy="9.6" rx="11.6" ry="3.5" fill="none" stroke="${GOLD}" stroke-width="4.6" opacity="${f(0.16 * o)}"/>
    <ellipse cx="32" cy="9.6" rx="11.2" ry="3.3" fill="none" stroke="${GOLD_DEEP}" stroke-width="2.9" opacity="0.9"/>
    <ellipse cx="32" cy="9.6" rx="11.2" ry="3.3" fill="none" stroke="url(#${p}-haloRing)" stroke-width="1.9"/>
    <ellipse cx="32" cy="9.2" rx="8.2" ry="2.1" fill="none" stroke="#fff6d8" stroke-width="0.8" opacity="${f(Math.min(1, 0.85 * o))}"/>
    <circle cx="23.5" cy="8.1" r="0.75" fill="#ffffff" opacity="${f(Math.min(1, 0.9 * o))}"/>
    <circle cx="40" cy="10.6" r="0.55" fill="#fff6d8" opacity="${f(0.7 * o)}"/>`;
}

/** Antenna stem + glossy gold bobble with faked bloom. */
function antenna(pose: GabrielPose, m: Mood): string {
  const p = `gpt-${pose}`;
  return `${bloom(32, 16, 4.6, GOLD, [0.12 * m.halo, 0.18 * m.halo])}
    <line x1="32" y1="23" x2="32" y2="18" stroke="#4a3a52" stroke-width="2" stroke-linecap="round"/>
    <line x1="31.5" y1="22.6" x2="31.5" y2="18.4" stroke="#c9b795" stroke-width="0.7" stroke-linecap="round" opacity="0.8"/>
    <circle cx="32" cy="16" r="2.3" fill="url(#${p}-bobble)"/>
    <circle cx="32" cy="16" r="2.3" fill="none" stroke="#8a5f14" stroke-width="0.5" opacity="0.55"/>
    <circle cx="31.2" cy="15.2" r="0.7" fill="#ffffff" opacity="0.95"/>`;
}

/** Glazed porcelain capsule bust: base gradient, form shading, speculars, rims. */
function body(pose: GabrielPose): string {
  const p = `gpt-${pose}`;
  return `<ellipse cx="32" cy="46" rx="20" ry="24" fill="url(#${p}-body)"/>
    <ellipse cx="32" cy="46" rx="20" ry="24" fill="url(#${p}-form)"/>
    <ellipse cx="32" cy="46" rx="20" ry="24" fill="none" stroke="#241b36" stroke-width="1" opacity="0.55"/>
    <path d="M43 26.5 q8.6 9.5 6.6 24 q-0.9 6.6 -4.6 11.5 q6.4 -17.5 -4.4 -33.5 z" fill="#7d6377" opacity="0.34"/>
    <path d="M20.6 28.2 q-4.6 7 -3.6 15.8" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M22.6 26 q-2.4 3 -3.3 6.6" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <ellipse cx="24" cy="25.2" rx="3.4" ry="1.7" fill="#ffffff" opacity="0.9" transform="rotate(-26 24 25.2)"/>
    <ellipse cx="23.2" cy="24.9" rx="1.4" ry="0.7" fill="#ffffff" transform="rotate(-26 23.2 24.9)"/>
    <path d="M17.2 47 q0.8 6.5 4.4 10.6" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.22"/>
    <path d="M18.2 33 A 20 24 0 0 1 45.8 32.4" fill="none" stroke="url(#${p}-rim)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M49.8 38 q2.4 9 -1.6 18.5" fill="none" stroke="#8fb6ff" stroke-width="1.7" stroke-linecap="round" opacity="0.3"/>`;
}

/** Deep-blue glass face screen: bezel, inner glow, clean glass reflection. */
function screen(pose: GabrielPose): string {
  const p = `gpt-${pose}`;
  return `<rect x="18.6" y="27" width="26.8" height="16.6" rx="8.3" fill="#1a1230" opacity="0.55"/>
    <rect x="19" y="27.4" width="26" height="15.8" rx="7.9" fill="url(#${p}-screen)"/>
    <ellipse cx="32" cy="36" rx="11.5" ry="6.4" fill="url(#${p}-screenGlow)"/>
    <rect x="19" y="27.4" width="26" height="15.8" rx="7.9" fill="none" stroke="#0a1830" stroke-width="0.9" opacity="0.8"/>
    <path d="M21 34.2 L31.5 28.6 L36.8 28.6 L24.5 35.4 Q22.2 35.4 21 34.2 Z" fill="#dff2ff" opacity="0.13"/>
    <path d="M22.3 29.6 q9.7 -1.9 19.4 0" fill="none" stroke="#cfeeff" stroke-width="0.9" stroke-linecap="round" opacity="0.4"/>`;
}

/** One luminous eye: cyan bloom, glassy gradient ball, gaze pupil, catchlights. */
function eye(pose: GabrielPose, cx: number, cy: number, r: number, gx = 0, gy = 0): string {
  return `${bloom(cx, cy, r * 2.2, '#4fc3ff', [0.14, 0.2])}
    <ellipse cx="${cx}" cy="${cy}" rx="${f(r)}" ry="${f(r * 1.12)}" fill="url(#gpt-${pose}-eye)"/>
    <circle cx="${f(cx + gx)}" cy="${f(cy + gy)}" r="${f(r * 0.52)}" fill="#1f7fc9" opacity="0.42"/>
    <circle cx="${f(cx - r * 0.32 + gx * 0.6)}" cy="${f(cy - r * 0.44 + gy * 0.6)}" r="${f(r * 0.32)}" fill="#ffffff"/>
    <circle cx="${f(cx + r * 0.4)}" cy="${f(cy + r * 0.52)}" r="${f(r * 0.15)}" fill="#ffdf8a" opacity="0.9"/>`;
}

/** Starry cheer eye: layered gold bloom + star with a white core glint. */
function starEye(cx: number, cy: number): string {
  return `${bloom(cx, cy, 5.6, GOLD, [0.16, 0.24])}
    ${star(cx, cy, 4.1, GOLD, `stroke="${GOLD_DEEP}" stroke-width="0.55" stroke-linejoin="round"`)}
    ${star(cx, cy, 1.7, '#fff6d8')}
    <circle cx="${f(cx - 1)}" cy="${f(cy - 1.1)}" r="0.55" fill="#ffffff"/>`;
}

/** Soft glowing brow stroke on the screen. */
function brow(d: string, opacity = 0.75): string {
  return `<path d="${d}" fill="none" stroke="#4fc3ff" stroke-width="2.4" stroke-linecap="round" opacity="${f(opacity * 0.35)}"/>
    <path d="${d}" fill="none" stroke="#bfe9ff" stroke-width="1.1" stroke-linecap="round" opacity="${f(opacity)}"/>`;
}

function face(pose: GabrielPose): string {
  switch (pose) {
    case 'point': // eager: wide eyes, high brows, excited open smile
      return `${brow('M23 30.4 q2.6 -1.5 5.2 -0.5')}
        ${brow('M35.8 29.9 q2.6 -1 5.2 0.5')}
        ${eye(pose, 26, 34.8, 3.5)}
        ${eye(pose, 38, 34.8, 3.5)}
        <path d="M27.4 39.3 h9.2 q-0.9 4.4 -4.6 4.4 q-3.7 0 -4.6 -4.4 z" fill="#eafcff" opacity="0.95"/>
        <path d="M28.6 41.9 q3.4 2 6.8 0 q-1.4 1.8 -3.4 1.8 q-2 0 -3.4 -1.8 z" fill="#4fc3ff" opacity="0.55"/>
        <path d="M27.4 39.3 h9.2" stroke="#4fc3ff" stroke-width="2.6" stroke-linecap="round" opacity="0.25"/>`;
    case 'cheer': // starry gold eyes + huge grin
      return `${starEye(26, 34.4)}
        ${starEye(38, 34.4)}
        <path d="M25.6 38.6 h12.8 q-1.1 5.4 -6.4 5.4 q-5.3 0 -6.4 -5.4 z" fill="#eafcff" opacity="0.95"/>
        <path d="M27 41.6 q5 2.6 10 0 q-1.8 2.4 -5 2.4 q-3.2 0 -5 -2.4 z" fill="#4fc3ff" opacity="0.6"/>
        <path d="M25.6 38.6 h12.8" stroke="#4fc3ff" stroke-width="2.8" stroke-linecap="round" opacity="0.25"/>`;
    case 'think': // gaze up-left, one brow raised, pensive wavy mouth
      return `${brow('M23 30.6 q2.6 -1.7 5.2 -0.7')}
        ${brow('M35.8 31.8 q2.6 -0.6 5.2 0', 0.6)}
        ${eye(pose, 25.6, 34.6, 2.9, -0.85, -0.95)}
        ${eye(pose, 37.6, 34.6, 2.9, -0.85, -0.95)}
        <path d="M28.6 39.9 q1.7 -1.4 3.4 0 q1.7 1.4 3.4 0" fill="none" stroke="#4fc3ff" stroke-width="2.6" stroke-linecap="round" opacity="0.3"/>
        <path d="M28.6 39.9 q1.7 -1.4 3.4 0 q1.7 1.4 3.4 0" fill="none" stroke="#d9f4ff" stroke-width="1.3" stroke-linecap="round"/>`;
    default: // idle: relaxed eyes, warm smile
      return `${brow('M23.4 31 q2.4 -1 4.8 -0.3', 0.45)}
        ${brow('M35.8 30.7 q2.4 -0.7 4.8 0.3', 0.45)}
        ${eye(pose, 26, 34.8, 3.1)}
        ${eye(pose, 38, 34.8, 3.1)}
        <path d="M27.6 39.4 q4.4 3.2 8.8 0" fill="none" stroke="#4fc3ff" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
        <path d="M27.6 39.4 q4.4 3.2 8.8 0" fill="none" stroke="#d9f4ff" stroke-width="1.5" stroke-linecap="round"/>`;
  }
}

/** Blush, cool screen bounce-light on the chin, glowing gold belly light. */
function bodyDetails(pose: GabrielPose, m: Mood): string {
  return `<path d="M24 45.6 q8 4.6 16 0" fill="none" stroke="#5fc4ff" stroke-width="2.4" stroke-linecap="round" opacity="0.18"/>
    <circle cx="21.6" cy="45.6" r="2" fill="#ff9d9d" opacity="0.3"/>
    <circle cx="21.6" cy="45.6" r="1.2" fill="#ff9d9d" opacity="0.4"/>
    <circle cx="42.4" cy="45.6" r="2" fill="#ff9d9d" opacity="0.3"/>
    <circle cx="42.4" cy="45.6" r="1.2" fill="#ff9d9d" opacity="0.4"/>
    ${bloom(32, 54.5, 7.5, GOLD, [0.12 * m.halo, 0.18 * m.halo])}
    <circle cx="32" cy="54.5" r="3.4" fill="url(#gpt-${pose}-bobble)"/>
    <circle cx="32" cy="54.5" r="3.4" fill="none" stroke="#8a5f14" stroke-width="0.55" opacity="0.5"/>
    ${star(32, 54.5, 1.6, '#fff6d8')}
    <circle cx="30.9" cy="53.4" r="0.6" fill="#ffffff" opacity="0.9"/>`;
}

/** Pose flavour floating in front of the portrait. */
function extras(pose: GabrielPose): string {
  switch (pose) {
    case 'cheer':
      return `${star(13.5, 20, 2.2, GOLD, 'opacity="0.85"')}
        ${star(51.5, 15.5, 1.8, '#fff6d8', 'opacity="0.8"')}
        ${star(49.5, 30, 1.3, '#7fd0ff', 'opacity="0.7"')}
        <circle cx="11.5" cy="30" r="0.8" fill="#fff6d8" opacity="0.55"/>`;
    case 'think':
      return `<g fill="#cfeeff">
        <circle cx="47.5" cy="24" r="1" opacity="0.35"/>
        <circle cx="51" cy="18.5" r="1.5" opacity="0.45"/>
        <circle cx="55.5" cy="11.5" r="2.1" opacity="0.55"/>
      </g>`;
    case 'point':
      return `<g stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.75">
        <path d="M52 34 l3.4 -1.2"/>
        <path d="M52.6 39 l3.6 0.3"/>
        <path d="M51.4 29.4 l3 -2.2"/>
      </g>`;
    default:
      return '';
  }
}

const memo = new Map<string, string>();

/** Painted semi-realistic bust portrait of Gabriel. Square, width=height=size px. */
export function gabrielPortrait(pose: GabrielPose, size = 62): string {
  const p = (POSES.has(pose) ? pose : 'idle') as GabrielPose;
  const key = `${p}:${size}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const m = MOODS[p];
  const svg = `<svg class="portrait-svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    ${defs(p, m)}
    ${background(p)}
    <g${m.tilt ? ` transform="${m.tilt}"` : ''}>
      ${halo(p, m)}
      ${antenna(p, m)}
      ${body(p)}
      ${screen(p)}
      ${face(p)}
      <rect x="10" y="48" width="44" height="16" fill="url(#gpt-${p}-fade)"/>
      ${bodyDetails(p, m)}
    </g>
    ${m.shade > 0 ? `<rect x="0" y="0" width="64" height="64" fill="${INK}" opacity="${f(m.shade)}"/>` : ''}
    ${extras(p)}
  </svg>`;
  memo.set(key, svg);
  return svg;
}
