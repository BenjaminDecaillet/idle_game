import type { Specialization } from '../game/types';

/**
 * Procedural "little persona" avatars: every worker gets a deterministic
 * SVG character (skin, hair, shirt, tier accessory) derived from a seed,
 * so the same person always looks the same — no image assets needed.
 */

const SKIN = ['#f9d5b3', '#eebc95', '#d19a6b', '#a9714b', '#8a5a3b', '#f7c8c0'];
const HAIR = ['#2b2b2b', '#5b3a1e', '#a9741f', '#d9c087', '#b8442c', '#6b7280', '#7c3aed', '#0ea5e9'];

const SHIRT: Record<Specialization, string> = {
  Frontend: '#ec4899',
  Backend: '#3b82f6',
  DevOps: '#10b981',
  'Data Science': '#f59e0b',
};

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
  hairstyle: number; // 0..3
}

export function personaLook(seed: string, specialization: Specialization): PersonaLook {
  const h = hashSeed(seed);
  return {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >> 3) % HAIR.length],
    shirt: SHIRT[specialization],
    hairstyle: (h >> 7) % 4,
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
    default: // curly
      return `<circle cx="10.8" cy="9.4" r="2.6" fill="${hair}"/>
              <circle cx="16" cy="7.6" r="3" fill="${hair}"/>
              <circle cx="21.2" cy="9.4" r="2.6" fill="${hair}"/>`;
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
  const look = personaLook(seed, specialization);
  return `<svg class="persona-avatar" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.06)"/>
    <path d="M6 32 q0 -9 10 -9 q10 0 10 9 z" fill="${look.shirt}"/>
    <circle cx="16" cy="13" r="7" fill="${look.skin}"/>
    ${hairPath(look.hairstyle, look.hair)}
    <circle cx="13.4" cy="13.8" r="0.9" fill="#1f2937"/>
    <circle cx="18.6" cy="13.8" r="0.9" fill="#1f2937"/>
    <path d="M13.8 17.2 q2.2 1.6 4.4 0" stroke="#1f2937" stroke-width="0.9" fill="none" stroke-linecap="round"/>
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
  const look = personaLook(seed, specialization);
  return `<svg class="persona-desk" viewBox="0 0 64 56" aria-hidden="true">
    <!-- chair -->
    <rect x="8" y="30" width="12" height="4" rx="2" fill="#1f2937"/>
    <rect x="12" y="33" width="4" height="12" fill="#1f2937"/>
    <!-- person -->
    <g class="persona-sit-head">
      <circle cx="20" cy="16" r="6.4" fill="${look.skin}"/>
      <g transform="translate(4.8,2.6) scale(0.92)">${hairPath(look.hairstyle, look.hair)}</g>
      <circle cx="22.4" cy="16.6" r="0.8" fill="#1f2937"/>
      <g transform="translate(4.8,2.6) scale(0.92)">${accessory(tierId)}</g>
    </g>
    <path d="M13 34 q0 -12 8 -11 q6 0.6 8 6 l3 5 z" fill="${look.shirt}"/>
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
  const look = personaLook(seed, specialization);
  return `<svg class="persona-stand" viewBox="0 0 32 56" aria-hidden="true">
    <g class="persona-sway">
      <circle cx="16" cy="12" r="6.6" fill="${look.skin}"/>
      <g transform="translate(0.6,-1.4) scale(0.96)">${hairPath(look.hairstyle, look.hair)}</g>
      <circle cx="13.6" cy="12.6" r="0.85" fill="#1f2937"/>
      <circle cx="18.4" cy="12.6" r="0.85" fill="#1f2937"/>
      <path d="M13.9 15.8 q2.1 1.5 4.2 0" stroke="#1f2937" stroke-width="0.85" fill="none" stroke-linecap="round"/>
      <g transform="translate(0.6,-1.4) scale(0.96)">${accessory(tierId)}</g>
      <path d="M9 34 q0 -16 7 -15 q7 -1 7 15 z" fill="${look.shirt}"/>
      <rect x="11.4" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
      <rect x="17" y="34" width="3.6" height="14" rx="1.6" fill="#1e293b"/>
    </g>
  </svg>`;
}
