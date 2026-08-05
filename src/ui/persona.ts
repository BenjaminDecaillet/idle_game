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
 *   h >>> 1   % 4                  -> rare-eye roll (0 => one of the new eye styles)
 *   h >>> 2   % 110                -> seated head-bob phase (hundredths of a second)
 *   h >>> 3   % HAIR.length        -> hair color
 *   h >>> 4   % 2                  -> which new eye style (closed-content / wink)
 *   h >>> 5   % 2                  -> senior-tier grey-hair bias roll
 *   h >>> 6   % 4                  -> rare-mouth roll (0 => one of the new mouth styles)
 *   h >>> 7   % HAIRSTYLE_COUNT    -> hairstyle (8 styles)
 *   h >>> 8   % 2                  -> which new mouth style (tongue-smile / smirk)
 *   h >>> 9   % GREY_HAIR.length   -> which grey shade, when biased
 *   h >>> 10  % 68                 -> typing-arms phase (hundredths of a second)
 *   h >>> 11  % 3                  -> base eye style (dots / happy arcs / wide)
 *   h >>> 12  % 8                  -> desk micro-prop (mug/stickies/plant/duck, 4..7 = none)
 *   h >>> 13  % 40                 -> blink animation phase (tenths of a second)
 *   h >>> 14  % 3                  -> eyebrow style
 *   h >>> 15  % 34                 -> seated idle-bob phase (tenths of a second)
 *   h >>> 16  % pool               -> raster portrait slot (see portraits.ts)
 *   h >>> 17  % 4                  -> base mouth style
 *   h >>> 18  % 26                 -> standing-sway phase (tenths of a second)
 *   h >>> 20  % 4                  -> facial hair (none/moustache/beard/goatee)
 *   h >>> 21  % 23                 -> screen-glow phase (tenths of a second)
 *   h >>> 23  % 3                  -> cheek blemish (none/freckles/blush)
 *   h >>> 24  % 50                 -> founder drone-float phase (player hash, tenths)
 *   h >>> 26  % 2                  -> whether a shirt detail is present (~50%)
 *   h >>> 27  % 28                 -> founder core-pulse phase (player hash, tenths)
 *   h >>> 28  % 5                  -> which shirt detail (collar/tie/zip/pocket/hoodie)
 *
 * NOTE for future edits: never change an existing shift/modulo pair — that
 * would reshuffle every already-hired worker's face. Add NEW shifts instead
 * (like the >>>1/4/6/8/12/13 rows above did).
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
/** Total eye styles (0..2 base + 3 closed-content + 4 wink). */
const EYE_STYLE_COUNT = 5;
/** Total mouth styles (0..3 base + 4 tongue-smile + 5 smirk). */
const MOUTH_STYLE_COUNT = 6;

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

/**
 * Which raster portrait file (0-based) a worker maps to, out of a pool of
 * `poolSize` interchangeable portraits. Rides its own hash shift (>>> 16)
 * so existing face traits keep their derivation — same worker, same
 * portrait, forever (see docs/portraits.md).
 */
export function portraitSlot(seed: string, poolSize: number): number {
  return (hashSeed(seed) >>> 16) % poolSize;
}

export interface PersonaLook {
  skin: string;
  hair: string;
  shirt: string;
  hairstyle: number; // 0..7
  eyeStyle: number; // 0..4 (3+ are the rare new styles)
  eyebrowStyle: number; // 0..2
  mouthStyle: number; // 0..5 (4+ are the rare new styles)
  facialHair: number; // 0..3 (0 = none)
  blemish: number; // 0..2 (0 = none, 1 = freckles, 2 = blush)
  shirtDetail: number; // 0..5 (0 = none, else pattern kind)
  deskProp: number; // 0 = none, 1 mug, 2 stickies, 3 plant, 4 duck
  blinkDelay: number; // seconds (0..3.9), staggers the CSS blink loop
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

  // New-generation face traits ride on NEW shifts so pre-existing traits
  // keep their derivation: 1 in 4 workers rolls an extended eye style, and
  // (independently) 1 in 4 rolls an extended mouth style.
  let eyeStyle = (h >>> 11) % 3;
  if ((h >>> 1) % 4 === 0) eyeStyle = 3 + ((h >>> 4) % 2);
  let mouthStyle = (h >>> 17) % 4;
  if ((h >>> 6) % 4 === 0) mouthStyle = 4 + ((h >>> 8) % 2);

  // Desk micro-prop: half of all workers personalize their desk (values
  // 4..7 mean "tidy desk, nothing extra").
  const propRoll = (h >>> 12) % 8;

