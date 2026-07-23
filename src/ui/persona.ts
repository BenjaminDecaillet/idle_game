import type { Specialization } from '../game/types';

/**
 * Procedural "little persona" avatars: every worker gets a deterministic
 * SVG character (skin, hair, shirt, tier accessory, and a bunch of facial
 * flavor) derived from a seed, so the same person always looks the same —
 * no image assets needed.
 *
 * Trait bit-map (all derived from the single 32-bit `hashSeed(seed)` value,
 * each trait reading a different shift so traits vary independently). All
 * shifts use `>>>` (unsigned) rather than `>>` — `h` can exceed 2^31, and a
 * signed shift would go negative for roughly half of all seeds:
 *   h         % SKIN.length        -> skin tone
 *   h >>> 3   % HAIR.length        -> hair color
 *   h >>> 5   % 2                  -> senior-tier grey-hair bias roll
 *   h >>> 7   % HAIRSTYLE_COUNT    -> hairstyle (8 styles)
 *   h >>> 9   % GREY_HAIR.length   -> which grey shade, when biased
 *   h >>> 11  % 3                  -> eye style (dots / happy arcs / wide)
 *   h >>> 14  % 3                  -> eyebrow style
 *   h >>> 17  % 4                  -> mouth style
 *   h >>> 20  % 4                  -> facial hair (none/moustache/beard/goatee)
 *   h >>> 23  % 3                  -> cheek blemish (none/freckles/blush)
 *   h >>> 26  % 2                  -> whether a shirt detail is present (~50%)
 *   h >>> 28  % 5                  -> which shirt detail (collar/tie/zip/pocket/hoodie)
 */

const SKIN = [
  '#f9d5b3',
  '#eebc95',
  '#d19a6b',
  '#a9714b',
  '#8a5a3b',
  '#f7c8c0',
  '#c68642',
  '#7a4a2b',
  '#ffe0bd',
];
const HAIR = [
  '#2b2b2b',
  '#5b3a1e',
  '#a9741f',
  '#d9c087',
  '#b8442c',
  '#6b7280',
  '#7c3aed',
  '#0ea5e9',
  '#111827',
  '#e2b04a',
  '#be185d',
];
/** Extra grey/white shades used to flavor senior-tier hires. */
const GREY_HAIR = ['#9ca3af', '#c7ccd4', '#e5e7eb'];

const SHIRT: Record<Specialization, string> = {
  Frontend: '#ec4899',
  Backend: '#3b82f6',
  DevOps: '#10b981',
  'Data Science': '#f59e0b',
};

const HAIRSTYLE_COUNT = 8;

const SENIOR_TIERS = new Set(['senior', 'architect', 'principal']);

/** Small deterministic hash for seeding looks. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PersonaLook {
  skin: string;
  hair: string;
  shirt: string;
  hairstyle: number; // 0..7
  eyeStyle: number; // 0..2
  eyebrowStyle: number; // 0..2
  mouthStyle: number; // 0..3
  facialHair: number; // 0..3 (0 = none)
  blemish: number; // 0..2 (0 = none, 1 = freckles, 2 = blush)
  shirtDetail: number; // 0..5 (0 = none, else pattern kind)
}

/**
 * Derive a deterministic look from a seed. `tierId` is optional (backward
 * compatible) — when supplied, senior/architect/principal hires get a
 * chance at grey/white hair for a bit of seniority flavor.
 */
