import { COMPANY_SITES, OFFLINE_CAP_HOURS, PROJECTS } from './data';
import { createInitialState, newProjectState, SAVE_VERSION, simulateOffline } from './engine';
import type { CompanyState, GameState } from './types';

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

/**
 * Pre-v3 saves kept a single company's fields flat on the game state.
 * Only the fields the migration reads are listed.
 */
interface LegacyFlatSave {
  companyName: string;
  workers: CompanyState['workers'];
  workstations: CompanyState['workstations'];
  projects: CompanyState['projects'];
  activeProjectId: string;
  upgrades: Record<string, number>;
  candidates: CompanyState['candidates'];
  candidateRerollCost: number;
}

/** Merge a parsed save onto a fresh state so new fields/projects get defaults. */
export function migrate(
  parsed: Partial<GameState> & Partial<LegacyFlatSave>,
  now = Date.now(),
): GameState {
  const fresh = createInitialState(now);
  const state: GameState = {
    ...fresh,
    ...parsed,
    version: SAVE_VERSION,
    settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
    boosts: Array.isArray(parsed.boosts) ? parsed.boosts : [],
    companies: Array.isArray(parsed.companies) && parsed.companies.length > 0
      ? parsed.companies
      : fresh.companies,
  };
  // Strip legacy flat fields that the spread may have copied onto the state.
  for (const key of [
    'companyName', 'workers', 'workstations', 'activeProjectId',
    'upgrades', 'candidates', 'candidateRerollCost', 'projects',
  ]) {
    delete (state as unknown as Record<string, unknown>)[key];
  }

  // v2 → v3: fold the old flat single-company fields into company #1.
  if (!Array.isArray(parsed.companies) || parsed.companies.length === 0) {
    const home = state.companies[0];
    if (typeof parsed.companyName === 'string') home.name = parsed.companyName;
    if (Array.isArray(parsed.workers)) home.workers = parsed.workers;
    if (Array.isArray(parsed.workstations)) home.workstations = parsed.workstations;
    if (Array.isArray(parsed.projects)) home.projects = parsed.projects;
    if (typeof parsed.activeProjectId === 'string') home.activeProjectId = parsed.activeProjectId;
    if (parsed.upgrades) home.upgrades = { ...parsed.upgrades };
    if (Array.isArray(parsed.candidates)) home.candidates = parsed.candidates;
    if (typeof parsed.candidateRerollCost === 'number') {
      home.candidateRerollCost = parsed.candidateRerollCost;
    }
    state.activeCompanyId = home.id;
  }

  // Per-company hygiene: fill defaults for fields added after a company was
  // saved, sync project lists with data.ts, keep sites/active ids valid.
  const template = fresh.companies[0];
  const knownSites = new Set(COMPANY_SITES.map((s) => s.id));
  state.companies = state.companies.map((c) => {
    const company: CompanyState = { ...template, ...c, upgrades: { ...(c.upgrades ?? {}) } };
    if (!knownSites.has(company.siteId)) company.siteId = 'garage';
    // Ensure every project defined in data.ts has a state entry (new content
    // added in updates appears automatically in old saves).
    const byId = new Map((company.projects ?? []).map((p) => [p.defId, p]));
    company.projects = PROJECTS.map((def) => byId.get(def.id) ?? newProjectState(def));
    if (!company.projects.some((p) => p.defId === company.activeProjectId && p.unlocked)) {
      company.projects[0].unlocked = true;
      company.activeProjectId = company.projects[0].defId;
    }
    return company;
  });
  if (!state.companies.some((c) => c.id === state.activeCompanyId)) {
    state.activeCompanyId = state.companies[0].id;
  }

  // nextEntityId must stay above every id in the save (workers, desks,
  // companies) so freshly created entities never collide.
  let maxId = 0;
  for (const c of state.companies) {
    maxId = Math.max(maxId, c.id);
    for (const w of c.workers) maxId = Math.max(maxId, w.id);
    for (const s of c.workstations) maxId = Math.max(maxId, s.id);
  }
  state.nextEntityId = Math.max(state.nextEntityId, maxId + 1);
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
  const parsed = JSON.parse(json) as Partial<GameState> & Partial<LegacyFlatSave>;
  const hasRoster = Array.isArray(parsed.companies) || Array.isArray(parsed.workers);
  if (typeof parsed.money !== 'number' || !hasRoster) {
    throw new Error('Not a valid save');
  }
  return migrate(parsed, now);
}
