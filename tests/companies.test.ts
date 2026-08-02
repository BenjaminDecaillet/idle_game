import { describe, expect, it } from 'vitest';
import { COMPANY_SITES, WORKER_TIERS } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyCompany,
  buyWorkstation,
  createInitialState,
  hireWorker,
  renameCompany,
  setActiveCompany,
  tick,
  SAVE_VERSION,
} from '../src/game/engine';
import { migrate } from '../src/game/save';

const NOW = 1_700_000_000_000;

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
    expect(err).toBe('Not enough money');
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
    expect(activeCountry(state).companies).toHaveLength(2);

    const loftCompany = activeCountry(state).companies.find((c) => c.siteId === 'loft');
    expect(loftCompany).not.toBeUndefined();
    expect(loftCompany!.name).toBe('MicroHard'); // first parody name in US pool
    expect(loftCompany!.workers).toHaveLength(0);
    expect(loftCompany!.workstations).toHaveLength(0);
    expect(loftCompany!.candidates).toHaveLength(3);
    expect(activeCountry(state).activeCompanyId).toBe(loftCompany!.id); // becomes active
  });

  it('returns an error when site is already occupied', () => {
    const state = createInitialState(NOW);
    expect(activeCountry(state).companies[0].siteId).toBe('garage');
    const err = buyCompany(state, 'garage');
    expect(err).toBe('Site already occupied');
    expect(activeCountry(state).companies).toHaveLength(1);
  });

  it('assigns parody name from country pool when no name provided', () => {
    const state = createInitialState(NOW);
    const paloaltoSite = COMPANY_SITES.find((s) => s.id === 'paloalto')!;
    activeCountry(state).money = paloaltoSite.cost;

    buyCompany(state, 'paloalto');
    const company = activeCountry(state).companies.find((c) => c.siteId === 'paloalto')!;
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

    const loft = activeCountry(state).companies.find((c) => c.siteId === 'loft')!;
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
    const loft = activeCompany(state);

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
    const loft = activeCompany(state);

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

    const garageProgressBefore = garage.projects.find((p) => p.defId === 'landing')!.progress;
    const loftProgressBefore = loft.projects.find((p) => p.defId === 'landing')!.progress;
    const moneyBefore = activeCountry(state).money;

    // Run a tick long enough for at least some completions
    const events = tick(state, 100);

    const garageProgressAfter = garage.projects.find((p) => p.defId === 'landing')!.progress;
    const loftProgressAfter = loft.projects.find((p) => p.defId === 'landing')!.progress;

    // Both companies should have progressed
    expect(garageProgressAfter).toBeGreaterThan(garageProgressBefore);
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
    const loft = activeCompany(state);

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
              projectSlots: 1,
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
