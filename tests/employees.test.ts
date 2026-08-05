import { describe, expect, it } from 'vitest';
import {
  PROMOTE_DURATION_BASE,
  PROMOTE_DURATION_GROWTH,
  TRAIN_DURATION_GROWTH,
  TRAIN_DURATION_SEC,
  TRAIN_LEVELS,
  TUTORIAL_FIRST_HIRE_NAME,
  WORKER_TIERS,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  atSkillCap,
  autoSeat,
  buyWorkstation,
  createInitialState,
  fireWorker,
  hireWorker,
  nextTier,
  promoteWorker,
  promoteCost,
  promoteDurationSec,
  rollCandidates,
  simulateOffline,
  tick,
  trainDurationSec,
  trainLevels,
  trainWorker,
  timedActionsFor,
  workerBusy,
} from '../src/game/engine';
import type { GameState, WorkerState } from '../src/game/types';

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

describe('Training ramp: trainDurationSec formula', () => {
  it('first training is ~120 seconds', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'intern', timesTrained: 0 });
    c.workers.push(worker);

    const duration = trainDurationSec(state, c, worker);
    expect(duration).toBeCloseTo(TRAIN_DURATION_SEC, 10);
    expect(duration).toBeCloseTo(120, 10);
  });

  it('second training is ramped by 1.6x', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'junior', timesTrained: 1 });
    c.workers.push(worker);

    const duration = trainDurationSec(state, c, worker);
    const expected = TRAIN_DURATION_SEC * Math.pow(TRAIN_DURATION_GROWTH, 1);
    expect(duration).toBeCloseTo(expected, 10);
    expect(duration).toBeCloseTo(120 * 1.6, 10);
  });

  it('third training is ramped by 1.6^2', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'senior', timesTrained: 2 });
    c.workers.push(worker);

    const duration = trainDurationSec(state, c, worker);
    const expected = TRAIN_DURATION_SEC * Math.pow(TRAIN_DURATION_GROWTH, 2);
    expect(duration).toBeCloseTo(expected, 10);
    expect(duration).toBeCloseTo(120 * 1.6 * 1.6, 10);
  });

  it('duration ramp is 1.6 by default (mentorship level 0)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(c.upgrades['mentorship'] ?? 0).toBe(0);

    const worker = makeWorker({ timesTrained: 1 });
    c.workers.push(worker);
    const duration = trainDurationSec(state, c, worker);
    const expected = TRAIN_DURATION_SEC * Math.pow(1.6, 1);
    expect(duration).toBeCloseTo(expected, 10);
  });

  it('duration ramp shrinks with mentorship upgrade (MENTORSHIP_SPEED_FACTOR = 0.85)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    // Mentorship level 1: duration *= 0.85
    c.upgrades['mentorship'] = 1;

    const worker = makeWorker({ timesTrained: 1 });
    c.workers.push(worker);
    const duration = trainDurationSec(state, c, worker);
    const baseWithMentorship = TRAIN_DURATION_SEC * Math.pow(0.85, 1);
    const expected = baseWithMentorship * Math.pow(TRAIN_DURATION_GROWTH, 1);
    expect(duration).toBeCloseTo(expected, 10);
  });
});

