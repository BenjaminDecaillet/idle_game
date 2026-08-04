import { describe, expect, it } from 'vitest';
import { COMPANY_SITES, SITE_SPEC_BONUS, siteById } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  createCompany,
  createInitialState,
  workerRate,
} from '../src/game/engine';
import type { WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function makeWorker(id: number, overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id,
    name: 'Test Worker',
    tierId: 'junior',
    specialization: 'Frontend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    traits: [],
    ...overrides,
  };
}

describe('site specialization (favoredSpec)', () => {
  it('the garage is a generalist and every specialization is favored somewhere', () => {
    expect(siteById('garage').favoredSpec).toBeUndefined();
    const favored = new Set(COMPANY_SITES.map((s) => s.favoredSpec).filter(Boolean));
    expect(favored).toEqual(new Set(['Frontend', 'Backend', 'DevOps', 'Data Science']));
    expect(siteById('seattle').favoredSpec).toBe('DevOps');
  });

  it('applies SITE_SPEC_BONUS only when the project matches the site specialty', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    // The loft favors Frontend; the garage favors nothing.
    const loft = createCompany(state, country, 'loft', 'Loft Co', siteById('loft').cost);
    country.activeCompanyId = loft.id;
    country.money = 10_000_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker(state.nextEntityId++, { specialization: 'DevOps' });
    loft.workers.push(worker);
    autoSeat(loft);

    // 'landing' is a Frontend project in data.ts — matches the loft specialty.
    const onFavored = workerRate(state, loft, worker, 'landing');
    // 'api' is Backend — no site match, same worker/desk otherwise.
    const offFavored = workerRate(state, loft, worker, 'api');
    expect(onFavored / offFavored).toBeCloseTo(SITE_SPEC_BONUS, 10);
  });

  it('does not apply at the generalist garage', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);
    activeCountry(state).money = 1_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker(state.nextEntityId++, { specialization: 'DevOps' });
    garage.workers.push(worker);
    autoSeat(garage);
    const frontend = workerRate(state, garage, worker, 'landing');
    const backend = workerRate(state, garage, worker, 'api');
    expect(frontend).toBeCloseTo(backend, 10);
  });

  it('stacks multiplicatively with the worker spec-match bonus', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const loft = createCompany(state, country, 'loft', 'Loft Co', siteById('loft').cost);
    country.activeCompanyId = loft.id;
    country.money = 10_000_000;
    buyWorkstation(state, 'basic');
    const frontendDev = makeWorker(state.nextEntityId++, { specialization: 'Frontend' });
    loft.workers.push(frontendDev);
    autoSeat(loft);
    const devopsDev = makeWorker(state.nextEntityId++, { specialization: 'DevOps' });

    // Same desk conditions: compare the seated worker's rate on the favored
    // Frontend project with and without the personal spec match.
    const matched = workerRate(state, loft, frontendDev, 'landing');
    devopsDev.stationId = frontendDev.stationId;
    const unmatched = workerRate(state, loft, devopsDev, 'landing');
    // Both get SITE_SPEC_BONUS; only frontendDev adds SPEC_MATCH_BONUS 1.5.
    expect(matched / unmatched).toBeCloseTo(1.5, 10);
  });
});
