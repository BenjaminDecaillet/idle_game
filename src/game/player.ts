import { PLAYER_LOOK_OPTIONS } from './data';
import { companyAtSite, getProject } from './engine';
import type { GameState, PlayerLook } from './types';

/**
 * Player avatar customization + the founder office progression.
 * Pure logic: the look is validated index data; the office stage is
 * derived from durable milestones so it always matches the story arc.
 */

export type PlayerLookField = keyof PlayerLook;

export const PLAYER_LOOK_FIELDS = Object.keys(PLAYER_LOOK_OPTIONS) as PlayerLookField[];

/** Set one or more look fields. Rejects unknown values, applies atomically. */
export function setPlayerLook(state: GameState, patch: Partial<PlayerLook>): string | null {
  const next: PlayerLook = { ...state.player.look };
  for (const field of PLAYER_LOOK_FIELDS) {
    const value = patch[field];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < 0 || value >= PLAYER_LOOK_OPTIONS[field]) {
      return `Invalid ${field}`;
    }
    next[field] = value;
  }
  state.player.look = next;
  return null;
}

/** Step a look field forward/backward with wrap-around (UI arrows). */
export function cyclePlayerLook(
  state: GameState,
  field: PlayerLookField,
  direction: 1 | -1,
): string | null {
  const count = PLAYER_LOOK_OPTIONS[field];
  if (count === undefined) return `Invalid ${String(field)}`;
  const current = state.player.look[field] ?? 0;
  state.player.look[field] = (current + direction + count) % count;
  return null;
}

/**
 * How far the founder's own office has evolved toward the global goal
 * (ship a benevolent AGI from orbit). Mirrors the story arc but derives
 * from durable state, so it's correct even on imported/backfilled saves.
 *
 * 0 garage den → 1 startup loft → 2 valley penthouse → 3 orbital study
 */
export function officeStage(state: GameState): number {
  const orbital = companyAtSite(state, 'orbital');
  const agiShipped = state.companies.some((c) => getProject(c, 'agi').completions >= 1);
  if (orbital && agiShipped) return 3;
  if (state.companies.length >= 5 || state.companies.some((c) => getProject(c, 'agi').unlocked)) {
    return 2;
  }
  if (state.companies.length >= 2) return 1;
  return 0;
}
