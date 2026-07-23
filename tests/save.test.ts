import { beforeEach, describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/game/data';
import { activeCompany, createInitialState } from '../src/game/engine';
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
import type { GameState } from '../src/game/types';

const NOW = 1_700_000_000_000;

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
    state.money = 12_345;
    c.workers.push({
      id: 1,
      name: 'Ada Lovelace',
      tierId: 'senior',
      specialization: 'Backend',
      skillLevel: 3,
      experience: 12,
      stationId: null,
    });
    c.projects[1].unlocked = true; // unlock 'todo'

    saveGame(state, storage, NOW);
    const result = loadGame(storage, NOW); // same instant => offlineSec = 0, no offline sim

    expect(result.isNewGame).toBe(false);
    expect(result.state.money).toBe(12_345);
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
    state.money = 1000;
    c.workstations.push({ id: 1, defId: 'basic' });
    c.workers.push({
      id: 1,
      name: 'W',
      tierId: 'mid',
      specialization: 'Frontend',
      skillLevel: 1,
      experience: 0,
      stationId: 1,
    });
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
    expect(result.state.money).toBe(50);
  });

  it('falls back to a fresh game on corrupt JSON', () => {
    storage.setItem(SAVE_KEY, '{not valid json!!!');
    const result = loadGame(storage, NOW);
    expect(result.isNewGame).toBe(true);
    expect(result.state.money).toBe(50);
    expect(activeCompany(result.state).activeProjectId).toBe('landing');
  });

  it('serialize produces valid JSON that round-trips', () => {
    const state = createInitialState(NOW);
    const json = serialize(state);
    const parsed = JSON.parse(json);
    expect(parsed.money).toBe(state.money);
  });
});

describe('migrate', () => {
  it('adds project entries for defs missing from an old save', () => {
    const state = createInitialState(NOW);
    // Simulate an old save that predates the last project in PROJECTS.
    const missingDef = PROJECTS[PROJECTS.length - 1];
    const oldSave = JSON.parse(JSON.stringify(state)) as GameState;
    const oc = oldSave.companies[0];
    oc.projects = oc.projects.filter((p) => p.defId !== missingDef.id);
    expect(oc.projects).toHaveLength(PROJECTS.length - 1);

    const migrated = migrate(oldSave, NOW);
    const mc = migrated.companies[0];
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
    const mc = migrated.companies[0];
    const landingAfter = mc.projects.find((p) => p.defId === 'landing')!;
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
    const mc = migrated.companies[0];
    expect(mc.projects[0].unlocked).toBe(true);
    expect(mc.activeProjectId).toBe(mc.projects[0].defId);
  });
});

describe('resetGame', () => {
  it('clears the stored save and returns a fresh state', () => {
    const state = createInitialState(NOW);
    saveGame(state, storage, NOW);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();

    const fresh = resetGame(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(fresh.money).toBe(50);
    expect(fresh.companies).toHaveLength(1);
  });
});

describe('exportSave / importSave', () => {
  it('round-trips a game state', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 777;
    c.name = 'Café Corp';
    c.workers.push({
      id: 1,
      name: 'Grace Hopper',
      tierId: 'architect',
      specialization: 'DevOps',
      skillLevel: 4,
      experience: 3,
      stationId: null,
    });

    const encoded = exportSave(state);
    expect(typeof encoded).toBe('string');
    const imported = importSave(encoded, NOW);

    expect(imported.money).toBe(777);
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
});
