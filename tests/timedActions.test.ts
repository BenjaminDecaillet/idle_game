import { describe, expect, it } from 'vitest';
import {
  FASTFORWARD_SEC_PER_VSCOIN,
  TRAIN_LEVELS,
  WORKER_TIERS,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  atSkillCap,
  autoSeat,
  buyWorkstation,
  companyWorkRate,
  createInitialState,
  deskUpgradeDurationSec,
  fastForwardAction,
  fastForwardCost,
  nextTier,
  promoteWorker,
  promoteDurationSec,
  simulateOffline,
  tick,
  timedActionsFor,
  trainDurationSec,
  trainWorker,
  upgradeDesk,
  workerBusy,
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
// 1. Timed action tick-down mechanics
// ---------------------------------------------------------------------------

describe('Timed action tick-down (training)', () => {
  it('creates a timedActions entry with remainingSec === totalSec on trainWorker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    expect(trainWorker(state, worker.id)).toBeNull();

    const action = c.timedActions.find((a) => a.kind === 'training' && a.targetId === worker.id);
    expect(action).toBeDefined();
    expect(action!.remainingSec).toBe(duration);
    expect(action!.totalSec).toBe(duration);
  });

  it('tick(state, dt) reduces remainingSec by dt', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);
    const actionBefore = c.timedActions[0];
    expect(actionBefore.remainingSec).toBe(duration);

    // Tick 30 seconds
    tick(state, 30);
    const actionAfter = c.timedActions[0];
    expect(actionAfter.remainingSec).toBeCloseTo(duration - 30, 10);

    // Tick another 50 seconds
    tick(state, 50);
    const actionAfter2 = c.timedActions[0];
    expect(actionAfter2.remainingSec).toBeCloseTo(duration - 80, 10);
  });

  it('completion happens exactly once even with extra ticks', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    const skillBefore = worker.skillLevel;
    const timestrainedBefore = worker.timesTrained;
    trainWorker(state, worker.id);

    // Tick enough to complete
    const events1 = tick(state, duration);
    expect(c.timedActions.length).toBe(0);
    expect(worker.skillLevel).toBe(skillBefore + TRAIN_LEVELS);
    expect(worker.timesTrained).toBe(timestrainedBefore + 1);
    expect(events1.trainingsDone).toHaveLength(1);

    // Tick again — no second completion
    const events2 = tick(state, 10);
    expect(worker.skillLevel).toBe(skillBefore + TRAIN_LEVELS);
    expect(worker.timesTrained).toBe(timestrainedBefore + 1);
    expect(events2.trainingsDone).toHaveLength(0);
  });

  it('worker is off the floor (stationId === null) while training', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    autoSeat(c);
    expect(worker.stationId).not.toBeNull();

    trainWorker(state, worker.id);
    expect(worker.stationId).toBeNull();
  });

  it('worker is reseated after training completes', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    autoSeat(c);
    expect(worker.stationId).not.toBeNull();

    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);
    expect(worker.stationId).toBeNull();

    tick(state, duration);
    expect(worker.stationId).not.toBeNull();
  });

  it('workerBusy returns true while training, false after completion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    expect(workerBusy(c, worker.id)).toBe(false);
    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);
    expect(workerBusy(c, worker.id)).toBe(true);

    tick(state, duration);
    expect(workerBusy(c, worker.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Timed action tick-down mechanics (promotion)
// ---------------------------------------------------------------------------

describe('Timed action tick-down (promotion)', () => {
  it('creates a promotion timedAction with correct duration', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'intern', skillLevel: 10 }); // at cap
    c.workers.push(worker);
    country.money = 100_000;

    const duration = promoteDurationSec(worker)!;
    expect(promoteWorker(state, worker.id)).toBeNull();

    const action = c.timedActions.find((a) => a.kind === 'promotion' && a.targetId === worker.id);
    expect(action).toBeDefined();
    expect(action!.remainingSec).toBe(duration);
    expect(action!.totalSec).toBe(duration);
    expect(action!.toTierId).toBe('junior');
  });

  it('promotion completes and updates tier', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'intern', skillLevel: 10 });
    c.workers.push(worker);
    country.money = 100_000;

    expect(worker.tierId).toBe('intern');
    const duration = promoteDurationSec(worker)!;
    promoteWorker(state, worker.id);

    const events = tick(state, duration);
    expect(worker.tierId).toBe('junior');
    expect(worker.promotions).toBe(1);
    expect(state.promotionsDone).toBe(1);
    expect(c.timedActions.length).toBe(0);
    expect(events.promotionsDone).toHaveLength(1);
    expect(events.promotionsDone[0]).toEqual({
      companyId: c.id,
      workerId: worker.id,
      newTierId: 'junior',
    });
  });

  it('skill level is preserved through promotion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const skillBeforePromotion = 10;
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: skillBeforePromotion,
    });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = promoteDurationSec(worker)!;
    promoteWorker(state, worker.id);
    tick(state, duration);

    expect(worker.skillLevel).toBe(skillBeforePromotion);
    expect(worker.tierId).toBe('junior');
  });
});

