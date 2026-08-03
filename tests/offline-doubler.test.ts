import { describe, expect, it } from 'vitest';
import { OFFLINE_DOUBLER_COOLDOWN_SEC } from '../src/game/data';
import {
  activeCountry,
  claimOfflineDoubler,
  createInitialState,
  offlineDoublerReady,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { GameState } from '../src/game/types';

const NOW = 1_700_000_000_000;

describe('offlineDoublerReady', () => {
  it('returns true on a fresh state (never claimed)', () => {
    const state = createInitialState(NOW);
    expect(offlineDoublerReady(state, NOW)).toBe(true);
  });

  it('returns false immediately after a claim', () => {
    const state = createInitialState(NOW);

    // First claim at NOW
    const err = claimOfflineDoubler(state, 1000, NOW);
    expect(err).toBeNull();

    // Check ready status at the same instant
    expect(offlineDoublerReady(state, NOW)).toBe(false);
  });

  it('returns true again after OFFLINE_DOUBLER_COOLDOWN_SEC has elapsed', () => {
    const state = createInitialState(NOW);

    // First claim at NOW
    claimOfflineDoubler(state, 1000, NOW);
    expect(offlineDoublerReady(state, NOW)).toBe(false);

    // Check after cooldown + 1ms
    const afterCooldown = NOW + OFFLINE_DOUBLER_COOLDOWN_SEC * 1000 + 1;
    expect(offlineDoublerReady(state, afterCooldown)).toBe(true);
  });

  it('returns false just before cooldown expires', () => {
    const state = createInitialState(NOW);

    // First claim at NOW
    claimOfflineDoubler(state, 1000, NOW);

    // Check 1ms before cooldown expires
    const beforeCooldown = NOW + OFFLINE_DOUBLER_COOLDOWN_SEC * 1000 - 1;
    expect(offlineDoublerReady(state, beforeCooldown)).toBe(false);
  });
});

describe('claimOfflineDoubler', () => {
  describe('success case', () => {
    it('credits exactly the amount to the active country\'s money', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);
      const startMoney = country.money;
      const amount = 5000;

      const err = claimOfflineDoubler(state, amount, NOW);

      expect(err).toBeNull();
      expect(country.money).toBe(startMoney + amount);
    });

    it('increments country.totalEarned by the amount', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);
      const startEarned = country.totalEarned;
      const amount = 3000;

      claimOfflineDoubler(state, amount, NOW);

      expect(country.totalEarned).toBe(startEarned + amount);
    });

    it('increments state.totalEarned by the amount', () => {
      const state = createInitialState(NOW);
      const startEarned = state.totalEarned;
      const amount = 7500;

      claimOfflineDoubler(state, amount, NOW);

      expect(state.totalEarned).toBe(startEarned + amount);
    });

    it('sets doublerLastClaimedAt to now', () => {
      const state = createInitialState(NOW);

      claimOfflineDoubler(state, 2000, NOW);

      expect(state.doublerLastClaimedAt).toBe(NOW);
    });

    it('increments offlineDoublesClaimed', () => {
      const state = createInitialState(NOW);
      const startCount = state.offlineDoublesClaimed;

      claimOfflineDoubler(state, 2000, NOW);

      expect(state.offlineDoublesClaimed).toBe(startCount + 1);
    });

    it('returns null on success', () => {
      const state = createInitialState(NOW);

      const err = claimOfflineDoubler(state, 1000, NOW);

      expect(err).toBeNull();
    });

    it('can claim multiple times after cooldown', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);

      // First claim
      claimOfflineDoubler(state, 1000, NOW);
      const afterFirst = country.money;

      // Advance past cooldown
      const cooldownTime = NOW + OFFLINE_DOUBLER_COOLDOWN_SEC * 1000 + 1;
      claimOfflineDoubler(state, 2000, cooldownTime);

      expect(country.money).toBe(afterFirst + 2000);
      expect(state.offlineDoublesClaimed).toBe(2);
    });
  });

  describe('guards', () => {
    it('returns "ui.doublerNothing" and does not mutate when amount is 0', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);
      const startMoney = country.money;
      const startEarned = country.totalEarned;
      const startDoublesClaimed = state.offlineDoublesClaimed;

      const err = claimOfflineDoubler(state, 0, NOW);

      expect(err).toBe('ui.doublerNothing');
      expect(country.money).toBe(startMoney);
      expect(country.totalEarned).toBe(startEarned);
      expect(state.totalEarned).toBe(startEarned);
      expect(state.offlineDoublesClaimed).toBe(startDoublesClaimed);
      expect(state.doublerLastClaimedAt).toBe(0); // unchanged
    });

    it('returns "ui.doublerNothing" and does not mutate when amount is negative', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);
      const startMoney = country.money;
      const startEarned = country.totalEarned;
      const startDoublesClaimed = state.offlineDoublesClaimed;

      const err = claimOfflineDoubler(state, -1000, NOW);

      expect(err).toBe('ui.doublerNothing');
      expect(country.money).toBe(startMoney);
      expect(country.totalEarned).toBe(startEarned);
      expect(state.totalEarned).toBe(startEarned);
      expect(state.offlineDoublesClaimed).toBe(startDoublesClaimed);
      expect(state.doublerLastClaimedAt).toBe(0); // unchanged
    });

    it('returns "ui.doublerCooldown" when called within cooldown period', () => {
      const state = createInitialState(NOW);
      const country = activeCountry(state);

      // First claim at NOW
      claimOfflineDoubler(state, 1000, NOW);
      const moneyAfterFirst = country.money;

      // Second claim within cooldown
      const withinCooldown = NOW + 1000; // 1 second later
      const err = claimOfflineDoubler(state, 500, withinCooldown);

      expect(err).toBe('ui.doublerCooldown');
      // No mutation
      expect(country.money).toBe(moneyAfterFirst);
      expect(state.offlineDoublesClaimed).toBe(1);
      expect(state.doublerLastClaimedAt).toBe(NOW); // unchanged
    });

    it('allows claim exactly at cooldown expiration', () => {
      const state = createInitialState(NOW);

      // First claim at NOW
      claimOfflineDoubler(state, 1000, NOW);

      // Second claim exactly at cooldown expiration
      const atExpiration = NOW + OFFLINE_DOUBLER_COOLDOWN_SEC * 1000;
      const err = claimOfflineDoubler(state, 500, atExpiration);

      expect(err).toBeNull();
      expect(state.offlineDoublesClaimed).toBe(2);
      expect(state.doublerLastClaimedAt).toBe(atExpiration);
    });
  });
});

