import { describe, expect, it } from 'vitest';
import {
  activeCompany,
  activeCountry,
  buyWorkstation,
  companyIncome,
  createInitialState,
  deskCapacity,
  deskPaybackSec,
  stationCost,
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

describe('deskPaybackSec', () => {
  it('returns null with no workers (income cannot move)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(c.workers).toHaveLength(0);
    expect(deskPaybackSec(state, c, 'basic')).toBeNull();
  });

  it('predicts the exact realized income delta for the first desk', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    country.money = 10_000;

    const cost = stationCost(c, 'basic');
    const payback = deskPaybackSec(state, c, 'basic');
    expect(payback).not.toBeNull();

    const before = companyIncome(state, c);
    expect(buyWorkstation(state, 'basic')).toBeNull();
    const delta = companyIncome(state, c) - before;
    expect(delta).toBeGreaterThan(0);
    expect(payback!).toBeCloseTo(cost / delta, 6);
  });

  it('returns null when everyone is seated and the new desk beats nothing', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    expect(buyWorkstation(state, 'basic')).toBeNull(); // seats the worker
    // A second basic desk changes nothing: same multiplier, nobody to sit.
    expect(deskPaybackSec(state, c, 'basic')).toBeNull();
  });

  it('prices the reshuffle when a better desk outranks an occupied one', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    expect(buyWorkstation(state, 'basic')).toBeNull();

    const cost = stationCost(c, 'standing');
    const payback = deskPaybackSec(state, c, 'standing');
    expect(payback).not.toBeNull();

    const before = companyIncome(state, c);
    expect(buyWorkstation(state, 'standing')).toBeNull(); // autoSeat migrates
    const delta = companyIncome(state, c) - before;
    expect(delta).toBeGreaterThan(0);
    expect(payback!).toBeCloseTo(cost / delta, 6);
  });

  it('returns null when the building has no room for another desk', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;
    while (c.workstations.length < deskCapacity(c)) {
      expect(buyWorkstation(state, 'basic')).toBeNull();
    }
    expect(deskPaybackSec(state, c, 'basic')).toBeNull();
  });
});
