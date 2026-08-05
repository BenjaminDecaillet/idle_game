import {
  COMPANY_SITES,
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_PLAYER_LOOK,
  FLOOR_CAPACITY,
  MAP_THEMES,
  MAX_FLOORS,
  MISSIONS,
  PLAYER_LOOK_OPTIONS,
  OFFLINE_CAP_HOURS,
  PROJECTS,
  TIME_SCALES,
  PETS,
  TRAITS,
  UPGRADES,
  WALLPAPERS,
  siteById,
} from './data';
import {
  createInitialState,
  newProjectState,
  SAVE_VERSION,
  simulateOfflineReport,
  type OfflineReport,
} from './engine';
import { STORY_BEATS } from './story';
import { TUTORIAL_STEPS } from './tutorial';
import type { CompanyState, CountryState, GameState, PlayerLook } from './types';

export const SAVE_KEY = 'idle-silicon-valley-save';

export interface LoadResult {
  state: GameState;
  offlineSec: number;
  offlineEarnings: number;
  /** Itemized breakdown of the offline simulation (null when none ran). */
  offlineReport: OfflineReport | null;
  isNewGame: boolean;
  /**
   * A pre-v8 save was found and discarded (approved beta reset). The UI
   * shows a friendly translated notice explaining the fresh start.
   */
  betaReset: boolean;
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
 * Load a save and apply offline progress (capped). Falls back to a fresh
 * game on corrupt/missing data. BETA POLICY: saves below SAVE_VERSION are
 * discarded (one-time approved reset for the big progression/expansion
 * update) — the player starts fresh and the UI explains why.
 */
export function loadGame(storage: Storage = localStorage, now = Date.now()): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    return fresh(now, false);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (typeof parsed.version !== 'number' || parsed.version < SAVE_VERSION) {
      return fresh(now, true);
    }
    const state = migrate(parsed, now);
    const offlineSec = Math.max(0, (now - state.lastSeen) / 1000);
    let offlineReport: OfflineReport | null = null;
    if (offlineSec > 5) {
      offlineReport = simulateOfflineReport(state, offlineSec, OFFLINE_CAP_HOURS * 3600);
    }
    state.lastSeen = now;
    return {
      state,
      offlineSec,
      offlineEarnings: offlineReport?.earnings ?? 0,
      offlineReport,
      isNewGame: false,
      betaReset: false,
    };
  } catch {
    return fresh(now, false);
  }
}

function fresh(now: number, betaReset: boolean): LoadResult {
  return {
    state: createInitialState(now),
    offlineSec: 0,
    offlineEarnings: 0,
    offlineReport: null,
    isNewGame: true,
    betaReset,
  };
}

/**
 * Merge a current-version save onto a fresh state so fields added in later
 * same-version builds get defaults, and repair corrupt/out-of-range values.
 * There is no cross-version migration chain: pre-v8 saves are discarded by
 * loadGame (beta reset), and future breaking changes decide their own
 * policy when they land.
 */