describe('migrate (same-version hygiene)', () => {
  describe('missing fields', () => {
    it('defaults doublerLastClaimedAt to 0 when missing', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as GameState;
      delete (save as Partial<GameState>).doublerLastClaimedAt;

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
    });

    it('defaults offlineDoublesClaimed to 0 when missing', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as GameState;
      delete (save as Partial<GameState>).offlineDoublesClaimed;

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(0);
    });

    it('defaults both fields to 0 when both are missing', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as GameState;
      delete (save as Partial<GameState>).doublerLastClaimedAt;
      delete (save as Partial<GameState>).offlineDoublesClaimed;

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
      expect(migrated.offlineDoublesClaimed).toBe(0);
    });
  });

  describe('corrupt values', () => {
    it('repairs negative doublerLastClaimedAt to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.doublerLastClaimedAt = -1000;

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
    });

    it('repairs NaN doublerLastClaimedAt to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.doublerLastClaimedAt = NaN;

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
    });

    it('repairs Infinity doublerLastClaimedAt to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.doublerLastClaimedAt = Infinity;

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
    });

    it('repairs string doublerLastClaimedAt to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      (save as Record<string, unknown>).doublerLastClaimedAt = 'not-a-number';

      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(0);
    });

    it('repairs negative offlineDoublesClaimed to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.offlineDoublesClaimed = -5;

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(0);
    });

    it('repairs NaN offlineDoublesClaimed to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.offlineDoublesClaimed = NaN;

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(0);
    });

    it('repairs Infinity offlineDoublesClaimed to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.offlineDoublesClaimed = Infinity;

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(0);
    });

    it('repairs string offlineDoublesClaimed to 0', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      (save as Record<string, unknown>).offlineDoublesClaimed = 'not-a-number';

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(0);
    });

    it('floors fractional offlineDoublesClaimed values', () => {
      const state = createInitialState(NOW);
      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      save.offlineDoublesClaimed = 3.7;

      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(3);
    });
  });

  describe('round-trip', () => {
    it('preserves valid doublerLastClaimedAt through serialize/migrate cycle', () => {
      const state = createInitialState(NOW);
      state.doublerLastClaimedAt = NOW - 10_000;

      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(NOW - 10_000);
    });

    it('preserves valid offlineDoublesClaimed through serialize/migrate cycle', () => {
      const state = createInitialState(NOW);
      state.offlineDoublesClaimed = 7;

      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(7);
    });

    it('preserves both fields together through serialize/migrate cycle', () => {
      const state = createInitialState(NOW);
      state.doublerLastClaimedAt = NOW - 5000;
      state.offlineDoublesClaimed = 3;

      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(NOW - 5000);
      expect(migrated.offlineDoublesClaimed).toBe(3);
    });

    it('preserves large offlineDoublesClaimed values', () => {
      const state = createInitialState(NOW);
      state.offlineDoublesClaimed = 999_999;

      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      const migrated = migrate(save, NOW);

      expect(migrated.offlineDoublesClaimed).toBe(999_999);
    });

    it('preserves recent doublerLastClaimedAt timestamps', () => {
      const state = createInitialState(NOW);
      const recentTime = NOW - 100;
      state.doublerLastClaimedAt = recentTime;

      const save = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
      const migrated = migrate(save, NOW);

      expect(migrated.doublerLastClaimedAt).toBe(recentTime);
    });
  });
});