export function personaLook(
  seed: string,
  specialization: Specialization,
  tierId?: string,
): PersonaLook {
  const h = hashSeed(seed);

  // NOTE: use `>>>` (unsigned shift), not `>>` — `h` can exceed 2^31, and a
  // plain `>>` re-applies ToInt32 on every call, silently going negative
  // (and producing a negative, out-of-range array index) for about half of
  // all seeds.
  let hair = HAIR[(h >>> 3) % HAIR.length];
  if (tierId && SENIOR_TIERS.has(tierId) && (h >>> 5) % 2 === 0) {
    hair = GREY_HAIR[(h >>> 9) % GREY_HAIR.length];
  }

  const hasShirtDetail = (h >>> 26) % 2 === 0;

  return {
    skin: SKIN[h % SKIN.length],
    hair,
    shirt: SHIRT[specialization],
    hairstyle: (h >>> 7) % HAIRSTYLE_COUNT,
    eyeStyle: (h >>> 11) % 3,
    eyebrowStyle: (h >>> 14) % 3,
    mouthStyle: (h >>> 17) % 4,
    facialHair: (h >>> 20) % 4,
    blemish: (h >>> 23) % 3,
    shirtDetail: hasShirtDetail ? 1 + ((h >>> 28) % 5) : 0,
  };
}

function hairPath(style: number, hair: string): string {
  switch (style) {
    case 0: // short crop
      return `<path d="M9 12 a7.2 7.2 0 0 1 14 0 v-1.5 a7.2 7.2 0 0 0 -14 0 z" fill="${hair}"/>
              <path d="M9 12 a7.2 7.2 0 0 1 14 0 l-1.2 -3.5 a6.5 6.5 0 0 0 -11.6 0 z" fill="${hair}"/>`;
    case 1: // side part
      return `<path d="M9 12.5 q0 -8 8.5 -7 q6 0.8 5.5 7 l-2.2 -1 q0.3 -4 -4.5 -4.5 l0.4 2 l-2.6 -1.8 q-4.8 0.4 -4.6 5.3 z" fill="${hair}"/>`;
    case 2: // bun
      return `<circle cx="16" cy="4.4" r="2.6" fill="${hair}"/>
              <path d="M9 12 a7.2 7.2 0 0 1 14 0 l-1.6 -2.6 a6 6 0 0 0 -10.8 0 z" fill="${hair}"/>`;
    case 3: // curly
      return `<circle cx="10.8" cy="9.4" r="2.6" fill="${hair}"/>
              <circle cx="16" cy="7.6" r="3" fill="${hair}"/>
              <circle cx="21.2" cy="9.4" r="2.6" fill="${hair}"/>`;
    case 4: // long, flowing down past the shoulders
      return `<path d="M9 12.4 q-0.4 -8.6 7 -8.4 q7.4 -0.2 7 8.4 l-1.6 -0.6 q0.6 -6.6 -5.4 -6.9 q-6 0.3 -5.4 6.9 z" fill="${hair}"/>
              <path d="M8.2 12 q-0.8 5.4 0.3 9.2 l1.8 -0.5 q-1.1 -4 -0.4 -8.4 z" fill="${hair}"/>
              <path d="M23.8 12 q0.8 5.4 -0.3 9.2 l-1.8 -0.5 q1.1 -4 0.4 -8.4 z" fill="${hair}"/>`;
    case 5: // mohawk, shaved sides
      return `<path d="M14.4 3.6 q1.6 -1.8 3.2 0 l0.7 7.6 h-4.6 z" fill="${hair}"/>`;
    case 6: // afro
      return `<path fill-rule="evenodd" d="M16 0.8 a9.2 9.2 0 1 0 0.02 0 z M16 4.2 a6.1 6.1 0 1 0 0.02 0 z" fill="${hair}"/>`;
    default: // bald with a low fringe
      return `<path d="M9.4 13 a7 7 0 0 0 13.2 0 l-0.7 2.6 a6.1 6.1 0 0 1 -11.8 0 z" fill="${hair}"/>`;
  }
}