export function migrate(parsed: Partial<GameState>, now = Date.now()): GameState {
  const fresh = createInitialState(now);
  const state: GameState = {
    ...fresh,
    ...parsed,
    version: SAVE_VERSION,
    settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
    daily: {
      day: Number.isFinite(parsed.daily?.day) ? parsed.daily!.day : -1,
      contracts: Array.isArray(parsed.daily?.contracts) ? parsed.daily.contracts : [],
      // Coerce baseline values: a corrupt entry would turn dailyProgress
      // into NaN and poison the progress bars.
      baselines: Object.fromEntries(
        Object.entries(
          parsed.daily?.baselines && typeof parsed.daily.baselines === 'object'
            ? parsed.daily.baselines
            : {},
        ).map(([k, v]) => [k, typeof v === 'number' && Number.isFinite(v) ? v : 0]),
      ),
      claimed: Array.isArray(parsed.daily?.claimed) ? parsed.daily.claimed : [],
    },
    boosts: Array.isArray(parsed.boosts) ? parsed.boosts : [],
    vault: {
      amount:
        typeof parsed.vault?.amount === 'number' &&
        Number.isFinite(parsed.vault.amount) &&
        parsed.vault.amount >= 0
          ? parsed.vault.amount
          : 0,
    },
    story: {
      seen: Array.isArray(parsed.story?.seen) ? parsed.story.seen : [],
      queue: Array.isArray(parsed.story?.queue) ? parsed.story.queue : [],
    },
    tutorial: { ...fresh.tutorial, ...(parsed.tutorial ?? {}) },
    player: {
      ...fresh.player,
      ...(parsed.player ?? {}),
      look: { ...fresh.player.look, ...(parsed.player?.look ?? {}) },
    },
    vsCoin:
      typeof parsed.vsCoin === 'number' && Number.isFinite(parsed.vsCoin) && parsed.vsCoin >= 0
        ? parsed.vsCoin
        : 0,
    vsCoinLedger: Array.isArray(parsed.vsCoinLedger) ? parsed.vsCoinLedger : [],
    missionsClaimed: Array.isArray(parsed.missionsClaimed) ? parsed.missionsClaimed : [],
    globalUpgrades: { ...(parsed.globalUpgrades ?? {}) },
    fastForwardsUsed:
      typeof parsed.fastForwardsUsed === 'number' && parsed.fastForwardsUsed >= 0
        ? parsed.fastForwardsUsed
        : 0,
    promotionsDone:
      typeof parsed.promotionsDone === 'number' && parsed.promotionsDone >= 0
        ? parsed.promotionsDone
        : 0,
    freeFastForwards:
      typeof parsed.freeFastForwards === 'number' &&
      Number.isFinite(parsed.freeFastForwards) &&
      parsed.freeFastForwards >= 0
        ? Math.floor(parsed.freeFastForwards)
        : 0,
    floorGiftClaimed: parsed.floorGiftClaimed === true,
    doublerLastClaimedAt:
      typeof parsed.doublerLastClaimedAt === 'number' &&
      Number.isFinite(parsed.doublerLastClaimedAt) &&
      parsed.doublerLastClaimedAt >= 0
        ? parsed.doublerLastClaimedAt
        : 0,
    offlineDoublesClaimed:
      typeof parsed.offlineDoublesClaimed === 'number' &&
      Number.isFinite(parsed.offlineDoublesClaimed) &&
      parsed.offlineDoublesClaimed >= 0
        ? Math.floor(parsed.offlineDoublesClaimed)
        : 0,
    prestige: {
      count:
        typeof parsed.prestige?.count === 'number' &&
        Number.isFinite(parsed.prestige.count) &&
        parsed.prestige.count >= 0
          ? Math.floor(parsed.prestige.count)
          : 0,
      reputation:
        typeof parsed.prestige?.reputation === 'number' &&
        Number.isFinite(parsed.prestige.reputation) &&
        parsed.prestige.reputation >= 0
          ? Math.floor(parsed.prestige.reputation)
          : 0,
    },
    countries:
      Array.isArray(parsed.countries) && parsed.countries.length > 0
        ? parsed.countries
        : fresh.countries,
  };

  // Country hygiene: drop unknown countries, dedupe ids, fill defaults for
  // fields added after the save was written, and keep active ids valid.
  const knownCountries = new Set(COUNTRIES.map((c) => c.id));
  const seenCountries = new Set<string>();
  const freshCountry = fresh.countries[0];
  state.countries = state.countries
    .filter((c) => {
      if (!knownCountries.has(c?.id) || seenCountries.has(c.id)) return false;
      seenCountries.add(c.id);
      return true;
    })
    .map((c) => migrateCountry(c, freshCountry));
  if (state.countries.length === 0) state.countries = fresh.countries;
  if (!state.countries.some((c) => c.id === state.activeCountryId)) {
    state.activeCountryId = state.countries[0].id;
  }

  // Cosmetics hygiene: drop unknown ids, keep the free defaults owned, and
  // make sure the selected default/theme is actually owned.
  const wallpaperIds = new Set(WALLPAPERS.map((w) => w.id));
  const petIds = new Set(PETS.map((p) => p.id));
  state.ownedPets = Array.from(
    new Set((state.ownedPets ?? []).filter((id) => petIds.has(id))),
  );
  state.ownedWallpapers = Array.from(
    new Set(['concrete', ...(state.ownedWallpapers ?? []).filter((id) => wallpaperIds.has(id))]),
  );
  if (!state.ownedWallpapers.includes(state.defaultWallpaperId)) {
    state.defaultWallpaperId = 'concrete';
  }
  for (const c of state.countries) {
    for (const company of c.companies) {
      if (company.wallpaperId !== null && !state.ownedWallpapers.includes(company.wallpaperId)) {
        company.wallpaperId = null;
      }
    }
  }
  const themeIds = new Set(MAP_THEMES.map((t) => t.id));
  state.ownedMapThemes = Array.from(
    new Set(['daylight', ...(state.ownedMapThemes ?? []).filter((id) => themeIds.has(id))]),
  );
  if (!state.ownedMapThemes.includes(state.mapThemeId)) state.mapThemeId = 'daylight';
  if (!TIME_SCALES.includes(state.settings.timeScale)) state.settings.timeScale = 1;

  // Player look hygiene: any out-of-range/corrupt index falls back to the
  // default so the avatar renderers always get valid data.
  for (const field of Object.keys(PLAYER_LOOK_OPTIONS) as (keyof PlayerLook)[]) {
    const value = state.player.look[field];
    if (!Number.isInteger(value) || value < 0 || value >= PLAYER_LOOK_OPTIONS[field]) {
      state.player.look[field] = DEFAULT_PLAYER_LOOK[field];
    }
  }

  // Mission/upgrade hygiene: drop claims/levels for content that no longer
  // exists (content may change between same-version builds).
  const knownMissions = new Set(MISSIONS.map((m) => m.id));
  state.missionsClaimed = state.missionsClaimed.filter((id) => knownMissions.has(id));
  const knownUpgrades = new Set(UPGRADES.map((u) => u.id));
  for (const id of Object.keys(state.globalUpgrades)) {
    if (!knownUpgrades.has(id)) delete state.globalUpgrades[id];
  }

  const knownBeats = new Set(STORY_BEATS.map((b) => b.id));
  state.story.seen = state.story.seen.filter((id) => knownBeats.has(id));
  state.story.queue = state.story.queue.filter((id) => knownBeats.has(id));
  state.tutorial.step = Math.max(0, Math.min(state.tutorial.step, TUTORIAL_STEPS.length));
  if (!['auto', 'en', 'fr'].includes(state.settings.language)) {
    state.settings.language = 'auto';
  }
  state.settings.music = state.settings.music === true;
  state.settings.animations = state.settings.animations !== false;
  state.settings.floatingNumbers = state.settings.floatingNumbers !== false;
  state.settings.musicVolume = Number.isFinite(state.settings.musicVolume)
    ? Math.max(0, Math.min(1, state.settings.musicVolume))
    : 0.5;

  // nextEntityId must stay above every id in the save (workers, desks,
  // companies, timed actions) so fresh entities never collide.
  let maxId = 0;
  for (const country of state.countries) {
    for (const a of country.timedActions) maxId = Math.max(maxId, a.id);
    for (const c of country.companies) {
      maxId = Math.max(maxId, c.id);
      for (const w of c.workers) maxId = Math.max(maxId, w.id);
      for (const s of c.workstations) maxId = Math.max(maxId, s.id);
      for (const a of c.timedActions) maxId = Math.max(maxId, a.id);
    }
  }
  state.nextEntityId = Math.max(state.nextEntityId, maxId + 1);
  return state;
}

