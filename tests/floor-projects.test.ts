import { describe, expect, it } from 'vitest';
import {
  FLOOR_CAPACITY,
  PROJECTS,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  assignFloorProject,
  buyFloor,
  buyWorkstation,
  createInitialState,
  floorBuildDurationSec,
  floorProject,
  getProject,
  simulateOffline,
  tick,
  unlockProject,
} from '../src/game/engine';
import type { GameState, WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function makeWorker(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id: 9999,
    name: 'Test Worker',
    tierId: 'junior',
    specialization: 'Backend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    ...overrides,
  };
}

/**
 * Helper: build a company up to N floors.
 * Returns the company for chaining.
 */
function buildFloors(state: GameState, targetFloors: number) {
  const c = activeCompany(state);
  const country = activeCountry(state);
  country.money = 1_000_000; // lots of money for floor building

  while (c.floors < targetFloors) {
    const err = buyFloor(state);
    expect(err).toBeNull();
    const duration = floorBuildDurationSec(country, c);
    tick(state, duration + 1);
  }
  expect(c.floors).toBe(targetFloors);
  return c;
}

describe('assignFloorProject — no slot cap', () => {
  it('allows assigning different projects to every floor with no cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Build up to 3 floors
    buildFloors(state, 3);

    // Unlock two extra projects (beyond landing)
    const unlockCosts = [75, 400]; // 'todo', 'api'
    for (const cost of unlockCosts) {
      country.money += cost;
    }
    const err1 = unlockProject(state, 'todo');
    const err2 = unlockProject(state, 'api');
    expect(err1).toBeNull();
    expect(err2).toBeNull();

    // Assign each floor a different project
    const floorAssign1 = assignFloorProject(state, 0, 'landing');
    const floorAssign2 = assignFloorProject(state, 1, 'todo');
    const floorAssign3 = assignFloorProject(state, 2, 'api');

    // All three calls should succeed
    expect(floorAssign1).toBeNull(); // no error
    expect(floorAssign2).toBeNull();
    expect(floorAssign3).toBeNull();

    // Verify assignments
    expect(floorProject(c, 0)).toBe('landing');
    expect(floorProject(c, 1)).toBe('todo');
    expect(floorProject(c, 2)).toBe('api');
  });
});

describe('assignFloorProject — validation', () => {
  it('rejects floor index out of range', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(c.floors).toBe(1);

    // Negative floor
    const err1 = assignFloorProject(state, -1, 'landing');
    expect(err1).toBe('error.noSuchFloor');

    // Floor index at or beyond count
    const err2 = assignFloorProject(state, 1, 'landing');
    expect(err2).toBe('error.noSuchFloor');

    const err3 = assignFloorProject(state, 100, 'landing');
    expect(err3).toBe('error.noSuchFloor');
  });

  it('rejects non-integer floor index', () => {
    const state = createInitialState(NOW);
    const err = assignFloorProject(state, 0.5, 'landing');
    expect(err).toBe('error.noSuchFloor');
  });

  it('rejects unknown project id', () => {
    const state = createInitialState(NOW);
    const err = assignFloorProject(state, 0, 'nonexistent-project');
    expect(err).toBe('error.noSuchProject');
  });

  it('rejects locked project', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // 'todo' is locked by default
    const todoDef = PROJECTS.find((p) => p.id === 'todo');
    expect(todoDef).not.toBeUndefined();
    const todoProject = getProject(c, 'todo');
    expect(todoProject.unlocked).toBe(false);

    const err = assignFloorProject(state, 0, 'todo');
    expect(err).toBe('error.projectLocked');
  });

  it('accepts null projectId to reset floor to activeProjectId', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Unlock 'todo'
    const todoDef = PROJECTS.find((p) => p.id === 'todo')!;
    country.money = todoDef.unlockCost;
    unlockProject(state, 'todo');

    // Assign floor 0 to 'todo'
    let err = assignFloorProject(state, 0, 'todo');
    expect(err).toBeNull();
    expect(floorProject(c, 0)).toBe('todo');

    // Reset to null
    err = assignFloorProject(state, 0, null);
    expect(err).toBeNull();

    // Floor should now fall back to activeProjectId (landing)
    expect(floorProject(c, 0)).toBe(c.activeProjectId);
    expect(floorProject(c, 0)).toBe('landing');
  });
});

