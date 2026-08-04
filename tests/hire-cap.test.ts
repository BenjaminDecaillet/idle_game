import { describe, expect, it } from 'vitest';
import { FLOOR_CAPACITY } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  atHeadcountCap,
  buyFloor,
  createInitialState,
  deskCapacity,
  fireWorker,
  floorBuildDurationSec,
  hireWorker,
  tick,
} from '../src/game/engine';
import type { WorkerState } from '../src/game/types';

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
    traits: [],
    ...overrides,
  };
}

describe('Headcount cap (deskCapacity, atHeadcountCap)', () => {
  it('initial company has 1 floor with FLOOR_CAPACITY desk slots', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    expect(company.floors).toBe(1);
    expect(deskCapacity(company)).toBe(FLOOR_CAPACITY);
    expect(atHeadcountCap(company)).toBe(false); // 0 workers < capacity
  });

  it('atHeadcountCap returns true when workers.length >= deskCapacity', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const cap = deskCapacity(company);

    // Add workers up to cap
    for (let i = 0; i < cap; i++) {
      company.workers.push(
        makeWorker({ id: state.nextEntityId++, tierId: 'junior' }),
      );
    }
    expect(company.workers).toHaveLength(cap);
    expect(atHeadcountCap(company)).toBe(true);
  });
});

describe('hireWorker — refusing at cap', () => {
  it('hiring is refused when at cap; money is unchanged, workers.length stays constant', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);
    const cap = deskCapacity(company);

    // Set plenty of money to hire cap + 2 workers
    country.money = 1_000_000;

    // Hire FLOOR_CAPACITY workers
    for (let i = 0; i < cap; i++) {
      const err = hireWorker(state, 0);
      expect(err).toBeNull();
      expect(company.workers).toHaveLength(i + 1);
    }

    expect(company.workers).toHaveLength(cap);
    expect(atHeadcountCap(company)).toBe(true);

    const moneyBeforeFail = country.money;
    const workersBeforeFail = company.workers.length;

    // Try to hire one more — should fail
    const err = hireWorker(state, 0);
    expect(err).toBe('error.officeAtCapacity');
    expect(company.workers).toHaveLength(workersBeforeFail);
    expect(country.money).toBe(moneyBeforeFail); // money unchanged
  });
});

describe('fireWorker — freeing a slot', () => {
  it('firing a worker frees a slot, allowing the next hire to succeed', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);
    const cap = deskCapacity(company);

    country.money = 1_000_000;

    // Fill to cap
    for (let i = 0; i < cap; i++) {
      hireWorker(state, 0);
    }
    expect(atHeadcountCap(company)).toBe(true);

    // Try to hire — should fail
    let err = hireWorker(state, 0);
    expect(err).toBe('error.officeAtCapacity');

    // Fire a worker
    const workerToFire = company.workers[0];
    expect(fireWorker(state, workerToFire.id)).toBeNull();
    expect(company.workers).toHaveLength(cap - 1);
    expect(atHeadcountCap(company)).toBe(false);

    // Now hire should succeed
    err = hireWorker(state, 0);
    expect(err).toBeNull();
    expect(company.workers).toHaveLength(cap);
    expect(atHeadcountCap(company)).toBe(true);
  });
});

describe('buyFloor — cap grows when a floor completes', () => {
  it('while floor is under construction, hiring is still refused; after completion, cap grows', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);
    const cap1 = deskCapacity(company); // should be FLOOR_CAPACITY

    // Set plenty of money for hiring + floor purchase
    country.money = 1_000_000;

    // Fill to cap
    for (let i = 0; i < cap1; i++) {
      hireWorker(state, 0);
    }
    expect(atHeadcountCap(company)).toBe(true);

    // Buy a floor
    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(company.floors).toBe(1); // floors increment happens on completion

    // While under construction, hiring is still refused
    let hireErr = hireWorker(state, 0);
    expect(hireErr).toBe('error.officeAtCapacity');

    // Calculate build duration and tick until floor completes
    const duration = floorBuildDurationSec(country, company);
    tick(state, duration);

    // After completion, floors should increment
    expect(company.floors).toBe(2);
    expect(deskCapacity(company)).toBe(FLOOR_CAPACITY * 2);

    // Now hire should succeed
    hireErr = hireWorker(state, 0);
    expect(hireErr).toBeNull();
    expect(company.workers).toHaveLength(cap1 + 1);
  });

  it('cap reflects the new floor after tick() completes the build', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);

    country.money = 1_000_000;

    expect(company.floors).toBe(1);
    expect(deskCapacity(company)).toBe(FLOOR_CAPACITY);

    // Buy a floor
    const err = buyFloor(state);
    expect(err).toBeNull();

    // Tick past the build duration
    const duration = floorBuildDurationSec(country, company);
    tick(state, duration + 1); // +1 to be safe past completion

    expect(company.floors).toBe(2);
    expect(deskCapacity(company)).toBe(FLOOR_CAPACITY * 2);
  });
});

describe('atHeadcountCap — tolerant of over-capacity', () => {
  it('tolerates over-capacity (e.g. from an old save) and blocks hiring', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);
    const cap = deskCapacity(company);

    country.money = 1_000_000;

    // Manually add workers beyond capacity (simulating old save)
    for (let i = 0; i < cap + 2; i++) {
      company.workers.push(
        makeWorker({ id: state.nextEntityId++, tierId: 'junior' }),
      );
    }

    expect(company.workers.length).toBe(cap + 2);
    expect(atHeadcountCap(company)).toBe(true);

    // Hiring should still be refused
    const err = hireWorker(state, 0);
    expect(err).toBe('error.officeAtCapacity');

    // No workers are removed, no money deducted
    expect(company.workers).toHaveLength(cap + 2);
    expect(country.money).toBe(1_000_000);
  });

  it('over-capacity does not crash and requires firing down below cap before hiring resumes', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const country = activeCountry(state);
    const cap = deskCapacity(company);

    country.money = 1_000_000;

    // Manually add workers beyond capacity
    for (let i = 0; i < cap + 3; i++) {
      company.workers.push(
        makeWorker({ id: state.nextEntityId++, tierId: 'junior' }),
      );
    }

    expect(atHeadcountCap(company)).toBe(true);

    // Fire 4 workers (one more than excess)
    for (let i = 0; i < 4; i++) {
      fireWorker(state, company.workers[0].id);
    }

    // Now we should be at cap exactly
    expect(company.workers.length).toBe(cap - 1);
    expect(atHeadcountCap(company)).toBe(false);

    // Hiring should succeed
    const err = hireWorker(state, 0);
    expect(err).toBeNull();
    expect(company.workers).toHaveLength(cap);
  });
});