describe('Grade caps: maxSkill tier limits', () => {
  it('intern caps at skillLevel 10', () => {
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    const tier = WORKER_TIERS.find((t) => t.id === 'intern')!;
    expect(tier.maxSkill).toBe(10);
    expect(atSkillCap(worker)).toBe(true);
  });

  it('junior caps at skillLevel 20', () => {
    const worker = makeWorker({ tierId: 'junior', skillLevel: 20 });
    const tier = WORKER_TIERS.find((t) => t.id === 'junior')!;
    expect(tier.maxSkill).toBe(20);
    expect(atSkillCap(worker)).toBe(true);
  });

  it('principal caps at skillLevel 100', () => {
    const worker = makeWorker({ tierId: 'principal', skillLevel: 100 });
    const tier = WORKER_TIERS.find((t) => t.id === 'principal')!;
    expect(tier.maxSkill).toBe(100);
    expect(atSkillCap(worker)).toBe(true);
  });

  it('trainLevels clamps at the tier cap', () => {
    // Intern at skill 8 can only gain 2 levels (not 3) to reach the 10 cap
    const worker = makeWorker({ tierId: 'intern', skillLevel: 8 });
    const levels = trainLevels(worker);
    expect(levels).toBe(2);
    expect(levels).toBeLessThan(TRAIN_LEVELS);
  });

  it('trainLevels returns 0 when already at cap', () => {
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    const levels = trainLevels(worker);
    expect(levels).toBe(0);
  });

  it('trainWorker rejects a capped non-principal with error.promoteInstead', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 1000;

    const err = trainWorker(state, worker.id);
    expect(err).toBe('error.promoteInstead');
    expect(worker.skillLevel).toBe(10); // unchanged
  });

  it('trainWorker rejects a capped principal with error.maxSkill', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'principal', skillLevel: 100 });
    c.workers.push(worker);
    country.money = 1000;

    const err = trainWorker(state, worker.id);
    expect(err).toBe('error.maxSkill');
    expect(worker.skillLevel).toBe(100); // unchanged
  });

  it('XP level-ups are capped during tick', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1000;
    buyWorkstation(state, 'basic');

    // Intern at skill 10 cap
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10, stationId: 1 });
    c.workers.push(worker);

    // Tick for a long time
    tick(state, 1000);

    // Should not go above 10
    expect(worker.skillLevel).toBe(10);
  });
});

describe('Promotion: cost and duration formula', () => {
  it('promoteCost for intern→junior is 100 × 0.6 = 60', () => {
    const c = activeCompany(createInitialState(NOW));
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    const cost = promoteCost(c, worker);
    const juniorHireCost = WORKER_TIERS.find((t) => t.id === 'junior')!.hireCost;
    expect(juniorHireCost).toBe(100);
    expect(cost).toBe(60);
  });

  it('promoteCost for junior→mid is 500 × 0.6 = 300', () => {
    const c = activeCompany(createInitialState(NOW));
    const worker = makeWorker({ tierId: 'junior', skillLevel: 20 });
    const cost = promoteCost(c, worker);
    const midHireCost = WORKER_TIERS.find((t) => t.id === 'mid')!.hireCost;
    expect(midHireCost).toBe(500);
    expect(cost).toBe(300);
  });

  it('promoteCost returns null for principal (top tier)', () => {
    const c = activeCompany(createInitialState(NOW));
    const worker = makeWorker({ tierId: 'principal', skillLevel: 100 });
    const cost = promoteCost(c, worker);
    expect(cost).toBeNull();
  });

  it('promoteDurationSec for junior→mid (tier index 2) is 180 × 2^2 = 720', () => {
    const worker = makeWorker({ tierId: 'junior', skillLevel: 20 });
    const duration = promoteDurationSec(worker);
    const midIndex = WORKER_TIERS.findIndex((t) => t.id === 'mid');
    expect(midIndex).toBe(2);
    expect(duration).toBe(PROMOTE_DURATION_BASE * Math.pow(PROMOTE_DURATION_GROWTH, midIndex));
    expect(duration).toBeCloseTo(180 * 4, 10);
  });

  it('promoteDurationSec for intern→junior (tier index 1) is 180 × 2^1 = 360', () => {
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    const duration = promoteDurationSec(worker);
    const juniorIndex = WORKER_TIERS.findIndex((t) => t.id === 'junior');
    expect(juniorIndex).toBe(1);
    expect(duration).toBe(PROMOTE_DURATION_BASE * Math.pow(PROMOTE_DURATION_GROWTH, juniorIndex));
    expect(duration).toBeCloseTo(360, 10);
  });

  it('promoteDurationSec returns null for principal', () => {
    const worker = makeWorker({ tierId: 'principal', skillLevel: 100 });
    const duration = promoteDurationSec(worker);
    expect(duration).toBeNull();
  });
});

