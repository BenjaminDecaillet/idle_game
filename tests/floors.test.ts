import { describe, expect, it } from 'vitest';
import {
  COMPANY_SITES,
  FLOOR_BASE_COST,
  FLOOR_CAPACITY,
  FLOOR_COST_GROWTH,
  MAX_FLOORS,
} from '../src/game/data';
import {
  activeCompany,
  buyCompany,
  buyFloor,
  buyWorkstation,
  createCompany,
  createInitialState,
  deskCapacity,
  floorCost,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { WorkstationState } from '../src/game/types';

const NOW = 1_700_000_000_000;

describe('company building structure', () => {
  it('new company starts with 1 floor and deskCapacity === FLOOR_CAPACITY', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);

    expect(garage.floors).toBe(1);
    expect(deskCapacity(garage)).toBe(FLOOR_CAPACITY);
    expect(deskCapacity(garage)).toBe(4); // FLOOR_CAPACITY is 4
  });
});

describe('buyWorkstation — desk capacity limits', () => {
  it('rejects with office space error once deskCapacity is reached', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 100_000;

    // Fill all desks on the first floor
    for (let i = 0; i < FLOOR_CAPACITY; i++) {
      const err = buyWorkstation(state, 'basic');
      expect(err).toBeNull();
    }
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY);

    // Next workstation should fail with office space error
    const err = buyWorkstation(state, 'basic');
    expect(err).toBe('No office space left — unlock a new floor');
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY); // unchanged
  });

  it('succeeds after buying a floor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 100_000;

    // Fill first floor
    for (let i = 0; i < FLOOR_CAPACITY; i++) {
      buyWorkstation(state, 'basic');
    }

    // Buy a floor
    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(c.floors).toBe(2);
    expect(deskCapacity(c)).toBe(FLOOR_CAPACITY * 2);

    // Now workstation purchase should succeed
    const wsErr = buyWorkstation(state, 'basic');
    expect(wsErr).toBeNull();
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY + 1);
  });
});

describe('buyFloor', () => {
  it('deducts floorCost and increments floors', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 10_000;

    const cost = floorCost(c);
    const moneyBefore = state.money;

    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(c.floors).toBe(2);
    expect(state.money).toBe(moneyBefore - cost);
  });

  it('fails without enough money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 0;

    const err = buyFloor(state);
    expect(err).toBe('Not enough money');
    expect(c.floors).toBe(1); // unchanged
  });

  it('fails at MAX_FLOORS with appropriate error', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 100_000_000;

    // Max out floors
    for (let i = 0; i < MAX_FLOORS - 1; i++) {
      buyFloor(state);
    }
    expect(c.floors).toBe(MAX_FLOORS);

    // Try to buy one more
    const err = buyFloor(state);
    expect(err).toBe('Building is already at max height');
    expect(c.floors).toBe(MAX_FLOORS); // unchanged
  });
});

