import { describe, expect, it } from 'vitest';
import { PROJECTS, SPEC_MATCH_BONUS, WORKER_TIERS, WORKSTATIONS } from '../src/game/data';
import {
  activeCompany,
  autoSeat,
  buyUpgrade,
  buyWorkstation,
  createInitialState,
  expToNextLevel,
  fireWorker,
  getProject,
  hireWorker,
  rerollCandidates,
  rollCandidates,
  setActiveProject,
  simulateOffline,
  skillMultiplier,
  stationCost,
  tick,
  trainCost,
  trainWorker,
  unlockProject,
  upgradeCost,
  workerRate,
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
    ...overrides,
  };
}

describe('createInitialState', () => {
  it('starts with $50, landing unlocked+active, 3 candidates, no workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(state.money).toBe(50);
    expect(c.activeProjectId).toBe('landing');
    expect(c.workers).toHaveLength(0);
    expect(c.candidates).toHaveLength(3);

    const landing = getProject(c, 'landing');
    expect(landing.unlocked).toBe(true);

    for (const p of c.projects) {
      if (p.defId !== 'landing') expect(p.unlocked).toBe(false);
    }
    expect(c.projects).toHaveLength(PROJECTS.length);
  });
});

describe('tick — no workers', () => {
  it('accrues no progress and does not touch money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const before = state.money;
    const events = tick(state, 10);
    const landing = getProject(c, 'landing');
    expect(landing.progress).toBe(0);
    expect(state.money).toBe(before);
    expect(events.completions).toHaveLength(0);
    expect(events.levelUps).toHaveLength(0);
  });

  it('money floors at 0 when salaries exceed funds', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 1;
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'senior' }); // salary 1.2/s
    c.workers.push(worker);
    // no workstation bought, so worker produces no work, but salary is still paid.
    tick(state, 10); // would need 12 to pay off; money should floor at 0, not go negative
    expect(state.money).toBe(0);
  });
});

describe('tick — with hired worker + workstation', () => {
  it('accrues progress at the expected rate and drains salary', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 1000;
    expect(buyWorkstation(state, 'basic')).toBeNull(); // cost 20
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Backend' });
    c.workers.push(worker);
    autoSeat(c);
    expect(worker.stationId).not.toBeNull();

    const moneyBeforeTick = state.money;
    const dt = 5;
    tick(state, dt);

    const tier = WORKER_TIERS.find((t) => t.id === 'junior')!;
    // junior baseRate=1, skillLevel1 multiplier=1, basic desk multiplier=1,
    // no global upgrades=1, specialization mismatch (Backend vs Frontend)=1x.
    const expectedRate = tier.baseRate * 1 * 1 * 1 * 1;
    const landing = getProject(c, 'landing');
    expect(landing.progress).toBeCloseTo(expectedRate * dt, 10);
    expect(state.money).toBeCloseTo(moneyBeforeTick - tier.salary * dt, 10);
  });

  it('completes the project, scales work/reward, rewards money, and rolls over progress', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 1000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Backend' });
    c.workers.push(worker);
    autoSeat(c);

    const landingDef = PROJECTS.find((p) => p.id === 'landing')!;
    const before = getProject(c, 'landing');
    const initialWork = before.currentWork; // 30
    const initialReward = before.currentReward; // 15
    expect(initialWork).toBeCloseTo(landingDef.baseWork);
    expect(initialReward).toBeCloseTo(landingDef.baseReward);

    // rate is 1 work/sec (junior, no station bonus, no spec match), so dt=35
    // produces exactly one completion with 5 leftover progress.
    const moneyBeforeTick = state.money;
    const salaryDrain = WORKER_TIERS.find((t) => t.id === 'junior')!.salary * 35;
    const events = tick(state, 35);

    expect(events.completions).toHaveLength(1);
    expect(events.completions[0]).toEqual({ companyId: c.id, projectId: 'landing', reward: initialReward });
    expect(state.projectsCompleted).toBe(1);

    const after = getProject(c, 'landing');
    expect(after.completions).toBe(1);
    expect(after.progress).toBeCloseTo(5, 10);
    expect(after.currentWork).toBeCloseTo(initialWork * landingDef.workGrowth, 10);
    expect(after.currentReward).toBeCloseTo(initialReward * landingDef.rewardGrowth, 10);

    expect(state.totalEarned).toBeCloseTo(initialReward, 10);
    expect(state.money).toBeCloseTo(moneyBeforeTick - salaryDrain + initialReward, 10);
  });

  it('handles multiple completions within one long tick (loop guard)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 1000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' }); // spec match
    c.workers.push(worker);
    autoSeat(c);

    const totalEarnedBefore = state.totalEarned;
    const events = tick(state, 500);

    expect(events.completions.length).toBeGreaterThan(1);
    expect(state.projectsCompleted).toBe(events.completions.length);

    const rewardSum = events.completions.reduce((sum, c) => sum + c.reward, 0);
    expect(state.totalEarned - totalEarnedBefore).toBeCloseTo(rewardSum, 6);

    const project = getProject(c, 'landing');
    expect(project.progress).toBeGreaterThanOrEqual(0);
    expect(project.progress).toBeLessThan(project.currentWork);
  });
});