// ---------------------------------------------------------------------------
// 2. Offline parity: same end state via many ticks vs. one simulateOffline
// ---------------------------------------------------------------------------

describe('Offline parity for timed actions', () => {
  function cloneState(state: any) {
    return JSON.parse(JSON.stringify(state));
  }

  it('training completes the same way via many ticks or one simulateOffline call', () => {
    const base = createInitialState(NOW);
    const c = activeCompany(base);
    const country = activeCountry(base);
    const worker = makeWorker({ id: base.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    trainWorker(base, worker.id);

    // Approach 1: many small ticks
    const viaSmallTicks = cloneState(base);
    const cSmallTicks = activeCompany(viaSmallTicks);
    const workerSmallTicks = cSmallTicks.workers[0];
    for (let i = 0; i < duration; i += 10) {
      tick(viaSmallTicks, Math.min(10, duration - i));
    }

    // Approach 2: one simulateOffline call
    const viaOffline = cloneState(base);
    const cOffline = activeCompany(viaOffline);
    const workerOffline = cOffline.workers[0];
    simulateOffline(viaOffline, duration, duration + 100);

    // Check parity
    expect(workerSmallTicks.skillLevel).toBe(workerOffline.skillLevel);
    expect(workerSmallTicks.timesTrained).toBe(workerOffline.timesTrained);
    expect(cSmallTicks.timedActions).toHaveLength(0);
    expect(cOffline.timedActions).toHaveLength(0);
    expect(activeCountry(viaSmallTicks).money).toBeCloseTo(
      activeCountry(viaOffline).money,
      6,
    );
  });

  it('promotion completes the same way via many ticks or one simulateOffline call', () => {
    const base = createInitialState(NOW);
    const c = activeCompany(base);
    const country = activeCountry(base);
    const worker = makeWorker({
      id: base.nextEntityId++,
      tierId: 'intern',
      skillLevel: 10,
    });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = promoteDurationSec(worker)!;
    promoteWorker(base, worker.id);

    // Approach 1: many small ticks
    const viaSmallTicks = cloneState(base);
    const cSmallTicks = activeCompany(viaSmallTicks);
    const workerSmallTicks = cSmallTicks.workers[0];
    for (let i = 0; i < duration; i += 10) {
      tick(viaSmallTicks, Math.min(10, duration - i));
    }

    // Approach 2: one simulateOffline call
    const viaOffline = cloneState(base);
    const cOffline = activeCompany(viaOffline);
    const workerOffline = cOffline.workers[0];
    simulateOffline(viaOffline, duration, duration + 100);

    // Check parity
    expect(workerSmallTicks.tierId).toBe(workerOffline.tierId);
    expect(workerSmallTicks.promotions).toBe(workerOffline.promotions);
    expect(cSmallTicks.timedActions).toHaveLength(0);
    expect(cOffline.timedActions).toHaveLength(0);
    expect(activeCountry(viaSmallTicks).money).toBeCloseTo(
      activeCountry(viaOffline).money,
      6,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. fastForwardCost calculation
// ---------------------------------------------------------------------------

describe('fastForwardCost', () => {
  it('returns 0 when fastForwardsUsed === 0 (first-ever use)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    const action = c.timedActions[0];

    expect(state.fastForwardsUsed).toBe(0);
    expect(fastForwardCost(state, action)).toBe(0);
  });

  it('calculates cost as max(1, ceil(remainingSec / 600)) after first use', () => {
    const state = createInitialState(NOW);
    state.fastForwardsUsed = 1; // mark as no longer first-ever

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    const action = c.timedActions[0];

    // Set remainingSec to test various cases
    action.remainingSec = 120;
    expect(fastForwardCost(state, action)).toBe(1); // ceil(120/600) = 1

    action.remainingSec = 1250;
    expect(fastForwardCost(state, action)).toBe(3); // ceil(1250/600) = 3

    action.remainingSec = 100;
    expect(fastForwardCost(state, action)).toBe(1); // ceil(100/600) = 1 (minimum)

    action.remainingSec = 599;
    expect(fastForwardCost(state, action)).toBe(1); // ceil(599/600) = 1

    action.remainingSec = 600;
    expect(fastForwardCost(state, action)).toBe(1); // ceil(600/600) = 1

    action.remainingSec = 601;
    expect(fastForwardCost(state, action)).toBe(2); // ceil(601/600) = 2

    action.remainingSec = 1800;
    expect(fastForwardCost(state, action)).toBe(3); // ceil(1800/600) = 3
  });

  it('uses FASTFORWARD_SEC_PER_VSCOIN constant (600)', () => {
    expect(FASTFORWARD_SEC_PER_VSCOIN).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// 4. fastForwardAction behavior
// ---------------------------------------------------------------------------

describe('fastForwardAction', () => {
  it('first-ever call is free: no VsCoin needed, vsCoin unchanged, fastForwardsUsed becomes 1', () => {
    const state = createInitialState(NOW);
    expect(state.fastForwardsUsed).toBe(0);
    expect(state.vsCoin).toBe(0);

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    const actionId = c.timedActions[0].id;

    const err = fastForwardAction(state, actionId);
    expect(err).toBeNull();
    expect(state.fastForwardsUsed).toBe(1);
    expect(state.vsCoin).toBe(0); // no VsCoin deducted
    expect(c.timedActions.length).toBe(0); // action removed
  });

  it('first-ever call instantly applies the effect (training completes, worker back on floor)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    autoSeat(c);
    expect(worker.stationId).not.toBeNull();

    const skillBefore = worker.skillLevel;
    trainWorker(state, worker.id);
    expect(worker.stationId).toBeNull(); // off floor during training
    const actionId = c.timedActions[0].id;

    const err = fastForwardAction(state, actionId);
    expect(err).toBeNull();
    expect(worker.skillLevel).toBe(skillBefore + TRAIN_LEVELS);
    expect(worker.timesTrained).toBe(1);
    expect(worker.stationId).not.toBeNull(); // back on floor
  });

  it('second call with insufficient VsCoin returns error and leaves action intact', () => {
    const state = createInitialState(NOW);
    state.fastForwardsUsed = 1; // pretend we already used fast-forward once
    state.vsCoin = 0; // no VsCoin

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    const actionBefore = c.timedActions[0];
    const actionId = actionBefore.id;

    const err = fastForwardAction(state, actionId);
    expect(err).toBe('error.notEnoughVsCoin');
    expect(c.timedActions.length).toBe(1); // action still there
    expect(c.timedActions[0].id).toBe(actionId);
    expect(c.timedActions[0].remainingSec).toBe(actionBefore.remainingSec); // unchanged
  });

  it('with enough VsCoin it spends exactly the cost through the ledger', () => {
    const state = createInitialState(NOW);
    state.fastForwardsUsed = 1;
    state.vsCoin = 10; // plenty

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    const action = c.timedActions[0];
    const expectedCost = fastForwardCost(state, action);
    expect(expectedCost).toBeGreaterThan(0);

    const vsCoinBefore = state.vsCoin;
    const err = fastForwardAction(state, action.id);
    expect(err).toBeNull();

    expect(state.vsCoin).toBe(vsCoinBefore - expectedCost);
    // Check ledger: last entry should be the fast-forward spend
    const lastEntry = state.vsCoinLedger[state.vsCoinLedger.length - 1];
    expect(lastEntry.source).toMatch(/^shop:fast-forward-/);
    expect(lastEntry.amount).toBe(-expectedCost);
  });

  it('unknown action id returns "Nothing to fast-forward"', () => {
    const state = createInitialState(NOW);
    const err = fastForwardAction(state, 99999);
    expect(err).toBe('error.nothingToFastForward');
  });

  it('after successful fast-forward, action is removed from timedActions', () => {
    const state = createInitialState(NOW);
    state.fastForwardsUsed = 1;
    state.vsCoin = 10;

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    country.money = 100_000;

    trainWorker(state, worker.id);
    expect(c.timedActions).toHaveLength(1);
    const actionId = c.timedActions[0].id;

    fastForwardAction(state, actionId);
    expect(c.timedActions).toHaveLength(0);
  });

  it('can fast-forward a promotion', () => {
    const state = createInitialState(NOW);
    state.fastForwardsUsed = 1;
    state.vsCoin = 10;

    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: 10,
    });
    c.workers.push(worker);
    country.money = 100_000;

    const tierBefore = worker.tierId;
    promoteWorker(state, worker.id);
    const actionId = c.timedActions[0].id;

    const err = fastForwardAction(state, actionId);
    expect(err).toBeNull();
    expect(worker.tierId).not.toBe(tierBefore);
    expect(worker.tierId).toBe('junior');
    expect(worker.promotions).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. TickEvents emission
// ---------------------------------------------------------------------------

describe('TickEvents: trainingsDone and promotionsDone', () => {
  it('completing a training via tick emits trainingsDone with companyId and workerId', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);
    const newLevel = worker.skillLevel + TRAIN_LEVELS;

    const events = tick(state, duration);

    expect(events.trainingsDone).toHaveLength(1);
    expect(events.trainingsDone[0]).toEqual({
      companyId: c.id,
      workerId: worker.id,
      newLevel,
    });
  });

  it('completing a promotion via tick emits promotionsDone with companyId and workerId', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: 10,
    });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = promoteDurationSec(worker)!;
    promoteWorker(state, worker.id);

    const events = tick(state, duration);

    expect(events.promotionsDone).toHaveLength(1);
    expect(events.promotionsDone[0]).toEqual({
      companyId: c.id,
      workerId: worker.id,
      newTierId: 'junior',
    });
  });

  it('multiple trainings can complete in one tick and emit multiple trainingsDone events', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker1 = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    const worker2 = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker1, worker2);
    country.money = 100_000;
    country.builders.count = 2; // two concurrent trainings need two builders

    const duration = trainDurationSec(c, worker1); // both workers same duration
    trainWorker(state, worker1.id);
    trainWorker(state, worker2.id);
    expect(c.timedActions).toHaveLength(2);

    const events = tick(state, duration);

    expect(events.trainingsDone).toHaveLength(2);
    expect(events.trainingsDone[0].workerId).toBe(worker1.id);
    expect(events.trainingsDone[1].workerId).toBe(worker2.id);
  });

  it('no events emitted when timed action is not yet complete', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 100_000;

    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);

    const events = tick(state, duration - 1); // not quite done
    expect(events.trainingsDone).toHaveLength(0);
    expect(c.timedActions).toHaveLength(1);
  });

  it('timedActionsFor returns all in-flight actions for a target', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    country.money = 100_000;

    expect(timedActionsFor(c, worker.id)).toHaveLength(0);

    trainWorker(state, worker.id);
    expect(timedActionsFor(c, worker.id)).toHaveLength(1);
    expect(timedActionsFor(c, worker.id)[0].kind).toBe('training');
  });
});

// ---------------------------------------------------------------------------
// Edge cases and additional coverage
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('atSkillCap returns true when at tier max, false otherwise', () => {
    const tier = WORKER_TIERS.find((t) => t.id === 'intern')!;
    const worker = makeWorker({ tierId: 'intern', skillLevel: tier.maxSkill - 1 });
    expect(atSkillCap(worker)).toBe(false);

    worker.skillLevel = tier.maxSkill;
    expect(atSkillCap(worker)).toBe(true);
  });

  it('nextTier returns the next tier or null at the top', () => {
    const intern = makeWorker({ tierId: 'intern' });
    expect(nextTier(intern)).toBe('junior');

    const principal = makeWorker({ tierId: 'principal' });
    expect(nextTier(principal)).toBeNull();
  });

  it('cannot promote a worker not at skill cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'intern', skillLevel: 5 });
    c.workers.push(worker);
    country.money = 100_000;

    const err = promoteWorker(state, worker.id);
    expect(err).toBe('error.notAtCap');
  });

  it('cannot promote the principal tier (already at top)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'principal',
      skillLevel: 100,
    });
    c.workers.push(worker);
    country.money = 100_000;

    const err = promoteWorker(state, worker.id);
    expect(err).toBe('error.topGrade');
  });
});

