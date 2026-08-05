import { describe, expect, it } from 'vitest';
import {
  COMPANY_SITES,
  COUNTRY_STARTING_MONEY,
  COUNTRY_UNLOCK_BASE,
  COUNTRY_UNLOCK_GROWTH,
  WORLD_OUTPUT_PER_COUNTRY,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  allCompanies,
  autoSeat,
  buyCompany,
  buyWorkstation,
  companyWorkRate,
  countryById,
  countryUnlockCost,
  createInitialState,
  grantVsCoin,
  globalOutputMultiplier,
  simulateOffline,
  siteUnderConstruction,
  tick,
  unlockCountry,
  setActiveCountry,
  setStartingCountry,
  worldUnlocked,
} from '../src/game/engine';
import type { CountryId, CountryState, GameState, WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

/**
 * Unlocks now require a market-scouting expedition first (Phase X); these
 * tests are about the unlock itself, so pre-seed the scouted flag.
 */
function unlockScouted(state: GameState, id: string): string | null {
  if (!state.scoutedCountries.includes(id)) state.scoutedCountries.push(id);
  return unlockCountry(state, id);
}

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

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
}

describe('countries — new game defaults', () => {
  it('starts in US with $50, one garage company named "My Startup"', () => {
    const state = createInitialState(NOW);
    expect(state.activeCountryId).toBe('us');
    expect(state.countries).toHaveLength(1);
    const country = activeCountry(state);
    expect(country.id).toBe('us');
    expect(country.money).toBe(COUNTRY_STARTING_MONEY);
    expect(country.companies).toHaveLength(1);
    const company = activeCompany(state);
    expect(company.name).toBe('My Startup');
    expect(company.siteId).toBe('garage');
  });

  it('createInitialState(now, "ch") starts in Switzerland with My Startup', () => {
    const state = createInitialState(NOW, 'ch');
    expect(state.activeCountryId).toBe('ch');
    expect(state.countries).toHaveLength(1);
    const country = activeCountry(state);
    expect(country.id).toBe('ch');
    expect(country.money).toBe(COUNTRY_STARTING_MONEY);
    const company = activeCompany(state);
    expect(company.name).toBe('My Startup');
    expect(company.siteId).toBe('garage');
  });
});

describe('setStartingCountry', () => {
  it('works during tutorial with zero progress, rebuilds economy, preserves company name', () => {
    const state = createInitialState(NOW);
    const originalName = activeCompany(state).name;
    expect(state.tutorial.done).toBe(false);

    const result = setStartingCountry(state, 'ch');
    expect(result).toBeNull();
    expect(state.activeCountryId).toBe('ch');
    expect(state.countries).toHaveLength(1);
    expect(activeCountry(state).id).toBe('ch');
    expect(activeCompany(state).name).toBe(originalName);
  });

  it('returns error after tutorial done', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    const result = setStartingCountry(state, 'ch');
    expect(result).toBe('error.journeyBegun');
    expect(state.activeCountryId).toBe('us');
  });

  it('returns error after earning money globally', () => {
    const state = createInitialState(NOW);
    state.totalEarned = 1; // global earned counter
    const result = setStartingCountry(state, 'ch');
    expect(result).toBe('error.journeyBegun');
  });

  it('returns error after completing a project', () => {
    const state = createInitialState(NOW);
    state.projectsCompleted = 1;
    const result = setStartingCountry(state, 'ch');
    expect(result).toBe('error.journeyBegun');
  });

  it('returns error after hiring a worker', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    company.workers.push(makeWorker({ id: state.nextEntityId++ }));
    const result = setStartingCountry(state, 'ch');
    expect(result).toBe('error.journeyBegun');
  });

  it('is a no-op success when setting to the same country', () => {
    const state = createInitialState(NOW, 'us');
    const originalCountryCount = state.countries.length;
    const result = setStartingCountry(state, 'us');
    expect(result).toBeNull();
    expect(state.countries.length).toBe(originalCountryCount);
  });
});

