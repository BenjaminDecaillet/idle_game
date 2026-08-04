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
  activeCountry,
  buyCompany,
  buyFloor,
  buyWorkstation,
  claimFloorGift,
  createCompany,
  createInitialState,
  deskCapacity,
  fastForwardAction,
  fastForwardCost,
  floorBuildDurationSec,
  floorCost,
  floorGiftAvailable,
  floorUnderConstruction,
  simulateOffline,
  siteUnderConstruction,
  tick,
  trainWorker,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { WorkerState, WorkstationState } from '../src/game/types';

const NOW = 1_700_000_000_000;

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
}

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
    activeCountry(state).money = 100_000;

    // Fill all desks on the first floor
    for (let i = 0; i < FLOOR_CAPACITY; i++) {
      const err = buyWorkstation(state, 'basic');
      expect(err).toBeNull();
    }
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY);

    // Next workstation should fail with office space error
    const err = buyWorkstation(state, 'basic');
    expect(err).toBe('error.officeFull');
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY); // unchanged
  });

  it('succeeds after buying and completing a floor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 100_000;

    // Fill first floor
    for (let i = 0; i < FLOOR_CAPACITY; i++) {
      buyWorkstation(state, 'basic');
    }

    // Buy a floor (starts construction)
    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(c.floors).toBe(1); // floor not added yet
    expect(floorUnderConstruction(c)).not.toBeNull();

    // Tick to complete construction
    const duration = floorBuildDurationSec(activeCountry(state), c);
    tick(state, duration + 1);
    expect(c.floors).toBe(2);
    expect(deskCapacity(c)).toBe(FLOOR_CAPACITY * 2);

    // Now workstation purchase should succeed
    const wsErr = buyWorkstation(state, 'basic');
    expect(wsErr).toBeNull();
    expect(c.workstations).toHaveLength(FLOOR_CAPACITY + 1);
  });
});

describe('buyFloor', () => {
  it('deducts floorCost immediately but floors increment only after completion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 10_000;

    const cost = floorCost(c);
    const moneyBefore = activeCountry(state).money;

    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(c.floors).toBe(1); // floor NOT incremented yet
    expect(activeCountry(state).money).toBe(moneyBefore - cost); // money deducted immediately
    expect(floorUnderConstruction(c)).not.toBeNull();

    // Tick to completion
    const duration = floorBuildDurationSec(activeCountry(state), c);
    tick(state, duration + 1);
    expect(c.floors).toBe(2);
  });

  it('fails without enough money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 0;

    const err = buyFloor(state);
    expect(err).toBe('error.notEnoughMoney');
    expect(c.floors).toBe(1); // unchanged
  });

  it('fails at MAX_FLOORS with appropriate error', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    activeCountry(state).money = 100_000_000;

    // Build floors sequentially up to MAX_FLOORS
    for (let i = 0; i < MAX_FLOORS - 1; i++) {
      const err = buyFloor(state);
      expect(err).toBeNull();
      const duration = floorBuildDurationSec(activeCountry(state), c);
      tick(state, duration + 1);
    }
    expect(c.floors).toBe(MAX_FLOORS);

    // Try to buy one more
    const err = buyFloor(state);
    expect(err).toBe('error.maxHeight');
    expect(c.floors).toBe(MAX_FLOORS); // unchanged
  });
});