// ---------------------------------------------------------------------------
// 6. Zero output while busy (construction downtime regression tests)
// ---------------------------------------------------------------------------

describe('zero output while busy', () => {
  it('a worker in training contributes zero to company work rate', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 1 });
    c.workers.push(worker);
    autoSeat(c);

    const rateBefore = companyWorkRate(state, c);
    expect(rateBefore).toBeGreaterThan(0);

    const duration = trainDurationSec(c, worker);
    trainWorker(state, worker.id);

    // During training, worker is off the floor and contributes nothing
    const rateDuringTraining = companyWorkRate(state, c);
    expect(rateDuringTraining).toBe(0);

    // Check midway through training
    tick(state, duration / 2);
    const rateMidway = companyWorkRate(state, c);
    expect(rateMidway).toBe(0);

    // After training completes, worker is back on floor and producing
    tick(state, duration / 2 + 1);
    const rateAfter = companyWorkRate(state, c);
    expect(rateAfter).toBeGreaterThan(0);
  });

  it('a worker being promoted contributes zero to company work rate', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    buyWorkstation(state, 'basic');

    const worker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      skillLevel: 10, // at skill cap for intern tier
    });
    c.workers.push(worker);
    autoSeat(c);

    const rateBefore = companyWorkRate(state, c);
    expect(rateBefore).toBeGreaterThan(0);

    const duration = promoteDurationSec(worker)!;
    promoteWorker(state, worker.id);

    // During promotion, worker is off the floor and contributes nothing
    const rateDuringPromotion = companyWorkRate(state, c);
    expect(rateDuringPromotion).toBe(0);

    // Check midway through promotion
    tick(state, duration / 2);
    const rateMidway = companyWorkRate(state, c);
    expect(rateMidway).toBe(0);

    // After promotion completes, worker is back on floor with new tier
    tick(state, duration / 2 + 1);
    const rateAfter = companyWorkRate(state, c);
    expect(rateAfter).toBeGreaterThan(0);
  });

  it('offline parity: state via many ticks equals state via simulateOffline (desk upgrade)', () => {
    function cloneState(state: any) {
      return JSON.parse(JSON.stringify(state));
    }

    function setupBase() {
      const state = createInitialState(NOW);
      const c = activeCompany(state);
      const country = activeCountry(state);
      country.money = 100_000;

      buyWorkstation(state, 'basic');
      const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 5 });
      c.workers.push(worker);
      autoSeat(c);

      return state;
    }

    const base = setupBase();
    const c = activeCompany(base);
    const deskId = c.workstations[0].id;

    upgradeDesk(base, deskId);
    const duration = deskUpgradeDurationSec('basic')!;
    const totalDuration = duration + 50; // upgrade + 50 more seconds

    // Approach 1: many small ticks through a desk upgrade
    const viaSmallTicks = cloneState(base);
    for (let i = 0; i < totalDuration; i += 10) {
      tick(viaSmallTicks, Math.min(10, totalDuration - i));
    }

    // Approach 2: one simulateOffline call
    const viaOffline = cloneState(base);
    simulateOffline(viaOffline, totalDuration, totalDuration + 100);

    // Both should end up with:
    // - Same workstation defId (upgraded from basic to standing)
    // - Same worker.stationId status
    // - Equal country money
    expect(activeCompany(viaSmallTicks).workstations[0].defId).toBe('standing');
    expect(activeCompany(viaOffline).workstations[0].defId).toBe('standing');

    const workerSmallTicks = activeCompany(viaSmallTicks).workers[0];
    const workerOffline = activeCompany(viaOffline).workers[0];
    expect(workerSmallTicks.stationId).toBe(workerOffline.stationId);

    expect(activeCountry(viaSmallTicks).money).toBeCloseTo(
      activeCountry(viaOffline).money,
      6,
    );
  });
});