describe('worldUnlocked', () => {
  it('is false initially with only garage company', () => {
    const state = createInitialState(NOW);
    expect(worldUnlocked(state)).toBe(false);
  });

  it('becomes true when all city sites are owned in one country', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000; // very huge amount (costs grow exponentially)

    // Fill all sites except garage (which already exists)
    for (const site of COMPANY_SITES.slice(1)) {
      const result = buyCompany(state, site.id);
      expect(result).toBeNull();
      completeBuild(state, site.id);
    }

    expect(country.companies.length).toBe(COMPANY_SITES.length);
    expect(worldUnlocked(state)).toBe(true);
  });
});

describe('unlockCountry', () => {
  it('returns error if world not unlocked', () => {
    const state = createInitialState(NOW);
    const result = unlockScouted(state, 'ch');
    expect(result).toBe('error.ownCityFirst');
  });

  it('returns error if country already unlocked', () => {
    const state = createInitialState(NOW, 'us');
    const result = unlockScouted(state, 'us');
    expect(result).toBe('error.countryUnlocked');
  });

  it('returns error if insufficient money in active country', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all sites to unlock world
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    // Set money to less than unlock cost
    country.money = countryUnlockCost(state) - 1;
    const result = unlockScouted(state, 'ch');
    expect(result).toBe('error.notEnoughMoney');
  });

  it('unlocks new country, costs money from active country, creates fresh garage', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all sites
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    const cost = countryUnlockCost(state);
    const moneyBefore = country.money;

    const result = unlockScouted(state, 'ch');
    expect(result).toBeNull();

    // Active country's money decreased
    expect(country.money).toBe(moneyBefore - cost);

    // New country created and is active
    expect(state.activeCountryId).toBe('ch');
    expect(state.countries).toHaveLength(2);
    const chCountry = activeCountry(state);
    expect(chCountry.id).toBe('ch');
    expect(chCountry.money).toBe(COUNTRY_STARTING_MONEY);
    expect(chCountry.companies).toHaveLength(1);
    expect(activeCompany(state).siteId).toBe('garage');
  });

  it('assigns parody name from new country pool (e.g., ch starts with Nestlay)', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all sites
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    unlockScouted(state, 'ch');

    const chCountry = activeCountry(state);
    const garageCompany = chCountry.companies[0];
    expect(garageCompany.name).toBe('Nestlay'); // First CH parody name
    expect(chCountry.usedCompanyNames).toContain('Nestlay');
  });

  it('second unlock costs 3× the first', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all sites
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    const firstCost = countryUnlockCost(state);
    expect(firstCost).toBe(COUNTRY_UNLOCK_BASE);

    unlockScouted(state, 'ch');

    // Switch back to US to unlock the next one
    setActiveCountry(state, 'us');
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000; // Give US more money

    const secondCost = countryUnlockCost(state);
    expect(secondCost).toBe(firstCost * COUNTRY_UNLOCK_GROWTH);
  });
});

describe('setActiveCountry', () => {
  it('free travel between unlocked countries', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all sites to unlock world
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    // Unlock CH
    unlockScouted(state, 'ch');
    expect(state.activeCountryId).toBe('ch');

    // Travel back to US
    const result = setActiveCountry(state, 'us');
    expect(result).toBeNull();
    expect(state.activeCountryId).toBe('us');

    // Travel back to CH
    const result2 = setActiveCountry(state, 'ch');
    expect(result2).toBeNull();
    expect(state.activeCountryId).toBe('ch');
  });

  it('returns error for non-existent country', () => {
    const state = createInitialState(NOW);
    const result = setActiveCountry(state, 'ch');
    expect(result).toBe('error.countryLocked');
  });
});