describe('floorProject — fallback semantics', () => {
  it('falls back to activeProjectId when no assignment', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // No assignment yet (floorProjects is empty or has null at floor 0)
    expect(floorProject(c, 0)).toBe(c.activeProjectId);
    expect(floorProject(c, 0)).toBe('landing');
  });

  it('falls back to activeProjectId when assigned project is no longer unlocked', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Unlock 'todo'
    const todoDef = PROJECTS.find((p) => p.id === 'todo')!;
    country.money = todoDef.unlockCost;
    unlockProject(state, 'todo');

    // Assign floor 0 to 'todo'
    assignFloorProject(state, 0, 'todo');
    expect(floorProject(c, 0)).toBe('todo');

    // Manually lock the project (simulate stale save, or some edge case)
    // We directly manipulate the project state to simulate a locked state
    const todoProject = getProject(c, 'todo');
    todoProject.unlocked = false;

    // floorProject should now fall back to activeProjectId
    expect(floorProject(c, 0)).toBe(c.activeProjectId);
    expect(floorProject(c, 0)).toBe('landing');
  });

  it('uses assigned project when it exists and is unlocked', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Unlock 'api'
    const apiDef = PROJECTS.find((p) => p.id === 'api')!;
    country.money = apiDef.unlockCost;
    unlockProject(state, 'api');

    // Assign floor 0 to 'api'
    assignFloorProject(state, 0, 'api');

    // floorProject should return 'api'
    expect(floorProject(c, 0)).toBe('api');
  });
});

describe('tick() routing — multiple floors, multiple projects', () => {
  it('routes workers from different floors to different projects and advances each', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Build a second floor
    buildFloors(state, 2);

    // Buy workstations on both floors (FLOOR_CAPACITY per floor)
    for (let i = 0; i < FLOOR_CAPACITY * 2; i++) {
      buyWorkstation(state, 'basic');
    }

    // Unlock two extra projects and assign them
    const apiDef = PROJECTS.find((p) => p.id === 'api')!;
    country.money = apiDef.unlockCost + 100_000;
    unlockProject(state, 'api');

    // Floor 0 -> landing (default)
    // Floor 1 -> api
    assignFloorProject(state, 0, 'landing');
    assignFloorProject(state, 1, 'api');

    // Create two workers
    const w1 = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Frontend', // matches landing
    });
    c.workers.push(w1);

    const w2 = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend', // matches api
    });
    c.workers.push(w2);

    // autoSeat will place w1 on desk 0 (floor 0) and w2 on desk 1 (floor 0)
    // But we need w2 on floor 1. So manually place them.
    // Desk 0-3 are floor 0, desk 4-7 are floor 1
    w1.stationId = c.workstations[0].id; // floor 0
    w2.stationId = c.workstations[4].id; // floor 1

    // Tick and check progress
    const landingBefore = getProject(c, 'landing').progress;
    const apiBefore = getProject(c, 'api').progress;

    tick(state, 10);

    const landingAfter = getProject(c, 'landing').progress;
    const apiAfter = getProject(c, 'api').progress;

    // Both projects should have advanced
    expect(landingAfter).toBeGreaterThan(landingBefore);
    expect(apiAfter).toBeGreaterThan(apiBefore);

    // A third unassigned project should not advance
    const todoProject = getProject(c, 'todo');
    const todoBefore = todoProject.progress;
    // (no workers assigned to 'todo')
    tick(state, 10);
    const todoAfter = getProject(c, 'todo').progress;
    expect(todoAfter).toBe(todoBefore); // unchanged
  });
});