function eyebrowPath(style: number, hair: string): string {
  switch (style) {
    case 0: // straight
      return `<path d="M12 11.7 h2.6" stroke="${hair}" stroke-width="0.75" stroke-linecap="round"/>
              <path d="M17.4 11.7 h2.6" stroke="${hair}" stroke-width="0.75" stroke-linecap="round"/>`;
    case 1: // raised / quizzical
      return `<path d="M12 12 l2.6 -0.9" stroke="${hair}" stroke-width="0.75" stroke-linecap="round"/>
              <path d="M17.4 11.1 l2.6 0.9" stroke="${hair}" stroke-width="0.75" stroke-linecap="round"/>`;
    default: // furrowed
      return `<path d="M11.9 11.9 q1.4 -1 2.8 0" stroke="${hair}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
              <path d="M17.3 11.9 q1.4 -1 2.8 0" stroke="${hair}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
  }
}

function eyePath(style: number): string {
  switch (style) {
    case 0: // dots
      return `<circle cx="13.4" cy="13.8" r="0.9" fill="#1f2937"/>
              <circle cx="18.6" cy="13.8" r="0.9" fill="#1f2937"/>`;
    case 1: // happy arcs
      return `<path d="M12.2 14 q1.2 -1.6 2.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>
              <path d="M17.4 14 q1.2 -1.6 2.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    default: // wide
      return `<circle cx="13.4" cy="13.7" r="1.3" fill="none" stroke="#1f2937" stroke-width="0.7"/>
              <circle cx="13.4" cy="13.7" r="0.5" fill="#1f2937"/>
              <circle cx="18.6" cy="13.7" r="1.3" fill="none" stroke="#1f2937" stroke-width="0.7"/>
              <circle cx="18.6" cy="13.7" r="0.5" fill="#1f2937"/>`;
  }
}

function mouthPath(style: number): string {
  switch (style) {
    case 0: // smile
      return `<path d="M13.8 17.2 q2.2 1.6 4.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    case 1: // big grin
      return `<path d="M13.3 16.9 q2.7 2.2 5.4 0" stroke="#1f2937" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    case 2: // neutral
      return `<line x1="14" y1="17.3" x2="18" y2="17.3" stroke="#1f2937" stroke-width="0.9" stroke-linecap="round"/>`;
    default: // open / talking
      return `<ellipse cx="16" cy="17.4" rx="1.3" ry="1.6" fill="#1f2937"/>`;
  }
}

