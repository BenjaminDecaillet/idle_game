import { describe, expect, it } from 'vitest';
import {
  VAULT_CAP_MIN,
  VAULT_CAP_MINUTES,
  VAULT_OPEN_COST,
  VAULT_RATE,
  WORKER_TIERS,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  createInitialState,
  grossRewardRate,
  grantVsCoin,
  openVault,
  prestigeReset,
  simulateOffline,
  tick,
  vaultCap,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { GameState, WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function makeWorkerState(overrides: Partial<WorkerState> = {}) {
  return {
    id: 9999,
    name: 'Test Worker',
    tierId: 'junior',
    specialization: 'Frontend',
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
// vaultCap
// ---------------------------------------------------------------------------

describe('vaultCap', () => {
  it('returns VAULT_CAP_MIN on a zero-income state', () => {
    const state = createInitialState(NOW);
    // Fresh state with no workers/income
    const cap = vaultCap(state);
    expect(cap).toBe(VAULT_CAP_MIN);
  });

  it('returns the max of VAULT_CAP_MIN and income-scaled cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    // Set up a producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Tick to get some income rate
    tick(state, 10);

    const grr = grossRewardRate(state);
    const expectedCap = Math.max(VAULT_CAP_MIN, Math.round(grr * 60 * VAULT_CAP_MINUTES));
    const actualCap = vaultCap(state);
    expect(actualCap).toBe(expectedCap);
  });
});

// ---------------------------------------------------------------------------
// Accrual: vault accumulates VAULT_RATE × completion rewards
// ---------------------------------------------------------------------------

describe('Vault accrual', () => {
  it('accumulates VAULT_RATE of each project completion reward on top of country money', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1000;

    // Set up a producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    const vaultBefore = state.vault.amount;
    const moneyBefore = country.money;

    // Tick long enough to complete the project
    // junior with basic desk and spec match = 1 * 1 * 1.5 = 1.5 work/sec
    // landing needs ~30 work, so 30/1.5 = 20 sec
    const dt = 25;
    const events = tick(state, dt);

    expect(events.completions.length).toBeGreaterThanOrEqual(1);

    // Vault should have accrued VAULT_RATE × sum of rewards
    const expectedVaultGain = events.completions.reduce(
      (sum, completion) => sum + completion.reward * VAULT_RATE,
      0
    );
    expect(state.vault.amount - vaultBefore).toBeCloseTo(expectedVaultGain, 5);

    // Country money should have gained the FULL rewards (vault is on top, not skimmed)
    // but reduced by salary cost
    const expectedMoneyGain = events.completions.reduce(
      (sum, completion) => sum + completion.reward,
      0
    );
    const juniorTier = WORKER_TIERS.find((t) => t.id === 'junior')!;
    const salaryCost = juniorTier.salary * dt;
    expect(country.money - moneyBefore).toBeCloseTo(expectedMoneyGain - salaryCost, 5);
  });

  it('accrues vault across multiple completions in a single tick', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    const vaultBefore = state.vault.amount;
    const moneyBefore = country.money;

    // Long tick to get many completions
    const dt = 200;
    const events = tick(state, dt);

    expect(events.completions.length).toBeGreaterThan(1);

    // Vault gains VAULT_RATE of all rewards
    const totalReward = events.completions.reduce((sum, c) => sum + c.reward, 0);
    const expectedVaultGain = totalReward * VAULT_RATE;
    expect(state.vault.amount - vaultBefore).toBeCloseTo(expectedVaultGain, 5);

    // Country money gains the full rewards minus salary cost
    const seniorTier = WORKER_TIERS.find((t) => t.id === 'senior')!;
    const salaryCost = seniorTier.salary * dt;
    expect(country.money - moneyBefore).toBeCloseTo(totalReward - salaryCost, 5);
  });
});

// ---------------------------------------------------------------------------
// Cap: vault is clamped to vaultCap(state)
// ---------------------------------------------------------------------------

describe('Vault cap', () => {
  it('clamps vault to vaultCap after accrual', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100000;

    // Set up producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Tick to accumulate vault
    tick(state, 100);

    const cap = vaultCap(state);
    expect(state.vault.amount).toBeLessThanOrEqual(cap);
  });

  it('clamps manually-set vault above the cap', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100000;

    // Set up a minimal producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Tick once to establish income rate
    tick(state, 10);

    const cap = vaultCap(state);

    // Manually set vault above the cap
    state.vault.amount = cap * 2;
    expect(state.vault.amount).toBeGreaterThan(cap);

    // Tick should clamp it
    tick(state, 1);
    expect(state.vault.amount).toBeLessThanOrEqual(cap);
    // With no completions in 1 sec, should be exactly at cap or below
  });
});

