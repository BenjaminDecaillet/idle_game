/**
 * Gabriel — the game's virtual assistant: a small, slightly angelic floating
 * robot companion who guides the tutorial and narrates story beats. One
 * hand-coded SVG character, four poses, all sharing the same base body so he
 * is obviously the same little guy everywhere (44–90 px).
 *
 * Pose guide:
 *   idle  — friendly neutral, small smile, waving one tiny hand
 *   point — pointing enthusiastically to the side (directs attention)
 *   cheer — arms up, starry eyes (step complete / milestone)
 *   think — hand on chin, eyes drifting up (story narration)
 *
 * The whole character is wrapped in `class="gabriel-float"` and the halo in
 * `class="gabriel-halo"` — both are animated from style.css (gentle bob +
 * halo shimmer); no styling lives here.
 */

const INK = '#2d2440';
const GOLD = '#ffc93c';
const GOLD_DEEP = '#e8a20b';
const BLUE = '#38b6ff';
const BLUE_SOFT = '#7fd0ff';

export type GabrielPose = 'idle' | 'point' | 'cheer' | 'think';

const POSES: ReadonlySet<string> = new Set(['idle', 'point', 'cheer', 'think']);

/** Four-point sparkle (cheer eyes, belly light, confetti). */
function sparkle(cx: number, cy: number, r: number, fill: string, extra = ''): string {
  const s = r * 0.32;
  return `<path d="M${cx} ${cy - r} L${cx + s} ${cy - s} L${cx + r} ${cy} L${cx + s} ${cy + s} L${cx} ${cy + r} L${cx - s} ${cy + s} L${cx - r} ${cy} L${cx - s} ${cy - s} Z" fill="${fill}" ${extra}/>`;
}

/** Outlined stubby arm: ink tube with a blue core, round caps. */
function arm(d: string): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Mitten hand at the end of an arm. */
function hand(x: number, y: number, r = 1.9): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${BLUE_SOFT}" stroke="${INK}" stroke-width="1.3"/>`;
}

/** Gradient defs, ids prefixed per-pose so two poses can share the DOM. */
function gabrielDefs(pose: GabrielPose): string {
  return `<defs>
    <linearGradient id="lg-gabriel-${pose}-body" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f4e6c9"/>
    </linearGradient>
    <linearGradient id="lg-gabriel-${pose}-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a8ddff"/><stop offset="1" stop-color="#5fc4ff"/>
    </linearGradient>
  </defs>`;
}

/** Golden halo ring — the angelic bit. Animated via .gabriel-halo in CSS. */
function halo(): string {
  return `<g class="gabriel-halo">
    <ellipse cx="24" cy="6.8" rx="6.2" ry="1.9" fill="none" stroke="${GOLD_DEEP}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="24" cy="6.8" rx="6.2" ry="1.9" fill="none" stroke="${GOLD}" stroke-width="1.9" stroke-linecap="round"/>
    <ellipse cx="24" cy="6.5" rx="4.6" ry="1.1" fill="none" stroke="#ffe9a8" stroke-width="0.7" opacity="0.85"/>
  </g>`;
}

/**
 * Shared base body: antenna, cream capsule with cel shade + highlight, blue
 * face screen, blush, belly light, rivets. Every pose draws this identical
 * core, then layers pose-specific eyes/mouth/arms on top.
 */
function bodyCore(pose: GabrielPose): string {
  return `
    <line x1="24" y1="15.6" x2="24" y2="10.4" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="24" cy="10" r="1.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.1"/>
    <ellipse cx="24" cy="27" rx="11.3" ry="12.3" fill="url(#lg-gabriel-${pose}-body)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30.6 17.6 q5.7 4.8 4 13 q-1.2 5.5 -5.4 7.7 q6.3 -10.3 1.4 -20.7 z" fill="#e9d8b4" opacity="0.8"/>
    <ellipse cx="18" cy="18.4" rx="3.3" ry="1.9" fill="#ffffff" opacity="0.6" transform="rotate(-24 18 18.4)"/>
    <rect x="15.2" y="19" width="17.6" height="10.6" rx="5.3" fill="url(#lg-gabriel-${pose}-face)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17.6 21.4 q6.4 -2.5 12.8 0" fill="none" stroke="#e6f6ff" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>
    <circle cx="17.7" cy="26.3" r="1.25" fill="#ff9d9d" opacity="0.55"/>
    <circle cx="30.3" cy="26.3" r="1.25" fill="#ff9d9d" opacity="0.55"/>
    <circle cx="24" cy="33.6" r="2.3" fill="${GOLD}" stroke="${INK}" stroke-width="1.3"/>
    ${sparkle(24, 33.6, 1.1, '#fff3cd')}
    <circle cx="15" cy="32" r="0.5" fill="${INK}" opacity="0.35"/>
    <circle cx="33" cy="32" r="0.5" fill="${INK}" opacity="0.35"/>`;
}