describe('floorCost — growth and site scaling', () => {
  it('grows by FLOOR_COST_GROWTH per owned floor', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000; // ensure we have enough to buy floors

    const cost0 = floorCost(garage); // floors = 1
    expect(cost0).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 0)));

    const err0 = buyFloor(state);
    expect(err0).toBeNull();
    expect(garage.floors).toBe(1); // not yet incremented
    let duration = floorBuildDurationSec(country, garage);
    tick(state, duration + 1);
    expect(garage.floors).toBe(2); // now incremented

    const cost1 = floorCost(garage); // floors = 2
    expect(cost1).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 1)));
    expect(cost1).toBeGreaterThan(cost0);

    const err1 = buyFloor(state);
    expect(err1).toBeNull();
    expect(garage.floors).toBe(2); // not yet incremented
    duration = floorBuildDurationSec(country, garage);
    tick(state, duration + 1);
    expect(garage.floors).toBe(3); // now incremented

    const cost2 = floorCost(garage); // floors = 3
    expect(cost2).toBe(Math.round(FLOOR_BASE_COST * 1 * Math.pow(FLOOR_COST_GROWTH, 2)));
    expect(cost2).toBeGreaterThan(cost1);
  });

  it('is scaled by site floorCostFactor', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Garage company (floorCostFactor = 1)
    const garage = activeCompany(state);
    const garageCost = floorCost(garage);
    const garageSite = COMPANY_SITES.find((s) => s.id === 'garage')!;
    expect(garageCost).toBe(
      Math.round(FLOOR_BASE_COST * garageSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );

    // Loft company (floorCostFactor = 5)
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    country.money = loftSite.cost;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    const loft = activeCountry(state).companies.find((c) => c.siteId === 'loft')!;

    const loftCost = floorCost(loft);
    expect(loftCost).toBe(
      Math.round(FLOOR_BASE_COST * loftSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );

    // Loft's first floor should be 5x more expensive than garage's
    expect(loftCost).toBeCloseTo(garageCost * 5, 0);
  });

  it('uses createCompany to set up a company at a specific site', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;

    // Create a new company at the loft site
    const newCompany = createCompany(state, country, 'loft', 'Loft Test', loftSite.cost);
    country.companies = [newCompany];
    country.activeCompanyId = newCompany.id;

    const loft = newCompany;
    expect(loft.siteId).toBe('loft');
    expect(loft.name).toBe('Loft Test');

    const cost = floorCost(loft);
    expect(cost).toBe(
      Math.round(FLOOR_BASE_COST * loftSite.floorCostFactor * Math.pow(FLOOR_COST_GROWTH, 0))
    );
  });
});