// ---------------------------------------------------------------------------
// openVault: error cases and success
// ---------------------------------------------------------------------------

describe('openVault — error cases', () => {
  it('returns "error.vaultEmpty" when vault is empty and does not spend VsCoin', () => {
    const state = createInitialState(NOW);
    state.vsCoin = 100;

    expect(state.vault.amount).toBe(0);
    const err = openVault(state);
    expect(err).toBe('error.vaultEmpty');
    expect(state.vsCoin).toBe(100); // unchanged
  });

  it('returns "error.notEnoughVsCoin" when vault has money but VsCoin insufficient', () => {
    const state = createInitialState(NOW);
    state.vault.amount = 1000;
    state.vsCoin = VAULT_OPEN_COST - 1; // not enough

    const vaultBefore = state.vault.amount;
    const err = openVault(state);
    expect(err).toBe('error.notEnoughVsCoin');
    expect(state.vault.amount).toBe(vaultBefore); // unchanged
  });
});

describe('openVault — success', () => {
  it('transfers vault amount to country money and empties the vault', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const vaultAmount = 5000;
    state.vault.amount = vaultAmount;
    state.vsCoin = VAULT_OPEN_COST;

    const moneyBefore = country.money;

    const err = openVault(state);
    expect(err).toBeNull();

    expect(country.money).toBe(moneyBefore + vaultAmount);
    expect(state.vault.amount).toBe(0);
    expect(state.vsCoin).toBe(0); // VAULT_OPEN_COST was spent
  });

  it('creates a ledger entry with amount=-VAULT_OPEN_COST and source="vault:open"', () => {
    const state = createInitialState(NOW);
    state.vault.amount = 5000;
    state.vsCoin = VAULT_OPEN_COST;

    openVault(state);

    const lastEntry = state.vsCoinLedger[state.vsCoinLedger.length - 1];
    expect(lastEntry).toEqual({ amount: -VAULT_OPEN_COST, source: 'vault:open' });
  });

  it('works when vault and VsCoin are exactly at threshold amounts', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const vaultAmount = 1;
    state.vault.amount = vaultAmount;
    state.vsCoin = VAULT_OPEN_COST;

    const moneyBefore = country.money;
    const err = openVault(state);

    expect(err).toBeNull();
    expect(country.money).toBe(moneyBefore + vaultAmount);
    expect(state.vault.amount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Offline: simulateOffline accrues vault the same way as live tick
// ---------------------------------------------------------------------------

describe('Vault offline accrual', () => {
  it('accrues vault during offline simulation', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 10000;

    // Set up a producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'junior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    const vaultBefore = state.vault.amount;
    expect(vaultBefore).toBe(0);

    // Simulate offline time
    simulateOffline(state, 50, 50);

    // Vault should have accrued
    expect(state.vault.amount).toBeGreaterThan(vaultBefore);
  });

  it('offline vault follows the same cap as live tick', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100000;

    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Simulate a long offline time
    simulateOffline(state, 1000, 1000);

    const cap = vaultCap(state);
    expect(state.vault.amount).toBeLessThanOrEqual(cap);
  });
});

// ---------------------------------------------------------------------------
// Prestige: vault survives prestigeReset
// ---------------------------------------------------------------------------

describe('Vault prestige survival', () => {
  it('preserves vault amount after prestigeReset', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100000;

    // Set up producing company
    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    // Accumulate vault
    tick(state, 100);
    const vaultBeforePrestige = state.vault.amount;
    expect(vaultBeforePrestige).toBeGreaterThan(0);

    // Set up prestige conditions
    state.story.seen.push('dream-achieved');
    state.totalEarned = 1e15; // over the prestige threshold

    // Prestige reset
    const err = prestigeReset(state, NOW + 1000);
    expect(err).toBeNull();

    // Vault should survive (same amount)
    expect(state.vault.amount).toBe(vaultBeforePrestige);
  });

  it('vault can be opened after prestige reset with fresh VsCoin', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100000;

    buyWorkstation(state, 'basic');
    const worker = makeWorkerState({ id: state.nextEntityId++, tierId: 'senior', specialization: 'Frontend' });
    c.workers.push(worker);
    autoSeat(c);

    tick(state, 50);
    const vaultAmount = state.vault.amount;
    expect(vaultAmount).toBeGreaterThan(0);

    // Set up prestige
    state.story.seen.push('dream-achieved');
    state.totalEarned = 1e15;

    prestigeReset(state, NOW + 1000);

    // Grant VsCoin and open vault (which survived prestige)
    grantVsCoin(state, VAULT_OPEN_COST, 'test');
    const moneyBefore = activeCountry(state).money;
    const err = openVault(state);

    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(moneyBefore + vaultAmount);
  });
});

