import { describe, expect, it } from 'vitest';
import {
  activeCompany,
  activeCountry,
  buyWorkstation,
  createInitialState,
  debtCap,
  debtCrisisThreshold,
  inDebt,
  inDebtCrisis,
  simulateOffline,
  tick,
} from '../src/game/engine';
import type { CompanyState, WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

/**
 * Helper to create a worker with minimal required fields.
 * All fields must be provided for a valid WorkerState.
 */
function makeWorker(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id: 9999,
    name: 'Test Worker',
    tierId: 'intern',
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

// ---------------------------------------------------------------------------
// Test 1: Wages push balance below zero
// ---------------------------------------------------------------------------

describe('Debt: wages push balance below zero', () => {
  it('with money 0 and a salaried worker, tick leaves money negative', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Set money to 0
    country.money = 0;

    // Add a senior worker with salary 1.2/sec
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'senior',
    });
    company.workers.push(worker);

    // No workstation, so no work is produced, but salary is still paid.
    // After 10 seconds:
    // - Salary cost: 1.2 * 10 = 12
    // - Interest on accumulated debt: ~0.024
    // Total: ~-12.024
    const before = country.money;
    tick(state, 10);
    expect(country.money).toBeLessThan(0);
    expect(country.money).toBeCloseTo(-12.024, 1); // Allow for interest accumulation
    expect(country.money).toBeLessThan(before);
  });

  it('no floor at zero: money stays negative once debt occurs', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    country.money = -100;
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior', // salary 0.15/sec
    });
    company.workers.push(worker);

    tick(state, 1);
    // Money should be even more negative
    expect(country.money).toBeLessThan(-100);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Interest compounds
// ---------------------------------------------------------------------------

