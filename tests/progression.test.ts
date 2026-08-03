import { describe, expect, it } from 'vitest';
import {
  COMPANY_COST_GROWTH,
  COMPANY_SITES,
  MENTORSHIP_SPEED_FACTOR,
  PROJECT_WORK_SCALE_EXP,
  PROJECTS,
  TRAIN_DURATION_SEC,
  UPGRADES,
  siteById,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyCompany,
  buyUpgrade,
  companyCost,
  createInitialState,
  getProject,
  globalOutputMultiplier,
  hireCost,
  projectUnlockCost,
  scaledProjectWork,
  setActiveCompany,
  siteUnderConstruction,
  tick,
  timedActionsFor,
  trainDurationSec,
  trainWorker,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
}

function makeWorker(id: number, overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id,
    name: 'Test Worker',
    tierId: 'intern',
    specialization: 'Frontend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    ...overrides,
  };
}

describe('site ladder', () => {
  it('has 8 sites with strictly increasing cost, bonus and contract scale', () => {
    expect(COMPANY_SITES).toHaveLength(8);
    for (let i = 1; i < COMPANY_SITES.length; i++) {
      const prev = COMPANY_SITES[i - 1];
      const site = COMPANY_SITES[i];
      expect(site.cost).toBeGreaterThan(prev.cost);
      expect(site.outputBonus).toBeGreaterThan(prev.outputBonus);
      expect(site.projectScale).toBeGreaterThan(prev.projectScale);
      expect(site.floorCostFactor).toBeGreaterThan(prev.floorCostFactor);
    }
  });

  it('makes each successive site at least 10x pricier than the previous', () => {
    for (let i = 2; i < COMPANY_SITES.length; i++) {
      const ratio = COMPANY_SITES[i].cost / COMPANY_SITES[i - 1].cost;
      expect(ratio).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('company cost curve', () => {
  it('charges the list price for the second company', () => {
    const state = createInitialState(NOW);
    expect(companyCost(state, 'loft')).toBe(200_000);
  });

  it('multiplies the price by COMPANY_COST_GROWTH per extra owned company', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    expect(buyCompany(state, 'loft')).toBeNull();
    completeBuild(state, 'loft');
    expect(companyCost(state, 'paloalto')).toBe(
      Math.round(siteById('paloalto').cost * COMPANY_COST_GROWTH),
    );
    expect(buyCompany(state, 'paloalto')).toBeNull();
    completeBuild(state, 'paloalto');
    expect(companyCost(state, 'campus')).toBe(
      Math.round(siteById('campus').cost * COMPANY_COST_GROWTH ** 2),
    );
  });

  it('buyCompany charges the scaled price, not the list price', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    const before = activeCountry(state).money;
    const expected = companyCost(state, 'paloalto');
    expect(buyCompany(state, 'paloalto')).toBeNull();
    completeBuild(state, 'paloalto');
    expect(before - activeCountry(state).money).toBe(expected);
  });

  it('refuses a company the player cannot afford at the scaled price', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    activeCountry(state).money = siteById('paloalto').cost; // list price, but scaled is higher
    expect(buyCompany(state, 'paloalto')).toBe('Not enough money');
  });

  it('each purchase in site order costs several times the previous one', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    let prevCharge = 0;
    for (const site of COMPANY_SITES.slice(1)) {
      const charge = companyCost(state, site.id);
      if (prevCharge > 0) expect(charge / prevCharge).toBeGreaterThanOrEqual(5);
      expect(buyCompany(state, site.id)).toBeNull();
      completeBuild(state, site.id);
      prevCharge = charge;
    }
  });
});

describe('per-site project scaling', () => {
  it('scales rewards linearly and work sub-linearly with projectScale', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'tower');
    completeBuild(state, 'tower');
    const company = activeCountry(state).companies.find((c) => c.siteId === 'tower')!;
    const scale = siteById('tower').projectScale;
    const landing = getProject(company, 'landing');
    expect(landing.currentReward).toBe(PROJECTS[0].baseReward * scale);
    expect(landing.currentWork).toBe(
      PROJECTS[0].baseWork * Math.pow(scale, PROJECT_WORK_SCALE_EXP),
    );
  });

  it('improves $/work at later sites (bigger contracts pay better)', () => {
    const garageRate = PROJECTS[0].baseReward / PROJECTS[0].baseWork;
    const scale = siteById('orbital').projectScale;
    const orbitalRate =
      (PROJECTS[0].baseReward * scale) / scaledProjectWork(PROJECTS[0].baseWork, scale);
    expect(orbitalRate).toBeGreaterThan(garageRate * 100);
  });

  it('keeps garage projects unscaled', () => {
    const state = createInitialState(NOW);
    const landing = getProject(activeCompany(state), 'landing');
    expect(landing.currentWork).toBe(PROJECTS[0].baseWork);
    expect(landing.currentReward).toBe(PROJECTS[0].baseReward);
  });

  it('scales unlock costs with the site contract scale', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'tower');
    completeBuild(state, 'tower');
    const company = activeCountry(state).companies.find((c) => c.siteId === 'tower')!;
    expect(projectUnlockCost(company, 'todo')).toBe(
      PROJECTS[1].unlockCost * siteById('tower').projectScale,
    );
  });
});