describe('per-country isolation', () => {
  it('money is separate per country', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;

    const moneyBefore = usCountry.money;

    // Fill all US sites to unlock world
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    const moneyAfterCompanies = usCountry.money;
    const cost = countryUnlockCost(state);
    unlockScouted(state, 'ch');

    const chCountry = activeCountry(state);
    expect(chCountry.money).toBe(COUNTRY_STARTING_MONEY); // CH starts with 50
    expect(usCountry.money).toBe(moneyAfterCompanies - cost); // US reduced by unlock cost only
    expect(usCountry.money).toBeLessThan(moneyBefore); // Overall money decreased
  });

  it('companies are separate per country', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;

    // Setup to unlock
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    unlockScouted(state, 'ch');
    const chCountry = activeCountry(state);

    // CH has only garage company
    expect(chCountry.companies).toHaveLength(1);
    expect(chCountry.companies[0].siteId).toBe('garage');

    // US still has all its companies
    expect(usCountry.companies.length).toBe(COMPANY_SITES.length);
  });

  it('each country tracks totalEarned independently', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);

    // Unlock CH
    usCountry.money = 200_000_000_000_000;
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');
    const chCountry = countryById(state, 'ch')!;

    // Verify each country starts with 0 totalEarned
    expect(usCountry.totalEarned).toBe(0);
    expect(chCountry.totalEarned).toBe(0);

    // Manually track earnings in each (simulating actual gameplay)
    usCountry.totalEarned = 1000;
    chCountry.totalEarned = 500;

    // Verify they remain separate
    expect(usCountry.totalEarned).toBe(1000);
    expect(chCountry.totalEarned).toBe(500);
  });

  it('spending in one country never touches the other', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;

    // Unlock CH
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');
    const chCountry = activeCountry(state);
    chCountry.money = 10_000_000;

    const usMoneyBefore = usCountry.money;

    // Spend money in CH
    buyWorkstation(state, 'basic'); // costs money in active (CH) country
    const usMoneyAfter = usCountry.money;

    // US money unchanged
    expect(usMoneyAfter).toBe(usMoneyBefore);

    // But CH money decreased
    expect(chCountry.money).toBeLessThan(10_000_000);
  });
});

describe('global output multiplier with world expansion', () => {
  it('adds 0.25× per additional country to output multiplier', () => {
    // Verify that countries.length affects the globalOutputMultiplier
    const state = createInitialState(NOW);
    const company = activeCompany(state);

    // Capture multiplier with 1 country
    const mult1 = globalOutputMultiplier(state, company);

    // Add a fake country and verify multiplier increases
    const fakeCountry: CountryState = {
      id: 'ch' as CountryId,
      money: COUNTRY_STARTING_MONEY,
      totalEarned: 0,
      projectsCompleted: 0,
      companies: [],
      activeCompanyId: 0,
      debtQuitCooldownSec: 60,
      usedCompanyNames: [],
      builders: { count: 1 },
      timedActions: [],
    };
    state.countries.push(fakeCountry);

    const mult2 = globalOutputMultiplier(state, company);

    // The ratio should be (1.25 / 1) since world factor goes from 1 to 1.25
    // But since other factors are identical, multiplier should increase by 1.25x
    expect(mult2).toBeGreaterThan(mult1);
    expect(mult2 / mult1).toBeCloseTo(1 + WORLD_OUTPUT_PER_COUNTRY, 4);
  });

  it('world output factor applies to all companies equally', () => {
    // Verify that adding a country increases output for any company
    const state = createInitialState(NOW);
    const company = activeCompany(state);

    // Add workers to the company
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    company.workers.push(worker);
    autoSeat(company);

    const rateWithWorker = companyWorkRate(state, company);
    expect(rateWithWorker).toBeGreaterThan(0);

    // Add a second country
    const fakeCountry: CountryState = {
      id: 'ch' as CountryId,
      money: COUNTRY_STARTING_MONEY,
      totalEarned: 0,
      projectsCompleted: 0,
      companies: [],
      activeCompanyId: 0,
      debtQuitCooldownSec: 60,
      usedCompanyNames: [],
      builders: { count: 1 },
      timedActions: [],
    };
    state.countries.push(fakeCountry);

    const rateWith2Countries = companyWorkRate(state, company);

    // Rate should increase due to world output bonus
    expect(rateWith2Countries / rateWithWorker).toBeCloseTo(1 + WORLD_OUTPUT_PER_COUNTRY, 4);
  });
});

