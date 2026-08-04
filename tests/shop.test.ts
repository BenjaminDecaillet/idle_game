import { describe, expect, it } from 'vitest';
import { BETA_FREE_IAP } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  builderCost,
  buyCompany,
  buyShopPack,
  buyWorkstation,
  claimVsCoinPack,
  createInitialState,
  freeBuilders,
  grantVsCoin,
  hireBuilder,
  shopPackCash,
  shopPackUnlocked,
  siteUnderConstruction,
  tick,
  trainWorker,
} from '../src/game/engine';

const NOW = 1_700_000_000_000;

/** Helper: after buyCompany, complete the build and return the company. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return activeCountry(state).companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return activeCountry(state).companies.find((c) => c.siteId === siteId)!;
}

/** Helper: create a state with a team producing income on a project. */
function stateWithTeam(): any {
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
  });
  buyWorkstation(state, 'basic');
  return state;
}

describe('A) Builder purchase ladder', () => {
  it('fresh country starts with 1 builder', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    expect(country.builders.count).toBe(1);
  });

  it('builderCost returns cash for builders #2 and #3, then VsCoin for #4+', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    // Builder #2 costs BUILDER_CASH_COSTS[0] = 2500
    expect(builderCost(country)).toEqual({ cash: 2_500 });

    country.money = 3_000;
    hireBuilder(state);
    expect(country.builders.count).toBe(2);
    country.money = 250_500; // fund builder #3
    // Builder #3 costs BUILDER_CASH_COSTS[1] = 250000
    expect(builderCost(country)).toEqual({ cash: 250_000 });

    hireBuilder(state);
    expect(country.builders.count).toBe(3);
    grantVsCoin(state, 1000, 'test');

    // Builder #4 costs BUILDER_VSCOIN_COSTS[0] = 8
    expect(builderCost(country)).toEqual({ vsCoin: 8 });

    hireBuilder(state);
    expect(country.builders.count).toBe(4);

    // Builder #5 costs BUILDER_VSCOIN_COSTS[1] = 15
    expect(builderCost(country)).toEqual({ vsCoin: 15 });

    hireBuilder(state);
    expect(country.builders.count).toBe(5);

    // Builder #6: ceil(12 × 1.8^(6-5)) = ceil(12 × 1.8) = ceil(21.6) = 22
    expect(builderCost(country)).toEqual({ vsCoin: 22 });

    hireBuilder(state);
    expect(country.builders.count).toBe(6);

    // Builder #7: ceil(12 × 1.8^(7-5)) = ceil(12 × 1.8²) = ceil(12 × 3.24) = ceil(38.88) = 39
    expect(builderCost(country)).toEqual({ vsCoin: 39 });
  });

  it('hireBuilder charges cash from wallet for builders #2-#3', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    country.money = 3_000;
    expect(hireBuilder(state)).toBeNull();
    expect(country.builders.count).toBe(2);
    expect(country.money).toBe(500); // 3000 - 2500

    country.money -= 500; // go broke
    expect(hireBuilder(state)).toBe('Not enough money');
    expect(country.builders.count).toBe(2); // no increment
  });

  it('hireBuilder charges VsCoin for builders #4+', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    country.money = 300_000;
    hireBuilder(state);
    hireBuilder(state);
    grantVsCoin(state, 50, 'test');

    const ledger = state.vsCoinLedger;
    const initialLength = ledger.length;

    expect(hireBuilder(state)).toBeNull();
    expect(country.builders.count).toBe(4);
    // Verify ledger entry was created
    expect(ledger.length).toBe(initialLength + 1);
    expect(ledger[ledger.length - 1]).toEqual(
      expect.objectContaining({
        amount: -8,
        source: 'shop:builder',
      })
    );
  });

  it('hireBuilder errors when VsCoin insufficient', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);

    country.money = 300_000;
    hireBuilder(state);
    hireBuilder(state);
    // Do NOT grant VsCoin

    expect(hireBuilder(state)).toBe('Not enough VsCoin');
    expect(country.builders.count).toBe(3); // no increment
  });

  it('freeBuilders decreases when a training starts and recovers when it completes', () => {
    const state = stateWithTeam();
    const country = activeCountry(state);
    country.money = 10_000;

    const company = activeCompany(state);
    const worker = company.workers[0];

    expect(freeBuilders(country)).toBe(1);

    // Start training the worker
    expect(trainWorker(state, worker.id)).toBeNull();
    expect(freeBuilders(country)).toBe(0); // builder now busy

    // Find the training action to get its duration
    const trainingAction = company.timedActions.find((a) => a.kind === 'training');
    expect(trainingAction).toBeDefined();
    const duration = trainingAction!.remainingSec;

    // Complete the training
    tick(state, duration + 1);
    expect(freeBuilders(country)).toBe(1); // builder is free again
  });
});