describe('Promotion: action creation and completion', () => {
  it('promoteWorker fails when not at skill cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 5 });
    c.workers.push(worker);
    country.money = 1000;

    const err = promoteWorker(state, worker.id);
    expect(err).toBe('error.notAtCap');
    expect(worker.tierId).toBe('intern');
    expect(c.timedActions).toHaveLength(0);
  });

  it('promoteWorker fails when not enough money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 0;

    const err = promoteWorker(state, worker.id);
    expect(err).toBe('error.notEnoughMoney');
    expect(worker.tierId).toBe('intern');
    expect(c.timedActions).toHaveLength(0);
  });

  it('promoteWorker succeeds, charges cost, creates timed action, frees desk', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'intern', skillLevel: 10, stationId: 1 });
    c.workers.push(worker);
    expect(worker.stationId).toBe(1);

    const cost = promoteCost(c, worker)!;
    const moneyBefore = country.money;
    const err = promoteWorker(state, worker.id);

    expect(err).toBeNull();
    expect(country.money).toBe(moneyBefore - cost);
    expect(c.timedActions).toHaveLength(1);
    expect(c.timedActions[0]).toMatchObject({
      kind: 'promotion',
      targetId: worker.id,
      toTierId: 'junior',
    });
    // Worker freed from desk
    expect(worker.stationId).toBeNull();
  });

  it('promoteWorker action has correct totalSec', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 1000;

    promoteWorker(state, worker.id);
    const action = c.timedActions[0];
    const expectedDuration = promoteDurationSec(worker)!;
    expect(action.remainingSec).toBe(expectedDuration);
    expect(action.totalSec).toBe(expectedDuration);
  });

  it('promotion completes: tier changes, skill kept, promotions increments, worker reseated', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'intern', skillLevel: 10, stationId: 1 });
    c.workers.push(worker);
    const skillBefore = worker.skillLevel;
    const promotionsBefore = worker.promotions;

    promoteWorker(state, worker.id);
    const duration = c.timedActions[0].totalSec;

    // Tick past the promotion duration
    tick(state, duration + 1);

    expect(worker.tierId).toBe('junior');
    expect(worker.skillLevel).toBe(skillBefore); // kept
    expect(worker.promotions).toBe(promotionsBefore + 1);
    expect(state.promotionsDone).toBe(1);
    expect(c.timedActions).toHaveLength(0); // action cleared
    expect(worker.stationId).not.toBeNull(); // reseated by autoSeat
  });

  it('promotion event fires in tick events', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 1000;

    promoteWorker(state, worker.id);
    const duration = c.timedActions[0].totalSec;

    const events = tick(state, duration + 1);
    expect(events.promotionsDone).toContainEqual({
      companyId: c.id,
      workerId: worker.id,
      newTierId: 'junior',
    });
  });

  it('promoteWorker rejects if worker is busy (mid-training)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    // Start with a junior at skill 5 to train them
    const worker = makeWorker({ tierId: 'junior', skillLevel: 5, id: state.nextEntityId++ });
    c.workers.push(worker);
    country.money = 1000;

    // Start a training (which requires a desk first)
    buyWorkstation(state, 'basic');
    autoSeat(c);
    const trainErr = trainWorker(state, worker.id);
    expect(trainErr).toBeNull();
    expect(workerBusy(c, worker.id)).toBe(true);

    // Now try to promote (should fail because they're busy training)
    const err = promoteWorker(state, worker.id);
    expect(err).toBe('error.workerBusy');
    expect(worker.tierId).toBe('junior'); // unchanged
  });
});

describe('Promotion: offline parity', () => {
  it('promotion completes identically via simulateOffline as through live tick', () => {
    function setupPromotion(): GameState {
      const state = createInitialState(NOW);
      const c = activeCompany(state);
      const country = activeCountry(state);
      country.money = 1000;
      const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
      c.workers.push(worker);
      return state;
    }

    const live = setupPromotion();
    const liveCom = activeCompany(live);
    const liveWorker = liveCom.workers[0];

    const offline = setupPromotion();
    const offlineCom = activeCompany(offline);
    const offlineWorker = offlineCom.workers[0];

    // Start promotion on both
    promoteWorker(live, liveWorker.id);
    promoteWorker(offline, offlineWorker.id);

    const promoDuration = liveCom.timedActions[0].totalSec;

    // Complete via live tick
    tick(live, promoDuration + 10);

    // Complete via offline simulation
    simulateOffline(offline, promoDuration + 10, promoDuration + 10);

    // Both should be in junior tier with same skill
    expect(liveWorker.tierId).toBe('junior');
    expect(offlineWorker.tierId).toBe('junior');
    expect(liveWorker.skillLevel).toBe(offlineWorker.skillLevel);
    expect(liveWorker.promotions).toBe(1);
    expect(offlineWorker.promotions).toBe(1);
  });
});

