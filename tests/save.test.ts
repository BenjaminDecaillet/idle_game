import { beforeEach, describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/game/data';
import { activeCompany, activeCountry, createInitialState, SAVE_VERSION } from '../src/game/engine';
import {
  SAVE_KEY,
  exportSave,
  importSave,
  loadGame,
  migrate,
  resetGame,
  saveGame,
  serialize,
} from '../src/game/save';
import type { GameState, WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function worker(partial: Partial<WorkerState> & { id: number; name: string }): WorkerState {
  return {
    tierId: 'intern',
    specialization: 'Backend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    ...partial,
  };
}

/** Minimal in-memory Storage mock implementing the full Storage interface. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe('saveGame / loadGame round trip', () => {
  it('restores money/workers/projects', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 12_345;
    c.workers.push(worker({ id: 1, name: 'Ada Lovelace', tierId: 'senior', skillLevel: 3 }));
    c.projects[1].unlocked = true; // unlock 'todo'

    saveGame(state, storage, NOW);
    const result = loadGame(storage, NOW); // same instant => offlineSec = 0, no offline sim

    expect(result.isNewGame).toBe(false);
    expect(result.betaReset).toBe(false);
    expect(activeCountry(result.state).money).toBe(12_345);
    const rc = activeCompany(result.state);
    expect(rc.workers).toHaveLength(1);
    expect(rc.workers[0].name).toBe('Ada Lovelace');
    expect(rc.projects.find((p) => p.defId === 'todo')?.unlocked).toBe(true);
    expect(result.offlineSec).toBe(0);
    expect(result.offlineEarnings).toBe(0);
  });

  it('applies offline progress when enough time passed, capped by OFFLINE_CAP_HOURS', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 1000;
    c.workstations.push({ id: 1, defId: 'basic' });
    c.workers.push(worker({ id: 1, name: 'W', tierId: 'mid', stationId: 1 }));
    saveGame(state, storage, NOW);

    const later = NOW + 60_000; // 60s later, > 5s threshold
    const result = loadGame(storage, later);
    expect(result.offlineSec).toBeCloseTo(60, 6);
    expect(result.offlineEarnings).toBeGreaterThanOrEqual(0);
    expect(result.state.playTimeSec).toBeGreaterThan(0);
  });

  it('falls back to a fresh game on missing save data', () => {
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(true);
    expect(result.betaReset).toBe(false);
    expect(activeCountry(result.state).money).toBe(50);
  });

  it('falls back to a fresh game on corrupt JSON', () => {
    storage.setItem(SAVE_KEY, '{not valid json!!!');
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(true);
    expect(activeCountry(result.state).money).toBe(50);
    expect(activeCompany(result.state).activeProjectId).toBe('landing');
  });

  it('serialize produces valid JSON that round-trips', () => {
    const state = createInitialState(NOW);
    const json = serialize(state);
    const parsed = JSON.parse(json) as GameState;
    expect(parsed.countries[0].money).toBe(activeCountry(state).money);
  });
});

describe('beta reset (pre-v8 saves are discarded)', () => {
  it('discards a pre-v8 save and flags the reset for the UI notice', () => {
    // A realistic v7 save: flat money/companies on the game state.
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 7,
        money: 999_999,
        totalEarned: 123_456,
        companies: [{ id: 1, name: 'Old Corp', siteId: 'garage' }],
        lastSeen: NOW - 1000,
      }),
    );
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(true);
    expect(result.betaReset).toBe(true);
    // Fully fresh: nothing carried over.
    expect(result.state.totalEarned).toBe(0);
    expect(activeCountry(result.state).money).toBe(50);
    expect(activeCompany(result.state).name).toBe('My Startup');
  });

  it('discards a save with no version field at all', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ money: 5, workers: [] }));
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(true);
    expect(result.betaReset).toBe(true);
  });

  it('keeps loading current-version saves', () => {
    const state = createInitialState(NOW);
    expect(state.version).toBe(SAVE_VERSION);
    saveGame(state, storage, NOW);
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(false);
    expect(result.betaReset).toBe(false);
  });
});

describe('migrate (same-version hygiene)', () => {
  it('adds project entries for defs missing from a save', () => {
    const state = createInitialState(NOW);
    const missingDef = PROJECTS[PROJECTS.length - 1];
    const oldSave = JSON.parse(JSON.stringify(state)) as GameState;
    const oc = oldSave.countries[0].companies[0];
    oc.projects = oc.projects.filter((p) => p.defId !== missingDef.id);
    expect(oc.projects).toHaveLength(PROJECTS.length - 1);

    const migrated = migrate(oldSave, NOW);
    const mc = migrated.countries[0].companies[0];
    expect(mc.projects).toHaveLength(PROJECTS.length);
    const restored = mc.projects.find((p) => p.defId === missingDef.id);
    expect(restored).toBeDefined();
    expect(restored?.unlocked).toBe(false);
    expect(restored?.progress).toBe(0);
    expect(restored?.completions).toBe(0);
    expect(restored?.currentWork).toBe(missingDef.baseWork);
    expect(restored?.currentReward).toBe(missingDef.baseReward);
  });

  it('preserves existing project progress for defs that already exist', () => {
    const state = createInitialState(NOW);
    const landing = activeCompany(state).projects.find((p) => p.defId === 'landing')!;
    landing.progress = 17;
    landing.completions = 4;

    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    const landingAfter = migrated.countries[0].companies[0].projects.find(
      (p) => p.defId === 'landing',
    )!;
    expect(landingAfter.progress).toBe(17);
    expect(landingAfter.completions).toBe(4);
  });

  it('re-unlocks the first project if the active project ended up unlocked-less', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    // Corrupt save: active project points to something no longer unlocked.
    c.activeProjectId = 'todo';
    c.projects.forEach((p) => (p.unlocked = p.defId === 'landing' ? false : p.unlocked));

    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    const mc = migrated.countries[0].companies[0];
    expect(mc.projects[0].unlocked).toBe(true);
    expect(mc.activeProjectId).toBe(mc.projects[0].defId);
  });

  it('drops unknown countries and repairs the active country id', () => {
    const state = createInitialState(NOW);
    const save = JSON.parse(JSON.stringify(state)) as GameState;
    (save.countries[0] as { id: string }).id = 'atlantis';
    (save as { activeCountryId: string }).activeCountryId = 'atlantis';

    const migrated = migrate(save, NOW);
    expect(migrated.countries.length).toBeGreaterThan(0);
    expect(migrated.countries.some((c) => (c.id as string) === 'atlantis')).toBe(false);
    expect(migrated.countries.some((c) => c.id === migrated.activeCountryId)).toBe(true);
  });

  it('backfills timed-action and worker fields added after a save was written', () => {
    const state = createInitialState(NOW);
    const save = JSON.parse(JSON.stringify(state)) as GameState;
    const company = save.countries[0].companies[0];
    delete (company as Partial<typeof company>).timedActions;
    delete (company as Partial<typeof company>).floorProjects;
    company.workers = [
      { id: 9, name: 'Old Timer', tierId: 'junior', specialization: 'DevOps', skillLevel: 2, experience: 1, stationId: null } as WorkerState,
    ];

    const migrated = migrate(save, NOW);
    const mc = migrated.countries[0].companies[0];
    expect(mc.timedActions).toEqual([]);
    expect(mc.floorProjects).toEqual([]);
    expect(mc.workers[0].timesTrained).toBe(0);
    expect(mc.workers[0].promotions).toBe(0);
    // nextEntityId stays above every restored id.
    expect(migrated.nextEntityId).toBeGreaterThan(9);
  });

  it('round-trips an in-flight country-level company-build action', () => {
    const state = createInitialState(NOW);
    const actionId = state.nextEntityId++;
    activeCountry(state).timedActions.push({
      id: actionId,
      kind: 'company-build',
      targetId: 0,
      remainingSec: 800,
      totalSec: 960,
      siteId: 'soma-loft',
      price: 200_000,
    });

    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    const restored = migrated.countries[0].timedActions;
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      id: actionId,
      kind: 'company-build',
      remainingSec: 800,
      totalSec: 960,
      siteId: 'soma-loft',
      price: 200_000,
    });
    // nextEntityId stays above the country-level action's id too.
    expect(migrated.nextEntityId).toBeGreaterThan(actionId);
  });

  it('defaults missing builders and country timedActions fields', () => {
    const state = createInitialState(NOW);
    const save = JSON.parse(JSON.stringify(state)) as GameState;
    const country = save.countries[0];
    delete (country as Partial<typeof country>).builders;
    delete (country as Partial<typeof country>).timedActions;
    delete (save as Partial<GameState>).freeFastForwards;
    delete (save as Partial<GameState>).floorGiftClaimed;

    const migrated = migrate(save, NOW);
    expect(migrated.countries[0].builders).toEqual({ count: 1 });
    expect(migrated.countries[0].timedActions).toEqual([]);
    expect(migrated.freeFastForwards).toBe(0);
    expect(migrated.floorGiftClaimed).toBe(false);
  });
});

describe('resetGame', () => {
  it('clears the stored save and returns a fresh state', () => {
    const state = createInitialState(NOW);
    saveGame(state, storage, NOW);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();

    const fresh = resetGame(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(activeCountry(fresh).money).toBe(50);
    expect(activeCountry(fresh).companies).toHaveLength(1);
  });
});

describe('exportSave / importSave', () => {
  it('round-trips a game state', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 777;
    c.name = 'Café Corp';
    c.workers.push(worker({ id: 1, name: 'Grace Hopper', tierId: 'architect', skillLevel: 4 }));

    const encoded = exportSave(state);
    expect(typeof encoded).toBe('string');
    const imported = importSave(encoded, NOW);

    expect(activeCountry(imported).money).toBe(777);
    const ic = activeCompany(imported);
    expect(ic.name).toBe('Café Corp');
    expect(ic.workers).toHaveLength(1);
    expect(ic.workers[0].name).toBe('Grace Hopper');
  });

  it('rejects garbage input', () => {
    expect(() => importSave('this is not base64 json')).toThrow();
  });

  it('rejects valid base64 that is not valid JSON', () => {
    const notJson = btoa('definitely not json');
    expect(() => importSave(notJson)).toThrow();
  });

  it('rejects valid JSON missing required save fields', () => {
    const bogus = btoa(JSON.stringify({ hello: 'world' }));
    expect(() => importSave(bogus)).toThrow('Not a valid save');
  });

  it('rejects pre-v8 exports (beta reset — no migration chain)', () => {
    const legacy = btoa(
      JSON.stringify({ version: 7, money: 100, companies: [], workers: [] }),
    );
    expect(() => importSave(legacy)).toThrow('Not a valid save');
  });
});
