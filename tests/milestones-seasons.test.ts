import { describe, expect, it } from 'vitest';
import {
  SEASON_BOOM_SPEC_MULT,
  SEASON_CRUNCH_MULT,
  SEASON_LENGTH_SEC,
  SEASON_RECOVERY_MULT,
  SPECIALIZATIONS,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  companyIncome,
  companyMilestoneMult,
  createInitialState,
  currentSeason,
  getProject,
  globalOutputMultiplier,
  nextMilestoneStep,
  seasonPayoutMult,
  tick,
} from '../src/game/engine';
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
    timesTrained: 0,
    promotions: 0,
    traits: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MILESTONES
// ---------------------------------------------------------------------------

describe('companyMilestoneMult — fresh company (0 desks, 0 workers)', () => {
  it('returns 1 with no workstations or workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(c.workstations).toHaveLength(0);
    expect(c.workers).toHaveLength(0);
    expect(companyMilestoneMult(c)).toBe(1);
  });
});

describe('companyMilestoneMult — single track (desks or workers)', () => {
  it('returns 1.05 (first milestone bonus) at exactly 8 desks', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 8; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    expect(c.workstations).toHaveLength(8);
    expect(c.workers).toHaveLength(0);
    // Single track: 1 + 0.05 = 1.05
    expect(companyMilestoneMult(c)).toBeCloseTo(1.05, 10);
  });

  it('returns 1.05 (first milestone bonus) at exactly 8 workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 8; i++) {
      c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    }
    expect(c.workstations).toHaveLength(0);
    expect(c.workers).toHaveLength(8);
    // Single track: 1 + 0.05 = 1.05
    expect(companyMilestoneMult(c)).toBeCloseTo(1.05, 10);
  });

  it('returns 1.15 (first + second milestones) at 16 desks', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 16; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    // Single track: 1 + 0.05 + 0.1 = 1.15
    expect(companyMilestoneMult(c)).toBeCloseTo(1.15, 10);
  });

  it('returns 1.30 (all three milestones) at 32 desks', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 32; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    // Single track: 1 + 0.05 + 0.1 + 0.15 = 1.30
    expect(companyMilestoneMult(c)).toBeCloseTo(1.30, 10);
  });
});

describe('companyMilestoneMult — both tracks (desks AND workers)', () => {
  it('returns 1.05² at 8 desks + 8 workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 8; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
      c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    }
    // Both tracks: (1 + 0.05) * (1 + 0.05) = 1.1025
    expect(companyMilestoneMult(c)).toBeCloseTo(1.05 * 1.05, 10);
  });

  it('returns 1.30 × 1.30 at full ladder (32 desks + 32 workers)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 32; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
      c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    }
    // Both tracks: 1.30 * 1.30 = 1.69
    expect(companyMilestoneMult(c)).toBeCloseTo(1.30 * 1.30, 10);
  });

  it('returns 1.15 × 1.05 at 16 desks + 8 workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    for (let i = 0; i < 16; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    for (let i = 0; i < 8; i++) {
      c.workers.push(makeWorker({ id: state.nextEntityId++ }));
    }
    // Desks: 1 + 0.05 + 0.1 = 1.15
    // Workers: 1 + 0.05 = 1.05 (only first milestone crossed)
    expect(companyMilestoneMult(c)).toBeCloseTo(1.15 * 1.05, 10);
  });
});

describe('nextMilestoneStep', () => {
  it('returns 8 for count 0', () => {
    expect(nextMilestoneStep(0)).toBe(8);
  });

  it('returns 8 for count 7', () => {
    expect(nextMilestoneStep(7)).toBe(8);
  });

  it('returns 16 for count 8', () => {
    expect(nextMilestoneStep(8)).toBe(16);
  });

  it('returns 16 for count 15', () => {
    expect(nextMilestoneStep(15)).toBe(16);
  });

  it('returns 32 for count 16', () => {
    expect(nextMilestoneStep(16)).toBe(32);
  });

  it('returns 32 for count 31', () => {
    expect(nextMilestoneStep(31)).toBe(32);
  });

  it('returns null for count 32', () => {
    expect(nextMilestoneStep(32)).toBeNull();
  });

  it('returns null for count 100 (ladder complete)', () => {
    expect(nextMilestoneStep(100)).toBeNull();
  });
});