describe('Steve Gates: tutorial special candidate', () => {
  it('first candidate during tutorial is Steve Gates (intern)', () => {
    const state = createInitialState(NOW);
    expect(state.tutorial.done).toBe(false);
    const c = activeCompany(state);
    expect(c.workers).toHaveLength(0);

    const candidates = c.candidates;
    expect(candidates[0].name).toBe(TUTORIAL_FIRST_HIRE_NAME);
    expect(candidates[0].tierId).toBe('intern');
  });

  it('Steve Gates hire cost is ≤ starting money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const candidate = c.candidates[0];
    const internHireCost = WORKER_TIERS.find((t) => t.id === 'intern')!.hireCost;

    expect(candidate.name).toBe(TUTORIAL_FIRST_HIRE_NAME);
    expect(candidate.tierId).toBe('intern');
    expect(internHireCost).toBeLessThanOrEqual(country.money);
  });

  it('after tutorial done, rollCandidates no longer injects Steve Gates', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;

    const candidates = rollCandidates(state);
    expect(candidates[0].name).not.toBe(TUTORIAL_FIRST_HIRE_NAME);
  });

  it('after a hire, rollCandidates no longer injects Steve Gates (tutorial-off convention)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);

    // Still in tutorial, no hires yet
    expect(state.tutorial.done).toBe(false);
    expect(c.workers).toHaveLength(0);
    expect(c.candidates[0].name).toBe(TUTORIAL_FIRST_HIRE_NAME);

    // Hire the first candidate
    country.money = 1000;
    hireWorker(state, 0);
    expect(c.workers).toHaveLength(1);

    // Reroll to get new candidates
    country.money = 1000;
    rollCandidates(state);
    const fresh = rollCandidates(state);

    // Steve Gates should not appear again
    expect(fresh[0].name).not.toBe(TUTORIAL_FIRST_HIRE_NAME);
  });
});

describe('Debt-quit orphaning: firing removes timed actions', () => {
  it('firing a worker removes their in-flight training', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 1000;

    // Start training
    trainWorker(state, worker.id);
    expect(c.timedActions.some((a) => a.kind === 'training' && a.targetId === worker.id)).toBe(true);

    // Fire the worker
    const err = fireWorker(state, worker.id);
    expect(err).toBeNull();

    // Training action should be orphaned (removed)
    expect(c.timedActions.some((a) => a.kind === 'training' && a.targetId === worker.id)).toBe(false);
    expect(c.workers).toHaveLength(0);
  });

  it('firing a worker removes their in-flight promotion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 1000;

    // Start promotion
    promoteWorker(state, worker.id);
    expect(c.timedActions.some((a) => a.kind === 'promotion' && a.targetId === worker.id)).toBe(true);

    // Fire the worker
    const err = fireWorker(state, worker.id);
    expect(err).toBeNull();

    // Promotion action should be orphaned (removed)
    expect(c.timedActions.some((a) => a.kind === 'promotion' && a.targetId === worker.id)).toBe(false);
    expect(c.workers).toHaveLength(0);
  });

  it('firing a worker preserves desk-upgrade timed actions', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'junior', skillLevel: 1, stationId: 1 });
    c.workers.push(worker);

    // Upgrade the desk
    const station = c.workstations[0];
    // Note: upgradeDesk API not tested here (desk upgrades are separate), but the
    // orphaning logic explicitly filters out desk-upgrade actions when firing
    c.timedActions.push({
      id: 1,
      kind: 'desk-upgrade',
      targetId: station.id,
      remainingSec: 100,
      totalSec: 100,
      toDefId: 'standing',
    });

    // Fire the worker
    fireWorker(state, worker.id);

    // Desk-upgrade action should remain (not orphaned)
    expect(c.timedActions.some((a) => a.kind === 'desk-upgrade')).toBe(true);
  });
});