/** Big warm eye with two catchlights, pupils offset for gaze direction. */
function warmEye(cx: number, cy: number, r = 2.1): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>
          <circle cx="${cx - 0.7}" cy="${cy - 0.8}" r="0.75" fill="#ffffff"/>
          <circle cx="${cx + 0.6}" cy="${cy + 0.4}" r="0.3" fill="#ffffff" opacity="0.85"/>`;
}

function eyes(pose: GabrielPose): string {
  switch (pose) {
    case 'cheer': // gold stars
      return `${sparkle(20, 23.6, 2.7, GOLD, `stroke="${GOLD_DEEP}" stroke-width="0.6" stroke-linejoin="round"`)}
              ${sparkle(28, 23.6, 2.7, GOLD, `stroke="${GOLD_DEEP}" stroke-width="0.6" stroke-linejoin="round"`)}`;
    case 'think': // gazing up-left, one brow raised
      return `<path d="M18.2 21 q1.6 -1.1 3.2 -0.3" fill="none" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>
              <path d="M26.6 21.3 q1.6 -0.5 3.2 0" fill="none" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>
              ${warmEye(19.5, 23.1)}
              ${warmEye(27.5, 23.1)}`;
    case 'point': // wide + eager, both brows up
      return `<path d="M18.3 20.9 q1.7 -0.9 3.4 -0.3" fill="none" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>
              <path d="M26.3 20.6 q1.7 -0.6 3.4 0.3" fill="none" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>
              ${warmEye(20, 23.6, 2.3)}
              ${warmEye(28, 23.6, 2.3)}`;
    default: // idle
      return `${warmEye(20, 23.6)}
              ${warmEye(28, 23.6)}`;
  }
}

function mouth(pose: GabrielPose): string {
  switch (pose) {
    case 'cheer': // big open grin + tongue
      return `<path d="M20.6 26.2 h6.8 q-0.5 3.5 -3.4 3.5 q-2.9 0 -3.4 -3.5 z" fill="${INK}"/>
              <ellipse cx="24" cy="28.9" rx="1.6" ry="0.9" fill="#ff8f8f"/>`;
    case 'point': // excited little open smile
      return `<path d="M21.8 26.4 h4.4 q-0.4 2.5 -2.2 2.5 q-1.8 0 -2.2 -2.5 z" fill="${INK}"/>
              <ellipse cx="24" cy="28.3" rx="1" ry="0.55" fill="#ff9d9d"/>`;
    case 'think': // hmm
      return `<path d="M22.4 27.3 q0.8 -0.7 1.6 0 q0.8 0.7 1.6 0" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`;
    default: // idle small smile
      return `<path d="M22 26.8 q2 1.7 4 0" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`;
  }
}

/** Tiny arms + hands, drawn over the body so hands can overlap the face. */
function arms(pose: GabrielPose): string {
  switch (pose) {
    case 'point': // right arm out flat, finger extended; left fist on hip
      return `${arm('M34.2 27 q4.2 -0.7 6.8 -1.3')}
              ${hand(41.6, 25.5)}
              <path d="M41.8 25.5 l2.8 -0.6" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M41.8 25.5 l2.8 -0.6" fill="none" stroke="${BLUE_SOFT}" stroke-width="1.2" stroke-linecap="round"/>
              ${arm('M13.8 27.2 q-3.4 0.4 -3 3.4')}
              ${hand(10.9, 30.8)}`;
    case 'cheer': // both arms up in a V
      return `${arm('M33.8 25.4 q4 -3 4.5 -7.2')}
              ${hand(38.6, 17)}
              ${arm('M14.2 25.4 q-4 -3 -4.5 -7.2')}
              ${hand(9.4, 17)}`;
    case 'think': // hand on chin, other arm folded across the belly
      return `${arm('M13.8 27.6 q1.6 3.3 5.4 3.3')}
              ${hand(19.5, 30.9)}
              ${arm('M34.6 29.2 q-0.8 2.5 -3.8 1.8')}
              ${hand(29, 30.4)}`;
    default: // idle — one hand resting, one mid-wave
      return `${arm('M34.2 26.8 q4.4 -1.5 5.4 -6')}
              ${hand(39.9, 19.7)}
              ${arm('M13.8 27.2 q-2.6 1.4 -2.8 4')}
              ${hand(11, 32)}`;
  }
}

/** Pose flavor floating around the body (motion arcs, confetti, dots). */
function extras(pose: GabrielPose): string {
  switch (pose) {
    case 'point': // emphasis dashes where he's pointing
      return `<g stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round" fill="none">
                <path d="M45.4 22.4 l1.8 -1"/>
                <path d="M46.2 25.4 l1.6 0.1"/>
              </g>`;
    case 'cheer': // confetti sparkles
      return `${sparkle(8, 11.5, 1.7, GOLD)}
              ${sparkle(40.4, 10.6, 1.9, GOLD)}
              ${sparkle(43.4, 19, 1.3, BLUE)}
              <circle cx="5.6" cy="19.4" r="0.9" fill="${BLUE}"/>
              <circle cx="36.6" cy="6.2" r="0.8" fill="#ff9d9d"/>`;
    case 'think': // thought dots drifting up
      return `<g fill="#fff8ec" stroke="${INK}" stroke-width="1.1">
                <circle cx="36.6" cy="15.4" r="1" opacity="0.75"/>
                <circle cx="39.6" cy="11.6" r="1.5" opacity="0.85"/>
                <circle cx="43.2" cy="7" r="2.1"/>
              </g>`;
    default: // idle — little motion arcs by the waving hand
      return `<g stroke="${INK}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.45">
                <path d="M42.8 21.6 q1.6 -1.6 1.8 -3.6"/>
                <path d="M43.6 24.4 q2.4 -2.2 2.7 -5.2"/>
              </g>`;
  }
}

const memo = new Map<string, string>();

/** Inline SVG string of Gabriel in the given pose. Memoised. */
export function gabriel(pose: GabrielPose = 'idle', size = 72): string {
  const p = (POSES.has(pose) ? pose : 'idle') as GabrielPose;
  const key = `${p}:${size}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const svg = `<svg class="gabriel" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    ${gabrielDefs(p)}
    <ellipse cx="24" cy="44.6" rx="8.5" ry="1.8" fill="${INK}" opacity="0.12"/>
    <g class="gabriel-float">
      ${halo()}
      ${bodyCore(p)}
      ${eyes(p)}
      ${mouth(p)}
      ${arms(p)}
      ${extras(p)}
    </g>
  </svg>`;
  memo.set(key, svg);
  return svg;
}