describe('Milestone multiplier in workerRate', () => {
  it('companyMilestoneMult is factored into globalOutputMultiplier', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    // Fresh company: no desks, no workers
    const mult0 = companyMilestoneMult(c);
    expect(mult0).toBe(1); // no milestones crossed
    const globalMult0 = globalOutputMultiplier(state, c);

    // Add 8 desks (cross first milestone)
    for (let i = 0; i < 8; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    const mult8 = companyMilestoneMult(c);
    expect(mult8).toBeCloseTo(1.05, 10); // first milestone crossed
    const globalMult8 = globalOutputMultiplier(state, c);

    // The global multiplier should increase by the same factor as the milestone multiplier
    const milestoneRatio = mult8 / mult0;
    const globalRatio = globalMult8 / globalMult0;
    expect(globalRatio).toBeCloseTo(milestoneRatio, 5);
  });

  it('globalOutputMultiplier includes companyMilestoneMult as a factor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // Measure global multiplier without any desks
    const mult0 = globalOutputMultiplier(state, c);
    const milestone0 = companyMilestoneMult(c);

    // Add 8 desks
    for (let i = 0; i < 8; i++) {
      c.workstations.push({ id: state.nextEntityId++, defId: 'basic' });
    }
    const mult8 = globalOutputMultiplier(state, c);
    const milestone8 = companyMilestoneMult(c);

    // The ratio of global multipliers should match the ratio of milestone multipliers
    // (all other factors remain constant)
    expect(mult8 / mult0).toBeCloseTo(milestone8 / milestone0, 5);
  });
});

// ---------------------------------------------------------------------------
// SEASONS
// ---------------------------------------------------------------------------

describe('currentSeason', () => {
  it('returns stable at playTimeSec 0', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = 0;
    const season = currentSeason(state);
    expect(season.id).toBe('stable');
  });

  it('returns boom at playTimeSec 21600 (one SEASON_LENGTH_SEC)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC;
    const season = currentSeason(state);
    expect(season.id).toBe('boom');
  });

  it('returns crunch at playTimeSec 43200 (two SEASON_LENGTH_SEC)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 2;
    const season = currentSeason(state);
    expect(season.id).toBe('crunch');
  });

  it('returns recovery at playTimeSec 64800 (three SEASON_LENGTH_SEC)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 3;
    const season = currentSeason(state);
    expect(season.id).toBe('recovery');
  });

  it('wraps back to stable at playTimeSec 86400 (four SEASON_LENGTH_SEC)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 4; // one full cycle
    const season = currentSeason(state);
    expect(season.id).toBe('stable');
  });

  it('rotates boomSpec per cycle (cycle 0 = spec 0, cycle 1 = spec 1)', () => {
    const state = createInitialState(NOW);

    // Cycle 0, boom season (idx=1): boomSpec = SPECIALIZATIONS[0]
    state.playTimeSec = SEASON_LENGTH_SEC * 1;
    const cycleBoom0 = currentSeason(state);
    expect(cycleBoom0.id).toBe('boom');
    expect(cycleBoom0.boomSpec).toBe(SPECIALIZATIONS[0]);

    // Cycle 1, boom season (idx=1 + 4): boomSpec = SPECIALIZATIONS[1]
    state.playTimeSec = SEASON_LENGTH_SEC * (1 + 4);
    const cycleBoom1 = currentSeason(state);
    expect(cycleBoom1.id).toBe('boom');
    expect(cycleBoom1.boomSpec).toBe(SPECIALIZATIONS[1]);
  });

  it('calculates remainingSec correctly', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 0.5; // halfway through stable
    const season = currentSeason(state);
    expect(season.remainingSec).toBeCloseTo(SEASON_LENGTH_SEC * 0.5, 10);
  });
});

describe('seasonPayoutMult', () => {
  it('returns 1.6 for boom + favored spec, 1 otherwise', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 1; // boom season
    const season = currentSeason(state);
    expect(season.id).toBe('boom');
    const favoredSpec = season.boomSpec;

    const multFavored = seasonPayoutMult(state, favoredSpec);
    expect(multFavored).toBe(SEASON_BOOM_SPEC_MULT);

    // Test all other specs
    for (const spec of SPECIALIZATIONS) {
      if (spec === favoredSpec) continue;
      const multOther = seasonPayoutMult(state, spec);
      expect(multOther).toBe(1);
    }
  });

  it('returns 0.8 for crunch (all specs)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 2; // crunch season
    const season = currentSeason(state);
    expect(season.id).toBe('crunch');

    for (const spec of SPECIALIZATIONS) {
      const mult = seasonPayoutMult(state, spec);
      expect(mult).toBe(SEASON_CRUNCH_MULT);
    }
  });

  it('returns 1.05 for recovery (all specs)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 3; // recovery season
    const season = currentSeason(state);
    expect(season.id).toBe('recovery');

    for (const spec of SPECIALIZATIONS) {
      const mult = seasonPayoutMult(state, spec);
      expect(mult).toBe(SEASON_RECOVERY_MULT);
    }
  });

  it('returns 1 for stable (all specs)', () => {
    const state = createInitialState(NOW);
    state.playTimeSec = SEASON_LENGTH_SEC * 0; // stable season
    const season = currentSeason(state);
    expect(season.id).toBe('stable');

    for (const spec of SPECIALIZATIONS) {
      const mult = seasonPayoutMult(state, spec);
      expect(mult).toBe(1);
    }
  });
});

