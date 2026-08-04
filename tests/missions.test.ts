import { describe, expect, it } from 'vitest';
import {
  MISSIONS,
  VSCOIN_BOOST_COST,
  VSCOIN_BOOST_DURATION_SEC,
  VSCOIN_BOOST_MULT,
  VSCOIN_LEDGER_CAP,
  VSCOIN_PER_STORY_BEAT,
} from '../src/game/data';
import {
  activeCountry,
  buyCompany,
  buyUpgrade,
  buyVsCoinBoost,
  buyWallpaper,
  buyWorkstation,
  createInitialState,
  grantVsCoin,
  siteUnderConstruction,
  spendVsCoin,
  tick,
  upgradeVsCoinCost,
} from '../src/game/engine';
import {
  claimMission,
  claimableMissions,
  metricValue,
  missionCompleted,
  missionProgress,
  visibleMissions,
} from '../src/game/missions';
import { migrate } from '../src/game/save';
import { advanceStory } from '../src/game/story';
import { skipTutorial } from '../src/game/tutorial';
import type { WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function makeWorker(id: number): WorkerState {
  return {
    id,
    name: 'Test Worker',
    tierId: 'intern',
    specialization: 'Frontend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
  };
}

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
}

describe('vsCoin ledger API', () => {
  it('grants and spends with a full audit trail', () => {
    const state = createInitialState(NOW);
    expect(grantVsCoin(state, 5, 'test:grant')).toBeNull();
    expect(state.vsCoin).toBe(5);
    expect(spendVsCoin(state, 2, 'test:sink')).toBeNull();
    expect(state.vsCoin).toBe(3);
    expect(state.vsCoinLedger).toEqual([
      { amount: 5, source: 'test:grant' },
      { amount: -2, source: 'test:sink' },
    ]);
  });

  it('rejects invalid amounts and overdrafts', () => {
    const state = createInitialState(NOW);
    expect(grantVsCoin(state, 0, 'x')).toBe('error.invalidAmount');
    expect(grantVsCoin(state, -3, 'x')).toBe('error.invalidAmount');
    expect(grantVsCoin(state, Number.NaN, 'x')).toBe('error.invalidAmount');
    expect(spendVsCoin(state, 1, 'x')).toBe('error.notEnoughVsCoin');
    expect(state.vsCoin).toBe(0);
    expect(state.vsCoinLedger).toEqual([]);
  });

  it('caps the ledger length', () => {
    const state = createInitialState(NOW);
    for (let i = 0; i < VSCOIN_LEDGER_CAP + 50; i++) grantVsCoin(state, 1, `g${i}`);
    expect(state.vsCoinLedger).toHaveLength(VSCOIN_LEDGER_CAP);
    expect(state.vsCoinLedger[VSCOIN_LEDGER_CAP - 1].source).toBe(
      `g${VSCOIN_LEDGER_CAP + 49}`,
    );
  });
});

describe('mission progress', () => {
  it('derives every metric from state counters', () => {
    const state = createInitialState(NOW);
    state.projectsCompleted = 7;
    state.totalEarned = 1234;
    const country = activeCountry(state);
    country.companies[0].workers.push(makeWorker(900), makeWorker(901));
    country.companies[0].upgrades = { coffee: 2, fiber: 1 };
    country.money = 1_000;
    buyWorkstation(state, 'basic');
    expect(metricValue(state, 'projectsCompleted')).toBe(7);
    expect(metricValue(state, 'totalEarned')).toBe(1234);
    expect(metricValue(state, 'workers')).toBe(2);
    expect(metricValue(state, 'companies')).toBe(1);
    expect(metricValue(state, 'upgradeLevels')).toBe(3);
    expect(metricValue(state, 'desks')).toBe(1);
  });

  it('clamps progress at the target', () => {
    const state = createInitialState(NOW);
    state.projectsCompleted = 25;
    const shipTen = MISSIONS.find((m) => m.id === 'ship-10')!;
    expect(missionProgress(state, shipTen)).toBe(10);
    expect(missionCompleted(state, shipTen)).toBe(true);
  });

  it('shows completed missions plus the first open one per chain', () => {
    const state = createInitialState(NOW);
    state.projectsCompleted = 150; // completes ship-10 and ship-100
    const visible = visibleMissions(state).map((m) => m.id);
    expect(visible).toContain('ship-10');
    expect(visible).toContain('ship-100');
    expect(visible).toContain('ship-1000'); // next open link
    expect(visible).not.toContain('ship-10000'); // hidden deeper link
    // Each other chain shows exactly its first link.
    expect(visible).toContain('earn-1k');
    expect(visible).not.toContain('earn-100k');
  });
});