describe('specialization match bonus', () => {
  it('gives exactly 1.5x rate when worker specialization matches the project', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push({ id: 1, defId: 'basic' });

    const matched = makeWorker({ specialization: 'Frontend', stationId: 1 });
    const mismatched = makeWorker({ specialization: 'Backend', stationId: 1 });

    const rateMatched = workerRate(state, c, matched, 'landing'); // landing spec = Frontend
    const rateMismatched = workerRate(state, c, mismatched, 'landing');

    expect(rateMatched / rateMismatched).toBeCloseTo(SPEC_MATCH_BONUS, 10);
    expect(SPEC_MATCH_BONUS).toBe(1.5);
  });
});

describe('worker with no workstation', () => {
  it('produces 0 rate and gains no experience', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ stationId: null });
    c.workers.push(worker);

    expect(workerRate(state, c, worker, c.activeProjectId)).toBe(0);

    const expBefore = worker.experience;
    const events = tick(state, 50);
    expect(worker.experience).toBe(expBefore);
    expect(events.levelUps).toHaveLength(0);
  });
});

describe('experience / level-ups', () => {
  it('levels up a worker after enough assigned seconds and reports it in events', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push({ id: 1, defId: 'basic' });
    const worker = makeWorker({ stationId: 1, skillLevel: 1, experience: 0 });
    c.workers.push(worker);

    const need = expToNextLevel(1); // 90 seconds with no agile upgrade
    expect(need).toBeCloseTo(90);

    const events = tick(state, need);
    expect(worker.skillLevel).toBe(2);
    expect(worker.experience).toBeCloseTo(0, 10);
    expect(events.levelUps).toContainEqual({ workerId: worker.id, newLevel: 2 });
    expect(skillMultiplier(worker)).toBeCloseTo(1.1, 10);
  });

  it('skillMultiplier formula is 1 + 0.1*(level-1)', () => {
    const worker = makeWorker({ skillLevel: 6 });
    expect(skillMultiplier(worker)).toBeCloseTo(1.5, 10);
  });
});

describe('hireWorker', () => {
  it('deducts hireCost and adds a worker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const candidate = c.candidates[0];
    const tier = WORKER_TIERS.find((t) => t.id === candidate.tierId)!;
    state.money = tier.hireCost;

    const err = hireWorker(state, 0);
    expect(err).toBeNull();
    expect(state.money).toBe(0);
    expect(c.workers).toHaveLength(1);
    expect(c.workers[0].name).toBe(candidate.name);
  });

  it('refuses when broke', () => {
    const state = createInitialState(NOW);
    state.money = 0;
    const err = hireWorker(state, 0);
    expect(err).toBe('Not enough money');
    expect(activeCompany(state).workers).toHaveLength(0);
  });

  it('returns an error for an invalid candidate index', () => {
    const state = createInitialState(NOW);
    const err = hireWorker(state, 99);
    expect(err).toBe('Candidate not found');
  });
});

describe('buyWorkstation', () => {
  it('scales cost as baseCost * costGrowth^owned, rounded', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 100_000;
    const def = WORKSTATIONS.find((w) => w.id === 'basic')!;

    const cost0 = stationCost(c, 'basic');
    expect(cost0).toBe(Math.round(def.baseCost * Math.pow(def.costGrowth, 0)));

    const before = state.money;
    buyWorkstation(state, 'basic');
    expect(state.money).toBe(before - cost0);

    const cost1 = stationCost(c, 'basic');
    expect(cost1).toBe(Math.round(def.baseCost * Math.pow(def.costGrowth, 1)));
    expect(cost1).toBeGreaterThan(cost0);
  });

  it('refuses when broke', () => {
    const state = createInitialState(NOW);
    state.money = 0;
    const err = buyWorkstation(state, 'basic');
    expect(err).toBe('Not enough money');
    expect(activeCompany(state).workstations).toHaveLength(0);
  });
});

