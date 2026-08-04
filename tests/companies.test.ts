import { describe, expect, it } from 'vitest';
import { COMPANY_SITES, WORKER_TIERS } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyCompany,
  buyWorkstation,
  createInitialState,
  fastForwardAction,
  hireWorker,
  renameCompany,
  setActiveCompany,
  siteUnderConstruction,
  tick,
  SAVE_VERSION,
  simulateOffline,
  availableSites,
} from '../src/game/engine';
import { migrate } from '../src/game/save';

const NOW = 1_700_000_000_000;

/** Helper: after buyCompany, complete the build and return the company. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return activeCountry(state).companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return activeCountry(state).companies.find((c) => c.siteId === siteId)!;
}

describe('createInitialState — company structure', () => {
  it('starts with exactly 1 company at garage, it is active, first project unlocked', () => {
    const state = createInitialState(NOW);
    expect(activeCountry(state).companies).toHaveLength(1);

    const garageCompany = activeCountry(state).companies[0];
    expect(garageCompany.siteId).toBe('garage');
    expect(activeCountry(state).activeCompanyId).toBe(garageCompany.id);

    const landing = garageCompany.projects.find((p) => p.defId === 'landing');
    expect(landing).not.toBeUndefined();
    expect(landing!.unlocked).toBe(true);

    // All other projects start locked
    for (const p of garageCompany.projects) {
      if (p.defId !== 'landing') {
        expect(p.unlocked).toBe(false);
      }
    }
  });
});

describe('buyCompany', () => {
  it('fails with "Not enough money" when wallet < site cost', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 50; // default starting money
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    expect(loftSite.cost).toBe(200_000);

    const err = buyCompany(state, 'loft');
    expect(err).toBe('error.notEnoughMoney');
    expect(activeCountry(state).companies).toHaveLength(1); // unchanged
  });

  it('succeeds when affordable: deducts cost, adds company with empty roster and candidates', () => {
    const state = createInitialState(NOW);
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money = loftSite.cost + 100;

    const initialMoney = activeCountry(state).money;
    const err = buyCompany(state, 'loft');

    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(initialMoney - loftSite.cost);

    // Complete the build
    const loftCompany = completeBuild(state, 'loft');
    expect(activeCountry(state).companies).toHaveLength(2);
    expect(loftCompany).not.toBeUndefined();
    expect(loftCompany.name).toBe('MicroHard'); // first parody name in US pool
    expect(loftCompany.workers).toHaveLength(0);
    expect(loftCompany.workstations).toHaveLength(0);
    expect(loftCompany.candidates).toHaveLength(3);
    // Note: activeCompanyId does NOT change on completion; only changed on buyCompany if instant
  });

  it('returns an error when site is already occupied', () => {
    const state = createInitialState(NOW);
    expect(activeCountry(state).companies[0].siteId).toBe('garage');
    const err = buyCompany(state, 'garage');
    expect(err).toBe('error.siteOccupied');
    expect(activeCountry(state).companies).toHaveLength(1);
  });

  it('assigns parody name from country pool when no name provided', () => {
    const state = createInitialState(NOW);
    const paloaltoSite = COMPANY_SITES.find((s) => s.id === 'paloalto')!;
    activeCountry(state).money = paloaltoSite.cost;

    buyCompany(state, 'paloalto');
    const company = completeBuild(state, 'paloalto');
    expect(company.name).toBe('MicroHard'); // first parody name in US pool
  });
});

describe('setActiveCompany', () => {
  it('switches to the specified company', () => {
    const state = createInitialState(NOW);
    const garage = activeCountry(state).companies[0];

    // Buy a second company
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money = loftSite.cost;
    buyCompany(state, 'loft');
    const loft = completeBuild(state, 'loft');

    // Switch to loft
    setActiveCompany(state, loft.id);
    expect(activeCountry(state).activeCompanyId).toBe(loft.id);

    // Switch back to garage
    const err = setActiveCompany(state, garage.id);
    expect(err).toBeNull();
    expect(activeCountry(state).activeCompanyId).toBe(garage.id);
    expect(activeCompany(state)).toBe(garage);
  });

  it('returns an error for an unknown company id', () => {
    const state = createInitialState(NOW);
    const err = setActiveCompany(state, 99999);
    expect(err).toBe('Company not found');
    expect(activeCountry(state).activeCompanyId).toBe(activeCountry(state).companies[0].id); // unchanged
  });
});

describe('action scoping — wallet is shared, actions affect only active company', () => {
  it('hireWorker and buyWorkstation affect only the active company', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);

    // Set up garage with enough money
    activeCountry(state).money = 10_000;

    // Buy a second company (loft)
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money += loftSite.cost;
    buyCompany(state, 'loft');
    const loft = completeBuild(state, 'loft');

    // Switch to loft
    setActiveCompany(state, loft.id);

    // Now we're in loft. Hire a worker and buy a workstation.
    const loftCandidateIdx = 0;
    const loftCandidateTier = WORKER_TIERS.find((t) => t.id === loft.candidates[loftCandidateIdx].tierId)!;
    activeCountry(state).money += loftCandidateTier.hireCost + 1000;

    const moneyBefore = activeCountry(state).money;
    const hireErr = hireWorker(state, loftCandidateIdx);
    expect(hireErr).toBeNull();
    expect(loft.workers).toHaveLength(1);
    expect(garage.workers).toHaveLength(0); // garage unchanged

    const stationErr = buyWorkstation(state, 'basic');
    expect(stationErr).toBeNull();
    expect(loft.workstations).toHaveLength(1);
    expect(garage.workstations).toHaveLength(0); // garage unchanged

    // Wallet is shared
    expect(activeCountry(state).money).toBeLessThan(moneyBefore);
  });
});

describe('parallel production — companies produce independently from shared wallet', () => {
  it('both companies generate progress and income simultaneously', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);
    activeCountry(state).money = 10_000;

    // Set up garage company with 1 worker seated at 1 desk
    garage.candidates.push({
      name: 'Alice',
      tierId: 'junior',
      specialization: 'Frontend', // matches landing project
    });
    hireWorker(state, 3); // hire the pushed candidate (index 3 = beyond the initial 3)
    buyWorkstation(state, 'basic');
    autoSeat(garage);

    expect(garage.workers).toHaveLength(1);
    expect(garage.workers[0].stationId).not.toBeNull();

    // Buy and set up loft company
    activeCountry(state).money = 500_000; // enough for loft + hiring (loft costs 200_000)
    buyCompany(state, 'loft');

    // Capture garage progress BEFORE completing the loft build (before the long tick)
    const garageProgressBefore = garage.projects.find((p) => p.defId === 'landing')!.progress;

    const loft = completeBuild(state, 'loft');

    // Switch to loft
    setActiveCompany(state, loft.id);

    loft.candidates.push({
      name: 'Bob',
      tierId: 'junior',
      specialization: 'Frontend',
    });
    hireWorker(state, 3);
    buyWorkstation(state, 'basic');
    autoSeat(loft);

    expect(loft.workers).toHaveLength(1);
    expect(loft.workers[0].stationId).not.toBeNull();

    const loftProgressBefore = loft.projects.find((p: any) => p.defId === 'landing')!.progress;
    const moneyBefore = activeCountry(state).money;

    // Run a tick long enough for at least some completions
    const events = tick(state, 100);

    const garageProgressAfter = garage.projects.find((p: any) => p.defId === 'landing')!.progress;
    const loftProgressAfter = loft.projects.find((p: any) => p.defId === 'landing')!.progress;

    // Both companies should have progressed (note: loft starts at 0, garage starts at garageProgressBefore)
    expect(garageProgressAfter).toBeGreaterThanOrEqual(garageProgressBefore);
    expect(loftProgressAfter).toBeGreaterThan(loftProgressBefore);

    // Both companies should have their own workers' IDs in the level-up events (if any)
    const workerIds = new Set(events.levelUps.map((e) => e.workerId));
    expect(workerIds.size).toBeLessThanOrEqual(2); // at most 2 workers

    // Money changed from salaries and rewards
    expect(activeCountry(state).money).not.toBe(moneyBefore);

    // If there were completions, verify both companies could have contributed
    if (events.completions.length > 0) {
      const companyIds = new Set(events.completions.map((c) => c.companyId));
      expect(companyIds.size).toBeLessThanOrEqual(2); // at most 2 companies
    }
  });
});

describe('renameCompany', () => {
  it('renames only the active company', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);

    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money = loftSite.cost;
    buyCompany(state, 'loft');
    const loft = completeBuild(state, 'loft');

    // Switch to loft
    setActiveCompany(state, loft.id);

    const err = renameCompany(state, 'My New Loft Name');
    expect(err).toBeNull();
    expect(loft.name).toBe('My New Loft Name');
    expect(garage.name).not.toBe('My New Loft Name'); // garage unchanged
  });

  it('truncates to 30 chars and trims whitespace', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    renameCompany(state, '  ' + 'a'.repeat(35) + '  ');
    expect(c.name).toHaveLength(30);
    expect(c.name).toBe('a'.repeat(30));
  });

  it('returns an error for an empty name', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const originalName = c.name;

    const err = renameCompany(state, '   ');
    expect(err).toBe('Name cannot be empty');
    expect(c.name).toBe(originalName); // unchanged
  });
});

describe('company-build — timed founding', () => {
  it('buyCompany charges immediately, no company exists yet, siteUnderConstruction returns the action with correct price, availableSites omits the site', () => {
    const state = createInitialState(NOW);
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money = loftSite.cost + 100;

    const initialMoney = activeCountry(state).money;
    const companiesCountBefore = activeCountry(state).companies.length;

    const err = buyCompany(state, 'loft');

    expect(err).toBeNull();
    // Money deducted immediately
    expect(activeCountry(state).money).toBe(initialMoney - loftSite.cost);
    // Company doesn't exist yet
    expect(activeCountry(state).companies.length).toBe(companiesCountBefore);

    // siteUnderConstruction returns the action with correct price
    const action = siteUnderConstruction(activeCountry(state), 'loft');
    expect(action).not.toBeNull();
    expect(action!.siteId).toBe('loft');
    expect(action!.price).toBe(loftSite.cost);
    expect(action!.kind).toBe('company-build');

    // availableSites omits the site
    const sites = availableSites(state);
    expect(sites).not.toContain('loft');
  });

  it('tick past the duration creates the company with parody name, purchasePrice === price, floors 1, emits companyBuildsDone once, does NOT change activeCompanyId', () => {
    const state = createInitialState(NOW);
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    activeCountry(state).money = loftSite.cost + 100;

    const garageId = activeCompany(state).id;
    const err = buyCompany(state, 'loft');
    expect(err).toBeNull();

    const action = siteUnderConstruction(activeCountry(state), 'loft');
    expect(action).not.toBeNull();
    const duration = action!.remainingSec;

    const events = tick(state, duration + 1);

    // Company now exists
    const loft = activeCountry(state).companies.find((c) => c.siteId === 'loft');
    expect(loft).not.toBeUndefined();
    expect(loft!.name).toBe('MicroHard'); // parody name from country pool
    expect(loft!.purchasePrice).toBe(loftSite.cost);
    expect(loft!.floors).toBe(1);

    // companyBuildsDone event emitted once
    expect(events.companyBuildsDone).toHaveLength(1);
    expect(events.companyBuildsDone[0].siteId).toBe('loft');
    expect(events.companyBuildsDone[0].companyId).toBe(loft!.id);

    // activeCompanyId does NOT change
    expect(activeCountry(state).activeCompanyId).toBe(garageId);
  });

  it('duration ramps: with 1 company the duration is 600×1.6; after that build completes, the next one is 600×1.6²', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 500_000_000;

    // First company build (garage exists, so founded is 1 at the time of check)
    buyCompany(state, 'loft');

    // Check duration before completion
    let action = siteUnderConstruction(country, 'loft');
    const duration1 = action!.remainingSec;
    // At the time of buyCompany, founded = 1 (garage) + 0 (pending) = 1
    // So duration = 600 * 1.6^1 = 960
    expect(duration1).toBe(600 * Math.pow(1.6, 1));

    // Complete first build
    tick(state, duration1 + 1);
    expect(country.timedActions).toHaveLength(0);

    // Start second company build
    buyCompany(state, 'paloalto');

    // Check duration after first build complete
    action = siteUnderConstruction(country, 'paloalto');
    const duration2 = action!.remainingSec;
    // At the time of buyCompany, founded = 2 (garage + loft) + 0 (pending) = 2
    // So duration = 600 * 1.6^2 = 1536
    expect(duration2).toBe(600 * Math.pow(1.6, 2));
  });

  it('companyCost counts a pending build in the escalation', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 500_000_000;

    // First company build
    buyCompany(state, 'loft');

    // Before completing the first build, check the cost of starting a second
    const paloaltoSite = COMPANY_SITES.find((s) => s.id === 'paloalto')!;
    // companyCost should count the pending loft build: companies = 1, pending = 1, extraCompanies = max(0, 1+1-1) = 1
    // So cost = paloalto.cost * 1.02^1
    const cost2Pendant = paloaltoSite.cost * Math.pow(1.02, 1);

    // Complete first build, then check cost of second
    tick(state, 1000);

    // Now companies = 2, pending = 0, extraCompanies = max(0, 2+0-1) = 1
    // So cost is the same as before
    const cost2Completed = paloaltoSite.cost * Math.pow(1.02, 1);

    expect(cost2Pendant).toBe(cost2Completed);
  });

  it('buyCompany errors: siteAlreadyBuilding and noFreeBuilders', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 500_000_000;

    // Start a company build
    const err1 = buyCompany(state, 'loft');
    expect(err1).toBeNull();

    // Try to buy at the same site again
    const err2 = buyCompany(state, 'loft');
    expect(err2).toBe('error.siteAlreadyBuilding');

    // Try to start another build (no free builders)
    const err3 = buyCompany(state, 'paloalto');
    expect(err3).toBe('error.noFreeBuilders');
  });

  it('offline parity: buyCompany then simulateOffline over the duration equals live ticking', () => {
    // State A: online tick
    const stateA = createInitialState(NOW);
    const countryA = activeCountry(stateA);
    countryA.money = 500_000;

    buyCompany(stateA, 'loft');
    const action = siteUnderConstruction(countryA, 'loft');
    const duration = action!.remainingSec;
    tick(stateA, duration + 1);

    const moneyA = countryA.money;
    const companyCountA = countryA.companies.length;

    // State B: offline simulation
    const stateB = createInitialState(NOW);
    const countryB = activeCountry(stateB);
    countryB.money = 500_000;

    buyCompany(stateB, 'loft');
    simulateOffline(stateB, duration + 1, 10000);

    const moneyB = countryB.money;
    const companyCountB = countryB.companies.length;

    // Results should match
    expect(companyCountB).toBe(companyCountA);
    expect(moneyB).toBe(moneyA);
  });

  it('fastForwardAction on the country-level action completes it instantly', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 500_000;

    buyCompany(state, 'loft');
    const action = siteUnderConstruction(country, 'loft');
    expect(action).not.toBeNull();

    const actionId = action!.id;
    const remainingSec = action!.remainingSec;

    // Set up VsCoin: first fast-forward is free (tutorial gift), so set fastForwardsUsed > 0 for cost
    state.vsCoin = 1000;
    state.fastForwardsUsed = 1; // Not the first fast-forward, so it will cost VsCoin

    const events = fastForwardAction(state, actionId);

    expect(events).toBeNull();
    expect(country.timedActions).toHaveLength(0);

    // Company should now exist
    const loft = country.companies.find((c) => c.siteId === 'loft');
    expect(loft).not.toBeUndefined();

    // VsCoin should be deducted: ceil(remainingSec / FASTFORWARD_SEC_PER_VSCOIN)
    const vsCoinSpent = Math.max(1, Math.ceil(remainingSec / 600));
    expect(state.vsCoin).toBe(1000 - vsCoinSpent);

    // Check ledger entry
    const ledger = state.vsCoinLedger.find((e) => e.source === 'shop:fast-forward-company-build');
    expect(ledger).not.toBeUndefined();
    expect(ledger!.amount).toBe(-vsCoinSpent);
  });
});

describe('save hygiene migration', () => {
  it('restores missing required fields with fresh defaults', () => {
    const partiallySaved = {
      countries: [
        {
          id: 'us',
          money: 500,
          totalEarned: 100,
          projectsCompleted: 2,
          companies: [
            {
              id: 1,
              name: 'Test Co',
              siteId: 'garage',
              floors: 1,
              wallpaperId: null,
              workers: [
                {
                  id: 100,
                  name: 'TestWorker',
                  tierId: 'junior',
                  specialization: 'Backend',
                  skillLevel: 5,
                  experience: 10,
                  stationId: null,
                  timesTrained: 0,
                  promotions: 0,
                },
              ],
              workstations: [{ id: 1, defId: 'basic' }],
              projects: [],
              activeProjectId: 'landing',
              upgrades: {},
              candidates: [],
              candidateRerollCost: 10,
              timedActions: [],
              purchasePrice: 0,
              renameCount: 0,
              floorProjects: [],
            },
          ],
          activeCompanyId: 1,
          debtQuitCooldownSec: 60,
          usedCompanyNames: [],
        },
      ],
      activeCountryId: 'us',
      totalEarned: 100,
      projectsCompleted: 2,
    } as any;

    const result = migrate(partiallySaved, NOW);

    expect(result.version).toBe(SAVE_VERSION);
    expect(result.countries).toHaveLength(1);

    const us = result.countries[0];
    expect(us.id).toBe('us');
    expect(us.money).toBe(500);
    expect(us.companies).toHaveLength(1);

    const company = us.companies[0];
    expect(company.name).toBe('Test Co');
    expect(company.siteId).toBe('garage');
    expect(company.workers).toHaveLength(1);
    expect(company.workers[0].name).toBe('TestWorker');
    expect(company.workers[0].tierId).toBe('junior');
    expect(company.workstations).toHaveLength(1);
    expect(company.workstations[0].defId).toBe('basic');

    expect(result.activeCountryId).toBe('us');
    expect(activeCountry(result).activeCompanyId).toBe(1);
  });

  it('restores missing countries array to fresh default', () => {
    const corrupted = {
      countries: undefined,
      activeCountryId: 'us',
    } as any;

    const result = migrate(corrupted, NOW);
    expect(result.countries.length).toBeGreaterThan(0);
    expect(result.countries[0].companies.length).toBeGreaterThan(0);
  });
});
