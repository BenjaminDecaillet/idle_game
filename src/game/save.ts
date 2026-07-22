import { OFFLINE_CAP_HOURS, PROJECTS } from './data';
import { createInitialState, SAVE_VERSION, simulateOffline } from './engine';
import type { GameState } from './types';

export const SAVE_KEY = 'idle-silicon-valley-save';

export interface LoadResult {
  state: GameState;
  offlineSec: number;
  offlineEarnings: number;
  isNewGame: boolean;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function saveGame(state: GameState, storage: Storage = localStorage, now = Date.now()): void {
  state.lastSeen = now;
  try {
    storage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // Storage full or unavailable (private mode) — the game keeps running.
  }
}

/**
 * Load a save, migrate it against current game data, and apply offline
 * progress (capped). Falls back to a fresh game on corrupt/missing data.
 */
export function loadGame(storage: Storage = localStorage, now = Date.now()): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    return { state: createInitialState(now), offlineSec: 0, offlineEarnings: 0, isNewGame: true };
  }
  try {
    const parsed = JSON.parse(raw) as GameState;
    const state = migrate(parsed, now);
    const offlineSec = Math.max(0, (now - state.lastSeen) / 1000);
    let offlineEarnings = 0;
    if (offlineSec > 5) {
      offlineEarnings = simulateOffline(state, offlineSec, OFFLINE_CAP_HOURS * 3600);
    }
    state.lastSeen = now;
    return { state, offlineSec, offlineEarnings, isNewGame: false };
  } catch {
    return { state: createInitialState(now), offlineSec: 0, offlineEarnings: 0, isNewGame: true };
  }
}

/** Merge a parsed save onto a fresh state so new fields/projects get defaults. */
export function migrate(parsed: Partial<GameState>, now = Date.now()): GameState {
  const fresh = createInitialState(now);
  const state: GameState = {
    ...fresh,
    ...parsed,
    version: SAVE_VERSION,
    settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
    upgrades: { ...(parsed.upgrades ?? {}) },
  };
  // Ensure every project defined in data.ts has a state entry (new content
  // added in updates appears automatically in old saves).
  const byId = new Map(state.projects.map((p) => [p.defId, p]));
  state.projects = PROJECTS.map(
    (def) =>
      byId.get(def.id) ?? {
        defId: def.id,
        unlocked: false,
        progress: 0,
        completions: 0,
        currentWork: def.baseWork,
        currentReward: def.baseReward,
      },
  );
  if (!state.projects.some((p) => p.defId === state.activeProjectId && p.unlocked)) {
    state.projects[0].unlocked = true;
    state.activeProjectId = state.projects[0].defId;
  }
  return state;
}

export function resetGame(storage: Storage = localStorage): GameState {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
  return createInitialState();
}

export function exportSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(serialize(state))));
}

export function importSave(encoded: string, now = Date.now()): GameState {
  const json = decodeURIComponent(escape(atob(encoded.trim())));
  const parsed = JSON.parse(json) as Partial<GameState>;
  if (typeof parsed.money !== 'number' || !Array.isArray(parsed.workers)) {
    throw new Error('Not a valid save');
  }
  return migrate(parsed, now);
}
