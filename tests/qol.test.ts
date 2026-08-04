import { describe, expect, it } from 'vitest';
import {
  MARKETING_COST_SEC,
  MARKETING_DURATION_SEC,
  MARKETING_MIN_COST,
  MARKETING_MULT,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyMarketingCampaign,
  buyWorkstation,
  createInitialState,
  grossRewardRate,
  marketingCost,
  setTimeScale,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function seatedWorker(id: number): WorkerState {
  return {
    id,
    name: 'Test Dev',
    tierId: 'junior',
    specialization: 'Backend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
  };
}

describe('time scale toggle', () => {
  it('accepts only 1, 2 and 4', () => {
    const state = createInitialState(NOW);
    expect(setTimeScale(state, 2)).toBeNull();
    expect(state.settings.timeScale).toBe(2);
    expect(setTimeScale(state, 4)).toBeNull();
    expect(setTimeScale(state, 1)).toBeNull();
    expect(setTimeScale(state, 3)).toBe('error.invalidSpeed');
    expect(state.settings.timeScale).toBe(1);
  });

  it('migration resets a corrupt timeScale to 1 and defaults old saves', () => {
    const state = createInitialState(NOW);
    const parsed = JSON.parse(JSON.stringify(state));
    parsed.settings.timeScale = 99;
    expect(migrate(parsed, NOW).settings.timeScale).toBe(1);
    delete parsed.settings.timeScale;
    expect(migrate(parsed, NOW).settings.timeScale).toBe(1);
  });
});

describe('marketing campaign', () => {
  it('costs the minimum with no income, else ~MARKETING_COST_SEC of gross income', () => {
    const state = createInitialState(NOW);
    expect(grossRewardRate(state)).toBe(0);
    expect(marketingCost(state)).toBe(MARKETING_MIN_COST);

    activeCountry(state).money = 1_000_000;
    buyWorkstation(state, 'basic');
    activeCompany(state).workers.push(seatedWorker(9001));
    autoSeat(activeCompany(state));
    const gross = grossRewardRate(state);
    expect(gross).toBeGreaterThan(0);
    expect(marketingCost(state)).toBe(
      Math.max(MARKETING_MIN_COST, Math.round(gross * MARKETING_COST_SEC)),
    );
  });

  it('deducts the cost and grants an extendable boost', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = MARKETING_MIN_COST * 2;

    expect(buyMarketingCampaign(state)).toBeNull();
    expect(activeCountry(state).money).toBe(MARKETING_MIN_COST);
    const boost = state.boosts.find((b) => b.source === 'marketing');
    expect(boost).toBeDefined();
    expect(boost!.mult).toBe(MARKETING_MULT);
    expect(boost!.remainingSec).toBe(MARKETING_DURATION_SEC);

    // Re-buying extends the same boost instead of stacking a second one.
    expect(buyMarketingCampaign(state)).toBeNull();
    expect(activeCountry(state).money).toBe(0);
    expect(state.boosts.filter((b) => b.source === 'marketing')).toHaveLength(1);
    expect(boost!.remainingSec).toBe(2 * MARKETING_DURATION_SEC);

    expect(buyMarketingCampaign(state)).toBe('error.notEnoughMoney');
  });
});