describe('floor-build — timed construction', () => {
  it('charges immediately, floors unchanged until completion, floorUnderConstruction returns action', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    const cost = floorCost(c);
    const moneyBefore = country.money;

    // buyFloor charges immediately
    const err = buyFloor(state);
    expect(err).toBeNull();
    expect(country.money).toBe(moneyBefore - cost);
    expect(c.floors).toBe(1); // not incremented yet

    // floorUnderConstruction returns the action
    const action = floorUnderConstruction(c);
    expect(action).not.toBeNull();
    expect(action!.kind).toBe('floor-build');
    expect(action!.targetId).toBe(c.id);

    // tick() with insufficient time doesn't materialize the floor
    tick(state, 100);
    expect(c.floors).toBe(1);
    expect(floorUnderConstruction(c)).not.toBeNull(); // still running

    // tick() past the duration adds the floor
    const duration = floorBuildDurationSec(country, c);
    tick(state, duration + 1);
    expect(c.floors).toBe(2);
    expect(floorUnderConstruction(c)).toBeNull(); // action removed
  });

  it('tick emits floorBuildsDone event on completion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyFloor(state);
    const duration = floorBuildDurationSec(country, c);
    const events = tick(state, duration + 1);

    expect(events.floorBuildsDone).toHaveLength(1);
    expect(events.floorBuildsDone[0]).toEqual({ companyId: c.id, floors: 2 });
  });

  it('duration matches floorBuildDurationSec with 10-min minimum for first floor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    const duration = floorBuildDurationSec(country, c);
    // First floor (floor index 2), first company (index 0)
    // FLOOR_BUILD_DURATION_BASE * 1.5^0 * 1.15^0 = 600
    expect(duration).toBe(600);
    expect(duration).toBeGreaterThanOrEqual(600);

    buyFloor(state);
    const action = floorUnderConstruction(c);
    expect(action!.totalSec).toBe(duration);
  });

  it('second buyFloor while one is building returns error and charges nothing', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 100_000;

    // First buyFloor succeeds
    const err1 = buyFloor(state);
    expect(err1).toBeNull();
    const moneyAfterFirst = country.money;

    // Second buyFloor should fail
    const err2 = buyFloor(state);
    expect(err2).toBe('error.floorAlreadyBuilding');
    expect(country.money).toBe(moneyAfterFirst); // no charge
  });

  it('noFreeBuilders error when another timed action occupies the single default builder', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const c = activeCompany(state);
    country.money = 100_000;

    // Set up a worker and start a training action to occupy the builder
    const worker: WorkerState = {
      id: state.nextEntityId++,
      name: 'Test Worker',
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      traits: [],
    };
    c.workers.push(worker);

    // Buy a workstation for the worker
    buyWorkstation(state, 'basic');

    // Start training to occupy the builder
    const err1 = trainWorker(state, worker.id);
    expect(err1).toBeNull(); // training started
    expect(c.timedActions.some((a) => a.kind === 'training')).toBe(true);

    // Now try to buyFloor — should fail because the builder is busy
    const err2 = buyFloor(state);
    expect(err2).toBe('error.noFreeBuilders');
    expect(c.timedActions.some((a) => a.kind === 'floor-build')).toBe(false); // no floor build action
  });

  it('offline parity: pay + simulateOffline over duration equals live ticking', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyFloor(state);
    const duration = floorBuildDurationSec(country, c);

    // Take offline snapshot
    const offlineState = JSON.parse(JSON.stringify(state));
    const offlineCountry = offlineState.countries[0];
    const offlineC = offlineCountry.companies[0];

    // Live path: tick to completion
    tick(state, duration + 1);
    const liveFloors = c.floors;

    // Offline path: simulateOffline
    simulateOffline(offlineState, duration + 1, 24 * 3600);
    const offlineFloors = offlineC.floors;

    expect(offlineFloors).toBe(liveFloors);
    expect(offlineCountry.money).toBe(country.money); // money should match too
  });

  it('Gabriel\'s floor gift available on fresh game', () => {
    const state = createInitialState(NOW);
    expect(floorGiftAvailable(state)).toBe(true);
  });

  it('claimFloorGift sets floors=2 instantly, freeFastForwards=1, floorGiftClaimed=true', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    expect(floorGiftAvailable(state)).toBe(true);
    expect(c.floors).toBe(1);
    expect(state.freeFastForwards).toBe(0);

    const err = claimFloorGift(state);
    expect(err).toBeNull();

    expect(c.floors).toBe(2);
    expect(state.floorGiftClaimed).toBe(true);
    expect(state.freeFastForwards).toBe(1);
  });

  it('floorGiftAvailable false after claiming once globally', () => {
    const state = createInitialState(NOW);

    claimFloorGift(state);
    expect(floorGiftAvailable(state)).toBe(false);

    // Trying to claim again returns error
    const err = claimFloorGift(state);
    expect(err).toBe('error.floorGiftUnavailable');
  });

  it('free fast-forward credit: fastForwardCost returns 0 when freeFastForwards > 0', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    state.fastForwardsUsed = 1; // not the first-ever use
    state.freeFastForwards = 1; // Gabriel's gift credit

    buyFloor(state);
    const action = floorUnderConstruction(c)!;

    const cost = fastForwardCost(state, action);
    expect(cost).toBe(0);
  });

  it('fastForwardAction with free credit decrements freeFastForwards', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    state.fastForwardsUsed = 1;
    state.freeFastForwards = 1;

    buyFloor(state);
    const action = floorUnderConstruction(c)!;

    expect(c.floors).toBe(1);
    expect(state.freeFastForwards).toBe(1);

    const err = fastForwardAction(state, action.id);
    expect(err).toBeNull();

    expect(c.floors).toBe(2); // floor materialized
    expect(state.freeFastForwards).toBe(0); // credit consumed
    expect(floorUnderConstruction(c)).toBeNull(); // action removed
  });

  it('fastForwardAction when fastForwardsUsed === 0 uses first-free path, keeps freeFastForwards', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    state.fastForwardsUsed = 0; // very first usage
    state.freeFastForwards = 1;

    buyFloor(state);
    const action = floorUnderConstruction(c)!;

    const err = fastForwardAction(state, action.id);
    expect(err).toBeNull();

    expect(c.floors).toBe(2);
    expect(state.freeFastForwards).toBe(1); // credit NOT consumed (first-ever usage takes precedence)
    expect(state.fastForwardsUsed).toBe(1);
  });
});