describe('mission claims', () => {
  it('pays out once and never again', () => {
    const state = createInitialState(NOW);
    state.projectsCompleted = 10;
    const def = MISSIONS.find((m) => m.id === 'ship-10')!;
    expect(claimMission(state, 'ship-10')).toBeNull();
    expect(state.vsCoin).toBe(def.reward);
    expect(state.vsCoinLedger[0]).toEqual({ amount: def.reward, source: 'mission:ship-10' });
    expect(claimMission(state, 'ship-10')).toBe('error.missionClaimed');
    expect(visibleMissions(state).map((m) => m.id)).not.toContain('ship-10');
  });

  it('refuses unfinished missions and unknown ids', () => {
    const state = createInitialState(NOW);
    expect(claimMission(state, 'ship-10')).toBe('error.missionIncomplete');
    expect(() => claimMission(state, 'nope')).toThrow();
  });

  it('lists claimable missions', () => {
    const state = createInitialState(NOW);
    state.totalEarned = 150_000;
    const ids = claimableMissions(state).map((m) => m.id);
    expect(ids).toEqual(['earn-1k', 'earn-100k']);
  });
});

describe('vsCoin sinks', () => {
  it('sells the premium boost', () => {
    const state = createInitialState(NOW);
    expect(buyVsCoinBoost(state)).toBe('error.notEnoughVsCoin');
    grantVsCoin(state, 10, 'test');
    expect(buyVsCoinBoost(state)).toBeNull();
    expect(state.vsCoin).toBe(10 - VSCOIN_BOOST_COST);
    const boost = state.boosts.find((b) => b.source === 'vscoin')!;
    expect(boost.mult).toBe(VSCOIN_BOOST_MULT);
    expect(boost.remainingSec).toBe(VSCOIN_BOOST_DURATION_SEC);
    // Re-buying extends rather than stacking.
    expect(buyVsCoinBoost(state)).toBeNull();
    expect(state.boosts.filter((b) => b.source === 'vscoin')).toHaveLength(1);
  });

  it("sells Founder's Aura levels for growing VsCoin prices, not money", () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    expect(upgradeVsCoinCost(state, 'aura')).toBe(2);
    expect(upgradeVsCoinCost(state, 'coffee')).toBeNull();
    expect(buyUpgrade(state, 'aura')).toBe('error.notEnoughVsCoin');
    grantVsCoin(state, 6, 'test');
    const moneyBefore = country.money;
    expect(buyUpgrade(state, 'aura')).toBeNull();
    expect(state.globalUpgrades['aura']).toBe(1);
    expect(state.vsCoin).toBe(4);
    expect(country.money).toBe(moneyBefore);
    expect(upgradeVsCoinCost(state, 'aura')).toBe(4);
    expect(buyUpgrade(state, 'aura')).toBeNull();
    expect(state.vsCoin).toBe(0);
  });

  it('sells the diamond wallpaper for VsCoin', () => {
    const state = createInitialState(NOW);
    expect(buyWallpaper(state, 'diamond')).toBe('error.notEnoughVsCoin');
    grantVsCoin(state, 8, 'test');
    expect(buyWallpaper(state, 'diamond')).toBeNull();
    expect(state.ownedWallpapers).toContain('diamond');
    expect(state.vsCoin).toBe(0);
    expect(buyWallpaper(state, 'diamond')).toBe('error.alreadyOwned');
  });
});

describe('story milestones grant VsCoin', () => {
  it('pays VSCOIN_PER_STORY_BEAT per fired beat', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const fired = advanceStory(state);
    expect(fired).toEqual(['dawn']);
    expect(state.vsCoin).toBe(VSCOIN_PER_STORY_BEAT);
    expect(state.vsCoinLedger[0].source).toBe('story:dawn');
  });

  it('company milestones cascade missions + story rewards', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    advanceStory(state);
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    advanceStory(state);
    expect(state.story.seen).toContain('site-loft');
    expect(claimMission(state, 'company-2')).toBeNull();
    expect(state.vsCoin).toBeGreaterThanOrEqual(
      2 * VSCOIN_PER_STORY_BEAT + MISSIONS.find((m) => m.id === 'company-2')!.reward,
    );
  });
});

describe('save migration v5', () => {
  it('defaults missing premium fields', () => {
    const state = createInitialState(NOW);
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    delete raw.vsCoin;
    delete raw.vsCoinLedger;
    delete raw.missionsClaimed;
    const migrated = migrate(raw, NOW);
    expect(migrated.vsCoin).toBe(0);
    expect(migrated.vsCoinLedger).toEqual([]);
    expect(migrated.missionsClaimed).toEqual([]);
  });

  it('sanitises corrupt balances and stale claims', () => {
    const state = createInitialState(NOW);
    grantVsCoin(state, 9, 'test');
    state.missionsClaimed.push('ship-10', 'removed-mission');
    const raw = JSON.parse(JSON.stringify(state));
    raw.vsCoin = -5;
    let migrated = migrate(raw, NOW);
    expect(migrated.vsCoin).toBe(0);
    raw.vsCoin = 9;
    migrated = migrate(raw, NOW);
    expect(migrated.vsCoin).toBe(9);
    expect(migrated.missionsClaimed).toEqual(['ship-10']);
    expect(migrated.vsCoinLedger).toEqual([{ amount: 9, source: 'test' }]);
  });
});