/** Per-country hygiene: defaults, valid sites, project sync, active ids. */
function migrateCountry(saved: CountryState, template: CountryState): CountryState {
  const country: CountryState = {
    ...template,
    ...saved,
    money: typeof saved.money === 'number' && Number.isFinite(saved.money) ? saved.money : 0,
    usedCompanyNames: Array.isArray(saved.usedCompanyNames) ? saved.usedCompanyNames : [],
    companies: Array.isArray(saved.companies) ? saved.companies : [],
    builders: {
      count:
        typeof saved.builders?.count === 'number' &&
        Number.isFinite(saved.builders.count) &&
        saved.builders.count >= 1
          ? Math.floor(saved.builders.count)
          : 1,
    },
    timedActions: Array.isArray(saved.timedActions) ? saved.timedActions : [],
  };
  const companyTemplate = template.companies[0];
  const knownSites = new Set(COMPANY_SITES.map((s) => s.id));
  const knownTraits = new Set(TRAITS.map((t) => t.id));
  const knownPets = new Set(PETS.map((p) => p.id));
  country.companies = country.companies.map((c) => {
    const company: CompanyState = {
      ...companyTemplate,
      ...c,
      upgrades: { ...(c.upgrades ?? {}) },
      timedActions: Array.isArray(c.timedActions) ? c.timedActions : [],
      floorProjects: Array.isArray(c.floorProjects) ? c.floorProjects : [],
    };
    if (!knownSites.has(company.siteId)) company.siteId = 'garage';
    // Candidates and workers may predate traits — default and drop unknown.
    if (typeof company.petId !== 'string' || !knownPets.has(company.petId)) {
      company.petId = null;
    }
    company.candidates = (company.candidates ?? []).map((cand) => ({
      ...cand,
      traits: Array.isArray(cand.traits) ? cand.traits.filter((id) => knownTraits.has(id)) : [],
    }));
    // Fill in worker fields added after the save was written.
    company.workers = (company.workers ?? []).map((w) => ({
      ...w,
      timesTrained: typeof w.timesTrained === 'number' ? w.timesTrained : 0,
      promotions: typeof w.promotions === 'number' ? w.promotions : 0,
      // Drop unknown trait ids so removed content can't linger in saves.
      traits: Array.isArray(w.traits) ? w.traits.filter((id) => knownTraits.has(id)) : [],
    }));
    // Saves that own more desks than their floors hold get enough floors
    // for their desks, free of charge (clamped to MAX_FLOORS otherwise).
    const neededFloors = Math.ceil(company.workstations.length / FLOOR_CAPACITY);
    const savedFloors = Math.max(1, Math.min(company.floors ?? 1, MAX_FLOORS));
    company.floors = Math.max(savedFloors, neededFloors);
    // Ensure every project defined in data.ts has a state entry (new content
    // added in updates appears automatically), scaled to the company's site.
    const byId = new Map((company.projects ?? []).map((p) => [p.defId, p]));
    const scale = siteById(company.siteId).projectScale;
    company.projects = PROJECTS.map((def) => byId.get(def.id) ?? newProjectState(def, scale));
    if (!company.projects.some((p) => p.defId === company.activeProjectId && p.unlocked)) {
      company.projects[0].unlocked = true;
      company.activeProjectId = company.projects[0].defId;
    }
    return company;
  });
  if (country.companies.length === 0) {
    country.companies = [structuredClone(companyTemplate)];
  }
  if (!country.companies.some((c) => c.id === country.activeCompanyId)) {
    country.activeCompanyId = country.companies[0].id;
  }
  return country;
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
  if (
    typeof parsed.version !== 'number' ||
    parsed.version < SAVE_VERSION ||
    !Array.isArray(parsed.countries)
  ) {
    throw new Error('Not a valid save');
  }
  return migrate(parsed, now);
}

// Re-export so existing imports keep working; DEFAULT_COUNTRY documents the
// fresh-game fallback used by createInitialState.
export { DEFAULT_COUNTRY };