describe('Payout application — season multiplier affects income rate', () => {
  it('income rate in boom with favored spec is higher than stable', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    buyWorkstation(state, 'basic');
    // Set worker to Frontend which is the landing project spec
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Measure income in stable season
    state.playTimeSec = 0; // stable
    const stableIncome = companyIncome(state, c);
    expect(stableIncome).toBeGreaterThan(0);

    // Measure income in boom season
    // In cycle 0, boom spec is SPECIALIZATIONS[0] which is 'Frontend'
    state.playTimeSec = SEASON_LENGTH_SEC * 1; // boom
    const boomSeason = currentSeason(state);
    expect(boomSeason.id).toBe('boom');
    expect(boomSeason.boomSpec).toBe('Frontend'); // Landing project is Frontend

    // Boom income should be higher since the landing project is the favored spec
    const boomIncome = companyIncome(state, c);
    expect(boomIncome).toBeGreaterThan(stableIncome);

    // The ratio includes both the season multiplier and the salary offset
    // Income ratio = (1.6 * rewardRate - salary) / (rewardRate - salary)
    // With junior tier, this ratio ends up being higher than 1.6
    const ratioCheck = boomIncome / stableIncome;
    expect(ratioCheck).toBeGreaterThan(SEASON_BOOM_SPEC_MULT);
  });

  it('income rate in crunch is ~0.8x vs stable', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Stable income
    state.playTimeSec = 0; // stable
    const stableIncome = companyIncome(state, c);

    // Crunch income
    state.playTimeSec = SEASON_LENGTH_SEC * 2; // crunch
    const crunchIncome = companyIncome(state, c);

    // Income should be 0.8x
    expect(crunchIncome).toBeLessThan(stableIncome);
    expect(crunchIncome / stableIncome).toBeCloseTo(SEASON_CRUNCH_MULT, 1);
  });

  it('income rate in recovery is ~1.05x vs stable', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Stable income
    state.playTimeSec = 0; // stable
    const stableIncome = companyIncome(state, c);

    // Recovery income
    state.playTimeSec = SEASON_LENGTH_SEC * 3; // recovery
    const recoveryIncome = companyIncome(state, c);

    // Income should be 1.05x
    expect(recoveryIncome).toBeGreaterThan(stableIncome);
    expect(recoveryIncome / stableIncome).toBeCloseTo(SEASON_RECOVERY_MULT, 1);
  });
});

