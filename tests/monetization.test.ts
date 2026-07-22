import { describe, expect, it } from 'vitest';
import {
  activeBoost,
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
  state.money = 1_000;
  state.workers.push({
    id: state.nextEntityId++,
    name: 'Test Dev',
    tierId: 'junior',
    specialization: 'Backend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
  });
  buyWorkstation(state, 'basic');
  return state;
}

describe('boosts (monetization groundwork)', () => {
  it('grantBoost multiplies global output and shows in activeBoost', () => {
    const state = createInitialState(NOW);
    expect(activeBoost(state)).toBeNull();
    expect(grantBoost(state, 2, 60, 'ad')).toBeNull();
    expect(globalOutputMultiplier(state)).toBe(2);
    expect(activeBoost(state)).toEqual({ mult: 2, remainingSec: 60 });
  });

  it('re-granting from the same source extends instead of stacking', () => {
    const state = createInitialState(NOW);
    grantBoost(state, 2, 60, 'ad');
    grantBoost(state, 2, 60, 'ad');
    expect(state.boosts).toHaveLength(1);
    expect(state.boosts[0].remainingSec).toBe(120);
    expect(globalOutputMultiplier(state)).toBe(2);
  });

  it('rejects invalid boosts and caps the number of concurrent sources', () => {
    const state = createInitialState(NOW);
    expect(grantBoost(state, 1, 60, 'x')).toBe('Invalid boost');
    expect(grantBoost(state, 2, 0, 'x')).toBe('Invalid boost');
    for (let i = 0; i < 5; i++) expect(grantBoost(state, 2, 60, `s${i}`)).toBeNull();
    expect(grantBoost(state, 2, 60, 'one-too-many')).toBe('Too many active boosts');
  });

  it('boosted ticks generate proportionally more work, then the boost expires', () => {
    const plain = stateWithTeam();
    const boosted = stateWithTeam();
    grantBoost(boosted, 2, 100, 'iap');

    tick(plain, 10);
    tick(boosted, 10);
    const progressPlain = plain.projects[0].progress;
    const progressBoosted = boosted.projects[0].progress;
    expect(progressBoosted).toBeCloseTo(progressPlain * 2, 6);
    expect(boosted.boosts[0].remainingSec).toBeCloseTo(90, 6);

    tick(boosted, 100);
    expect(boosted.boosts).toHaveLength(0);
    expect(globalOutputMultiplier(boosted)).toBe(1);
  });

  it('a boost expiring mid-tick only covers its remaining fraction', () => {
    const plain = stateWithTeam();
    const boosted = stateWithTeam();
    grantBoost(boosted, 3, 5, 'ad'); // 3x for 5s of a 10s tick

    tick(plain, 10);
    tick(boosted, 10);
    // 5s at 3x + 5s at 1x = 20 rate-seconds vs 10 plain.
    expect(boosted.projects[0].progress).toBeCloseTo(plain.projects[0].progress * 2, 6);
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
    expect(skipped.money).toBeCloseTo(live.money, 6);
  });

  it('returns 0 for non-positive durations', () => {
    const state = stateWithTeam();
    expect(timeSkip(state, 0)).toBe(0);
    expect(timeSkip(state, -5)).toBe(0);
  });
});