describe('Debt: interest compounds', () => {
  it('debt grows due to interest at DEBT_INTEREST_PER_SEC rate', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Start with debt of -1000
    country.money = -1000;

    // Add a worker so there's salary too
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior', // salary 0.15/sec
    });
    company.workers.push(worker);

    // After 100 seconds:
    // - Salary cost: 0.15 * 100 = 15
    // - Interest on -1000 at 0.0002/s: -1000 * 0.0002 * 100 = -20
    // Total expected debt (worse): around -1000 - 15 - 20 = -1035
    // But interest is applied to the growing debt, so let's just check it's worse than salary alone

    tick(state, 100);

    // The debt should grow beyond just the salary cost
    const justSalaryCost = -1000 - 0.15 * 100;
    expect(country.money).toBeLessThan(justSalaryCost);
    expect(country.money).toBeLessThan(-1000 - 15); // at least salary impact
  });

  it('with higher debt, interest compounds more aggressively', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add expensive workers to increase the debt cap
    // Debt cap = max(10000, salaries * 3600)
    // We want salaries * 3600 > 10000, so salaries > 2.78/sec
    // Add 5 senior workers: 5 * 1.2 = 6/sec, so cap = 6 * 3600 = 21600
    for (let i = 0; i < 5; i++) {
      company.workers.push(
        makeWorker({
          id: state.nextEntityId++,
          tierId: 'senior',
        })
      );
    }

    // Heavy debt (well below cap)
    country.money = -10000;

    // After 100 seconds:
    // - Salary cost: 6 * 100 = 600, so money = -10600
    // - Interest on -10600: 10600 * 0.0002 * 100 = 212, so money ≈ -10812
    // Total should be significantly worse than just the starting debt

    const before = country.money;
    tick(state, 100);

    // Debt should grow significantly due to both salary and interest
    expect(country.money).toBeLessThan(before);
    // Should be worse than just salary: -10000 - 600 = -10600
    expect(country.money).toBeLessThan(-10600);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Crisis quits
// ---------------------------------------------------------------------------

describe('Debt: crisis quits', () => {
  it('with debt below crisis threshold, employees resign per 60-second interval', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add cheap workers (interns, salary 0.05/sec each)
    for (let i = 0; i < 5; i++) {
      company.workers.push(
        makeWorker({
          id: state.nextEntityId++,
          tierId: 'intern',
        })
      );
    }

    // Set money far below crisis threshold
    country.money = -5000;

    // Crisis threshold = max(500, salaries * 600)
    // Salaries = 0.05 * 5 = 0.25/sec
    // Threshold = max(500, 0.25 * 600) = max(500, 150) = 500
    // So we're at -5000, threshold is at -500. We're well in crisis.

    const beforeQuitCount = company.workers.length;

    // Tick for 61 seconds to trigger at least one quit
    // The cooldown starts at DEBT_QUIT_INTERVAL_SEC = 60
    // After 61 seconds, one quit should have occurred
    tick(state, 61);

    expect(company.workers.length).toBeLessThan(beforeQuitCount);
    expect(country.money).toBeLessThan(-4000); // Still heavily in debt
  });

  it('cheapest/lowest-tier worker leaves first', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add workers of different tiers and skill levels
    const intern = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: 1,
    });
    const junior = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      skillLevel: 1,
    });
    const mid = makeWorker({
      id: state.nextEntityId++,
      tierId: 'mid',
      skillLevel: 1,
    });

    company.workers.push(intern, junior, mid);

    // Set deep debt
    country.money = -10000;

    // Tick past first quit interval
    tick(state, 61);

    // Intern (tier 0) should have quit, not junior (tier 1) or mid (tier 2)
    expect(company.workers.find((w) => w.id === intern.id)).toBeUndefined();
    expect(company.workers.find((w) => w.id === junior.id)).toBeDefined();
    expect(company.workers.find((w) => w.id === mid.id)).toBeDefined();
  });

  it('never empties the country: at least one worker always remains', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add only 2 workers
    company.workers.push(
      makeWorker({ id: state.nextEntityId++, tierId: 'intern' }),
      makeWorker({ id: state.nextEntityId++, tierId: 'intern' })
    );

    // Set heavy debt
    country.money = -50000;

    // Tick for a very long time (many quit intervals)
    tick(state, 600); // 10 intervals worth

    // At least one worker should remain
    expect(company.workers.length).toBeGreaterThanOrEqual(1);
  });

  it('quit events are recorded in events.quits', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add workers
    const w1 = makeWorker({ id: state.nextEntityId++, tierId: 'intern' });
    const w2 = makeWorker({ id: state.nextEntityId++, tierId: 'intern' });
    company.workers.push(w1, w2);

    country.money = -10000;

    const events = tick(state, 61);

    // Should have recorded a quit event
    expect(events.quits.length).toBeGreaterThan(0);
    const quit = events.quits[0];
    expect(quit.companyId).toBe(company.id);
    expect(quit.workerId).toBeDefined();
    expect(quit.name).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Test 4: Quit cooldown resets when back above crisis line
// ---------------------------------------------------------------------------

describe('Debt: quit cooldown resets above crisis threshold', () => {
  it('when money returns above -threshold, cooldown resets', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add workers
    company.workers.push(
      makeWorker({ id: state.nextEntityId++, tierId: 'intern' }),
      makeWorker({ id: state.nextEntityId++, tierId: 'intern' })
    );

    // Start in crisis
    country.money = -10000;

    // Trigger a quit
    let events = tick(state, 61);
    expect(events.quits.length).toBeGreaterThan(0);
    const workerCountAfterQuit = company.workers.length;

    // Now make money positive (earn revenue)
    // To do this without workers producing, we just set it
    country.money = 1000;

    // Tick again in non-crisis
    events = tick(state, 10);

    // The cooldown should have been reset, and no more quits should occur
    // (quits only happen when in crisis)
    const workerCountAfterRecovery = company.workers.length;
    expect(workerCountAfterRecovery).toBe(workerCountAfterQuit);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Debt cap enforcement
// ---------------------------------------------------------------------------

describe('Debt: cap enforcement', () => {
  it('debtCap enforces max(10000, salaries * 3600)', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    // No workers initially
    // salaries = 0
    // cap should be max(10000, 0) = 10000
    let cap = debtCap(country);
    expect(cap).toBe(10000);

    // Add a worker with salary 0.05/sec
    const company = activeCompany(state);
    company.workers.push(
      makeWorker({
        id: state.nextEntityId++,
        tierId: 'intern', // salary 0.05/sec
      })
    );

    // salaries = 0.05
    // cap should be max(10000, 0.05 * 3600) = max(10000, 180) = 10000
    cap = debtCap(country);
    expect(cap).toBe(10000);

    // Add expensive workers to exceed the base cap
    for (let i = 0; i < 100; i++) {
      company.workers.push(
        makeWorker({
          id: state.nextEntityId++,
          tierId: 'senior', // salary 1.2/sec
        })
      );
    }

    // salaries = 0.05 + 100 * 1.2 = 120.05
    // cap should be max(10000, 120.05 * 3600) ≈ 432180
    cap = debtCap(country);
    expect(cap).toBeGreaterThan(10000);
    const salaries = 0.05 + 100 * 1.2;
    const expectedCap = Math.max(10000, salaries * 3600);
    expect(cap).toBeCloseTo(expectedCap, -2); // Within 100
  });

  it('money is clamped at -debtCap during simulateOffline', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add expensive worker to generate salary
    company.workers.push(
      makeWorker({
        id: state.nextEntityId++,
        tierId: 'senior', // salary 1.2/sec
      })
    );

    // Start with huge debt
    country.money = -1000000;

    const cap = debtCap(country);

    // Simulate offline for 24 hours
    simulateOffline(state, 24 * 3600, 24 * 3600);

    // Money should be clamped at -cap
    expect(country.money).toBeGreaterThanOrEqual(-cap);
    expect(country.money).toBeGreaterThanOrEqual(-cap - 1); // Allow tiny epsilon
  });
});

// ---------------------------------------------------------------------------
// Test 6: Zero-worker recovery
// ---------------------------------------------------------------------------

describe('Debt: zero-worker recovery', () => {
  it('with no workers, debt strictly increases toward zero', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    // Start with debt, no workers
    country.money = -5000;
    expect(country.money).toBeLessThan(0);

    // With zero workers, the formula is:
    // money = min(0, money + (-money * DEBT_INTEREST_PER_SEC * 2 + 1) * dt)
    // For money = -5000:
    // gain = (5000 * 0.0002 * 2 + 1) * dt = (2 + 1) * dt = 3 * dt
    // So after 1 second: money = min(0, -5000 + 3) = -4997
    // Strictly increasing, approaching 0

    const before = country.money;
    tick(state, 1);
    expect(country.money).toBeGreaterThan(before);
    expect(country.money).toBeLessThan(0);
  });

  it('zero-worker recovery eventually reaches >= -1', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    // Start with deep debt, no workers
    country.money = -10000;

    // Repeatedly tick until money approaches 0
    let iterations = 0;
    while (country.money < -1 && iterations < 100000) {
      tick(state, 10);
      iterations++;
    }

    // Should have recovered to at least -1
    expect(country.money).toBeGreaterThanOrEqual(-1);
    expect(iterations).toBeLessThan(100000); // Should converge reasonably fast
  });

  it('the 1/s flat component guarantees progress even with zero workers', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    // Start with debt at or near the cap (with 0 workers, cap is 10000)
    country.money = -10000;

    const before = country.money;
    tick(state, 1);

    // With formula for 0 workers: gain = (-(-10000) * 0.0002 * 2 + 1) * 1 = (4 + 1) = 5
    // So money should increase by 5 toward 0
    expect(country.money).toBeGreaterThan(before);
    expect(country.money).toBeCloseTo(-9995, 1);
  });
});