function facialHairPath(style: number, hair: string): string {
  switch (style) {
    case 0:
      return '';
    case 1: // moustache
      return `<path d="M13.6 16.5 q1.2 -0.9 2.4 0 q1.2 -0.9 2.4 0" stroke="${hair}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    case 2: // full beard
      return `<path d="M10.7 14.8 q-0.4 5.6 5.3 6.5 q5.7 -0.9 5.3 -6.5 q-1.5 4.5 -5.3 4.7 q-3.8 -0.2 -5.3 -4.7 z" fill="${hair}" opacity="0.92"/>`;
    default: // goatee
      return `<path d="M14 18 q2 2.5 4 0 q-0.3 2.7 -2 2.7 q-1.7 0 -2 -2.7 z" fill="${hair}"/>`;
  }
}

function blemishPath(style: number): string {
  switch (style) {
    case 0:
      return '';
    case 1: // freckles
      return `<g fill="#7c4a2d" opacity="0.5">
                <circle cx="11.6" cy="15" r="0.35"/><circle cx="12.5" cy="15.7" r="0.35"/><circle cx="11" cy="16" r="0.3"/>
                <circle cx="20.4" cy="15" r="0.35"/><circle cx="19.5" cy="15.7" r="0.35"/><circle cx="21" cy="16" r="0.3"/>
              </g>`;
    default: // blush
      return `<circle cx="11.7" cy="15.6" r="1.3" fill="#f87171" opacity="0.32"/>
              <circle cx="20.3" cy="15.6" r="1.3" fill="#f87171" opacity="0.32"/>`;
  }
}

/** All the face-interior traits, drawn in the avatar's native coordinate
 * space (head centered around 16,13). Callers wrap this in the same
 * translate/scale group used for `hairPath` so features line up. */
function facialFeatures(look: PersonaLook): string {
  return `${eyebrowPath(look.eyebrowStyle, look.hair)}
          ${eyePath(look.eyeStyle)}
          ${mouthPath(look.mouthStyle)}
          ${facialHairPath(look.facialHair, look.hair)}
          ${blemishPath(look.blemish)}`;
}

/** Small dark accent drawn onto the shirt: collar/tie/zip/pocket/hoodie
 * strings, anchored at the neckline point (cx, topY) of a given scene. */
function shirtDetailPath(type: number, cx: number, topY: number): string {
  const ink = '#0f172a';
  switch (type) {
    case 1: // collar
      return `<path d="M${cx - 2.6} ${topY} l2.6 2.6 l2.6 -2.6" fill="none" stroke="${ink}" stroke-width="0.7" opacity="0.45"/>`;
    case 2: // tie
      return `<path d="M${cx - 0.7} ${topY} h1.4 l-0.5 1.8 h-0.4 z" fill="${ink}" opacity="0.55"/>
              <rect x="${cx - 0.5}" y="${topY + 1.7}" width="1" height="4.6" fill="${ink}" opacity="0.5"/>`;
    case 3: // zip line
      return `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${topY + 7}" stroke="${ink}" stroke-width="0.55" opacity="0.45"/>`;
    case 4: // chest pocket
      return `<rect x="${cx - 4.6}" y="${topY + 3.6}" width="2.8" height="2.2" rx="0.35" fill="${ink}" opacity="0.3"/>`;
    case 5: // hoodie strings
      return `<line x1="${cx - 1.3}" y1="${topY}" x2="${cx - 1.6}" y2="${topY + 3.6}" stroke="${ink}" stroke-width="0.55" opacity="0.5"/>
              <circle cx="${cx - 1.6}" cy="${topY + 3.6}" r="0.45" fill="${ink}" opacity="0.5"/>
              <line x1="${cx + 1.3}" y1="${topY}" x2="${cx + 1.6}" y2="${topY + 3.6}" stroke="${ink}" stroke-width="0.55" opacity="0.5"/>
              <circle cx="${cx + 1.6}" cy="${topY + 3.6}" r="0.45" fill="${ink}" opacity="0.5"/>`;
    default:
      return '';
  }
}

function accessory(tierId: string): string {
  switch (tierId) {
    case 'intern': // backwards cap
      return `<path d="M8.6 9.6 a7.5 7.5 0 0 1 14.8 0 l0 1 l-14.8 0 z" fill="#ef4444"/>
              <rect x="20.5" y="9.2" width="5" height="2" rx="1" fill="#b91c1c"/>`;
    case 'mid': // glasses
      return `<g stroke="#0f172a" stroke-width="1.1" fill="none">
                <circle cx="12.6" cy="13.6" r="2.3"/><circle cx="19.4" cy="13.6" r="2.3"/>
                <line x1="14.9" y1="13.6" x2="17.1" y2="13.6"/>
              </g>`;
    case 'senior': // headphones
      return `<path d="M8.8 12 a7.4 7.4 0 0 1 14.4 0" stroke="#334155" stroke-width="1.6" fill="none"/>
              <rect x="7.6" y="11" width="2.6" height="4.4" rx="1.2" fill="#334155"/>
              <rect x="21.8" y="11" width="2.6" height="4.4" rx="1.2" fill="#334155"/>`;
    case 'architect': // golden crown
      return `<path d="M10.5 8.6 l1.8 -3 l2 2.2 l1.7 -3 l1.7 3 l2 -2.2 l1.8 3 z" fill="#fbbf24" stroke="#d97706" stroke-width="0.5"/>`;
    case 'principal': // halo
      return `<ellipse cx="16" cy="4.2" rx="4.6" ry="1.4" fill="none" stroke="#fde68a" stroke-width="1.4"/>`;
    default:
      return '';
  }
}

