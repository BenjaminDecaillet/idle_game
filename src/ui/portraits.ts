import { PLAYER_PORTRAIT_COUNT } from '../game/data';
import type { PlayerLook, Specialization } from '../game/types';
import type { GabrielPose } from './gabriel';
import { gabrielPortrait } from './gabrielPortrait';
import { personaLook, portraitSlot, resolvePlayer } from './persona';
import { paintedBust, type BustAccessory } from './portraitArt';

/**
 * Hybrid character-portrait pipeline (see docs/portraits.md).
 *
 * Characters (player, employees, Gabriel) render as painted semi-realistic
 * portraits — a deliberate contrast with the cartoon UI. Two layers:
 *
 *  1. Raster assets in `public/portraits/` (WebP or PNG, drop-in, zero code
 *     changes). At startup `initPortraits()` probes which files exist; a
 *     probe finishing simply flips the source used by the next 2 Hz
 *     re-render, so assets can even land mid-session.
 *  2. When a file is missing, an upgraded painted SVG placeholder renders
 *     instead (portraitArt.ts / gabrielPortrait.ts) — the game is fully
 *     playable with zero image assets, exactly as before.
 *
 * Mapping:
 *  - employees → `employee-NN` via portraitSlot() (deterministic per worker,
 *    new hash shift — existing persona traits untouched).
 *  - player    → `player-NN` via the explicit `look.portrait` picker
 *    (0 = drawn look built from the customization fields).
 *  - Gabriel   → `gabriel-<pose>`; a missing pose falls back to
 *    `gabriel-idle` before falling back to SVG, so one image is enough.
 */

/** Size of the interchangeable employee portrait pool. */
export const EMPLOYEE_PORTRAIT_COUNT = 24;

const GABRIEL_POSES: GabrielPose[] = ['idle', 'point', 'cheer', 'think'];

/** Raster formats probed for every portrait name, in preference order. */
const FORMATS = ['webp', 'png'] as const;

/** Resolved URL per portrait name (name → url), 'missing' when no file. */
const resolved = new Map<string, string | 'missing'>();

const pad2 = (n: number): string => String(n).padStart(2, '0');

function baseUrl(): string {
  // Vite injects BASE_URL ('/idle_game/' on GitHub Pages). Guarded so the
  // module stays importable from vitest/node.
  try {
    return import.meta.env?.BASE_URL ?? '/';
  } catch {
    return '/';
  }
}

/** Every portrait file name the pipeline knows about (without extension). */
export function portraitNames(): string[] {
  return [
    ...Array.from({ length: EMPLOYEE_PORTRAIT_COUNT }, (_, i) => `employee-${pad2(i + 1)}`),
    ...Array.from({ length: PLAYER_PORTRAIT_COUNT }, (_, i) => `player-${pad2(i + 1)}`),
    ...GABRIEL_POSES.map((pose) => `gabriel-${pose}`),
  ];
}

function probe(name: string, formatIdx = 0): void {
  if (formatIdx >= FORMATS.length) {
    resolved.set(name, 'missing');
    return;
  }
  const url = `${baseUrl()}portraits/${name}.${FORMATS[formatIdx]}`;
  const img = new Image();
  img.onload = () => resolved.set(name, url);
  img.onerror = () => probe(name, formatIdx + 1);
  img.src = url;
}

/**
 * Kick off the availability probe for every known portrait file. Call once
 * at startup; cheap (browser-cached after the first load) and async — the
 * UI's normal 2 Hz re-render picks results up as they arrive.
 */
export function initPortraits(): void {
  if (typeof Image === 'undefined') return; // non-browser (tests)
  for (const name of portraitNames()) probe(name);
}

function urlFor(name: string): string | null {
  const hit = resolved.get(name);
  return hit && hit !== 'missing' ? hit : null;
}

function rasterImg(url: string, size: number): string {
  return `<img class="portrait-img" src="${url}" width="${size}" height="${size}" alt="" aria-hidden="true" draggable="false"/>`;
}

/** Employee tier → painted-bust accessory (mirrors the cartoon tier gear). */
const TIER_ACCESSORY: Record<string, BustAccessory> = {
  intern: 'cap-back',
  mid: 'glasses',
  senior: 'headphones',
  architect: 'crown',
  principal: 'halo',
};

/** Player accessory index → painted-bust accessory (persona.ts order). */
const PLAYER_ACCESSORIES: BustAccessory[] = [
  'none',
  'cap',
  'glasses',
  'sunglasses',
  'headphones',
  'beret',
  'crown',
  'halo',
];

/**
 * Portrait of a worker/candidate: raster when the mapped file exists,
 * painted SVG placeholder otherwise. Same seed convention as personaAvatar.
 */
export function employeePortrait(
  seed: string,
  specialization: Specialization,
  tierId: string,
  size = 44,
): string {
  const slot = portraitSlot(seed, EMPLOYEE_PORTRAIT_COUNT);
  const url = urlFor(`employee-${pad2(slot + 1)}`);
  if (url) return rasterImg(url, size);
  return paintedBust(personaLook(seed, specialization, tierId), TIER_ACCESSORY[tierId] ?? 'none', size);
}

/**
 * Portrait of the player. `look.portrait` > 0 selects a raster card;
 * 0 (or a missing file) paints the look built from the customizer fields.
 */
export function playerPortrait(look: PlayerLook, size = 44): string {
  if (look.portrait > 0) {
    const url = urlFor(`player-${pad2(look.portrait)}`);
    if (url) return rasterImg(url, size);
  }
  const { look: resolvedLook, accessoryIdx } = resolvePlayer(look);
  return paintedBust(resolvedLook, PLAYER_ACCESSORIES[accessoryIdx] ?? 'none', size);
}

/** Gabriel's dialog/coach portrait; pose file → idle file → painted SVG. */
export function gabrielDialogPortrait(pose: GabrielPose, size = 62): string {
  const url = urlFor(`gabriel-${pose}`) ?? urlFor('gabriel-idle');
  if (url) return rasterImg(url, size);
  return gabrielPortrait(pose, size);
}