  return {
    skin: SKIN[h % SKIN.length],
    hair,
    shirt: SHIRT[specialization],
    hairstyle: (h >>> 7) % HAIRSTYLE_COUNT,
    eyeStyle,
    eyebrowStyle: (h >>> 14) % 3,
    mouthStyle,
    facialHair: (h >>> 20) % 4,
    blemish: (h >>> 23) % 3,
    shirtDetail: hasShirtDetail ? 1 + ((h >>> 28) % 5) : 0,
    deskProp: propRoll < 4 ? propRoll + 1 : 0,
    blinkDelay: ((h >>> 13) % 40) / 10,
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
    case 2: // wide
      return `<circle cx="13.4" cy="13.7" r="1.3" fill="none" stroke="#1f2937" stroke-width="0.7"/>
              <circle cx="13.4" cy="13.7" r="0.5" fill="#1f2937"/>
              <circle cx="18.6" cy="13.7" r="1.3" fill="none" stroke="#1f2937" stroke-width="0.7"/>
              <circle cx="18.6" cy="13.7" r="0.5" fill="#1f2937"/>`;
    case 3: // happy-closed: content downward arcs with tiny lashes
      return `<path d="M12.2 13.5 q1.2 1.5 2.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>
              <path d="M17.4 13.5 q1.2 1.5 2.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>
              <path d="M11.9 13.2 l-0.6 -0.4 M15 13.2 l0.6 -0.4 M17.1 13.2 l-0.6 -0.4 M20.2 13.2 l0.6 -0.4" stroke="#1f2937" stroke-width="0.55" stroke-linecap="round"/>`;
    default: // wink (left open dot, right cheeky closed arc)
      return `<circle cx="13.4" cy="13.8" r="0.9" fill="#1f2937"/>
              <path d="M17.4 13.8 q1.2 1.3 2.4 0" stroke="#1f2937" stroke-width="0.95" fill="none" stroke-linecap="round"/>`;
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
    case 3: // open / talking
      return `<ellipse cx="16" cy="17.4" rx="1.3" ry="1.6" fill="#1f2937"/>`;
    case 4: // open laughing smile with tongue
      return `<path d="M13.5 16.7 a2.5 2.5 0 0 0 5 0 z" fill="#1f2937"/>
              <path d="M14.7 18.15 a1.3 1 0 0 0 2.6 0 z" fill="#f87171"/>`;
    default: // smirk
      return `<path d="M13.9 17.5 q1.9 0.9 3.9 -0.7" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>
              <path d="M17.8 16.8 q0.6 -0.1 0.8 0.4" stroke="#1f2937" stroke-width="0.7" fill="none" stroke-linecap="round"/>`;
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

/** Eye styles that are drawn open (closed styles should not "blink"). */
const OPEN_EYES = new Set([0, 2, 4]);

/** All the face-interior traits, drawn in the avatar's native coordinate
 * space (head centered around 16,13). Callers wrap this in the same
 * translate/scale group used for `hairPath` so features line up.
 * Open-eyed personas get a `.persona-blink` group (CSS eyelid animation),
 * phase-staggered per person via the hash-derived blinkDelay. */
function facialFeatures(look: PersonaLook): string {
  const eyes = OPEN_EYES.has(look.eyeStyle)
    ? `<g class="persona-blink" style="animation-delay:-${look.blinkDelay}s">${eyePath(look.eyeStyle)}</g>`
    : eyePath(look.eyeStyle);
  return `${eyebrowPath(look.eyebrowStyle, look.hair)}
          ${eyes}
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

/**
 * Tier-driven outfit layered over the specialization shirt color (which
 * must stay recognizable — outfits are trims/panels, never full recolors):
 * intern/junior plain tee, mid zip hoodie, senior smart shirt with rolled
 * sleeves, architect vest, principal gold-trim jacket.
 * (cx, topY) = neckline anchor, w = torso half-width at chest, botY =
 * bottom of the torso — the same anchors shirtDetailPath uses.
 */
function tierOutfitPath(
  tierId: string,
  cx: number,
  topY: number,
  w: number,
  botY: number,
): string {
  const ink = '#0f172a';
  switch (tierId) {
    case 'mid': // zip hoodie: draped hood, zipper, kangaroo pocket
      return `<path d="M${cx - 3.2} ${topY - 0.2} q3.2 3 6.4 0 l1 1.8 q-4.2 3 -8.4 0 z" fill="${ink}" opacity="0.22"/>
              <line x1="${cx}" y1="${topY + 2}" x2="${cx}" y2="${botY - 0.4}" stroke="${ink}" stroke-width="0.6" opacity="0.5"/>
              <circle cx="${cx}" cy="${topY + 2}" r="0.5" fill="${ink}" opacity="0.5"/>
              <path d="M${cx - 3.1} ${botY - 1} l1 -2.2 h4.2 l1 2.2" fill="none" stroke="${ink}" stroke-width="0.55" opacity="0.4"/>`;
    case 'senior': // smart shirt: crisp collar, buttons, rolled-sleeve cuffs
      return `<path d="M${cx - 2.7} ${topY - 0.3} l2.7 2.5 l2.7 -2.5 l1.1 1.1 l-3.8 3 l-3.8 -3 z" fill="#fdfdfd" stroke="${ink}" stroke-width="0.5" opacity="0.9"/>
              <circle cx="${cx}" cy="${topY + 4.4}" r="0.42" fill="${ink}" opacity="0.5"/>
              <circle cx="${cx}" cy="${topY + 6.4}" r="0.42" fill="${ink}" opacity="0.5"/>
              <rect x="${cx - w - 0.5}" y="${topY + 3.2}" width="2" height="1.6" rx="0.6" fill="#fdfdfd" opacity="0.75"/>
              <rect x="${cx + w - 1.5}" y="${topY + 3.2}" width="2" height="1.6" rx="0.6" fill="#fdfdfd" opacity="0.75"/>`;
    case 'architect': // slate vest over the shirt
      return `<path d="M${cx - w - 0.2} ${botY} L${cx - w + 0.5} ${topY + 2.4} Q${cx - 2.8} ${topY + 1.5} ${cx - 2} ${topY + 0.3} L${cx - 2} ${botY} Z" fill="#334155" stroke="${ink}" stroke-width="0.5" opacity="0.92"/>
              <path d="M${cx + w + 0.2} ${botY} L${cx + w - 0.5} ${topY + 2.4} Q${cx + 2.8} ${topY + 1.5} ${cx + 2} ${topY + 0.3} L${cx + 2} ${botY} Z" fill="#334155" stroke="${ink}" stroke-width="0.5" opacity="0.92"/>
              <path d="M${cx - 2} ${topY + 0.3} l2 2.3 l2 -2.3" fill="none" stroke="${ink}" stroke-width="0.55" opacity="0.6"/>`;
    case 'principal': // dark jacket with gold trim
      return `<path d="M${cx - w - 0.3} ${botY} L${cx - w + 0.4} ${topY + 2.2} Q${cx - 2.8} ${topY + 1.3} ${cx - 1.9} ${topY + 0.2} L${cx - 1.9} ${botY} Z" fill="#1f2937" stroke="${ink}" stroke-width="0.5"/>
              <path d="M${cx + w + 0.3} ${botY} L${cx + w - 0.4} ${topY + 2.2} Q${cx + 2.8} ${topY + 1.3} ${cx + 1.9} ${topY + 0.2} L${cx + 1.9} ${botY} Z" fill="#1f2937" stroke="${ink}" stroke-width="0.5"/>
              <path d="M${cx - 1.9} ${topY + 0.2} L${cx - 1.9} ${botY}" stroke="#ffc93c" stroke-width="0.55" opacity="0.9"/>
              <path d="M${cx + 1.9} ${topY + 0.2} L${cx + 1.9} ${botY}" stroke="#ffc93c" stroke-width="0.55" opacity="0.9"/>
              <circle cx="${cx + 3.1}" cy="${topY + 4.2}" r="0.4" fill="#ffc93c"/>
              <circle cx="${cx + 3.1}" cy="${topY + 6.2}" r="0.4" fill="#ffc93c"/>`;
    default: // intern / junior: plain tee
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
    ${tierOutfitPath(tierId, 16, 23.4, 6.5, 32)}
    <circle cx="16" cy="13" r="7" fill="${look.skin}"/>
    ${hairPath(look.hairstyle, look.hair)}
    ${facialFeatures(look)}
    ${accessory(tierId)}
  </svg>`;
}

/**
 * Per-workstation desk rigs (the furniture half of the seated scene).
 * Each rig defines its furniture art and where the typing hand rests, so
 * buying a better desk visibly upgrades the scene in the office.
 */
const INK = '#2d2440';

interface DeskRig {
  /** Furniture drawn behind/over the person (desk, screens, props). */
  furniture: string;
  /** Typing arm path + hand position (desk heights differ per rig). */
  arm: string;
  handX: number;
  handY: number;
  /** Bottom-center anchor with free desk space for a hash-driven micro-prop. */
  propX: number;
  propY: number;
}

function deskRig(stationId: string): DeskRig {
  switch (stationId) {
    case 'standing':
      return {
        furniture: `
          <rect x="29" y="29.8" width="31" height="3.2" rx="1.6" fill="#e8d9b8" stroke="${INK}" stroke-width="0.9"/>
          <rect x="42.6" y="33" width="3.8" height="11" rx="1" fill="#9aa0a8" stroke="${INK}" stroke-width="0.8"/>
          <rect x="41" y="36.6" width="7" height="2.6" rx="0.8" fill="#6b7280" stroke="${INK}" stroke-width="0.7"/>
          <rect x="37" y="44" width="15" height="2.2" rx="1.1" fill="#6b7280" stroke="${INK}" stroke-width="0.7"/>
          <rect x="40.5" y="19" width="14" height="9" rx="1.1" fill="#0f172a" stroke="${INK}" stroke-width="0.9"/>
          <rect x="41.7" y="20.2" width="11.6" height="6.6" rx="0.5" class="persona-screen"/>
          <rect x="46.6" y="28" width="2" height="1.9" fill="#334155"/>
          <rect x="44.4" y="29.6" width="6.4" height="1" rx="0.5" fill="#334155"/>
          <path d="M56.2 27.4 q0.8 -2.6 2.2 0 q1.4 -1.8 1.4 0.6 q0 1.8 -2.5 1.8 q-2.1 0 -1.1 -2.4 z" fill="#2fbf7f" stroke="${INK}" stroke-width="0.6"/>
          <rect x="55.6" y="29.4" width="4.2" height="2.4" rx="0.6" fill="#c2410c" stroke="${INK}" stroke-width="0.6"/>
          <rect x="31" y="27.9" width="10" height="1.4" rx="0.7" fill="#1e293b"/>`,
        arm: 'M24 25.8 q5 0.2 8 2.4',
        handX: 33,
        handY: 28.4,
        propX: 49.8,
        propY: 44,
      };
    case 'dual':
      return {
        furniture: `
          <rect x="28.5" y="32.6" width="31.5" height="3.4" rx="1.6" fill="#3a3f52" stroke="${INK}" stroke-width="0.9"/>
          <rect x="30" y="36.2" width="28.5" height="1.1" rx="0.55" fill="#22d3ee" opacity="0.85"/>
          <rect x="42" y="37.6" width="4" height="8.6" fill="#2b2f40" stroke="${INK}" stroke-width="0.7"/>
          <rect x="31.6" y="22.4" width="12.6" height="8.8" rx="1" fill="#0f172a" stroke="${INK}" stroke-width="0.9"/>
          <rect x="32.7" y="23.5" width="10.4" height="6.6" rx="0.5" class="persona-screen"/>
          <rect x="45.4" y="22.4" width="12.6" height="8.8" rx="1" fill="#0f172a" stroke="${INK}" stroke-width="0.9"/>
          <rect x="46.5" y="23.5" width="10.4" height="6.6" rx="0.5" class="persona-screen"/>
          <rect x="43.2" y="31.2" width="3.2" height="1.6" fill="#2b2f40"/>
          <rect x="31.5" y="33.1" width="15" height="1.5" rx="0.75" fill="#111827"/>
          <circle cx="55" cy="34" r="1.2" fill="#111827"/>`,
        arm: 'M24 27 q5 2 8 4',
        handX: 33,
        handY: 31.4,
        propX: 57.9,
        propY: 32.6,
      };
    case 'corner':
      return {
        furniture: `
          <rect x="28" y="32.4" width="33" height="3.6" rx="1.6" fill="#7a4426" stroke="${INK}" stroke-width="0.9"/>
          <rect x="28.6" y="33.1" width="31.8" height="0.9" rx="0.45" fill="#ffc93c" opacity="0.7"/>
          <rect x="30" y="36" width="29" height="9.6" rx="1" fill="#5e3319" stroke="${INK}" stroke-width="0.9"/>
          <rect x="33" y="39.6" width="23" height="2.2" rx="1.1" fill="#7a4426"/>
          <path d="M35 21.8 q7.5 -2.2 15 0 l-0.9 9.4 q-6.6 -1.8 -13.2 0 z" fill="#0f172a" stroke="${INK}" stroke-width="0.9"/>
          <path d="M36.3 23 q6.2 -1.7 12.4 0 l-0.7 7 q-5.5 -1.4 -11 0 z" class="persona-screen"/>
          <rect x="41" y="31.2" width="3" height="1.6" fill="#334155"/>
          <path d="M54.4 25.4 l3.4 0 q1.7 0 1.7 1.7 l-4.2 0 q-1.7 0 -0.9 -1.7 z" fill="#2fbf7f" stroke="${INK}" stroke-width="0.7"/>
          <rect x="56.2" y="27" width="1.2" height="4.4" fill="#b8860b" stroke="${INK}" stroke-width="0.5"/>
          <path d="M31.4 27.2 h3 l-0.5 2 q-1 0.6 -2 0 z" fill="#ffc93c" stroke="${INK}" stroke-width="0.6"/>
          <rect x="31.9" y="29.6" width="2" height="2.8" rx="0.5" fill="#d99a06" stroke="${INK}" stroke-width="0.5"/>`,
        arm: 'M24 27 q5 2 8 4',
        handX: 33,
        handY: 31.4,
        propX: 37.8,
        propY: 32.4,
      };
    default: // basic — honest wooden desk + laptop + mug
      return {
        furniture: `
          <rect x="30" y="32.6" width="30" height="3.4" rx="1.6" fill="#b07a3f" stroke="${INK}" stroke-width="0.9"/>
          <rect x="42" y="36.2" width="4" height="9.8" fill="#8a5a2b" stroke="${INK}" stroke-width="0.7"/>
          <rect x="34" y="24" width="16" height="10" rx="1.2" fill="#0f172a" stroke="${INK}" stroke-width="0.9"/>
          <rect x="35.4" y="25.4" width="13.2" height="7.2" rx="0.6" class="persona-screen"/>
          <rect x="33" y="33" width="18" height="1.6" rx="0.8" fill="#1e293b"/>
          <rect x="54" y="29.2" width="4" height="3.6" rx="0.8" fill="#ff5d55" stroke="${INK}" stroke-width="0.7"/>
          <path d="M58 30 q1.8 0.6 0 2.2" fill="none" stroke="${INK}" stroke-width="0.7"/>`,
        arm: 'M24 27 q5 2 8 4',
        handX: 33,
        handY: 31.6,
        propX: 31.6,
        propY: 32.6,
      };
  }
}

/**
 * Tiny hash-driven desk micro-prop (life details): coffee mug, sticky
 * notes, tiny plant, or rubber duck. (x, y) = bottom-center anchor.
 */
function deskPropPath(kind: number, x: number, y: number): string {
  switch (kind) {
    case 1: // coffee mug with steam
      return `<rect x="${x - 1.5}" y="${y - 3}" width="3" height="3" rx="0.5" fill="#8b5cf6" stroke="${INK}" stroke-width="0.55"/>
              <path d="M${x + 1.5} ${y - 2.4} q1.3 0.5 0 1.5" fill="none" stroke="${INK}" stroke-width="0.55"/>
              <path d="M${x - 0.6} ${y - 3.7} q0.4 -0.6 0 -1.2 M${x + 0.6} ${y - 3.7} q0.4 -0.6 0 -1.2" stroke="${INK}" stroke-width="0.45" fill="none" opacity="0.4"/>`;
    case 2: // sticky notes
      return `<rect x="${x - 2.2}" y="${y - 2.2}" width="2.3" height="2.3" fill="#fde047" stroke="${INK}" stroke-width="0.45" transform="rotate(-8 ${x - 1} ${y - 1})"/>
              <rect x="${x - 0.2}" y="${y - 2}" width="2.1" height="2.1" fill="#f9a8d4" stroke="${INK}" stroke-width="0.45" transform="rotate(6 ${x + 0.9} ${y - 1})"/>`;
    case 3: // tiny potted plant
      return `<path d="M${x} ${y - 2.5} q-1.7 -1.3 -0.7 -3.1 q1.1 0.9 0.7 3.1 q0.3 -2.3 1.9 -2.6 q0.2 1.9 -1.7 2.8 z" fill="#2fbf6b" stroke="${INK}" stroke-width="0.5"/>
              <path d="M${x - 1.4} ${y - 2.6} h2.8 l-0.4 2.6 h-2 z" fill="#c2410c" stroke="${INK}" stroke-width="0.55"/>`;
    case 4: // rubber duck
      return `<ellipse cx="${x}" cy="${y - 1.2}" rx="1.8" ry="1.2" fill="#fde047" stroke="${INK}" stroke-width="0.55"/>
              <circle cx="${x + 1}" cy="${y - 2.9}" r="1" fill="#fde047" stroke="${INK}" stroke-width="0.55"/>
              <path d="M${x + 1.9} ${y - 3.1} l1.2 0.35 l-1.2 0.5 z" fill="#fb923c" stroke="${INK}" stroke-width="0.4"/>
              <circle cx="${x + 1.25}" cy="${y - 3.2}" r="0.22" fill="${INK}"/>`;
    default:
      return '';
  }
}

const CHAIR = `
  <rect x="8" y="30" width="12" height="4" rx="2" fill="#1f2937" stroke="${INK}" stroke-width="0.7"/>
  <rect x="12" y="33" width="4" height="12" fill="#1f2937" stroke="${INK}" stroke-width="0.7"/>
  <rect x="8" y="18" width="3.4" height="13" rx="1.7" fill="#1f2937" stroke="${INK}" stroke-width="0.7"/>`;

/**
 * The seated figure itself (head + torso + typing arm) in the shared
 * 64x56 seated coordinate space — used by both employee desks and the
 * founder office so the player is drawn in exactly the employee style.
 * The head nests a `.persona-bob` group inside `.persona-sit-head` so the
 * gentle idle bob composes with the existing typing head tilt. `phase` is
 * the 32-bit persona hash: each looping animation gets a hash-derived
 * negative animation-delay so a floor of workers types out of phase
 * (and 2 Hz re-renders don't restart every loop in lockstep).
 */
function seatedBody(
  look: PersonaLook,
  headAccessory: string,
  torsoExtra: string,
  arm: string,
  handX: number,
  handY: number,
  phase: number,
): string {
  const headD = ((phase >>> 2) % 110) / 100; // head-bob loops every 1.1s
  const bobD = ((phase >>> 15) % 34) / 10; // idle bob loops every 3.4s
  const armD = ((phase >>> 10) % 68) / 100; // typing alternates every 0.68s
  return `<g class="persona-sit-head" style="animation-delay:-${headD}s"><g class="persona-bob" style="animation-delay:-${bobD}s">
      <circle cx="20" cy="16" r="6.4" fill="${look.skin}"/>
      <g transform="translate(4.8,2.6) scale(0.92)">${hairPath(look.hairstyle, look.hair)}</g>
      <g transform="translate(4.8,2.6) scale(0.92)">${facialFeatures(look)}</g>
      <g transform="translate(4.8,2.6) scale(0.92)">${headAccessory}</g>
    </g></g>
    <path d="M13 34 q0 -12 8 -11 q6 0.6 8 6 l3 5 z" fill="${look.shirt}"/>
    ${torsoExtra}
    <g class="persona-sit-arms" style="animation-delay:-${armD}s">
      <path d="${arm}" stroke="${look.shirt}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <circle cx="${handX}" cy="${handY}" r="1.7" fill="${look.skin}"/>
    </g>`;
}

/**
 * Full-body seated-at-desk scene for the office floor: station-specific
 * desk rig, glowing monitor, and the persona typing away (animation via
 * CSS classes .persona-sit-head / .persona-sit-arms / .persona-bob).
 */
export function personaAtDesk(
  seed: string,
  specialization: Specialization,
  tierId: string,
  stationId = 'basic',
): string {
  const look = personaLook(seed, specialization, tierId);
  const rig = deskRig(stationId);
  const h = hashSeed(seed);
  // Stagger this desk's screen glow too (rigs are shared, so the delay is
  // injected here rather than baked into the station furniture).
  const glowD = ((h >>> 21) % 23) / 10; // screen-glow loops every 2.3s
  const furniture = rig.furniture.replaceAll(
    'class="persona-screen"',
    `class="persona-screen" style="animation-delay:-${glowD}s"`,
  );
  const torsoExtra =
    shirtDetailPath(look.shirtDetail, 20, 27) + tierOutfitPath(tierId, 20, 27, 5, 34);
  return `<svg class="persona-desk" viewBox="0 0 64 56" aria-hidden="true">
    ${CHAIR}
    ${seatedBody(look, accessory(tierId), torsoExtra, rig.arm, rig.handX, rig.handY, h)}
    ${furniture}
    ${deskPropPath(look.deskProp, rig.propX, rig.propY)}
  </svg>`;
}

/** An unoccupied workstation tile: the station-specific rig, empty chair. */
export function emptyDeskSvg(stationId: string): string {
  const rig = deskRig(stationId);
  return `<svg class="persona-desk" viewBox="0 0 64 56" aria-hidden="true">
    ${CHAIR}
    ${rig.furniture}
  </svg>`;
}

/** Standing idle persona (workers without a desk), swaying via CSS. */
export function personaStanding(
  seed: string,
  specialization: Specialization,
  tierId: string,
): string {
  const look = personaLook(seed, specialization, tierId);
  const swayD = ((hashSeed(seed) >>> 18) % 26) / 10; // sway loops every 2.6s
  return `<svg class="persona-stand" viewBox="0 0 32 56" aria-hidden="true">
    <g class="persona-sway" style="animation-delay:-${swayD}s">
      <circle cx="16" cy="12" r="6.6" fill="${look.skin}"/>
      <g transform="translate(0.6,-1.4) scale(0.96)">${hairPath(look.hairstyle, look.hair)}</g>
      <g transform="translate(0.6,-1.4) scale(0.96)">${facialFeatures(look)}</g>
      <g transform="translate(0.6,-1.4) scale(0.96)">${accessory(tierId)}</g>
      <path d="M9 34 q0 -16 7 -15 q7 -1 7 15 z" fill="${look.shirt}"/>
      ${shirtDetailPath(look.shirtDetail, 16, 22)}
      ${tierOutfitPath(tierId, 16, 22, 5.2, 34)}
      <rect x="11.4" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
      <rect x="17" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
    </g>
  </svg>`;
}

/* ======================================================================
 * Player avatar + founder office
 * ====================================================================== */

/** Explicit appearance — chosen by the player, not hash-derived. */
export interface PlayerLookInput {
  skin: number;
  hair: number;
  hairstyle: number;
  eyeStyle: number;
  mouthStyle: number;
  facialHair: number;
  outfit: number;
  accessory: number;
}

/** Outfit color palette for the player (8 distinct colors). */
export const OUTFIT_COLORS: string[] = [
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
  '#1f2937', // charcoal
];

/** Number of player accessory options (index 0 = none). */
export const PLAYER_ACCESSORY_COUNT = 8;

/** Safe modulo into [0, m): tolerates negative, fractional, non-finite. */
function safeIndex(n: number, m: number): number {
  if (!Number.isFinite(n)) return 0;
  const t = Math.trunc(n) % m;
  return t < 0 ? t + m : t;
}

/** Player head accessories, drawn in the shared head coordinate space
 * (head centered around 16,13 — same space as the tier `accessory`). */
function playerAccessory(idx: number): string {
  switch (idx) {
    case 0: // none
      return '';
    case 1: // forward baseball cap
      return `<path d="M8.7 10.2 a7.4 7.4 0 0 1 14.6 0 l0 0.6 h-14.6 z" fill="#ff5d55" stroke="#b91c1c" stroke-width="0.5"/>
              <rect x="7" y="10.4" width="18" height="1.7" rx="0.85" fill="#c73128"/>
              <circle cx="16" cy="5" r="0.8" fill="#b91c1c"/>`;
    case 2: // round glasses
      return `<g stroke="#0f172a" stroke-width="1.1" fill="none">
                <circle cx="12.6" cy="13.6" r="2.3"/><circle cx="19.4" cy="13.6" r="2.3"/>
                <line x1="14.9" y1="13.6" x2="17.1" y2="13.6"/>
              </g>`;
    case 3: // sunglasses
      return `<rect x="10.5" y="12.3" width="4.6" height="2.8" rx="1.2" fill="#1f2937"/>
              <rect x="16.9" y="12.3" width="4.6" height="2.8" rx="1.2" fill="#1f2937"/>
              <line x1="15.1" y1="13.2" x2="16.9" y2="13.2" stroke="#1f2937" stroke-width="0.9"/>
              <line x1="10.5" y1="13" x2="9.2" y2="12.5" stroke="#1f2937" stroke-width="0.8"/>
              <line x1="21.5" y1="13" x2="22.8" y2="12.5" stroke="#1f2937" stroke-width="0.8"/>`;
    case 4: // headphones
      return `<path d="M8.8 12 a7.4 7.4 0 0 1 14.4 0" stroke="#334155" stroke-width="1.6" fill="none"/>
              <rect x="7.6" y="11" width="2.6" height="4.4" rx="1.2" fill="#334155"/>
              <rect x="21.8" y="11" width="2.6" height="4.4" rx="1.2" fill="#334155"/>`;
    case 5: // artist beret
      return `<path d="M8.8 10.6 q-0.6 -6.8 8 -6.6 q7 0.2 6.4 5.2 q-7.4 -2.6 -14.4 1.4 z" fill="#e11d48" stroke="#9f1239" stroke-width="0.5"/>
              <circle cx="16.4" cy="3.6" r="0.75" fill="#9f1239"/>`;
    case 6: // golden crown
      return `<path d="M10.5 8.6 l1.8 -3 l2 2.2 l1.7 -3 l1.7 3 l2 -2.2 l1.8 3 z" fill="#fbbf24" stroke="#d97706" stroke-width="0.5"/>`;
    default: // 7: halo
      return `<ellipse cx="16" cy="4.2" rx="4.6" ry="1.4" fill="none" stroke="#fde68a" stroke-width="1.4"/>`;
  }
}

/** Resolve raw player-chosen indexes into a concrete PersonaLook (all
 * indexes wrapped safely into range) + the resolved accessory index.
 * Exported so the portrait layer can paint the same resolved look. */
export function resolvePlayer(input: PlayerLookInput): {
  look: PersonaLook;
  accessoryIdx: number;
  key: string;
} {
  const skin = safeIndex(input.skin, SKIN.length);
  const hair = safeIndex(input.hair, HAIR.length);
  const hairstyle = safeIndex(input.hairstyle, HAIRSTYLE_COUNT);
  const eyeStyle = safeIndex(input.eyeStyle, EYE_STYLE_COUNT);
  const mouthStyle = safeIndex(input.mouthStyle, MOUTH_STYLE_COUNT);
  const facialHair = safeIndex(input.facialHair, 4);
  const outfit = safeIndex(input.outfit, OUTFIT_COLORS.length);
  const accessoryIdx = safeIndex(input.accessory, PLAYER_ACCESSORY_COUNT);
  return {
    look: {
      skin: SKIN[skin],
      hair: HAIR[hair],
      shirt: OUTFIT_COLORS[outfit],
      hairstyle,
      eyeStyle,
      eyebrowStyle: 0,
      mouthStyle,
      facialHair,
      blemish: 0,
      shirtDetail: 0,
      deskProp: 0,
      blinkDelay: ((skin * 7 + hair * 5 + hairstyle * 3 + eyeStyle) % 40) / 10,
    },
    accessoryIdx,
    key: `${skin}.${hair}.${hairstyle}.${eyeStyle}.${mouthStyle}.${facialHair}.${outfit}.${accessoryIdx}`,
  };
}

const playerAvatarCache = new Map<string, string>();

/** Bust avatar of the player, like personaAvatar. */
export function playerAvatar(look: PlayerLookInput, size = 44): string {
  const { look: l, accessoryIdx, key } = resolvePlayer(look);
  const cacheKey = `${key}|${size}`;
  const hit = playerAvatarCache.get(cacheKey);
  if (hit) return hit;
  const svg = `<svg class="persona-avatar" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="lg-player-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe9c2"/><stop offset="1" stop-color="#ffc93c"/>
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="16" fill="url(#lg-player-bg)" opacity="0.55"/>
    <path d="M6 32 q0 -9 10 -9 q10 0 10 9 z" fill="${l.shirt}"/>
    ${shirtDetailPath(1, 16, 23.4)}
    <circle cx="16" cy="13" r="7" fill="${l.skin}"/>
    ${hairPath(l.hairstyle, l.hair)}
    ${facialFeatures(l)}
    ${playerAccessory(accessoryIdx)}
  </svg>`;
  playerAvatarCache.set(cacheKey, svg);
  return svg;
}

/* ---------- founder office scene ---------- */

/** Small gold trophy, defined once per scene as a <symbol> (overflow
 * visible: the art sits in negative coords around its bottom-center
 * origin) and stamped up to seven times per shelf wall via `trophyUse`.
 * The founder office renders once per page, so the plain id is safe. */
const TROPHY_SYMBOL = `<symbol id="fo-trophy" overflow="visible">
    <path d="M-3.2 -9 h6.4 l-0.5 3.4 a2.8 2.8 0 0 1 -5.4 0 z" fill="#ffc93c" stroke="${INK}" stroke-width="0.7"/>
    <path d="M-3.5 -8.2 q-2.3 0.5 -0.7 2.7 M3.5 -8.2 q2.3 0.5 0.7 2.7" fill="none" stroke="#d99a06" stroke-width="0.8"/>
    <rect x="-0.9" y="-5" width="1.8" height="2.2" fill="#d99a06" stroke="${INK}" stroke-width="0.5"/>
    <rect x="-2.6" y="-2.8" width="5.2" height="2.8" rx="0.6" fill="#8a5a2b" stroke="${INK}" stroke-width="0.6"/>
  </symbol>`;

/** One trophy stamp, (x, y) = bottom-center of the base. */
function trophyUse(x: number, y: number, s = 1): string {
  return `<use href="#fo-trophy" transform="translate(${x},${y}) scale(${s})"/>`;
}

/** Stage 1 brick texture: one path of mortar lines over the base fill. */
function brickLines(): string {
  let d = '';
  for (let r = 0; r < 8; r++) {
    const y = 6 + r * 13;
    d += `M0 ${y} H240 `;
    const off = r % 2 === 0 ? 0 : 13;
    for (let x = off; x <= 240; x += 26) {
      d += `M${x} ${y} V${Math.min(y + 13, 106)} `;
    }
  }
  return `<path d="${d}" stroke="#7c3728" stroke-width="1" opacity="0.45" fill="none"/>`;
}

/** Deterministic little star field for the orbital stage. */
function starField(): string {
  let s = '';
  for (let i = 0; i < 18; i++) {
    const sx = ((i * 97 + 23) % 236) + 2;
    const sy = ((i * 61 + 11) % 96) + 4;
    const r = 0.5 + (i % 3) * 0.25;
    s += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="#ffffff" opacity="${0.45 + (i % 2) * 0.3}"/>`;
  }
  return s;
}

/** Server rack unit rows (stages 2). The unit is a <symbol> (y at 0,
 * x baked in — one rack per scene) stamped four times down the chassis. */
function serverRack(x: number, y: number, w: number, h: number): string {
  const uh = 11;
  const unit = `<symbol id="fo-rack-unit" overflow="visible"><rect x="${x + 3}" y="0" width="${w - 6}" height="${uh}" rx="1" fill="#2b3648" stroke="#0f172a" stroke-width="0.8"/>
      <line x1="${x + 6}" y1="3" x2="${x + 13}" y2="3" stroke="#475569" stroke-width="0.8"/>
      <line x1="${x + 6}" y1="5.5" x2="${x + 13}" y2="5.5" stroke="#475569" stroke-width="0.8"/>
      <line x1="${x + 6}" y1="8" x2="${x + 13}" y2="8" stroke="#475569" stroke-width="0.8"/>
      <circle cx="${x + w - 8.5}" cy="5.5" r="1" fill="#2fbf6b"/>
      <circle cx="${x + w - 5.5}" cy="5.5" r="1" fill="#22d3ee"/></symbol>`;
  let units = '';
  for (let i = 0; i < 4; i++) {
    units += `<use href="#fo-rack-unit" y="${y + 4 + i * (uh + 3.5)}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#1f2937" stroke="${INK}" stroke-width="1.2"/>${unit}${units}`;
}

/** Stage-specific backdrop: wall + floor + props (all behind the player). */
function officeBackdrop(stage: number): string {
  switch (stage) {
    case 0: {
      // Garage den: bare wall, corkboard dream sketch, boxes, yard window.
      return `
        <rect x="0" y="0" width="240" height="106" fill="#cfc8b8"/>
        <path d="M0 26 H240 M0 52 H240 M0 78 H240" stroke="${INK}" stroke-width="0.8" opacity="0.1"/>
        <rect x="0" y="106" width="240" height="34" fill="#b0a998"/>
        <path d="M0 106 H240" stroke="${INK}" stroke-width="1.1" opacity="0.5"/>
        <path d="M30 120 l24 6 M150 128 l20 -4" stroke="${INK}" stroke-width="0.7" opacity="0.18"/>
        <line x1="112" y1="0" x2="112" y2="12" stroke="${INK}" stroke-width="1"/>
        <circle cx="112" cy="16" r="5.5" fill="#ffe9a8" opacity="0.4"/>
        <circle cx="112" cy="15" r="3.4" fill="#ffe9a8" stroke="${INK}" stroke-width="0.9"/>
        <rect x="26" y="16" width="44" height="34" fill="#bfe9ff" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="38" cy="26" r="4.4" fill="#ffc93c" stroke="${INK}" stroke-width="0.8"/>
        <rect x="26" y="40" width="44" height="10" fill="#7cc96b"/>
        <path d="M28 40 v-5 M34 40 v-5 M40 40 v-5 M46 40 v-5 M52 40 v-5 M58 40 v-5 M64 40 v-5 M26 36.5 h44" stroke="#f5efe0" stroke-width="1.4"/>
        <path d="M26 33 h44 M48 16 v34" stroke="${INK}" stroke-width="1.1" opacity="0.75"/>
        <rect x="23.6" y="50" width="48.8" height="3.4" rx="1.4" fill="#a89a7e" stroke="${INK}" stroke-width="0.9"/>
        <rect x="150" y="16" width="54" height="40" rx="2" fill="#c9a06a" stroke="${INK}" stroke-width="1.3"/>
        <rect x="153" y="19" width="48" height="34" fill="#b98c53"/>
        <g transform="rotate(-3 165 33)">
          <rect x="157" y="23" width="16" height="20" fill="#fdfdf4" stroke="${INK}" stroke-width="0.7"/>
          <path d="M165 26.5 q2.6 3 0 8.2 q-2.6 -5.2 0 -8.2 z" fill="none" stroke="#ff5d55" stroke-width="0.8"/>
          <path d="M163.4 34 l-1.6 2.4 M166.6 34 l1.6 2.4 M164 36.6 q1 1.6 2 0" fill="none" stroke="#ff8a2a" stroke-width="0.8"/>
        </g>
        <g transform="rotate(4 188 34)">
          <rect x="180" y="24" width="16" height="20" fill="#fdfdf4" stroke="${INK}" stroke-width="0.7"/>
          <rect x="184" y="28" width="8" height="6.5" rx="1" fill="none" stroke="#38b6ff" stroke-width="0.8"/>
          <circle cx="186.4" cy="31" r="0.7" fill="#38b6ff"/><circle cx="189.6" cy="31" r="0.7" fill="#38b6ff"/>
          <line x1="188" y1="28" x2="188" y2="25.6" stroke="#38b6ff" stroke-width="0.8"/><circle cx="188" cy="25.2" r="0.6" fill="#38b6ff"/>
          <rect x="184.6" y="36" width="6.8" height="5.4" rx="1" fill="none" stroke="#38b6ff" stroke-width="0.8"/>
        </g>
        <circle cx="165" cy="22.4" r="1" fill="#ff5d55" stroke="${INK}" stroke-width="0.4"/>
        <circle cx="188" cy="23.4" r="1" fill="#38b6ff" stroke="${INK}" stroke-width="0.4"/>
        <rect x="198" y="82" width="30" height="22" fill="#d8a35f" stroke="${INK}" stroke-width="1.1"/>
        <line x1="213" y1="82" x2="213" y2="104" stroke="#a9741f" stroke-width="2"/>
        <path d="M198 87 h30" stroke="${INK}" stroke-width="0.7" opacity="0.35"/>
        <rect x="203" y="64" width="24" height="18" fill="#c98d4e" stroke="${INK}" stroke-width="1.1"/>
        <line x1="215" y1="64" x2="215" y2="82" stroke="#a9741f" stroke-width="2"/>`;
    }
    case 1: {
      // Startup loft: brick wall, city window, whiteboard, first trophy.
      return `
        <rect x="0" y="0" width="240" height="106" fill="#a8503a"/>
        ${brickLines()}
        <rect x="0" y="106" width="240" height="34" fill="#c98d4e"/>
        <path d="M0 106 H240 M0 117 H240 M0 128 H240" stroke="${INK}" stroke-width="0.8" opacity="0.35"/>
        <path d="M40 106 v11 M120 117 v11 M80 128 v12 M180 106 v11 M210 128 v12" stroke="${INK}" stroke-width="0.7" opacity="0.25"/>
        <rect x="150" y="14" width="80" height="58" fill="url(#lg-fo-city1)"/>
        <g fill="#6b7aa8">
          <rect x="154" y="40" width="10" height="32"/>
          <rect x="166" y="30" width="12" height="42"/>
          <rect x="180" y="46" width="10" height="26"/>
          <rect x="192" y="34" width="14" height="38"/>
          <rect x="208" y="44" width="12" height="28"/>
          <rect x="222" y="36" width="8" height="36"/>
        </g>
        <g fill="#e6f4ff" opacity="0.8">
          <rect x="168" y="34" width="2" height="2"/><rect x="173" y="40" width="2" height="2"/>
          <rect x="195" y="38" width="2" height="2"/><rect x="200" y="46" width="2" height="2"/>
          <rect x="210" y="48" width="2" height="2"/>
        </g>
        <path d="M150 43 h80 M190 14 v58" stroke="${INK}" stroke-width="1.1" opacity="0.7"/>
        <rect x="150" y="14" width="80" height="58" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <rect x="146.6" y="72" width="86.8" height="4" rx="1.6" fill="#8a8f9c" stroke="${INK}" stroke-width="0.9"/>
        <rect x="24" y="14" width="48" height="34" rx="1.5" fill="#fdfdf6" stroke="${INK}" stroke-width="1.4"/>
        <polyline points="29,42 38,34 45,37 54,25 65,20" fill="none" stroke="#2fbf6b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M62 17 l6 6 M68 17 l-6 6" stroke="#ff5d55" stroke-width="1" opacity="0.7"/>
        <circle cx="54" cy="25" r="2.6" fill="none" stroke="#ff5d55" stroke-width="0.9"/>
        <path d="M29 20 h12 M29 24 h9" stroke="#38b6ff" stroke-width="1" opacity="0.7"/>
        <rect x="30" y="48" width="18" height="2.4" rx="1.2" fill="#c7ccd4" stroke="${INK}" stroke-width="0.7"/>
        <rect x="92" y="26" width="44" height="3.4" rx="1.4" fill="#8a5a2b" stroke="${INK}" stroke-width="1"/>
        <path d="M96 29.4 l3 5 M132 29.4 l-3 5" stroke="${INK}" stroke-width="1" opacity="0.6"/>
        ${trophyUse(114, 26)}`;
    }
    case 2: {
      // Valley penthouse: dusk skyline, AGI blueprint, servers, trophies.
      return `
        <rect x="0" y="0" width="240" height="106" fill="#413e63"/>
        <rect x="0" y="106" width="240" height="34" fill="#37345c"/>
        <path d="M0 106 H240" stroke="${INK}" stroke-width="1.1" opacity="0.6"/>
        <rect x="0" y="110" width="240" height="4" fill="#ffffff" opacity="0.06"/>
        <rect x="88" y="10" width="108" height="68" fill="url(#lg-fo-dusk2)"/>
        <circle cx="170" cy="60" r="10" fill="#ffb02e" opacity="0.3"/>
        <circle cx="170" cy="60" r="6.4" fill="#ffb02e"/>
        <g fill="#241f3d">
          <rect x="92" y="46" width="12" height="32"/>
          <rect x="106" y="34" width="14" height="44"/>
          <rect x="122" y="52" width="10" height="26"/>
          <rect x="134" y="40" width="14" height="38"/>
          <rect x="150" y="56" width="10" height="22"/>
          <rect x="178" y="44" width="12" height="34"/>
        </g>
        <g fill="#ffc93c" opacity="0.85">
          <rect x="109" y="38" width="2" height="2"/><rect x="114" y="44" width="2" height="2"/>
          <rect x="137" y="44" width="2" height="2"/><rect x="142" y="52" width="2" height="2"/>
          <rect x="95" y="52" width="2" height="2"/><rect x="181" y="48" width="2" height="2"/>
        </g>
        <path d="M124 10 v68 M160 10 v68 M88 44 h108" stroke="#1f1c33" stroke-width="1.2" opacity="0.8"/>
        <rect x="88" y="10" width="108" height="68" fill="none" stroke="${INK}" stroke-width="1.7"/>
        <rect x="24" y="12" width="34" height="34" rx="1.5" fill="#1d4ed8" stroke="${INK}" stroke-width="1.3"/>
        <rect x="27" y="15" width="28" height="28" fill="none" stroke="#93c5fd" stroke-width="0.7" opacity="0.8"/>
        <rect x="33" y="19" width="16" height="12" rx="3" fill="none" stroke="#e0f2ff" stroke-width="1"/>
        <circle cx="38" cy="24.4" r="1.1" fill="#e0f2ff"/><circle cx="44" cy="24.4" r="1.1" fill="#e0f2ff"/>
        <line x1="41" y1="19" x2="41" y2="16" stroke="#e0f2ff" stroke-width="0.9"/><circle cx="41" cy="15.4" r="0.7" fill="#e0f2ff"/>
        <path d="M33 35 h5 v4 M49 35 h-5 v4 M41 31 v8" fill="none" stroke="#93c5fd" stroke-width="0.8"/>
        <circle cx="33" cy="39" r="0.8" fill="#93c5fd"/><circle cx="49" cy="39" r="0.8" fill="#93c5fd"/><circle cx="41" cy="39.6" r="0.8" fill="#93c5fd"/>
        ${serverRack(204, 42, 32, 62)}
        <rect x="56" y="24" width="30" height="3" rx="1.4" fill="#8a5a2b" stroke="${INK}" stroke-width="0.9"/>
        ${trophyUse(65, 24, 0.9)}
        ${trophyUse(78, 24, 0.9)}`;
    }
    default: {
      // Orbital study: stars, round Earth window, drone, AGI core.
      return `
        <rect x="0" y="0" width="240" height="106" fill="#141b33"/>
        ${starField()}
        <rect x="0" y="106" width="240" height="34" fill="#232c4d"/>
        <path d="M0 106 H240" stroke="#0c1226" stroke-width="1.4"/>
        <rect x="0" y="107.5" width="240" height="1.6" fill="#22d3ee" opacity="0.35"/>
        <path d="M60 122 v18 M120 112 v28 M185 122 v18 M0 124 H240" stroke="#0c1226" stroke-width="0.9" opacity="0.7"/>
        <circle cx="160" cy="50" r="40" fill="#090e20"/>
        <circle cx="139" cy="30" r="0.8" fill="#fff" opacity="0.8"/>
        <circle cx="183" cy="26" r="0.6" fill="#fff" opacity="0.7"/>
        <circle cx="189" cy="66" r="0.7" fill="#fff" opacity="0.8"/>
        <circle cx="152" cy="56" r="21" fill="url(#lg-fo-earth3)"/>
        <path d="M141 47 q5 -4 9 -1 q5 3 1 6 q-7 2 -10 -5 z" fill="#2fbf6b" opacity="0.9"/>
        <path d="M156 64 q6 -4 10 0 q-2 6 -8 5 q-4 -1 -2 -5 z" fill="#2fbf6b" opacity="0.85"/>
        <path d="M158 42 q4 -2 6 1 q-1 3 -5 2 z" fill="#2fbf6b" opacity="0.8"/>
        <path d="M136 60 q8 3 16 1" stroke="#ffffff" stroke-width="1.4" fill="none" opacity="0.5" stroke-linecap="round"/>
        <path d="M146 40 q6 -2 12 1" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.45" stroke-linecap="round"/>
        <circle cx="152" cy="56" r="22.4" fill="none" stroke="#7dd3fc" stroke-width="1" opacity="0.5"/>
        <circle cx="160" cy="50" r="40" fill="none" stroke="#8b93a8" stroke-width="4.6"/>
        <circle cx="160" cy="50" r="42.6" fill="none" stroke="${INK}" stroke-width="1.3"/>
        <circle cx="160" cy="50" r="37.6" fill="none" stroke="${INK}" stroke-width="1" opacity="0.7"/>
        <circle cx="160" cy="10.6" r="1.1" fill="#454f66"/><circle cx="199" cy="45" r="1.1" fill="#454f66"/>
        <circle cx="160" cy="89.4" r="1.1" fill="#454f66"/><circle cx="121" cy="45" r="1.1" fill="#454f66"/>
        <g class="fo-drone">
          <ellipse cx="98" cy="18.5" rx="6.6" ry="1.9" fill="none" stroke="#fde68a" stroke-width="1.5"/>
          <rect x="93.5" y="21.5" width="9" height="7.5" rx="2" fill="#c7ccd4" stroke="${INK}" stroke-width="1"/>
          <circle cx="98" cy="25.2" r="1.9" fill="#38b6ff" stroke="${INK}" stroke-width="0.7"/>
          <rect x="83" y="23.4" width="8.5" height="4.2" rx="0.8" fill="#3b82f6" stroke="${INK}" stroke-width="0.8"/>
          <rect x="104.5" y="23.4" width="8.5" height="4.2" rx="0.8" fill="#3b82f6" stroke="${INK}" stroke-width="0.8"/>
          <line x1="87" y1="24.5" x2="87" y2="26.6" stroke="${INK}" stroke-width="0.5" opacity="0.6"/>
          <line x1="109" y1="24.5" x2="109" y2="26.6" stroke="${INK}" stroke-width="0.5" opacity="0.6"/>
        </g>
        <path d="M204 104 l4 -18 h14 l4 18 z" fill="#2b3352" stroke="${INK}" stroke-width="1.1"/>
        <rect x="205" y="84" width="20" height="3.2" rx="1.6" fill="#454f66" stroke="${INK}" stroke-width="0.9"/>
        <circle cx="215" cy="76" r="12.5" fill="#22d3ee" opacity="0.16"/>
        <circle class="fo-core" cx="215" cy="76" r="7.5" fill="url(#lg-fo-core3)" stroke="#7dd3fc" stroke-width="1"/>
        <ellipse cx="215" cy="76" rx="10.6" ry="3.4" fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.8"/>
        <rect x="18" y="16" width="60" height="3" rx="1.4" fill="#454f66" stroke="${INK}" stroke-width="0.9"/>
        ${trophyUse(27, 16, 0.85)}
        ${trophyUse(43, 16, 0.85)}
        ${trophyUse(59, 16, 0.85)}
        ${trophyUse(73, 16, 0.85)}
        <rect x="18" y="38" width="44" height="3" rx="1.4" fill="#454f66" stroke="${INK}" stroke-width="0.9"/>
        ${trophyUse(28, 38, 0.85)}
        ${trophyUse(44, 38, 0.85)}
        ${trophyUse(57, 38, 0.85)}`;
    }
  }
}

/** Per-stage gradient + symbol defs (unique lg-fo-… ids, no filters).
 * Stages 1+ all show trophies, so they carry the shared trophy symbol. */
function officeDefs(stage: number): string {
  switch (stage) {
    case 1:
      return `<linearGradient id="lg-fo-city1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8fd4ff"/><stop offset="1" stop-color="#ffe3bd"/>
        </linearGradient>${TROPHY_SYMBOL}`;
    case 2:
      return `<linearGradient id="lg-fo-dusk2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5b4a8f"/><stop offset="0.55" stop-color="#c25b7c"/><stop offset="1" stop-color="#ff9a5b"/>
        </linearGradient>${TROPHY_SYMBOL}`;
    case 3:
      return `<radialGradient id="lg-fo-earth3" cx="0.38" cy="0.32" r="0.95">
          <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.6" stop-color="#2e7cd6"/><stop offset="1" stop-color="#173a8a"/>
        </radialGradient>
        <radialGradient id="lg-fo-core3" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#7ae6f5"/><stop offset="1" stop-color="#0ea5e9"/>
        </radialGradient>${TROPHY_SYMBOL}`;
    default:
      return '';
  }
}

/** Founder's executive chair (drawn in the shared seated coord space). */
const FOUNDER_CHAIR = `
  <rect x="6.6" y="13" width="4.2" height="18" rx="2" fill="#7a4426" stroke="${INK}" stroke-width="0.8"/>
  <rect x="7" y="29.5" width="13" height="4.6" rx="2.2" fill="#7a4426" stroke="${INK}" stroke-width="0.8"/>
  <rect x="12" y="33.5" width="4" height="10.5" fill="#4a5568" stroke="${INK}" stroke-width="0.7"/>
  <rect x="7.6" y="43.4" width="12.8" height="1.9" rx="0.95" fill="#4a5568" stroke="${INK}" stroke-width="0.7"/>`;

/** The founder's handsome desk, drawn in scene (240x140) coordinates.
 * Includes the empty nameplate slot (the UI overlays the name in HTML). */
const FOUNDER_DESK = `
  <ellipse cx="131" cy="121" rx="62" ry="5" fill="${INK}" opacity="0.12"/>
  <rect x="80" y="89" width="9" height="30" fill="#5e3319" stroke="${INK}" stroke-width="1"/>
  <rect x="150" y="89" width="36" height="30" fill="#5e3319" stroke="${INK}" stroke-width="1.1"/>
  <rect x="153.5" y="93" width="29" height="10" rx="1.4" fill="#7a4426" stroke="${INK}" stroke-width="0.8"/>
  <rect x="153.5" y="106" width="29" height="10" rx="1.4" fill="#7a4426" stroke="${INK}" stroke-width="0.8"/>
  <rect x="164.5" y="97" width="7" height="1.8" rx="0.9" fill="#ffc93c" stroke="${INK}" stroke-width="0.5"/>
  <rect x="164.5" y="110" width="7" height="1.8" rx="0.9" fill="#ffc93c" stroke="${INK}" stroke-width="0.5"/>
  <rect x="72" y="82" width="118" height="7" rx="2.4" fill="#7a4426" stroke="${INK}" stroke-width="1.3"/>
  <rect x="74" y="83.4" width="114" height="1.4" rx="0.7" fill="#ffc93c" opacity="0.3"/>
  <rect x="96" y="56" width="34" height="23" rx="2" fill="#0f172a" stroke="${INK}" stroke-width="1.3"/>
  <rect x="98" y="58" width="30" height="19" rx="1" class="persona-screen"/>
  <rect x="110" y="79" width="6" height="3.4" fill="#334155" stroke="${INK}" stroke-width="0.7"/>
  <rect x="78.5" y="80.6" width="15" height="1.9" rx="0.95" fill="#1e293b"/>
  <rect x="136" y="77" width="6" height="5.4" rx="1" fill="#ff5d55" stroke="${INK}" stroke-width="0.9"/>
  <path d="M142 78.2 q2.4 0.8 0 3" fill="none" stroke="${INK}" stroke-width="0.8"/>
  <rect x="158" y="79.2" width="13" height="3.2" rx="0.6" fill="#fdfdf4" stroke="${INK}" stroke-width="0.7"/>
  <path d="M160.5 80.8 h8" stroke="${INK}" stroke-width="0.5" opacity="0.4"/>
  <path d="M176 82 q2 -6 5.5 -3.2 q3 2.4 -0.6 3.2 z" fill="#2fbf6b" stroke="${INK}" stroke-width="0.7"/>
  <rect x="176.8" y="79.6" width="4.4" height="2.6" rx="0.6" fill="#c2410c" stroke="${INK}" stroke-width="0.6"/>
  <rect x="117" y="93.5" width="42" height="11" rx="2" fill="#3b2a18" stroke="${INK}" stroke-width="1.1"/>
  <rect class="fo-nameplate" x="120" y="95.6" width="36" height="6.8" rx="1.3" fill="#e9d9a8" stroke="${INK}" stroke-width="0.7"/>`;

const founderOfficeCache = new Map<string, string>();

/**
 * The founder's personal office: a wide scene (viewBox 240x140) with the
 * player seated at a handsome desk. `stage` evolves the room toward the
 * game's global goal (ship a benevolent AGI from orbit):
 *  0 garage den, 1 startup loft, 2 valley penthouse, 3 orbital study.
 * Same player avatar at the desk in all stages. The nameplate rect is an
 * empty slot — the UI overlays the founder's name in HTML.
 */
export function founderOffice(
  look: PlayerLookInput,
  stage: number,
  size = 340,
): string {
  const { look: l, accessoryIdx, key } = resolvePlayer(look);
  // Stage clamps (not wraps): out-of-range progression should show the
  // nearest real stage, and never throw.
  const s = Number.isFinite(stage)
    ? Math.min(3, Math.max(0, Math.trunc(stage)))
    : 0;
  const cacheKey = `${key}|${s}|${size}`;
  const hit = founderOfficeCache.get(cacheKey);
  if (hit) return hit;

  const height = Math.round((size * 140) / 240);
  const torsoExtra = shirtDetailPath(1, 20, 27);
  // The player look is explicit state, but the loop phases still need a
  // deterministic 32-bit seed — hash the resolved look key (same FNV-1a
  // the workers use) so identical looks always render byte-identically.
  const hp = hashSeed(key);
  const glowD = ((hp >>> 21) % 23) / 10; // screen-glow loops every 2.3s
  const droneD = ((hp >>> 24) % 50) / 10; // drone float loops every 5s
  const coreD = ((hp >>> 27) % 28) / 10; // core pulse loops every 2.8s
  const backdrop = officeBackdrop(s)
    .replace('class="fo-drone"', `class="fo-drone" style="animation-delay:-${droneD}s"`)
    .replace('class="fo-core"', `class="fo-core" style="animation-delay:-${coreD}s"`);
  const desk = FOUNDER_DESK.replace(
    'class="persona-screen"',
    `class="persona-screen" style="animation-delay:-${glowD}s"`,
  );
  const svg = `<svg class="founder-office" width="${size}" height="${height}" viewBox="0 0 240 140" aria-hidden="true">
    <defs>${officeDefs(s)}</defs>
    ${backdrop}
    <ellipse cx="50" cy="106" rx="21" ry="3.6" fill="${INK}" opacity="0.12"/>
    <g transform="translate(26,36) scale(1.5)">
      ${FOUNDER_CHAIR}
      ${seatedBody(l, playerAccessory(accessoryIdx), torsoExtra, 'M24 27 q5 2 8 4', 33, 31.4, hp)}
    </g>
    ${desk}
  </svg>`;
  founderOfficeCache.set(cacheKey, svg);
  return svg;
}
