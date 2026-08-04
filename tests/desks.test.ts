import { describe, expect, it } from 'vitest';
import { WORKSTATIONS } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  companyWorkRate,
  createInitialState,
  deskUpgradeCost,
  deskUpgradeDurationSec,
  fastForwardAction,
  fastForwardCost,
  nextStationDef,
  simulateOffline,
  stationMultiplier,
  stationUnderUpgrade,
  tick,
  upgradeDesk,
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

describe('nextStationDef', () => {
  it('returns the next tier for basic, standing, and dual', () => {
    expect(nextStationDef('basic')).toBe('standing');
    expect(nextStationDef('standing')).toBe('dual');
    expect(nextStationDef('dual')).toBe('corner');
  });

  it('returns null for corner (already the best desk)', () => {
    expect(nextStationDef('corner')).toBeNull();
  });
});

describe('deskUpgradeCost', () => {
  const garage = activeCompany(createInitialState(NOW));

  it('costs round((next.baseCost - current.baseCost) × 0.8)', () => {
    // basic (20) → standing (250): (250 - 20) × 0.8 = 230 × 0.8 = 184
    expect(deskUpgradeCost(garage, 'basic')).toBe(184);

    // standing (250) → dual (2000): (2000 - 250) × 0.8 = 1750 × 0.8 = 1400
    expect(deskUpgradeCost(garage, 'standing')).toBe(1400);

    // dual (2000) → corner (20000): (20000 - 2000) × 0.8 = 18000 × 0.8 = 14400
    expect(deskUpgradeCost(garage, 'dual')).toBe(14400);
  });

  it('returns null for corner (already the best)', () => {
    expect(deskUpgradeCost(garage, 'corner')).toBeNull();
  });

  it('is cheaper than buying the new desk directly', () => {
    // Verify that upgrading a basic desk to standing is cheaper than buying a standing desk
    const standingCost = WORKSTATIONS.find((w) => w.id === 'standing')!.baseCost; // 250
    const upgradeCost = deskUpgradeCost(garage, 'basic')!;
    expect(upgradeCost).toBe(184);
    expect(upgradeCost).toBeLessThan(standingCost);
  });
});

describe('deskUpgradeDurationSec', () => {
  it('is 180 × 2^target_index', () => {
    // standing is at index 1: 180 × 2^1 = 360
    expect(deskUpgradeDurationSec('basic')).toBe(360);

    // dual is at index 2: 180 × 2^2 = 720
    expect(deskUpgradeDurationSec('standing')).toBe(720);

    // corner is at index 3: 180 × 2^3 = 1440
    expect(deskUpgradeDurationSec('dual')).toBe(1440);
  });

  it('returns null for corner (already the best)', () => {
    expect(deskUpgradeDurationSec('corner')).toBeNull();
  });
});

describe('upgradeDesk — basic validation', () => {
  it('refuses when the desk does not exist', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    country.money = 10_000;
    const err = upgradeDesk(state, 9999);
    expect(err).toBe('error.deskNotFound');
  });

  it('refuses when the desk is already the best (corner)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    // Create a corner desk
    c.workstations.push({ id: state.nextEntityId++, defId: 'corner' });
    const err = upgradeDesk(state, c.workstations[0].id);
    expect(err).toBe('error.bestDesk');
  });

  it('refuses when broke', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    // Buy the workstation first with enough money
    country.money = 20;
    buyWorkstation(state, 'basic');
    // Now set money to 0 to refuse the upgrade
    country.money = 0;
    const err = upgradeDesk(state, c.workstations[0].id);
    expect(err).toBe('error.notEnoughMoney');
  });

  it('refuses when a second upgrade is already running on the same desk', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;
    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;

    // First upgrade starts
    const err1 = upgradeDesk(state, deskId);
    expect(err1).toBeNull();
    expect(c.timedActions.some((a) => a.kind === 'desk-upgrade' && a.targetId === deskId)).toBe(true);

    // Second upgrade on same desk is rejected
    const err2 = upgradeDesk(state, deskId);
    expect(err2).toBe('error.deskUpgrading');
  });
});