describe('migration grandfathering — floors populated from workstation count', () => {
  it('migrates company with 10 workstations but floors: 1 to floors: 3', () => {
    const workstations: WorkstationState[] = [];
    for (let i = 0; i < 10; i++) {
      workstations.push({ id: i + 100, defId: 'basic' });
    }

    const stateSave = {
      countries: [
        {
          id: 'us',
          money: 1000,
          totalEarned: 0,
          projectsCompleted: 0,
          activeCompanyId: 1,
          usedCompanyNames: [],
          debtQuitCooldownSec: 0,
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
              wallpaperId: null,
              timedActions: [],
              floorProjects: [],
            },
          ],
        },
      ],
      activeCountryId: 'us',
    } as any;

    const result = migrate(stateSave, NOW);
    const company = result.countries[0].companies[0];

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
      countries: [
        {
          id: 'us',
          money: 1000,
          totalEarned: 0,
          projectsCompleted: 0,
          activeCompanyId: 1,
          usedCompanyNames: [],
          debtQuitCooldownSec: 0,
          companies: [
            {
              id: 1,
              name: 'Default Company',
              siteId: 'garage',
              // no floors field
              workers: [],
              workstations,
              projects: [],
              activeProjectId: 'landing',
              upgrades: {},
              candidates: [],
              candidateRerollCost: 10,
              wallpaperId: null,
              timedActions: [],
              floorProjects: [],
            },
          ],
        },
      ],
      activeCountryId: 'us',
    } as any;

    const result = migrate(flatSave, NOW);
    const company = result.countries[0].companies[0]; // migrated in country

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
      countries: [
        {
          id: 'us',
          money: 1000,
          totalEarned: 0,
          projectsCompleted: 0,
          activeCompanyId: 1,
          usedCompanyNames: [],
          debtQuitCooldownSec: 0,
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
              wallpaperId: null,
              timedActions: [],
              floorProjects: [],
            },
          ],
        },
      ],
      activeCountryId: 'us',
    } as any;

    const result = migrate(stateSave, NOW);
    const company = result.countries[0].companies[0];

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
      countries: [
        {
          id: 'us',
          money: 5000,
          totalEarned: 0,
          projectsCompleted: 0,
          activeCompanyId: 1,
          usedCompanyNames: [],
          debtQuitCooldownSec: 0,
          companies: [
            {
              id: 1,
              name: 'Mixed Desks Co',
              siteId: 'garage',
              floors: 1,
              workers: [],
              workstations,
              projects: [],
              activeProjectId: 'landing',
              upgrades: {},
              candidates: [],
              candidateRerollCost: 10,
              wallpaperId: null,
              timedActions: [],
              floorProjects: [],
            },
          ],
        },
      ],
      activeCountryId: 'us',
    } as any;

    const result = migrate(flatSave, NOW);
    const company = result.countries[0].companies[0];

    expect(company.workstations).toHaveLength(3);
    expect(company.workstations[0]).toEqual({ id: 1, defId: 'basic' });
    expect(company.workstations[1]).toEqual({ id: 2, defId: 'standing' });
    expect(company.workstations[2]).toEqual({ id: 3, defId: 'dual' });
  });
});
