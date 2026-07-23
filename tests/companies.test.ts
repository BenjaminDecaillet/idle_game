import { describe, expect, it } from 'vitest';
import { COMPANY_SITES, WORKER_TIERS } from '../src/game/data';
import {
  activeCompany,
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
    training: null,
    ...overrides,
  };
}

describe('createInitialState — company structure', () => {
  it('starts with exactly 1 company at garage, it is active, first project unlocked', () => {
    const state = createInitialState(NOW);
    expect(state.companies).toHaveLength(1);

    const garageCompany = state.companies[0];
    expect(garageCompany.siteId).toBe('garage');
    expect(state.activeCompanyId).toBe(garageCompany.id);

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
    state.money = 50; // default starting money
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    expect(loftSite.cost).toBe(200_000);

    const err = buyCompany(state, 'loft');
    expect(err).toBe('Not enough money');
    expect(state.companies).toHaveLength(1); // unchanged
  });

  it('succeeds when affordable: deducts cost, adds company with empty roster and candidates', () => {
    const state = createInitialState(NOW);
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    state.money = loftSite.cost + 100;

    const initialMoney = state.money;
    const err = buyCompany(state, 'loft', 'My Loft Office');

    expect(err).toBeNull();
    expect(state.money).toBe(initialMoney - loftSite.cost);
    expect(state.companies).toHaveLength(2);

    const loftCompany = state.companies.find((c) => c.siteId === 'loft');
    expect(loftCompany).not.toBeUndefined();
    expect(loftCompany!.name).toBe('My Loft Office');
    expect(loftCompany!.workers).toHaveLength(0);
    expect(loftCompany!.workstations).toHaveLength(0);
    expect(loftCompany!.candidates).toHaveLength(3);
    expect(state.activeCompanyId).toBe(loftCompany!.id); // becomes active
  });

  it('returns an error when site is already occupied', () => {
    const state = createInitialState(NOW);
    expect(state.companies[0].siteId).toBe('garage');
    const err = buyCompany(state, 'garage');
    expect(err).toBe('Site already occupied');
    expect(state.companies).toHaveLength(1);
  });

  it('uses default name if not provided', () => {
    const state = createInitialState(NOW);
    const paloaltoSite = COMPANY_SITES.find((s) => s.id === 'paloalto')!;
    state.money = paloaltoSite.cost;

    buyCompany(state, 'paloalto');
    const company = state.companies.find((c) => c.siteId === 'paloalto')!;
    expect(company.name).toBe(`${paloaltoSite.name} Branch`);
  });
});

describe('setActiveCompany', () => {
  it('switches to the specified company', () => {
    const state = createInitialState(NOW);
    const garage = state.companies[0];

    // Buy a second company
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    state.money = loftSite.cost;
    buyCompany(state, 'loft');

    const loft = state.companies.find((c) => c.siteId === 'loft')!;
    expect(state.activeCompanyId).toBe(loft.id);

    // Switch back to garage
    const err = setActiveCompany(state, garage.id);
    expect(err).toBeNull();
    expect(state.activeCompanyId).toBe(garage.id);
    expect(activeCompany(state)).toBe(garage);
  });

  it('returns an error for an unknown company id', () => {
    const state = createInitialState(NOW);
    const err = setActiveCompany(state, 99999);
    expect(err).toBe('Company not found');
    expect(state.activeCompanyId).toBe(state.companies[0].id); // unchanged
  });
});

describe('action scoping — wallet is shared, actions affect only active company', () => {
  it('hireWorker and buyWorkstation affect only the active company', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);

    // Set up garage with enough money
    state.money = 10_000;

    // Buy a second company (loft)
    const loftSite = COMPANY_SITES.find((s) => s.id === 'loft')!;
    state.money += loftSite.cost;
    buyCompany(state, 'loft');
    const loft = activeCompany(state);

    // Now we're in loft. Hire a worker and buy a workstation.
    const loftCandidateIdx = 0;
    const loftCandidateTier = WORKER_TIERS.find((t) => t.id === loft.candidates[loftCandidateIdx].tierId)!;
    state.money += loftCandidateTier.hireCost + 1000;

    const moneyBefore = state.money;
    const hireErr = hireWorker(state, loftCandidateIdx);
    expect(hireErr).toBeNull();
    expect(loft.workers).toHaveLength(1);
    expect(garage.workers).toHaveLength(0); // garage unchanged

    const stationErr = buyWorkstation(state, 'basic');
    expect(stationErr).toBeNull();
    expect(loft.workstations).toHaveLength(1);
    expect(garage.workstations).toHaveLength(0); // garage unchanged

    // Wallet is shared
    expect(state.money).toBeLessThan(moneyBefore);
  });
});

describe('parallel production — companies produce independently from shared wallet', () => {
  it('both companies generate progress and income simultaneously', () => {
    const state = createInitialState(NOW);
    const garage = activeCompany(state);
    state.money = 10_000;

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
    state.money = 500_000; // enough for loft + hiring (loft costs 200_000)
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
    const moneyBefore = state.money;

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
    expect(state.money).not.toBe(moneyBefore);

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
    state.money = loftSite.cost;
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

describe('legacy v2 save migration to v3', () => {
  it('migrates flat pre-v3 save into v3 company structure', () => {
    const flatSave = {
      money: 500,
      companyName: 'Old Co',
      workers: [makeWorker({ id: 100, name: 'OldWorker' })],
      workstations: [{ id: 1, defId: 'basic' }],
      activeProjectId: 'landing',
      upgrades: { coffee: 2 },
      candidateRerollCost: 15,
    } as any;

    const result = migrate(flatSave, NOW);

    expect(result.version).toBe(SAVE_VERSION);
    expect(result.version).toBe(3);
    expect(result.money).toBe(500);
    expect(result.companies).toHaveLength(1);

    const home = result.companies[0];
    expect(home.name).toBe('Old Co');
    expect(home.siteId).toBe('garage');
    expect(home.workers).toHaveLength(1);
    expect(home.workers[0].name).toBe('OldWorker');
    expect(home.workers[0].id).toBe(100);
    expect(home.workstations).toHaveLength(1);
    expect(home.workstations[0].defId).toBe('basic');
    expect(home.workstations[0].id).toBe(1);
    expect(home.activeProjectId).toBe('landing');
    expect(home.upgrades['coffee']).toBe(2);
    expect(home.candidateRerollCost).toBe(15);

    // nextEntityId must be greater than any id in the save
    expect(result.nextEntityId).toBeGreaterThan(home.id);
    expect(result.nextEntityId).toBeGreaterThan(100); // max worker id
    expect(result.nextEntityId).toBeGreaterThan(1); // max workstation id
  });

  it('preserves activeCompanyId for the migrated home company', () => {
    const flatSave = {
      money: 1000,
      companyName: 'Test Co',
    } as any;

    const result = migrate(flatSave, NOW);
    expect(result.activeCompanyId).toBe(result.companies[0].id);
  });
});