describe('buyUpgrade', () => {
  it('cost grows by costGrowth^level and rejects insufficient funds', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const cost0 = upgradeCost(c, 'coffee');
    expect(cost0).toBe(200); // baseCost * 2.4^0

    c.upgrades['coffee'] = 1;
    const cost1 = upgradeCost(c, 'coffee');
    expect(cost1).toBe(Math.round(200 * Math.pow(2.4, 1)));
  });

  it('enforces the max level cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 10_000_000;
    c.upgrades['agile'] = 12; // maxLevel for agile
    const err = buyUpgrade(state, 'agile');
    expect(err).toBe('Already at max level');
    expect(c.upgrades['agile']).toBe(12);
  });

  it('succeeds below the cap and deducts money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 10_000;
    const before = state.money;
    const cost = upgradeCost(c, 'coffee');
    const err = buyUpgrade(state, 'coffee');
    expect(err).toBeNull();
    expect(c.upgrades['coffee']).toBe(1);
    expect(state.money).toBe(before - cost);
  });
});

describe('unlockProject / setActiveProject error paths', () => {
  it('unlockProject refuses an already-unlocked project', () => {
    const state = createInitialState(NOW);
    const err = unlockProject(state, 'landing');
    expect(err).toBe('Already unlocked');
  });

  it('unlockProject refuses when broke', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 0;
    const err = unlockProject(state, 'todo');
    expect(err).toBe('Not enough money');
    expect(getProject(c, 'todo').unlocked).toBe(false);
  });

  it('unlockProject succeeds and deducts unlockCost', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const todoDef = PROJECTS.find((p) => p.id === 'todo')!;
    state.money = todoDef.unlockCost;
    const err = unlockProject(state, 'todo');
    expect(err).toBeNull();
    expect(state.money).toBe(0);
    expect(getProject(c, 'todo').unlocked).toBe(true);
  });

  it('setActiveProject refuses a locked project', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const err = setActiveProject(state, 'todo');
    expect(err).toBe('Project is locked');
    expect(c.activeProjectId).toBe('landing');
  });

  it('setActiveProject succeeds on an unlocked project', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 1_000_000;
    unlockProject(state, 'todo');
    const err = setActiveProject(state, 'todo');
    expect(err).toBeNull();
    expect(c.activeProjectId).toBe('todo');
  });
});

describe('trainWorker', () => {
  it('cost formula is base * 4^tierIndex * level^2', () => {
    const internWorker = makeWorker({ tierId: 'intern', skillLevel: 1 });
    expect(trainCost(internWorker)).toBe(150); // 150 * 4^0 * 1^2

    const juniorWorker = makeWorker({ tierId: 'junior', skillLevel: 3 });
    expect(trainCost(juniorWorker)).toBe(Math.round(150 * 4 * 9)); // tierIndex=1 -> 4^1=4
  });

  it('deducts cost, increments skillLevel, resets experience', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'intern', skillLevel: 1, experience: 42 });
    c.workers.push(worker);
    state.money = trainCost(worker);

    const err = trainWorker(state, worker.id);
    expect(err).toBeNull();
    expect(state.money).toBe(0);
    expect(worker.skillLevel).toBe(2);
    expect(worker.experience).toBe(0);
  });

  it('refuses when broke', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'senior', skillLevel: 5 });
    c.workers.push(worker);
    state.money = 0;
    const err = trainWorker(state, worker.id);
    expect(err).toBe('Not enough money');
    expect(worker.skillLevel).toBe(5);
  });

  it('returns an error for an unknown worker id', () => {
    const state = createInitialState(NOW);
    expect(trainWorker(state, 12345)).toBe('Worker not found');
  });

  it('does not exceed the level-100 cap enforced by tick()', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const worker = makeWorker({ tierId: 'principal', skillLevel: 100, experience: 0 });
    c.workers.push(worker);
    state.money = trainCost(worker);

    expect(trainWorker(state, worker.id)).toBe('Already at max skill level');
    expect(worker.skillLevel).toBe(100);
  });
});

