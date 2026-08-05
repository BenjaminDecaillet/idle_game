import { describe, expect, it } from 'vitest';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  createInitialState,
  getProject,
  simulateOffline,
  simulateOfflineReport,
  trainDurationSec,
  trainWorker,
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

describe('simulateOfflineReport', () => {
  describe('1. Earnings parity', () => {
    it('earnings from simulateOfflineReport matches simulateOffline', () => {
      // Create two identical states
      const state1 = createInitialState(NOW);
      const state2 = createInitialState(NOW);

      // Set up both identically: hire worker + buy desk
      const c1 = activeCountry(state1);
      const c2 = activeCountry(state2);
      const country1 = activeCountry(state1);
      const country2 = activeCountry(state2);

      country1.money = 1000;
      country2.money = 1000;

      buyWorkstation(state1, 'basic');
      buyWorkstation(state2, 'basic');

      const worker1 = makeWorker({ id: state1.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
      const worker2 = makeWorker({ id: state2.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });

      c1.companies[0].workers.push(worker1);
      c2.companies[0].workers.push(worker2);

      autoSeat(c1.companies[0]);
      autoSeat(c2.companies[0]);

      // Simulate offline on both
      const report = simulateOfflineReport(state1, 3600, 86400);
      const earnings = simulateOffline(state2, 3600, 86400);

      // earnings from report should match simulateOffline result
      expect(report.earnings).toBeCloseTo(earnings, 6);

      // Both states should end with same money
      expect(country1.money).toBeCloseTo(country2.money, 6);
    });
  });

  describe('2. projectsCompleted counts', () => {
    it('counts project completions correctly during offline simulation', () => {
      const state = createInitialState(NOW);
      const company = activeCompany(state);
      const country = activeCountry(state);

      // Set up: hire worker + buy desk so income flows
      country.money = 10000;
      buyWorkstation(state, 'basic');

      const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
      company.workers.push(worker);
      autoSeat(company);

      // Get project before simulation
      const projectBefore = getProject(company, 'landing');
      const completionsBefore = projectBefore.completions;

      // Simulate 1 hour offline
      const report = simulateOfflineReport(state, 3600, 86400);

      // Get project after simulation
      const projectAfter = getProject(company, 'landing');
      const completionsAfter = projectAfter.completions;

      // projectsCompleted should be > 0
      expect(report.projectsCompleted).toBeGreaterThan(0);

      // projectsCompleted should match the completion delta
      const completionDelta = completionsAfter - completionsBefore;
      expect(report.projectsCompleted).toBe(completionDelta);
    });
  });

  describe('3. trainingsDone', () => {
    it('counts trainings completed and clears timed action', () => {
      const state = createInitialState(NOW);
      const company = activeCompany(state);
      const country = activeCountry(state);

      // Set up: hire worker with enough money for training
      country.money = 100000;

      const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
      company.workers.push(worker);

      // Start training
      const trainingDuration = trainDurationSec(state, company, worker);
      expect(trainWorker(state, worker.id)).toBeNull();

      // Verify timed action exists
      const timedActionBefore = company.timedActions.find((a) => a.kind === 'training' && a.targetId === worker.id);
      expect(timedActionBefore).toBeDefined();
      expect(timedActionBefore!.remainingSec).toBe(trainingDuration);

      // Simulate offline for longer than training duration
      const simulateTime = trainingDuration + 100;
      const report = simulateOfflineReport(state, simulateTime, simulateTime * 2);

      // trainingsDone should be 1
      expect(report.trainingsDone).toBe(1);

      // Timed action should be gone
      const timedActionAfter = company.timedActions.find((a) => a.kind === 'training' && a.targetId === worker.id);
      expect(timedActionAfter).toBeUndefined();
    });
  });

  describe('4. Cap respected', () => {
    it('caps elapsed time at capSec', () => {
      // Create two identical states
      const state1 = createInitialState(NOW);
      const state2 = createInitialState(NOW);

      const company1 = activeCompany(state1);
      const company2 = activeCompany(state2);
      const country1 = activeCountry(state1);
      const country2 = activeCountry(state2);

      // Set up both identically
      country1.money = 10000;
      country2.money = 10000;

      buyWorkstation(state1, 'basic');
      buyWorkstation(state2, 'basic');

      const worker1 = makeWorker({ id: state1.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
      const worker2 = makeWorker({ id: state2.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });

      company1.workers.push(worker1);
      company2.workers.push(worker2);

      autoSeat(company1);
      autoSeat(company2);

      // Report with long elapsed but 1-hour cap
      const report1 = simulateOfflineReport(state1, 48 * 3600, 3600);

      // Report with just 1-hour elapsed on identical state
      const report2 = simulateOfflineReport(state2, 3600, 3600);

      // Both reports should have same earnings (both capped at 1 hour)
      expect(report1.earnings).toBeCloseTo(report2.earnings, 6);
    });
  });

  describe('5. Fresh state with no workers/desks', () => {
    it('has zero earnings and all counters zero', () => {
      const state = createInitialState(NOW);

      // Simulate offline without any workers or desks
      const report = simulateOfflineReport(state, 3600, 86400);

      // earnings should be 0 (or negative if salaries are paid)
      expect(report.earnings).toBeLessThanOrEqual(0);

      // All counters should be 0
      expect(report.projectsCompleted).toBe(0);
      expect(report.trainingsDone).toBe(0);
      expect(report.promotionsDone).toBe(0);
      expect(report.deskUpgradesDone).toBe(0);
      expect(report.floorsBuilt).toBe(0);
      expect(report.companiesBuilt).toBe(0);
      expect(report.quits).toBe(0);
    });
  });
});
