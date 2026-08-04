// ---------------------------------------------------------------------------
// Next-best-action hint (the Gabriel goal chip). Pure derivation over the
// ACTIVE country/company: collect every sensible progression step with its
// cash cost, then suggest the cheapest affordable one — or, when nothing is
// affordable, the cheapest step overall as a save-up target. The UI only
// translates and displays; all judgement lives here so it stays testable.
// ---------------------------------------------------------------------------

import { COUNTRIES, MAX_FLOORS, UPGRADES, WORKSTATIONS, projectDefById, siteById } from './data';
import {
  activeCompany,
  activeCountry,
  availableSites,
  companyCost,
  countryUnlockCost,
  deskCapacity,
  floorCost,
  floorUnderConstruction,
  hireCost,
  projectUnlockCost,
  stationCost,
  upgradeCost,
  upgradeCompanyRequirement,
  walletMoney,
  worldUnlocked,
} from './engine';
import type { GameState } from './types';

export type GoalKind =
  | 'hire'
  | 'desk'
  | 'unlock-project'
  | 'upgrade'
  | 'floor'
  | 'company'
  | 'country';

export interface GoalHint {
  kind: GoalKind;
  /** Cash price of the step, from the active country's wallet. */
  cost: number;
  /** The wallet covers the cost right now. */
  affordable: boolean;
  /** Tab where the step is performed. */
  tab: 'team' | 'office' | 'projects' | 'upgrades' | 'map';
  /** Display name from the data defs (project/upgrade/site), if any. */
  targetName?: string;
}

type GoalStep = Omit<GoalHint, 'affordable'>;

/** The suggested next step, or null before the tutorial ends / at endgame. */
export function nextGoalHint(state: GameState): GoalHint | null {
  if (!state.tutorial.done) return null;
  const country = activeCountry(state);
  const company = activeCompany(state);
  const steps: GoalStep[] = [];

  const unseated = company.workers.filter((w) => w.stationId === null).length;
  const desks = company.workstations.length;
  const capacity = deskCapacity(company);

  // A desk for an idle employee (cheapest station type).
  if (unseated > 0 && desks < capacity) {
    const cost = Math.min(...WORKSTATIONS.map((d) => stationCost(company, d.id)));
    steps.push({ kind: 'desk', cost, tab: 'office' });
  }

  // A hire while a desk sits empty and a candidate is on the board.
  if (company.candidates.length > 0 && desks > company.workers.length) {
    const cost = Math.min(...company.candidates.map((c) => hireCost(company, c.tierId)));
    steps.push({ kind: 'hire', cost, tab: 'office' });
  }

  // The cheapest locked project of this company.
  let projectStep: GoalStep | null = null;
  for (const p of company.projects) {
    if (p.unlocked) continue;
    const cost = projectUnlockCost(company, p.defId);
    if (!projectStep || cost < projectStep.cost) {
      projectStep = {
        kind: 'unlock-project',
        cost,
        tab: 'office',
        targetName: projectDefById(p.defId).name,
      };
    }
  }
  if (projectStep) steps.push(projectStep);

  // The cheapest next level of a visible cash upgrade.
  let upgradeStep: GoalStep | null = null;
  for (const def of UPGRADES) {
    if (def.vsCoinCost !== undefined) continue; // premium — not a cash goal
    if ((company.upgrades[def.id] ?? 0) >= def.maxLevel) continue;
    if (country.companies.length < upgradeCompanyRequirement(def.id)) continue;
    const cost = upgradeCost(company, def.id);
    if (!upgradeStep || cost < upgradeStep.cost) {
      upgradeStep = { kind: 'upgrade', cost, tab: 'office', targetName: def.name };
    }
  }
  if (upgradeStep) steps.push(upgradeStep);

  // A new floor once every desk slot is used up.
  if (desks >= capacity && company.floors < MAX_FLOORS && !floorUnderConstruction(company)) {
    steps.push({ kind: 'floor', cost: floorCost(company), tab: 'office' });
  }

  // The cheapest open site in this city.
  let siteStep: GoalStep | null = null;
  for (const siteId of availableSites(state)) {
    const cost = companyCost(state, siteId);
    if (!siteStep || cost < siteStep.cost) {
      siteStep = { kind: 'company', cost, tab: 'map', targetName: siteById(siteId).name };
    }
  }
  if (siteStep) steps.push(siteStep);

  // International expansion.
  if (worldUnlocked(state) && state.countries.length < COUNTRIES.length) {
    steps.push({ kind: 'country', cost: countryUnlockCost(state), tab: 'map' });
  }

  if (steps.length === 0) return null;
  steps.sort((a, b) => a.cost - b.cost);
  const money = walletMoney(state);
  const chosen = steps.find((s) => s.cost <= money) ?? steps[0];
  return { ...chosen, affordable: chosen.cost <= money };
}