/**
 * Bust avatar (head + shoulders) for cards. size in px.
 */
export function personaAvatar(
  seed: string,
  specialization: Specialization,
  tierId: string,
  size = 44,
): string {
  const look = personaLook(seed, specialization, tierId);
  return `<svg class="persona-avatar" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.06)"/>
    <path d="M6 32 q0 -9 10 -9 q10 0 10 9 z" fill="${look.shirt}"/>
    ${shirtDetailPath(look.shirtDetail, 16, 23.4)}
    <circle cx="16" cy="13" r="7" fill="${look.skin}"/>
    ${hairPath(look.hairstyle, look.hair)}
    ${facialFeatures(look)}
    ${accessory(tierId)}
  </svg>`;
}

/**
 * Full-body seated-at-desk scene for the office floor: desk, glowing
 * monitor, and the persona typing away (animation via CSS classes
 * .persona-sit-head / .persona-sit-arms).
 */
export function personaAtDesk(
  seed: string,
  specialization: Specialization,
  tierId: string,
): string {
  const look = personaLook(seed, specialization, tierId);
  return `<svg class="persona-desk" viewBox="0 0 64 56" aria-hidden="true">
    <!-- chair -->
    <rect x="8" y="30" width="12" height="4" rx="2" fill="#1f2937"/>
    <rect x="12" y="33" width="4" height="12" fill="#1f2937"/>
    <!-- person -->
    <g class="persona-sit-head">
      <circle cx="20" cy="16" r="6.4" fill="${look.skin}"/>
      <g transform="translate(4.8,2.6) scale(0.92)">${hairPath(look.hairstyle, look.hair)}</g>
      <g transform="translate(4.8,2.6) scale(0.92)">${facialFeatures(look)}</g>
      <g transform="translate(4.8,2.6) scale(0.92)">${accessory(tierId)}</g>
    </g>
    <path d="M13 34 q0 -12 8 -11 q6 0.6 8 6 l3 5 z" fill="${look.shirt}"/>
    ${shirtDetailPath(look.shirtDetail, 20, 27)}
    <g class="persona-sit-arms">
      <path d="M24 27 q5 2 8 4" stroke="${look.shirt}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <circle cx="33" cy="31.6" r="1.7" fill="${look.skin}"/>
    </g>
    <!-- desk -->
    <rect x="30" y="33" width="30" height="3" rx="1.5" fill="#475569"/>
    <rect x="42" y="36" width="4" height="10" fill="#334155"/>
    <!-- laptop -->
    <rect x="34" y="24" width="16" height="10" rx="1.2" fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
    <rect x="35.4" y="25.4" width="13.2" height="7.2" rx="0.6" class="persona-screen"/>
    <rect x="33" y="33.4" width="18" height="1.6" rx="0.8" fill="#1e293b"/>
  </svg>`;
}

/** Standing idle persona (workers without a desk), swaying via CSS. */
export function personaStanding(
  seed: string,
  specialization: Specialization,
  tierId: string,
): string {
  const look = personaLook(seed, specialization, tierId);
  return `<svg class="persona-stand" viewBox="0 0 32 56" aria-hidden="true">
    <g class="persona-sway">
      <circle cx="16" cy="12" r="6.6" fill="${look.skin}"/>
      <g transform="translate(0.6,-1.4) scale(0.96)">${hairPath(look.hairstyle, look.hair)}</g>
      <g transform="translate(0.6,-1.4) scale(0.96)">${facialFeatures(look)}</g>
      <g transform="translate(0.6,-1.4) scale(0.96)">${accessory(tierId)}</g>
      <path d="M9 34 q0 -16 7 -15 q7 -1 7 15 z" fill="${look.shirt}"/>
      ${shirtDetailPath(look.shirtDetail, 16, 22)}
      <rect x="11.4" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
      <rect x="17" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
    </g>
  </svg>`;
}