describe('Project currentReward is NOT scaled by seasons', () => {
  it('currentReward grows at the same rate regardless of season', () => {
    // Complete a project in stable season
    const stableState = createInitialState(NOW);
    const stableCompany = activeCompany(stableState);
    const stableCountry = activeCountry(stableState);
    stableCountry.money = 100000;
    stableState.playTimeSec = 0; // stable

    buyWorkstation(stableState, 'basic');
    const stableWorker = makeWorker({ id: stableState.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    stableCompany.workers.push(stableWorker);
    autoSeat(stableCompany);

    const stableLandingBefore = getProject(stableCompany, 'landing');
    const stableRewardBefore = stableLandingBefore.currentReward;

    // Tick enough to complete the project at least once
    tick(stableState, 50);
    const stableLandingAfter = getProject(stableCompany, 'landing');
    const stableRewardAfter = stableLandingAfter.currentReward;

    // Complete a project in boom season
    const boomState = createInitialState(NOW);
    const boomCompany = activeCompany(boomState);
    const boomCountry = activeCountry(boomState);
    boomCountry.money = 100000;
    boomState.playTimeSec = SEASON_LENGTH_SEC * 1; // boom

    buyWorkstation(boomState, 'basic');
    const boomWorker = makeWorker({ id: boomState.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    boomCompany.workers.push(boomWorker);
    autoSeat(boomCompany);

    const boomLandingBefore = getProject(boomCompany, 'landing');
    const boomRewardBefore = boomLandingBefore.currentReward;

    // Tick enough to complete the project at least once
    tick(boomState, 50);
    const boomLandingAfter = getProject(boomCompany, 'landing');
    const boomRewardAfter = boomLandingAfter.currentReward;

    // Both should have the same reward growth factor applied
    // (Season multiplier affects PAYOUT, not the soft-cap currentReward scaling)
    const stableGrowthFactor = stableRewardAfter / stableRewardBefore;
    const boomGrowthFactor = boomRewardAfter / boomRewardBefore;

    // Growth factor should be the same (both complete at least once)
    expect(stableGrowthFactor).toBeCloseTo(boomGrowthFactor, 4);
  });
});

describe('Cycle mean = 1.0', () => {
  it('arithmetic check: (1 + 0.25*1.6 + 0.75 + 0.8 + 1.05) / 4 === 1', () => {
    // One full cycle: stable, boom, crunch, recovery
    // SEASON_ORDER = ['stable', 'boom', 'crunch', 'recovery']
    const stableMult = 1; // stable multiplier
    const boomMult = SEASON_BOOM_SPEC_MULT; // 1.6 (25% of cycle)
    const crunchMult = SEASON_CRUNCH_MULT; // 0.8
    const recoveryMult = SEASON_RECOVERY_MULT; // 1.05

    // Cycle mean: each season is 1/4 of the cycle, but boom is only 1/4 of the year
    // and it only applies to 25% of projects (one spec favored out of ~4 specs)
    // So effective boom contribution: 1.6 for one spec, 1 for others = average 1.6/4 + 3/4 = 1 + 0.15 = 1.15
    // Wait, re-reading: boom favors ONE spec with 1.6×, others get 1×
    // Average over all projects: (1 spec × 1.6 + 3 specs × 1) / 4 = (1.6 + 3) / 4 = 1.15
    // So cycle mean = (1 + 1.15 + 0.8 + 1.05) / 4 = 4 / 4 = 1

    const cycleMean = (stableMult + boomMult * 0.25 + 0.75 + crunchMult + recoveryMult) / 4;
    expect(cycleMean).toBeCloseTo(1.0, 10);
  });

  it('precise calculation per SEASON_ORDER', () => {
    // SEASON_ORDER = ['stable', 'boom', 'crunch', 'recovery']
    // One cycle = 4 seasons
    // Boom affects only 1 spec (1/4 of work on average) → effective mult: 1 + 0.6/4 = 1.15
    // Actually, re-reading the spec: "boom favors only the boom spec (1.6 vs 1)"
    // This means one project (Frontend, Backend, etc) gets 1.6×, others get 1×
    // If distributed equally, average = (1 + 1.6 + 1 + 1) / 4 = 1.15
    // But the problem statement says: "(1 + 0.25*1.6+0.75 + 0.8 + 1.05)/4 === 1"
    // This simplifies to: (1 + 0.4 + 0.75 + 0.8 + 1.05) / 4 = 4 / 4 = 1
    // So: boom contribution = 0.4 (which is 0.25 * 1.6)
    // Stable contribution = 1
    // Crunch = 0.8
    // Recovery = 1.05
    // Total = 4, average = 1

    const cycleMult =
      (1 + 0.25 * SEASON_BOOM_SPEC_MULT + 0.75 + SEASON_CRUNCH_MULT + SEASON_RECOVERY_MULT) / 4;
    expect(cycleMult).toBeCloseTo(1.0, 10);
  });
});

describe('Seasons integration with companyIncome', () => {
  it('companyIncome includes seasonPayoutMult in the reward rate calculation', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Stable season income
    state.playTimeSec = 0; // stable
    const stableIncome = companyIncome(state, c);
    expect(stableIncome).toBeGreaterThan(0);

    // Crunch season income (all specs affected equally)
    state.playTimeSec = SEASON_LENGTH_SEC * 2; // crunch
    const crunchIncome = companyIncome(state, c);

    // Crunch income should be 0.8x stable (all specs equally affected)
    expect(crunchIncome).toBeLessThan(stableIncome);
    expect(crunchIncome / stableIncome).toBeCloseTo(SEASON_CRUNCH_MULT, 1);
  });
});