describe('Training: completion flow', () => {
  it('training completes: skill gains TRAIN_LEVELS, timesTrained increments, event fires', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'junior', skillLevel: 1, stationId: 1 });
    c.workers.push(worker);
    const skillBefore = worker.skillLevel;
    const timesTrainedBefore = worker.timesTrained;

    trainWorker(state, worker.id);
    expect(c.timedActions).toHaveLength(1);

    const duration = trainDurationSec(state, c, worker);
    const events = tick(state, duration + 1);

    expect(worker.skillLevel).toBe(skillBefore + TRAIN_LEVELS);
    expect(worker.timesTrained).toBe(timesTrainedBefore + 1);
    expect(events.trainingsDone).toContainEqual({
      companyId: c.id,
      workerId: worker.id,
      newLevel: worker.skillLevel,
    });
    expect(c.timedActions).toHaveLength(0);
  });

  it('second training ramps duration 1.6x longer', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'junior', skillLevel: 5, timesTrained: 1 });
    c.workers.push(worker);
    autoSeat(c);

    const firstDuration = TRAIN_DURATION_SEC * Math.pow(1.6, 1);
    const duration = trainDurationSec(state, c, worker);
    expect(duration).toBeCloseTo(firstDuration, 10);

    trainWorker(state, worker.id);
    tick(state, duration + 1);
    expect(worker.timesTrained).toBe(2);

    // Now third training
    const worker2 = makeWorker({ tierId: 'junior', skillLevel: 8, timesTrained: 2 });
    c.workers[0] = worker2;
    country.money = 1000;
    autoSeat(c);
    trainWorker(state, worker2.id);

    const thirdDuration = trainDurationSec(state, c, worker2);
    const expectedThird = TRAIN_DURATION_SEC * Math.pow(1.6, 2);
    expect(thirdDuration).toBeCloseTo(expectedThird, 10);
  });

  it('training clamped by skill cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');

    // Intern at skill 9, can only gain 1 level (not 3) to reach cap 10
    const worker = makeWorker({ tierId: 'intern', skillLevel: 9, stationId: 1 });
    c.workers.push(worker);

    trainWorker(state, worker.id);
    const action = c.timedActions[0];
    expect(action.levels).toBe(1); // clamped by trainLevels

    const duration = trainDurationSec(state, c, worker);
    tick(state, duration + 1);

    expect(worker.skillLevel).toBe(10); // capped
    expect(c.timedActions).toHaveLength(0);
  });
});

describe('nextTier helper', () => {
  it('nextTier for intern is junior', () => {
    const worker = makeWorker({ tierId: 'intern' });
    expect(nextTier(worker)).toBe('junior');
  });

  it('nextTier for principal is null', () => {
    const worker = makeWorker({ tierId: 'principal' });
    expect(nextTier(worker)).toBeNull();
  });

  it('nextTier for mid is senior', () => {
    const worker = makeWorker({ tierId: 'mid' });
    expect(nextTier(worker)).toBe('senior');
  });
});

describe('workerBusy helper', () => {
  it('returns false for a worker with no timed actions', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker();
    c.workers.push(worker);

    expect(workerBusy(c, worker.id)).toBe(false);
  });

  it('returns true while training', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 1000;

    trainWorker(state, worker.id);
    expect(workerBusy(c, worker.id)).toBe(true);
  });

  it('returns true while promoting', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 1000;

    promoteWorker(state, worker.id);
    expect(workerBusy(c, worker.id)).toBe(true);
  });

  it('returns false after training completes', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ tierId: 'junior', skillLevel: 1, stationId: 1 });
    c.workers.push(worker);

    trainWorker(state, worker.id);
    expect(workerBusy(c, worker.id)).toBe(true);

    const duration = trainDurationSec(state, c, worker);
    tick(state, duration + 1);
    expect(workerBusy(c, worker.id)).toBe(false);
  });
});

describe('timedActionsFor helper', () => {
  it('returns all actions for a worker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ id: 100 });
    const otherWorker = makeWorker({ id: 200 });
    c.workers.push(worker, otherWorker);

    c.timedActions = [
      { id: 1, kind: 'training', targetId: worker.id, remainingSec: 100, totalSec: 100 },
      { id: 2, kind: 'promotion', targetId: worker.id, remainingSec: 200, totalSec: 200, toTierId: 'junior' },
      { id: 3, kind: 'training', targetId: otherWorker.id, remainingSec: 50, totalSec: 50 }, // different worker
    ];

    const actions = timedActionsFor(c, worker.id);
    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.targetId === worker.id)).toBe(true);
  });

  it('returns empty array when no actions for a worker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ id: 100 });
    c.workers.push(worker);

    const actions = timedActionsFor(c, worker.id);
    expect(actions).toHaveLength(0);
  });
});