describe('company-count upgrade unlocks', () => {
  it('defines gates at 2, 3, 5 and 7 companies', () => {
    const gates = UPGRADES.filter((u) => u.requiresCompanies !== undefined).map(
      (u) => u.requiresCompanies,
    );
    expect(gates).toEqual([2, 3, 5, 7]);
  });

  it('refuses gated upgrades until enough companies are owned', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    expect(buyUpgrade(state, 'synergy')).toBe('Requires 2 companies');
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    expect(buyUpgrade(state, 'synergy')).toBeNull();
    expect(buyUpgrade(state, 'mentorship')).toBe('Requires 3 companies');
    buyCompany(state, 'paloalto');
    completeBuild(state, 'paloalto');
    expect(buyUpgrade(state, 'mentorship')).toBeNull();
    expect(buyUpgrade(state, 'talent')).toBe('Requires 5 companies');
    expect(buyUpgrade(state, 'moonshot')).toBe('Requires 7 companies');
  });

  it('synergy scales output with owned companies', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    setActiveCompany(state, activeCountry(state).companies[0].id);
    const company = activeCompany(state);
    const before = globalOutputMultiplier(state, company);
    company.upgrades['synergy'] = 1;
    const after = globalOutputMultiplier(state, company);
    expect(after / before).toBeCloseTo(1 + 0.04 * 2, 10);
  });

  it('moonshot multiplies output per level', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    const before = globalOutputMultiplier(state, company);
    company.upgrades['moonshot'] = 2;
    const after = globalOutputMultiplier(state, company);
    expect(after / before).toBeCloseTo(2, 10);
  });

  it('talent network discounts hires', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    expect(hireCost(company, 'intern')).toBe(25);
    company.upgrades['talent'] = 3;
    expect(hireCost(company, 'intern')).toBe(Math.round(25 * 0.7));
  });

  it('mentorship shortens training programs', () => {
    const state = createInitialState(NOW);
    const company = activeCompany(state);
    expect(trainDurationSec(company)).toBe(TRAIN_DURATION_SEC);
    company.upgrades['mentorship'] = 2;
    const expected = TRAIN_DURATION_SEC * MENTORSHIP_SPEED_FACTOR ** 2;
    expect(trainDurationSec(company)).toBeCloseTo(expected, 10);
    activeCountry(state).money = 10_000;
    const worker = makeWorker(999);
    company.workers.push(worker);
    expect(trainWorker(state, 999)).toBeNull();
    const timedAction = timedActionsFor(company, 999)[0];
    expect(timedAction.totalSec).toBeCloseTo(expected, 10);
  });
});

describe('migration', () => {
  it('gives migrated companies scaled states for newly added projects only', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'tower');
    completeBuild(state, 'tower');
    const company = activeCountry(state).companies.find((c) => c.siteId === 'tower')!;
    // Simulate an old save that predates the last project in data.ts.
    const savedWork = 12_345;
    company.projects = company.projects.slice(0, PROJECTS.length - 1);
    company.projects[0].currentWork = savedWork;
    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    const migratedCompany = activeCountry(migrated).companies.find((c) => c.siteId === 'tower')!;
    expect(migratedCompany.projects).toHaveLength(PROJECTS.length);
    // Existing progress untouched, new entry scaled to the site.
    expect(migratedCompany.projects[0].currentWork).toBe(savedWork);
    const added = migratedCompany.projects[PROJECTS.length - 1];
    const scale = siteById('tower').projectScale;
    expect(added.currentReward).toBe(PROJECTS[PROJECTS.length - 1].baseReward * scale);
  });

  it('keeps pre-update saves loading with the new sites present', () => {
    const state = createInitialState(NOW);
    const raw = JSON.parse(JSON.stringify(state));
    delete raw.countries[0].companies[0].siteId;
    const migrated = migrate(raw, NOW);
    expect(activeCountry(migrated).companies[0].siteId).toBe('garage');
  });
});