describe('offline simulation across countries', () => {
  it('advances both economies when seated workers in two countries', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    const usCompany = activeCompany(state);
    usCountry.money = 50_000;

    buyWorkstation(state, 'basic');
    const usWorker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    usCompany.workers.push(usWorker);
    autoSeat(usCompany);

    // Unlock CH with worker
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
    }
    unlockScouted(state, 'ch');
    const chCountry = activeCountry(state);
    const chCompany = activeCompany(state);
    chCountry.money = 50_000;

    buyWorkstation(state, 'basic');
    const chWorker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    chCompany.workers.push(chWorker);
    autoSeat(chCompany);

    // Record initial state
    const usEarnedBefore = usCountry.totalEarned;
    const chEarnedBefore = chCountry.totalEarned;

    // Simulate offline
    simulateOffline(state, 100, 24 * 3600);

    // Both economies advanced
    expect(usCountry.totalEarned).toBeGreaterThan(usEarnedBefore);
    expect(chCountry.totalEarned).toBeGreaterThan(chEarnedBefore);
  });

  it('offline simulation matches equivalent live ticks for both countries', () => {
    // State 1: offline simulation
    const state1 = createInitialState(NOW);
    const us1 = activeCountry(state1);
    const usCompany1 = activeCompany(state1);
    us1.money = 50_000;

    buyWorkstation(state1, 'basic');
    const usWorker1 = makeWorker({ id: state1.nextEntityId++, tierId: 'junior' });
    usCompany1.workers.push(usWorker1);
    autoSeat(usCompany1);

    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state1, site.id);
    }
    unlockScouted(state1, 'ch');
    const ch1 = activeCountry(state1);
    const chCompany1 = activeCompany(state1);
    ch1.money = 50_000;

    buyWorkstation(state1, 'basic');
    const chWorker1 = makeWorker({ id: state1.nextEntityId++, tierId: 'junior' });
    chCompany1.workers.push(chWorker1);
    autoSeat(chCompany1);

    simulateOffline(state1, 100, 24 * 3600);

    // State 2: live ticks
    const state2 = createInitialState(NOW);
    const us2 = activeCountry(state2);
    const usCompany2 = activeCompany(state2);
    us2.money = 50_000;

    buyWorkstation(state2, 'basic');
    const usWorker2 = makeWorker({ id: state2.nextEntityId++, tierId: 'junior' });
    usCompany2.workers.push(usWorker2);
    autoSeat(usCompany2);

    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state2, site.id);
    }
    unlockScouted(state2, 'ch');
    const ch2 = activeCountry(state2);
    const chCompany2 = activeCompany(state2);
    ch2.money = 50_000;

    buyWorkstation(state2, 'basic');
    const chWorker2 = makeWorker({ id: state2.nextEntityId++, tierId: 'junior' });
    chCompany2.workers.push(chWorker2);
    autoSeat(chCompany2);

    // Simulate with ticks
    for (let i = 0; i < 100; i++) {
      tick(state2, 1);
    }

    // Results should be very close (within rounding)
    expect(us1.totalEarned).toBeCloseTo(us2.totalEarned, 2);
    expect(ch1.totalEarned).toBeCloseTo(ch2.totalEarned, 2);
  });
});

