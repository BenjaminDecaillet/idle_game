import { describe, expect, it } from 'vitest';
import { COMPANY_SITES, WORKSTATIONS, tierById } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyCompany,
  buyFloor,
  buyUpgrade,
  buyWorkstation,
  companyCost,
  createInitialState,
  deskCapacity,
  floorCost,
  hireCost,
  hireWorker,
  setActiveCompany,
  stationCost,
  tick,
  unlockProject,
  upgradeCost,
  projectUnlockCost,
} from '../src/game/engine';
import type { GameState } from '../src/game/types';

/**
 * Balance simulation harness (docs/balance.md Phase H): a greedy bot playing through tick() only, recording time-to-milestone.
 *
 * Always-on: loose pacing guards that fail CI when a data.ts change breaks
 * the intended curve. Opt-in tables: BALANCE_SIM=1 npm run balance:sim
 * prints the full milestone table for tuning sessions.
 *
 * The bot deliberately skips training/promotions/events (builder-occupied
 * flows) — it measures the buy/hire/expand spine, which is what the curve
 * targets in balance.md describe.
 */

const NOW = 1_700_000_000_000;
/** Decision cadence and tick chunk, in simulated seconds. */
const STEP = 5;
/** Hard stop: 4 simulated days. */
const MAX_SIM_SEC = 4 * 24 * 3600;

interface Milestones {
  secondCompanySec: number | null;
  fourthCompanySec: number | null;
  earned1e6Sec: number | null;
  earned1e9Sec: number | null;
  desks20Sec: number | null;
}

function greedyStep(state: GameState): void {
  const country = activeCountry(state);
  const company = activeCompany(state);

  // 1. Keep a small cash upgrade habit (coffee only — the cheap early curve).
  if ((company.upgrades['coffee'] ?? 0) < 5) {
    const cost = upgradeCost(company, 'coffee');
    if (country.money > cost * 4) buyUpgrade(state, 'coffee');
  }

  // 2. Unlock the next project when it is a rounding error of the wallet.
  for (const p of company.projects) {
    if (!p.unlocked) {
      const cost = projectUnlockCost(company, p.defId);
      if (country.money > cost * 3) unlockProject(state, p.defId);
      break;
    }
  }

  // 3. Desks before hires; floors when full; hire onto free desks. The bot
  // buys the BEST desk it can cushion and the strongest affordable
  // candidate — mirroring the play style the balance targets assume.
  const desks = company.workstations.length;
  if (desks < deskCapacity(company)) {
    for (let w = WORKSTATIONS.length - 1; w >= 0; w--) {
      const def = WORKSTATIONS[w];
      if (country.money >= stationCost(company, def.id) * 2) {
        buyWorkstation(state, def.id);
        break;
      }
    }
  } else if (country.money >= floorCost(company) * 2) {
    buyFloor(state);
  }
  if (company.workers.length < company.workstations.length && company.candidates.length > 0) {
    // The first hire is the income engine — take it at face value; later
    // hires keep a cash cushion.
    const margin = company.workers.length === 0 ? 1 : 1.5;
    let idx = -1;
    let bestRate = -1;
    for (let i = 0; i < company.candidates.length; i++) {
      const cand = company.candidates[i];
      const tier = tierById(cand.tierId);
      if (country.money >= hireCost(company, cand.tierId) * margin && tier.baseRate > bestRate) {
        bestRate = tier.baseRate;
        idx = i;
      }
    }
    if (idx >= 0) hireWorker(state, idx);
  }

  // 4. Found the next site when the wallet dwarfs the price.
  const owned = new Set(country.companies.map((c) => c.siteId));
  const nextSite = COMPANY_SITES.find((s) => !owned.has(s.id));
  if (nextSite) {
    const cost = companyCost(state, nextSite.id);
    if (country.money > cost * 1.5) buyCompany(state, nextSite.id);
  }

  // 5. Manage the youngest company (it needs the attention most).
  const youngest = country.companies[country.companies.length - 1];
  if (youngest && youngest.id !== country.activeCompanyId) {
    const y = youngest;
    if (y.workers.length < y.workstations.length || y.workstations.length < deskCapacity(y)) {
      setActiveCompany(state, y.id);
    }
  }
}

function runBot(): { m: Milestones; state: GameState } {
  const state = createInitialState(NOW);
  state.tutorial.done = true; // the bot plays the live game, not the intro
  const m: Milestones = {
    secondCompanySec: null,
    fourthCompanySec: null,
    earned1e6Sec: null,
    earned1e9Sec: null,
    desks20Sec: null,
  };
  for (let sec = 0; sec < MAX_SIM_SEC; sec += STEP) {
    greedyStep(state);
    tick(state, STEP);
    const country = activeCountry(state);
    const desks = country.companies.reduce((sum, c) => sum + c.workstations.length, 0);
    if (m.secondCompanySec === null && country.companies.length >= 2) m.secondCompanySec = sec;
    if (m.fourthCompanySec === null && country.companies.length >= 4) m.fourthCompanySec = sec;
    if (m.earned1e6Sec === null && state.totalEarned >= 1e6) m.earned1e6Sec = sec;
    if (m.earned1e9Sec === null && state.totalEarned >= 1e9) m.earned1e9Sec = sec;
    if (m.desks20Sec === null && desks >= 20) m.desks20Sec = sec;
  }
  return { m, state };
}

const fmt = (sec: number | null): string =>
  sec === null ? '— (not reached)' : `${(sec / 60).toFixed(0)} min (${(sec / 3600).toFixed(1)} h)`;

describe('balance harness (greedy bot through tick)', () => {
  const { m, state } = runBot();

  if (process.env.BALANCE_SIM) {
    it('prints the time-to-milestone table', () => {
      // eslint-disable-next-line no-console
      console.log(
        [
          '',
          '=== Balance harness — greedy bot, 4 simulated days ===',
          `second company (loft):  ${fmt(m.secondCompanySec)}`,
          `fourth company:         ${fmt(m.fourthCompanySec)}`,
          `total earned ≥ $1M:     ${fmt(m.earned1e6Sec)}`,
          `total earned ≥ $1B:     ${fmt(m.earned1e9Sec)}`,
          `20 desks (all cos):     ${fmt(m.desks20Sec)}`,
          `final: $${state.totalEarned.toExponential(2)} earned, ` +
            `${activeCountry(state).companies.length} companies`,
          '',
        ].join('\n'),
      );
      expect(true).toBe(true);
    });
  }

  // Regression guards anchored on the MEASURED bot curve (~10 h to the
  // second company, ~60 h to four companies as of Phase H) with ~2× slack.
  // The bot skips training/promotions, so it runs well behind the
  // balance.md human-assumption targets — these guards catch a data.ts
  // change that wrecks the curve, they do not enforce the aspirational
  // pacing (see docs/balance.md Phase H).
  it('reaches the second company within a simulated day', () => {
    expect(m.secondCompanySec).not.toBeNull();
    expect(m.secondCompanySec!).toBeLessThan(24 * 3600);
  });

  it('earns the first $1M within a simulated day', () => {
    expect(m.earned1e6Sec).not.toBeNull();
    expect(m.earned1e6Sec!).toBeLessThan(24 * 3600);
  });

  it('keeps expanding: 4 companies inside 4 simulated days', () => {
    expect(m.fourthCompanySec).not.toBeNull();
  });

  it('never bankrupts itself into an unrecoverable hole', () => {
    // The debt clamp guarantees recoverability; the bot must end cash-positive.
    expect(activeCountry(state).money).toBeGreaterThan(0);
  });
});