describe('simulateOffline — per-floor project progress', () => {
  it('advances both floor projects consistently with live tick()', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Build 2 floors
    buildFloors(state, 2);

    // Unlock api and assign floors
    const apiDef = PROJECTS.find((p) => p.id === 'api')!;
    country.money += apiDef.unlockCost;
    unlockProject(state, 'api');
    assignFloorProject(state, 0, 'landing');
    assignFloorProject(state, 1, 'api');

    // Buy workstations on both floors
    for (let i = 0; i < FLOOR_CAPACITY * 2; i++) {
      buyWorkstation(state, 'basic');
    }

    const w1 = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Frontend', // matches landing
    });
    c.workers.push(w1);
    w1.stationId = c.workstations[0].id; // floor 0

    const w2 = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend', // matches api
    });
    c.workers.push(w2);
    w2.stationId = c.workstations[4].id; // floor 1

    // Clone state for offline sim
    const offlineState = JSON.parse(JSON.stringify(state));
    const offlineCountry = activeCountry(offlineState);
    const offlineC = activeCompany(offlineState);

    // Offline sim: 120 seconds
    simulateOffline(offlineState, 120, 86400);

    const landingAfterOffline = getProject(offlineC, 'landing').progress;
    const apiAfterOffline = getProject(offlineC, 'api').progress;
    const moneyAfterOffline = offlineCountry.money;

    // Live path: tick 120 seconds
    tick(state, 120);

    const landingAfterLive = getProject(c, 'landing').progress;
    const apiAfterLive = getProject(c, 'api').progress;
    const moneyAfterLive = country.money;

    // Both floors should advance similarly in both paths
    expect(landingAfterOffline).toBeCloseTo(landingAfterLive, 1);
    expect(apiAfterOffline).toBeCloseTo(apiAfterLive, 1);
    expect(moneyAfterOffline).toBeCloseTo(moneyAfterLive, 1);
  });
});

describe('per-floor project integration', () => {
  it('supports independent project progress on each floor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Build 3 floors
    buildFloors(state, 3);

    // Unlock 3 projects and assign each floor
    for (const projectId of ['todo', 'api']) {
      const projectDef = PROJECTS.find((p) => p.id === projectId)!;
      country.money += projectDef.unlockCost;
      unlockProject(state, projectId);
    }

    assignFloorProject(state, 0, 'landing');
    assignFloorProject(state, 1, 'todo');
    assignFloorProject(state, 2, 'api');

    // Verify floorProject returns correct values
    expect(floorProject(c, 0)).toBe('landing');
    expect(floorProject(c, 1)).toBe('todo');
    expect(floorProject(c, 2)).toBe('api');

    // Verify floorProjects array is populated
    expect(c.floorProjects).toEqual(['landing', 'todo', 'api']);
  });

  it('preserves null (unassigned) slots in floorProjects', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    buildFloors(state, 3);

    // Unlock projects
    for (const projectId of ['todo', 'api']) {
      const projectDef = PROJECTS.find((p) => p.id === projectId)!;
      country.money += projectDef.unlockCost;
      unlockProject(state, projectId);
    }

    // Assign only floors 0 and 2, leaving floor 1 unassigned
    assignFloorProject(state, 0, 'landing');
    assignFloorProject(state, 2, 'api');

    // Floor 1 should fall back to activeProjectId
    expect(floorProject(c, 0)).toBe('landing');
    expect(floorProject(c, 1)).toBe(c.activeProjectId); // falls back
    expect(floorProject(c, 2)).toBe('api');

    // floorProjects array can have mixed null and strings
    expect(c.floorProjects[0]).toBe('landing');
    expect(c.floorProjects[1]).toBeNull();
    expect(c.floorProjects[2]).toBe('api');
  });

  it('handles reassigning a floor to different projects', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Unlock multiple projects
    for (const projectId of ['todo', 'api', 'payments']) {
      const projectDef = PROJECTS.find((p) => p.id === projectId)!;
      country.money += projectDef.unlockCost;
      unlockProject(state, projectId);
    }

    // Floor 0 starts with 'landing'
    expect(floorProject(c, 0)).toBe('landing');

    // Reassign to 'todo'
    const err1 = assignFloorProject(state, 0, 'todo');
    expect(err1).toBeNull();
    expect(floorProject(c, 0)).toBe('todo');

    // Reassign to 'api'
    const err2 = assignFloorProject(state, 0, 'api');
    expect(err2).toBeNull();
    expect(floorProject(c, 0)).toBe('api');

    // Reassign back to 'landing' via null
    const err3 = assignFloorProject(state, 0, null);
    expect(err3).toBeNull();
    expect(floorProject(c, 0)).toBe('landing');
  });
});