describe('B) Shop cash packs', () => {
  it('shopPackCash with zero income returns floorCash', () => {
    const state = createInitialState(NOW);
    expect(shopPackCash(state, 'seed')).toBe(1000); // floorCash for seed
  });

  it('shopPackCash with income grows with minutes', () => {
    const state = stateWithTeam();
    tick(state, 1);

    // Now we should have some income
    const seedCash = shopPackCash(state, 'seed');
    const seriesACash = shopPackCash(state, 'series-a');

    // seed is 5 min, series-a is 15 min
    // Both should use the same rate, so series-a should be higher
    expect(seriesACash).toBeGreaterThanOrEqual(seedCash);
  });

  it('shopPackUnlocked: seed is true with 1 company', () => {
    const state = createInitialState(NOW);
    expect(shopPackUnlocked(state, 'seed')).toBe(true);
  });

  it('shopPackUnlocked: series-a is false until 2 companies', () => {
    const state = createInitialState(NOW);
    expect(shopPackUnlocked(state, 'series-a')).toBe(false);

    // Buy and complete a second company
    activeCountry(state).money = 500_000;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');

    expect(shopPackUnlocked(state, 'series-a')).toBe(true);
  });

  it('buyShopPack fails with locked pack', () => {
    const state = createInitialState(NOW);
    grantVsCoin(state, 1000, 'test');

    // series-a is locked initially
    expect(buyShopPack(state, 'series-a')).toBe('error.packLocked');
    // VsCoin should not be spent
    expect(state.vsCoinLedger[state.vsCoinLedger.length - 1]).toEqual(
      expect.objectContaining({ amount: 1000 })
    );
  });

  it('buyShopPack fails with insufficient VsCoin', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const initialMoney = country.money; // 50
    grantVsCoin(state, 2, 'test');

    expect(buyShopPack(state, 'seed')).toBe('Not enough VsCoin');
    expect(country.money).toBe(initialMoney); // wallet unchanged
  });

  it('buyShopPack succeeds: spends exact VsCoin, credits wallet, no totalEarned change', () => {
    const state = createInitialState(NOW);
    grantVsCoin(state, 10, 'test');

    const country = activeCountry(state);
    const priorMoney = country.money;
    const priorTotalEarned = state.totalEarned;
    const ledgerLen = state.vsCoinLedger.length;

    const cash = shopPackCash(state, 'seed');
    expect(buyShopPack(state, 'seed')).toBeNull();

    expect(country.money).toBe(priorMoney + cash);
    expect(state.totalEarned).toBe(priorTotalEarned); // NOT incremented
    expect(state.vsCoinLedger[ledgerLen]).toEqual(
      expect.objectContaining({
        amount: -4,
        source: 'shop:seed',
      })
    );
  });

  it('buyShopPack with negative wallet (debt): credit pays debt down first', () => {
    const state = createInitialState(NOW);
    grantVsCoin(state, 10, 'test');

    const country = activeCountry(state);
    country.money = -5_000; // debt
    const cash = shopPackCash(state, 'seed');

    expect(buyShopPack(state, 'seed')).toBeNull();
    // Money was -5000, received ~1000, so now around -4000
    expect(country.money).toBe(-5_000 + cash);
  });

  it('buyShopPack does not change country.totalEarned', () => {
    const state = stateWithTeam();
    grantVsCoin(state, 50, 'test');

    const country = activeCountry(state);
    const priorCountryEarned = country.totalEarned;

    buyShopPack(state, 'seed');

    expect(country.totalEarned).toBe(priorCountryEarned);
  });
});

describe('C) VsCoin tab', () => {
  it('claimVsCoinPack vsc-starter grants 20 and is repeatable', () => {
    const state = createInitialState(NOW);

    const ledgerLen = state.vsCoinLedger.length;
    expect(claimVsCoinPack(state, 'vsc-starter')).toBeNull();
    // Verify ledger entry
    expect(state.vsCoinLedger[ledgerLen]).toEqual(
      expect.objectContaining({
        amount: 20,
        source: 'shop:vsc-starter',
      })
    );

    // Claim again
    expect(claimVsCoinPack(state, 'vsc-starter')).toBeNull();
    expect(state.vsCoinLedger[ledgerLen + 1]).toEqual(
      expect.objectContaining({
        amount: 20,
        source: 'shop:vsc-starter',
      })
    );

    // Claim third time
    expect(claimVsCoinPack(state, 'vsc-starter')).toBeNull();
    expect(state.vsCoinLedger[ledgerLen + 2]).toEqual(
      expect.objectContaining({
        amount: 20,
        source: 'shop:vsc-starter',
      })
    );
  });

  it('claimVsCoinPack: every SKU is a free claim during beta', () => {
    const state = createInitialState(NOW);
    const ledgerLen = state.vsCoinLedger.length;

    expect(claimVsCoinPack(state, 'vsc-angel')).toBeNull();
    expect(claimVsCoinPack(state, 'vsc-venture')).toBeNull();
    expect(claimVsCoinPack(state, 'vsc-growth')).toBeNull();
    expect(claimVsCoinPack(state, 'vsc-unicorn')).toBeNull();

    expect(state.vsCoinLedger.length).toBe(ledgerLen + 4);
    expect(state.vsCoinLedger[ledgerLen + 3]).toEqual(
      expect.objectContaining({ amount: 1000, source: 'shop:vsc-unicorn' }),
    );
  });

  it('BETA_FREE_IAP must be true (guards the beta free claim)', () => {
    expect(BETA_FREE_IAP).toBe(true);
  });
});