// ---------------------------------------------------------------------------
// Migrate: vault field handling in save/load
// ---------------------------------------------------------------------------

describe('Vault migration', () => {
  it('missing vault field defaults to { amount: 0 }', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      countries: [],
      activeCountryId: 'us',
      totalEarned: 0,
      projectsCompleted: 0,
      startedAt: NOW,
      lastSeen: NOW,
      playTimeSec: 0,
      ownedWallpapers: ['concrete'],
      defaultWallpaperId: 'concrete',
      ownedMapThemes: ['daylight'],
      mapThemeId: 'daylight',
      boosts: [],
      settings: { sound: true, particles: true, music: false, musicVolume: 0.5, timeScale: 1, language: 'auto' },
      story: { seen: [], queue: [] },
      tutorial: { step: 0, done: false, giftGiven: false },
      player: { name: 'Founder', look: { skin: 0, hair: 0, hairstyle: 0, eyeStyle: 0, mouthStyle: 0, facialHair: 0, outfit: 0, accessory: 0, portrait: 0 } },
      vsCoin: 0,
      vsCoinLedger: [],
      missionsClaimed: [],
      daily: { day: -1, contracts: [], baselines: {}, claimed: [] },
      // vault field omitted
      globalUpgrades: {},
      fastForwardsUsed: 0,
      freeFastForwards: 0,
      floorGiftClaimed: false,
      promotionsDone: 0,
      prestige: { count: 0, reputation: 0 },
      doublerLastClaimedAt: 0,
      offlineDoublesClaimed: 0,
      nextEntityId: 1,
    };

    const state = migrate(parsed, NOW);
    expect(state.vault).toEqual({ amount: 0 });
  });

  it('corrupt vault amount (negative) defaults to 0', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: -100 },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(0);
  });

  it('corrupt vault amount (NaN) defaults to 0', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: NaN },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(0);
  });

  it('corrupt vault amount (Infinity) defaults to 0', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: Infinity },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(0);
  });

  it('valid vault amount round-trips', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: 12345.67 },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(12345.67);
  });

  it('valid vault at exactly VAULT_CAP_MIN survives migration', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: VAULT_CAP_MIN },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(VAULT_CAP_MIN);
  });

  it('valid zero vault survives migration', () => {
    const parsed: Partial<GameState> = {
      version: 10,
      vault: { amount: 0 },
    };

    const state = migrate(parsed, NOW);
    expect(state.vault.amount).toBe(0);
  });
});