describe('floorCost — growth and site scaling', () => {
  it('grows by FLOOR_COST_GROWTH per owned floor', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);
    state.money = 100_000; // ensure we have enough to buy floors

    const cost0 = floorCost(garage); // floors = 1
    expect(cost0).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 0)));

    const err0 = buyFloor(state);
    expect(err0).toBeNull();
    const cost1 = floorCost(garage); // floors = 2
    expect(cost1).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 1)));
    expect(cost1).toBeGreaterThan(cost0);

    const err1 = buyFloor(state);
    expect(err1).toBeNull();
    const cost2 = floorCost(garage); // floors = 3
    expect(cost2).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 2)));
    expect(cost2).toBeGreaterThan(cost1);
  });

  it('is scaled by site floorCostFactor', () => {
    const state = createInitialState(NOW);
    state.money = 1_000_000;

    // Garage company (floorCostFactor = 1)
    const garage = activeCompany(state);
    const garageCost = floorCost(garage);
    const garageSite = COMPANY_SITES.find((s) => s.id === 'garage')!;
    expect(garageCost).toBe(
      Math.round(FLOOR_BASE_COST * garageSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );

    // Loft company (floorCostFactor = 5)
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    state.money = loftSite.cost;
    buyCompany(state, 'loft');
    const loft = activeCompany(state);

    const loftCost = floorCost(loft);
    expect(loftCost).toBe(
      Math.round(FLOOR_BASE_COST * loftSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );

    // Loft's first floor should be 5x more expensive than garage's
    expect(loftCost).toBeCloseTo(garageCost * 5, 0);
  });

  it('uses createCompany to set up a company at a specific site', () => {
    const state = createInitialState(NOW);
    state.companies = []; // clear to start fresh
    state.companies.push(createCompany(state, 'loft', 'Loft Test'));

    const loft = state.companies[0];
    expect(loft.siteId).toBe('loft');
    expect(loft.name).toBe('Loft Test');

    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    const cost = floorCost(loft);
    expect(cost).toBe(
      Math.round(FLOOR_BASE_COST * loftSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );
  });
});

describe('migration grandfathering — floors populated from workstation count', () => {
  it('migrates company with 10 workstations but floors: 1 to floors: 3', () => {
    const workstations: WorkstationState[] = [];
    for (let i = 0; i < 10; i++) {
      workstations.push({ id: i + 100, defId: 'basic' });
    }

    const stateSave = {
      companies: [
        {
          id: 1,
          name: 'Packed Office',
          siteId: 'garage',
          floors: 1, // insufficient for 10 desks
          workers: [],
          workstations,
          projects: [],
          activeProjectId: 'landing',
          upgrades: {},
          candidates: [],
          candidateRerollCost: 10,
        },
      ],
      money: 1000,
      activeCompanyId: 1,
    } as any;

    const result = migrate(stateSave, NOW);
    const company = result.companies[0];

    // 10 workstations / 4 capacity = 2.5, ceil to 3
    expect(company.floors).toBe(3);
    expect(deskCapacity(company)).toBe(12); // 3 * 4
  });

  it('migrates flat legacy save with no floors field and 6 workstations to floors: 2', () => {
    const workstations: WorkstationState[] = [];
    for (let i = 0; i < 6; i++) {
      workstations.push({ id: i + 50, defId: 'basic' });
    }

    const flatSave = {
      money: 1000,
      workstations,
      // no floors field, no companies array
    } as any;

    const result = migrate(flatSave, NOW);
    const company = result.companies[0]; // migrated into home

    // 6 workstations / 4 capacity = 1.5, ceil to 2
    expect(company.floors).toBe(2);
    expect(company.workstations).toHaveLength(6);
  });

  it('allows floors > MAX_FLOORS if workstations demand it (grandfathered save)', () => {
    // Create a hypothetical save with more workstations than MAX_FLOORS can hold
    // Migration allows this to preserve grandfathered saves
    const workstations: WorkstationState[] = [];
    const excessWorkstations = MAX_FLOORS * FLOOR_CAPACITY + 10;
    for (let i = 0; i < excessWorkstations; i++) {
      workstations.push({ id: i + 200, defId: 'basic' });
    }

    const stateSave = {
      companies: [
        {
          id: 1,
          name: 'Over-Capacity',
          siteId: 'garage',
          floors: 1,
          workers: [],
          workstations,
          projects: [],
          activeProjectId: 'landing',
          upgrades: {},
          candidates: [],
          candidateRerollCost: 10,
        },
      ],
      money: 1000,
      activeCompanyId: 1,
    } as any;

    const result = migrate(stateSave, NOW);
    const company = result.companies[0];

    // Needed: ceil((MAX_FLOORS * FLOOR_CAPACITY + 10) / FLOOR_CAPACITY) = MAX_FLOORS + 1
    // Migration allows floors > MAX_FLOORS if workstations demand it
    const neededFloors = Math.ceil(excessWorkstations / FLOOR_CAPACITY);
    expect(company.floors).toBe(neededFloors);
  });

  it('preserves workstations during migration', () => {
    const workstations: WorkstationState[] = [
      { id: 1, defId: 'basic' },
      { id: 2, defId: 'standing' },
      { id: 3, defId: 'dual' },
    ];

    const flatSave = {
      money: 5000,
      workstations,
      companyName: 'Mixed Desks Co',
    } as any;

    const result = migrate(flatSave, NOW);
    const company = result.companies[0];

    expect(company.workstations).toHaveLength(3);
    expect(company.workstations[0]).toEqual({ id: 1, defId: 'basic' });
    expect(company.workstations[1]).toEqual({ id: 2, defId: 'standing' });
    expect(company.workstations[2]).toEqual({ id: 3, defId: 'dual' });
  });
});