describe('upgradeDesk — cost & action creation', () => {
  it('deducts money from the active country and creates a desk-upgrade timed action', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 500;

    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;
    const cost = deskUpgradeCost(c, 'basic')!;
    expect(cost).toBe(184);

    const before = country.money;
    const err = upgradeDesk(state, deskId);

    expect(err).toBeNull();
    expect(country.money).toBe(before - cost);
    expect(c.timedActions).toHaveLength(1);
    const action = c.timedActions[0];
    expect(action.kind).toBe('desk-upgrade');
    expect(action.targetId).toBe(deskId);
    expect(action.toDefId).toBe('standing');
    expect(action.remainingSec).toBe(360);
    expect(action.totalSec).toBe(360);
  });
});

describe('upgradeDesk — construction site: zero output', () => {
  it('unseats the worker so they produce nothing (stationMultiplier is 0 for a desk under upgrade)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    autoSeat(c);

    expect(worker.stationId).not.toBeNull();
    const deskId = c.workstations[0].id;

    upgradeDesk(state, deskId);

    // Worker is unseated during construction
    expect(worker.stationId).toBeNull();
    // Desk is marked as under upgrade
    expect(stationUnderUpgrade(c, deskId)).toBe(true);
    // If they were still on the desk, its multiplier would be 0
    const multiplierIfSeated = stationMultiplier(c, deskId);
    expect(multiplierIfSeated).toBe(0);
  });
});

describe('upgradeDesk — completion after tick', () => {
  it('upgrades the desk defId and fires deskUpgradesDone event after tick past duration', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;
    const duration = deskUpgradeDurationSec('basic')!;
    expect(duration).toBe(360);

    upgradeDesk(state, deskId);
    expect(c.workstations[0].defId).toBe('basic');

    // Tick past the upgrade duration
    const events = tick(state, duration + 1);

    expect(c.workstations[0].defId).toBe('standing');
    expect(c.timedActions.filter((a) => a.kind === 'desk-upgrade')).toHaveLength(0);
    expect(events.deskUpgradesDone).toHaveLength(1);
    expect(events.deskUpgradesDone[0]).toEqual({
      companyId: c.id,
      stationId: deskId,
      newDefId: 'standing',
    });
  });

  it('completes multiple upgrades separately on different desks', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    buyWorkstation(state, 'basic');
    const desk1Id = c.workstations[0].id;
    const desk2Id = c.workstations[1].id;

    country.builders.count = 2; // two concurrent renovations need two builders
    upgradeDesk(state, desk1Id);
    upgradeDesk(state, desk2Id);
    expect(c.timedActions).toHaveLength(2);

    const duration = deskUpgradeDurationSec('basic')!;
    const events = tick(state, duration + 1);

    expect(c.workstations[0].defId).toBe('standing');
    expect(c.workstations[1].defId).toBe('standing');
    expect(events.deskUpgradesDone).toHaveLength(2);
  });
});

describe('upgradeDesk — reseating after upgrade', () => {
  it('re-seats workers to the upgraded desk after completion (best workers get best desks)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    buyWorkstation(state, 'basic');

    const weak = makeWorker({ id: state.nextEntityId++, tierId: 'intern' });
    const strong = makeWorker({ id: state.nextEntityId++, tierId: 'senior' });
    c.workers.push(weak, strong);
    autoSeat(c);

    // Before upgrade: senior on better desk (if available)
    // With two basic desks (both multiplier 1), the strong worker gets one.
    expect(strong.stationId).not.toBeNull();
    expect(weak.stationId).not.toBeNull();

    // Upgrade one desk to standing
    const desk1Id = c.workstations[0].id;
    upgradeDesk(state, desk1Id);
    const duration = deskUpgradeDurationSec('basic')!;
    tick(state, duration + 1);

    // After upgrade: strong worker should migrate to the standing desk
    expect(strong.stationId).not.toBeNull();
    const strongDeskAfter = strong.stationId!;
    // The strong worker should now be on the upgraded (standing) desk
    expect(c.workstations.find((w) => w.id === strongDeskAfter)?.defId).toBe('standing');
  });
});

