import { describe, expect, it } from 'vitest';
import {
  activeBoost,
  activeCompany,
  activeCountry,
  buyWorkstation,
  createInitialState,
  globalOutputMultiplier,
  grantBoost,
  tick,
  timeSkip,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { GameState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function stateWithTeam(): GameState {
  const state = createInitialState(NOW);
  const c = activeCompany(state);
  activeCountry(state).money = 1_000;
  c.workers.push({
    id: state.nextEntityId++,
    name: 'Test Dev',
    tierId: 'junior',
    specialization: 'Backend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    traits: [],
  });
  buyWorkstation(state, 'basic');
  return state;
}

describe('boosts (monetization groundwork)', () => {
  it('grantBoost multiplies global output and shows in activeBoost', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(activeBoost(state)).toBeNull();
    expect(grantBoost(state, 2, 60, 'ad')).toBeNull();
    expect(globalOutputMultiplier(state, c)).toBe(2);
    expect(activeBoost(state)).toEqual({ mult: 2, remainingSec: 60 });
  });

  it('re-granting from the same source extends instead of stacking', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    grantBoost(state, 2, 60, 'ad');
    grantBoost(state, 2, 60, 'ad');
    expect(state.boosts).toHaveLength(1);
    expect(state.boosts[0].remainingSec).toBe(120);
    expect(globalOutputMultiplier(state, c)).toBe(2);
  });

  it('rejects invalid boosts and caps the number of concurrent sources', () => {
    const state = createInitialState(NOW);
    expect(grantBoost(state, 1, 60, 'x')).toBe('error.invalidBoost');
    expect(grantBoost(state, 2, 0, 'x')).toBe('error.invalidBoost');
    for (let i = 0; i < 5; i++) expect(grantBoost(state, 2, 60, `s${i}`)).toBeNull();
    expect(grantBoost(state, 2, 60, 'one-too-many')).toBe('error.tooManyBoosts');
  });

  it('boosted ticks generate proportionally more work, then the boost expires', () => {
    const plain = stateWithTeam();
    const boosted = stateWithTeam();
    grantBoost(boosted, 2, 100, 'iap');

    tick(plain, 10);
    tick(boosted, 10);
    const plainC = activeCompany(plain);
    const boostedC = activeCompany(boosted);
    const progressPlain = plainC.projects[0].progress;
    const progressBoosted = boostedC.projects[0].progress;
    expect(progressBoosted).toBeCloseTo(progressPlain * 2, 6);
    expect(boosted.boosts[0].remainingSec).toBeCloseTo(90, 6);

    tick(boosted, 100);
    expect(boosted.boosts).toHaveLength(0);
    expect(globalOutputMultiplier(boosted, boostedC)).toBe(1);
  });

  it('a boost expiring mid-tick only covers its remaining fraction', () => {
    const plain = stateWithTeam();
    const boosted = stateWithTeam();
    grantBoost(boosted, 3, 5, 'ad'); // 3x for 5s of a 10s tick

    tick(plain, 10);
    tick(boosted, 10);
    // 5s at 3x + 5s at 1x = 20 rate-seconds vs 10 plain.
    const plainC = activeCompany(plain);
    const boostedC = activeCompany(boosted);
    expect(boostedC.projects[0].progress).toBeCloseTo(plainC.projects[0].progress * 2, 6);
    expect(boosted.boosts).toHaveLength(0);
  });

  it('old saves without boosts migrate to an empty boosts array', () => {
    const state = createInitialState(NOW);
    const legacy = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
    delete (legacy as Record<string, unknown>).boosts;
    const migrated = migrate(legacy, NOW);
    expect(migrated.boosts).toEqual([]);
  });
});

describe('timeSkip (monetization groundwork)', () => {
  it('earns the same as playing the equivalent time live', () => {
    const live = stateWithTeam();
    const skipped = stateWithTeam();

    for (let i = 0; i < 10; i++) tick(live, 60);
    const earned = timeSkip(skipped, 600);

    expect(skipped.totalEarned).toBeCloseTo(live.totalEarned, 6);
    expect(earned).toBeCloseTo(live.totalEarned, 6);
    expect(activeCountry(skipped).money).toBeCloseTo(activeCountry(live).money, 6);
  });

  it('returns 0 for non-positive durations', () => {
    const state = stateWithTeam();
    expect(timeSkip(state, 0)).toBe(0);
    expect(timeSkip(state, -5)).toBe(0);
  });
});
