import { describe, expect, it } from 'vitest';
import {
  activeCompany,
  activeCountry,
  buyWorkstations,
  createInitialState,
  maxAffordableStations,
  stationCostN,
} from '../src/game/engine';

const NOW = 1_700_000_000_000;

describe('stationCostN', () => {
  it('computes the sum of sequential station costs matching three buy-one-at-a-time purchases', () => {
    // Create a fresh state with plenty of money to buy 3 basic desks one at a time
    const stateForBuying = createInitialState(NOW);
    const country1 = activeCountry(stateForBuying);
    country1.money = 1_000_000;
    const company1 = activeCompany(stateForBuying);

    // Record the cost of each desk before buying
    const cost0 = stationCostN(company1, 'basic', 1);
    buyWorkstations(stateForBuying, 'basic', 1);

    const cost1 = stationCostN(company1, 'basic', 1);
    buyWorkstations(stateForBuying, 'basic', 1);

    const cost2 = stationCostN(company1, 'basic', 1);
    buyWorkstations(stateForBuying, 'basic', 1);

    const sequentialSum = cost0 + cost1 + cost2;

    // Now on a fresh state, compute stationCostN for 3 desks
    const stateForCompute = createInitialState(NOW);
    const company2 = activeCompany(stateForCompute);

    const bulkCost = stationCostN(company2, 'basic', 3);

    expect(bulkCost).toBe(sequentialSum);
  });
});

describe('buyWorkstations — error cases', () => {
  it('refuses when n exceeds remaining desk slots with error.officeFull', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000_000;

    // Fresh company has floors=1, so deskCapacity=4
    // Try to buy 5 desks (exceeds capacity)
    const err = buyWorkstations(state, 'basic', 5);

    expect(err).toBe('error.officeFull');
    expect(c.workstations).toHaveLength(0); // nothing was bought
  });

  it('refuses when money < total cost with error.notEnoughMoney and changes nothing', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);

    // Compute the cost of 2 basic desks and set money to 1 less than that
    const costOf2 = stationCostN(c, 'basic', 2);
    country.money = costOf2 - 1;

    const err = buyWorkstations(state, 'basic', 2);

    expect(err).toBe('error.notEnoughMoney');
    expect(country.money).toBe(costOf2 - 1); // money unchanged
    expect(c.workstations).toHaveLength(0); // no workstations bought
  });

  it('refuses n < 1 with error.officeFull', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000_000;

    const err0 = buyWorkstations(state, 'basic', 0);
    expect(err0).toBe('error.officeFull');
    expect(c.workstations).toHaveLength(0);

    const err1 = buyWorkstations(state, 'basic', -1);
    expect(err1).toBe('error.officeFull');
    expect(c.workstations).toHaveLength(0);
  });
});

describe('buyWorkstations — success', () => {
  it('succeeds with exact money for 4 desks, deducts cost, seats workers, returns null', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);

    // Compute the exact cost of 4 basic desks (fills the capacity)
    const costOf4 = stationCostN(c, 'basic', 4);
    country.money = costOf4;

    const err = buyWorkstations(state, 'basic', 4);

    expect(err).toBeNull();
    expect(country.money).toBe(0);
    expect(c.workstations).toHaveLength(4);
  });
});

describe('maxAffordableStations', () => {
  it('with infinite money, returns the remaining desk slots', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 999_999_999; // "infinite"

    // Fresh company has floors=1, capacity=4, no workstations
    const max = maxAffordableStations(state, 'basic');
    expect(max).toBe(4); // all 4 slots available
  });

  it('with money for exactly 2 desks, returns 2', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);

    const costOf2 = stationCostN(c, 'basic', 2);
    country.money = costOf2;

    const max = maxAffordableStations(state, 'basic');
    expect(max).toBe(2);
  });

  it('with 0 money, returns 0', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 0;

    const max = maxAffordableStations(state, 'basic');
    expect(max).toBe(0);
  });
});