describe('upgradeDesk — offline simulation parity', () => {
  it('completes the same way through simulateOffline as through manual ticks', () => {
    function setupState(): [typeof state, number] {
      const state = createInitialState(NOW);
      const c = activeCompany(state);
      const country = activeCountry(state);
      country.money = 100_000;
      buyWorkstation(state, 'basic');
      const deskId = c.workstations[0].id;
      upgradeDesk(state, deskId);
      const duration = deskUpgradeDurationSec('basic')!;
      return [state, duration];
    }

    const [viaOffline, duration] = setupState();
    const [viaManualTicks] = setupState();

    // Via simulateOffline
    simulateOffline(viaOffline, duration + 100, duration + 100);
    expect(activeCompany(viaOffline).workstations[0].defId).toBe('standing');

    // Via manual ticks
    tick(viaManualTicks, duration + 100);
    expect(activeCompany(viaManualTicks).workstations[0].defId).toBe('standing');

    // Both should end up in the same state
    expect(viaOffline.countries[0].money).toBeCloseTo(
      viaManualTicks.countries[0].money,
      6,
    );
  });
});

describe('fastForwardAction — desk upgrades', () => {
  it('fast-forwards a desk upgrade: first use is free', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;
    upgradeDesk(state, deskId);

    const action = c.timedActions[0];
    const cost = fastForwardCost(state, action);
    expect(cost).toBe(0); // first fast-forward is free
    expect(state.fastForwardsUsed).toBe(0);

    const err = fastForwardAction(state, action.id);
    expect(err).toBeNull();
    expect(c.workstations[0].defId).toBe('standing');
    expect(c.timedActions).toHaveLength(0);
    expect(state.fastForwardsUsed).toBe(1);
  });

  it('fast-forwards a second desk upgrade: costs VsCoin', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Mark first fast-forward as used
    state.fastForwardsUsed = 1;

    // Set up initial standing desk
    c.workstations.push({ id: state.nextEntityId++, defId: 'standing' });

    upgradeDesk(state, c.workstations[0].id);
    const action = c.timedActions[0];
    const remainingSec = action.remainingSec;
    expect(remainingSec).toBe(720); // standing upgrade duration

    const cost = fastForwardCost(state, action);
    expect(cost).toBe(Math.max(1, Math.ceil(remainingSec / 600)));
    expect(cost).toBe(2); // ceil(720 / 600) = ceil(1.2) = 2

    state.vsCoin = cost;
    const err = fastForwardAction(state, action.id);
    expect(err).toBeNull();
    expect(c.workstations[0].defId).toBe('dual');
    expect(state.vsCoin).toBe(0); // spent on fast-forward
    expect(state.fastForwardsUsed).toBe(2);
  });

  it('rounds up cost correctly: ceil(remaining/600)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;
    state.fastForwardsUsed = 1; // not the first fast-forward

    buyWorkstation(state, 'basic');
    upgradeDesk(state, c.workstations[0].id);

    // Manually set remaining time to test rounding
    const action = c.timedActions[0];
    action.remainingSec = 1; // 1 sec remaining
    const cost = fastForwardCost(state, action);
    expect(cost).toBe(Math.max(1, Math.ceil(1 / 600))); // ceil(0.00167) = 1
    expect(cost).toBe(1);

    action.remainingSec = 600;
    expect(fastForwardCost(state, action)).toBe(1); // ceil(600/600) = 1

    action.remainingSec = 601;
    expect(fastForwardCost(state, action)).toBe(2); // ceil(601/600) = 2
  });
});