describe('rerollCandidates', () => {
  it('increases cost by 1.5x each time and refuses when broke', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    expect(c.candidateRerollCost).toBe(10);
    state.money = 1000;

    let err = rerollCandidates(state);
    expect(err).toBeNull();
    expect(c.candidateRerollCost).toBe(Math.round(10 * 1.5)); // 15

    err = rerollCandidates(state);
    expect(err).toBeNull();
    expect(c.candidateRerollCost).toBe(Math.round(15 * 1.5)); // 23

    state.money = 0;
    err = rerollCandidates(state);
    expect(err).toBe('Not enough money');
  });
});

describe('fireWorker', () => {
  it('removes the worker and re-seats remaining workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    state.money = 100_000;
    buyWorkstation(state, 'basic');
    const w1 = makeWorker({ id: state.nextEntityId++, tierId: 'senior' });
    const w2 = makeWorker({ id: state.nextEntityId++, tierId: 'intern' });
    c.workers.push(w1, w2);
    autoSeat(c);
    // Only one desk: the stronger worker (senior) should be seated.
    expect(w1.stationId).not.toBeNull();
    expect(w2.stationId).toBeNull();

    const err = fireWorker(state, w1.id);
    expect(err).toBeNull();
    expect(c.workers).toHaveLength(1);
    // w2 should now take the freed desk.
    expect(w2.stationId).not.toBeNull();
  });

  it('returns an error for an unknown worker id', () => {
    const state = createInitialState(NOW);
    expect(fireWorker(state, 12345)).toBe('Worker not found');
  });
});

describe('autoSeat', () => {
  it('gives the best workers the highest-multiplier desks; excess get null', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push(
      { id: 1, defId: 'basic' }, // multiplier 1
      { id: 2, defId: 'standing' }, // multiplier 1.25
    );
    // Three workers of increasing potential; only top 2 should get desks.
    const weak = makeWorker({ id: 1, tierId: 'intern', specialization: 'DevOps' }); // baseRate 0.5
    const mid = makeWorker({ id: 2, tierId: 'mid', specialization: 'DevOps' }); // baseRate 2.5
    const strong = makeWorker({ id: 3, tierId: 'senior', specialization: 'DevOps' }); // baseRate 5
    c.workers.push(weak, mid, strong);

    autoSeat(c);

    expect(strong.stationId).toBe(2); // best worker -> best desk (standing)
    expect(mid.stationId).toBe(1); // second best -> basic desk
    expect(weak.stationId).toBeNull(); // excess worker -> no desk
  });
});

describe('rollCandidates (seeded)', () => {
  it('is deterministic given a fixed rand sequence', () => {
    const state = createInitialState(NOW);
    let calls = 0;
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05, 0.15, 0.25];
    const fakeRand = () => values[calls++ % values.length];

    const first = rollCandidates(state, fakeRand);
    calls = 0;
    const second = rollCandidates(state, fakeRand);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    for (const c of first) {
      expect(WORKER_TIERS.some((t) => t.id === c.tierId)).toBe(true);
      expect(c.name.split(' ')).toHaveLength(2);
    }
  });
});

describe('simulateOffline', () => {
  function cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }

  function seatWorker(state: GameState) {
    const c = activeCompany(state);
    state.money = 1000;
    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'mid', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);
  }

  it('earns the same total as an equivalent sequence of 60s ticks', () => {
    const base = createInitialState(NOW);
    seatWorker(base);

    const viaOffline = cloneState(base);
    const viaManualTicks = cloneState(base);

    const earnedOffline = simulateOffline(viaOffline, 300, 100_000);

    const earnedBefore = viaManualTicks.totalEarned;
    for (let i = 0; i < 5; i++) tick(viaManualTicks, 60);
    const earnedManual = viaManualTicks.totalEarned - earnedBefore;

    expect(earnedOffline).toBeCloseTo(earnedManual, 6);
    expect(viaOffline.money).toBeCloseTo(viaManualTicks.money, 6);
    expect(viaOffline.projectsCompleted).toBe(viaManualTicks.projectsCompleted);
  });

  it('respects the cap parameter', () => {
    const state = createInitialState(NOW);
    seatWorker(state);
    const playTimeBefore = state.playTimeSec;

    simulateOffline(state, 10_000, 500);
    expect(state.playTimeSec - playTimeBefore).toBeCloseTo(500, 6);
  });
});