// ---------------------------------------------------------------------------
// Test 7: inDebt and inDebtCrisis helpers
// ---------------------------------------------------------------------------

describe('Debt: inDebt and inDebtCrisis helpers', () => {
  it('inDebt returns true when money < 0', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    country.money = 100;
    expect(inDebt(country)).toBe(false);

    country.money = 0;
    expect(inDebt(country)).toBe(false);

    country.money = -1;
    expect(inDebt(country)).toBe(true);

    country.money = -10000;
    expect(inDebt(country)).toBe(true);
  });

  it('inDebtCrisis returns true when money < -debtCrisisThreshold', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // No workers initially
    // Crisis threshold = max(500, 0 * 600) = 500
    let threshold = debtCrisisThreshold(country);
    expect(threshold).toBe(500);

    country.money = -500;
    expect(inDebtCrisis(country)).toBe(false); // exactly at threshold, not past it

    country.money = -501;
    expect(inDebtCrisis(country)).toBe(true);

    country.money = 0;
    expect(inDebtCrisis(country)).toBe(false);

    // Add a worker
    company.workers.push(
      makeWorker({
        id: state.nextEntityId++,
        tierId: 'senior', // salary 1.2/sec
      })
    );

    // Crisis threshold = max(500, 1.2 * 600) = max(500, 720) = 720
    threshold = debtCrisisThreshold(country);
    expect(threshold).toBe(720);

    country.money = -720;
    expect(inDebtCrisis(country)).toBe(false);

    country.money = -721;
    expect(inDebtCrisis(country)).toBe(true);
  });

  it('purchases fail while money is negative', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add a worker so there's payroll
    company.workers.push(
      makeWorker({
        id: state.nextEntityId++,
        tierId: 'intern',
      })
    );

    // Trigger debt
    country.money = -100;

    // Try to buy a workstation
    const error = buyWorkstation(state, 'basic');
    expect(error).toBe('error.notEnoughMoney');
    expect(company.workstations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 8: Offline parity
// ---------------------------------------------------------------------------

describe('Debt: offline parity', () => {
  it('same debt trajectory via simulateOffline vs live ticks', () => {
    // State 1: use simulateOffline
    const state1 = createInitialState(NOW);
    const country1 = activeCountry(state1);
    const company1 = activeCompany(state1);

    company1.workers.push(
      makeWorker({
        id: state1.nextEntityId++,
        tierId: 'senior',
      })
    );

    country1.money = -1000;

    simulateOffline(state1, 600, 600);

    // State 2: use live tick calls
    const state2 = createInitialState(NOW);
    const country2 = activeCountry(state2);
    const company2 = activeCompany(state2);

    company2.workers.push(
      makeWorker({
        id: state2.nextEntityId++,
        tierId: 'senior',
      })
    );

    country2.money = -1000;

    for (let i = 0; i < 10; i++) {
      tick(state2, 60);
    }

    // Both should have similar debt levels (within floating-point epsilon)
    expect(country1.money).toBeCloseTo(country2.money, 1);
  });

  it('offline respects debt cap the same way live ticks do', () => {
    // State 1: simulateOffline with long duration
    const state1 = createInitialState(NOW);
    const country1 = activeCountry(state1);
    const company1 = activeCompany(state1);

    company1.workers.push(
      makeWorker({
        id: state1.nextEntityId++,
        tierId: 'senior',
      })
    );

    country1.money = -100000;

    const cap1 = debtCap(country1);
    simulateOffline(state1, 24 * 3600, 24 * 3600);

    expect(country1.money).toBeGreaterThanOrEqual(-cap1 - 1);

    // State 2: many live ticks
    const state2 = createInitialState(NOW);
    const country2 = activeCountry(state2);
    const company2 = activeCompany(state2);

    company2.workers.push(
      makeWorker({
        id: state2.nextEntityId++,
        tierId: 'senior',
      })
    );

    country2.money = -100000;

    const cap2 = debtCap(country2);
    for (let i = 0; i < 1440; i++) {
      tick(state2, 60);
    }

    expect(country2.money).toBeGreaterThanOrEqual(-cap2 - 1);
    expect(country1.money).toBeCloseTo(country2.money, 1);
  });
});

// ---------------------------------------------------------------------------
// Additional edge case: crisis quits with multiple companies
// ---------------------------------------------------------------------------

describe('Debt: crisis quits across multiple companies', () => {
  it('picks cheapest worker from any company in the country', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company1 = activeCompany(state);

    // Create a second company via manual manipulation
    const company2: CompanyState = {
      id: state.nextEntityId++,
      name: 'Second Co',
      siteId: 'loft',
      floors: 1,
      wallpaperId: null,
      workers: [],
      workstations: [],
      projects: company1.projects.map((p) => ({ ...p })),
      activeProjectId: 'landing',
      upgrades: {},
      candidates: [],
      candidateRerollCost: 10,
      timedActions: [],
      purchasePrice: 200000,
      renameCount: 0,
      petId: null,
      floorProjects: [],
    };

    country.companies.push(company2);

    // Add expensive worker to company1
    const expensive = makeWorker({
      id: state.nextEntityId++,
      tierId: 'senior',
      skillLevel: 10,
    });
    company1.workers.push(expensive);

    // Add cheap worker to company2
    const cheap = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: 1,
    });
    company2.workers.push(cheap);

    // Deep debt
    country.money = -50000;

    // Tick past first quit
    tick(state, 61);

    // The cheap intern should have quit, not the senior
    expect(company2.workers.find((w) => w.id === cheap.id)).toBeUndefined();
    expect(company1.workers.find((w) => w.id === expensive.id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Edge case: multiple quits in one long tick
// ---------------------------------------------------------------------------

describe('Debt: multiple quits in one tick', () => {
  it('can fire multiple quits if tick is long enough', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);

    // Add many cheap workers
    for (let i = 0; i < 10; i++) {
      company.workers.push(
        makeWorker({
          id: state.nextEntityId++,
          tierId: 'intern',
        })
      );
    }

    country.money = -50000;

    // Tick for 300 seconds (5 intervals of 60)
    // Should see multiple quits
    const events = tick(state, 300);

    // Should have multiple quit events
    expect(events.quits.length).toBeGreaterThan(1);

    // Should have fired quits but not emptied the country
    expect(company.workers.length).toBeGreaterThanOrEqual(1);
    expect(company.workers.length).toBeLessThan(10);
  });
});