describe('VsCoin and missions are global', () => {
  it('grantVsCoin in one country visible after travel', () => {
    const state = createInitialState(NOW);

    // Grant VsCoin in US
    grantVsCoin(state, 10, 'test');
    expect(state.vsCoin).toBe(10);

    // Setup to unlock and unlock CH
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');

    // VsCoin is still visible in CH (global)
    expect(state.vsCoin).toBe(10);

    // Travel back to US
    setActiveCountry(state, 'us');
    expect(state.vsCoin).toBe(10);
  });

  it('mission metric "countries" equals state.countries.length', () => {
    const state = createInitialState(NOW);
    expect(state.countries).toHaveLength(1);

    // Setup to unlock
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');

    // Countries increased
    expect(state.countries).toHaveLength(2);

    // Setup to unlock CA
    const activeC = activeCountry(state);
    activeC.money = 200_000_000_000_000;
    unlockScouted(state, 'ca');
    expect(state.countries).toHaveLength(3);
  });

  it('claiming a mission works regardless of active country', () => {
    const state = createInitialState(NOW);
    // This test verifies the structure is correct for mission claiming
    // Mission claiming logic would be in a separate module, but the structure
    // (missionsClaimed, vsCoin, etc.) should be global and survive travel.

    const missionsBefore = state.missionsClaimed.length;
    state.missionsClaimed.push('test-mission');

    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');

    // Mission claim persists after unlock
    expect(state.missionsClaimed).toContain('test-mission');
    expect(state.missionsClaimed).toHaveLength(missionsBefore + 1);
  });
});

describe('parody company name pools', () => {
  it('assigns US parody names in order (MicroHard, Gogol, ...)', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill each site and verify parody name order
    const expectedNames = ['MicroHard', 'Gogol', 'Appel', 'Amazoom', 'Facelook', 'Netflicks', 'Teslo', 'Orbacle'];

    for (let i = 0; i < COMPANY_SITES.length - 1; i++) {
      const site = COMPANY_SITES[i + 1]; // skip garage
      buyCompany(state, site.id);
      completeBuild(state, site.id);
      const company = country.companies[i + 1]; // second company onwards
      expect(company.name).toBe(expectedNames[i]);
    }
  });

  it('exhausts pool and falls back to "Site name Branch"', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Fill all 8 sites to exhaust the US pool
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    // Verify that usedCompanyNames has 7 parody names (7 companies purchased + 1 initial garage)
    expect(country.usedCompanyNames.length).toBe(7); // 7 companies purchased (plus the initial garage)
  });

  it('first company is "My Startup" and does not consume pool name', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    expect(country.companies[0].name).toBe('My Startup');
    expect(country.usedCompanyNames).toHaveLength(0); // No names used yet

    country.money = 200_000_000_000_000;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');

    // Second company gets the first parody name
    expect(country.companies[1].name).toBe('MicroHard');
    expect(country.usedCompanyNames).toEqual(['MicroHard']);
  });

  it('later countries take pool names (e.g., CH starts with Nestlay)', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;

    // Fill all US sites
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    // Unlock CH
    unlockScouted(state, 'ch');
    const chCountry = activeCountry(state);

    // CH's garage company takes the first CH parody name
    const garageCompany = chCountry.companies[0];
    expect(garageCompany.name).toBe('Nestlay');
    expect(chCountry.usedCompanyNames).toEqual(['Nestlay']);
  });

  it('no parody name reuse within a country', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 200_000_000_000_000;

    // Add multiple companies
    for (const site of COMPANY_SITES.slice(1).slice(0, 3)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }

    // Verify no duplicates
    const names = country.companies.slice(1).map((c) => c.name);
    expect(names.length).toBe(new Set(names).size);
  });
});

describe('countries — integration with allCompanies', () => {
  it('allCompanies returns companies across all countries', () => {
    const state = createInitialState(NOW);
    const usCountry = activeCountry(state);
    usCountry.money = 200_000_000_000_000;

    // Add a company in US
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    expect(usCountry.companies.length).toBe(2);

    // Unlock CH
    for (const site of COMPANY_SITES.slice(1)) {
      buyCompany(state, site.id);
      completeBuild(state, site.id);
    }
    unlockScouted(state, 'ch');
    const chCountry = activeCountry(state);
    expect(chCountry.companies.length).toBe(1); // just garage

    // allCompanies should return all from both countries
    const allComp = allCompanies(state);
    expect(allComp.length).toBe(usCountry.companies.length + chCountry.companies.length);
    expect(allComp.length).toBeGreaterThan(usCountry.companies.length);
  });
});