describe('desk upgrade lifecycle — comprehensive flow', () => {
  it('basic → standing → dual upgrade chain works end-to-end', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000;

    // Buy a basic desk (costs 20)
    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;
    expect(c.workstations[0].defId).toBe('basic');
    const moneyAfterBuy = country.money;

    // Upgrade to standing
    const cost1 = deskUpgradeCost(c, 'basic')!;
    expect(cost1).toBe(184);
    upgradeDesk(state, deskId);
    expect(country.money).toBe(moneyAfterBuy - cost1);

    const duration1 = deskUpgradeDurationSec('basic')!;
    tick(state, duration1 + 1);
    expect(c.workstations[0].defId).toBe('standing');
    const moneyAfterUpgrade1 = country.money;

    // Upgrade to dual
    const cost2 = deskUpgradeCost(c, 'standing')!;
    expect(cost2).toBe(1400);
    upgradeDesk(state, deskId);
    expect(country.money).toBe(moneyAfterUpgrade1 - cost2);

    const duration2 = deskUpgradeDurationSec('standing')!;
    tick(state, duration2 + 1);
    expect(c.workstations[0].defId).toBe('dual');
    const moneyAfterUpgrade2 = country.money;

    // Try to upgrade to corner
    const cost3 = deskUpgradeCost(c, 'dual')!;
    expect(cost3).toBe(14400);
    upgradeDesk(state, deskId);
    expect(country.money).toBe(moneyAfterUpgrade2 - cost3);

    const duration3 = deskUpgradeDurationSec('dual')!;
    tick(state, duration3 + 1);
    expect(c.workstations[0].defId).toBe('corner');

    // Now it's at the best, can't upgrade further
    const errMsg = upgradeDesk(state, deskId);
    expect(errMsg).toBe('error.bestDesk');
  });
});

describe('upgradeDesk — construction downtime', () => {
  it('unseats a seated worker when their desk starts upgrading', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    autoSeat(c);

    expect(worker.stationId).not.toBeNull();
    const deskId = c.workstations[0].id;
    upgradeDesk(state, deskId);

    // Worker is unseated
    expect(worker.stationId).toBeNull();
    // Desk is marked as under upgrade
    expect(stationUnderUpgrade(c, deskId)).toBe(true);
  });

  it('produces nothing during the upgrade (stationMultiplier is 0)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 5 });
    c.workers.push(worker);
    autoSeat(c);

    const deskId = c.workstations[0].id;
    const rateBefore = companyWorkRate(state, c);
    expect(rateBefore).toBeGreaterThan(0);

    upgradeDesk(state, deskId);
    const rateDuringUpgrade = companyWorkRate(state, c);
    expect(rateDuringUpgrade).toBe(0);

    // Tick partway through upgrade, still no production
    const duration = deskUpgradeDurationSec('basic')!;
    tick(state, duration / 2);
    const rateMidway = companyWorkRate(state, c);
    expect(rateMidway).toBe(0);
  });

  it('re-seats the evicted worker at a second free desk if available', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    buyWorkstation(state, 'basic');
    const deskId1 = c.workstations[0].id;
    const deskId2 = c.workstations[1].id;

    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior' });
    c.workers.push(worker);
    autoSeat(c);

    // Worker is seated (on first desk)
    expect(worker.stationId).not.toBeNull();

    // Upgrade the first desk
    upgradeDesk(state, deskId1);

    // Worker should be re-seated on the second desk
    expect(worker.stationId).toBe(deskId2);
    expect(stationUnderUpgrade(c, deskId1)).toBe(true);
  });

  it('re-seats the worker at the upgraded desk after completion', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10_000;

    buyWorkstation(state, 'basic');
    const deskId = c.workstations[0].id;
    const worker = makeWorker({ id: state.nextEntityId++, tierId: 'junior', skillLevel: 5 });
    c.workers.push(worker);
    autoSeat(c);

    const rateBefore = companyWorkRate(state, c);
    expect(rateBefore).toBeGreaterThan(0);

    upgradeDesk(state, deskId);
    expect(worker.stationId).toBeNull();
    expect(companyWorkRate(state, c)).toBe(0);

    // Tick past the upgrade completion
    const duration = deskUpgradeDurationSec('basic')!;
    tick(state, duration + 1);

    // Worker should be re-seated
    expect(worker.stationId).toBe(deskId);
    expect(stationUnderUpgrade(c, deskId)).toBe(false);
    // Production should resume
    const rateAfter = companyWorkRate(state, c);
    expect(rateAfter).toBeGreaterThan(0);
  });
});
