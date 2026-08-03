import { describe, expect, it } from 'vitest';
import { PRESTIGE_MIN_LIFETIME, PRESTIGE_STORY_BEAT } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyWorkstation,
  createInitialState,
  createCountry,
  grantVsCoin,
  globalOutputMultiplier,
  hireWorker,
  prestigeMultiplier,
  prestigePreview,
  prestigeRepFor,
  prestigeReset,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import { advanceStory } from '../src/game/story';
import { skipTutorial } from '../src/game/tutorial';
import type { GameState } from '../src/game/types';

const NOW = 1_700_000_000_000;

describe('prestigeRepFor', () => {
  it('returns 0 at PRESTIGE_MIN_LIFETIME (1e14)', () => {
    expect(prestigeRepFor(PRESTIGE_MIN_LIFETIME)).toBe(0);
  });

  it('returns 0 below PRESTIGE_MIN_LIFETIME', () => {
    expect(prestigeRepFor(PRESTIGE_MIN_LIFETIME - 1)).toBe(0);
    expect(prestigeRepFor(1_000_000_000)).toBe(0);
  });

  it('follows floor(10*log10(E/1e14)) above PRESTIGE_MIN_LIFETIME', () => {
    // E = 1.1e14 → log10(1.1) ≈ 0.041 → 10*0.041 ≈ 0.41 → floor = 0
    expect(prestigeRepFor(1.1e14)).toBe(0);

    // E = 1e15 → log10(10) = 1 → 10*1 = 10 → floor = 10
    expect(prestigeRepFor(1e15)).toBe(10);

    // E = 3e14 → log10(3) ≈ 0.477 → 10*0.477 ≈ 4.77 → floor = 4
    expect(prestigeRepFor(3e14)).toBe(4);

    // E = 1e16 → log10(100) = 2 → 10*2 = 20 → floor = 20
    expect(prestigeRepFor(1e16)).toBe(20);
  });
});

describe('prestigePreview', () => {
  it('returns 0 when no new reputation can be banked', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    // prestigeRepFor(1e15) = 10, so if we have that earned and 10 banked, delta = 0
    state.totalEarned = 1e15;
    state.prestige.reputation = 10; // already banked all
    expect(prestigePreview(state)).toBe(0);
  });

  it('returns delta between potential and banked reputation', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 3e14;
    state.prestige.reputation = 0;
    // prestigeRepFor(3e14) = 4, banked = 0 → delta = 4
    expect(prestigePreview(state)).toBe(4);
  });

  it('never returns negative (clamps to 0)', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 1.5e14;
    state.prestige.reputation = 5; // impossible, but test the guard
    expect(prestigePreview(state)).toBe(0);
  });

  it('carries over fractional decades to the next reset', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    // E = 5e14 → log10(5) ≈ 0.699 → 10*0.699 ≈ 6.99 → floor = 6
    state.totalEarned = 5e14;
    state.prestige.reputation = 0;
    const first = prestigePreview(state);
    expect(first).toBe(6);

    // After reset, bank the 6, then earn to 1e15
    state.prestige.reputation = 6;
    state.totalEarned = 1e15;
    // prestigeRepFor(1e15) = 10, banked = 6 → delta = 4
    expect(prestigePreview(state)).toBe(4);
  });
});

describe('prestigeMultiplier', () => {
  it('returns 1 at reputation 0', () => {
    const state = createInitialState(NOW);
    state.prestige.reputation = 0;
    expect(prestigeMultiplier(state)).toBe(1);
  });

  it('applies 1 + 0.5*sqrt(rep) formula', () => {
    const state = createInitialState(NOW);

    state.prestige.reputation = 4;
    // 1 + 0.5 * sqrt(4) = 1 + 0.5 * 2 = 2.0
    expect(prestigeMultiplier(state)).toBeCloseTo(2.0, 5);

    state.prestige.reputation = 9;
    // 1 + 0.5 * sqrt(9) = 1 + 0.5 * 3 = 1 + 1.5 = 2.5
    expect(prestigeMultiplier(state)).toBeCloseTo(2.5, 5);

    state.prestige.reputation = 16;
    // 1 + 0.5 * sqrt(16) = 1 + 0.5 * 4 = 1 + 2 = 3.0
    expect(prestigeMultiplier(state)).toBeCloseTo(3.0, 5);
  });

  it('is integrated into globalOutputMultiplier', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const company = activeCompany(state);
    buyWorkstation(state, 'basic');

    // Hire a worker to enable output calculation
    activeCountry(state).money = 1_000_000;
    hireWorker(state, 0);
    const worker = company.workers[0];
    worker.stationId = company.workstations[0].id;

    // Base output multiplier with rep 0
    state.prestige.reputation = 0;
    const multiBase = globalOutputMultiplier(state, company);

    // Same company with rep 4
    state.prestige.reputation = 4;
    const multiRep4 = globalOutputMultiplier(state, company);

    // Ratio should be exactly 2.0
    expect(multiRep4 / multiBase).toBeCloseTo(2.0, 5);
  });
});

describe('prestigeReset guards', () => {
  it("returns 'ui.prestigeNeedStory' without 'dream-achieved' seen", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 3e14;
    state.prestige.reputation = 0;
    state.story.seen = []; // not seen

    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNeedStory');
    // State must not mutate
    expect(state.prestige.count).toBe(0);
    expect(state.prestige.reputation).toBe(0);
  });

  it("returns 'ui.prestigeNoRep' with story beat seen but gained < 1", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = PRESTIGE_MIN_LIFETIME; // exactly at floor, gain 0
    state.prestige.reputation = 0;

    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNoRep');
    // State must not mutate
    expect(state.prestige.count).toBe(0);
  });

  it("returns 'ui.prestigeNoRep' if already reset and no new earnings", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 1e15;
    state.prestige = { count: 1, reputation: 10 }; // already reset once

    // Now try again with no additional earnings
    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNoRep');
    expect(state.prestige.count).toBe(1); // unchanged
  });
});

describe('prestigeReset successful reset', () => {
  it('increments count and banks reputation', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    const error = prestigeReset(state, NOW);
    expect(error).toBeNull();
    expect(state.prestige.count).toBe(1);
    expect(state.prestige.reputation).toBe(4); // prestigeRepFor(3e14) = 4
  });

  it('resets countries to exactly one fresh country (same id as original)', () => {
    const state = createInitialState(NOW, 'de');
    skipTutorial(state);
    const originalCountryId = state.countries[0].id;
    expect(originalCountryId).toBe('de');

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.countries).toHaveLength(1);
    expect(state.countries[0].id).toBe(originalCountryId);
    expect(state.countries[0].companies).toHaveLength(1);
    expect(state.countries[0].companies[0].name).toBe('My Startup');
  });

  it('preserves global cosmetics and settings', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    // Add cosmetics
    state.ownedWallpapers.push('mahogany');
    state.defaultWallpaperId = 'mahogany';
    state.ownedMapThemes.push('neon');
    state.mapThemeId = 'neon';
    state.player.name = 'Test Player';

    // Add settings
    state.settings.sound = false;
    state.settings.language = 'fr';

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.ownedWallpapers).toContain('mahogany');
    expect(state.defaultWallpaperId).toBe('mahogany');
    expect(state.ownedMapThemes).toContain('neon');
    expect(state.mapThemeId).toBe('neon');
    expect(state.player.name).toBe('Test Player');
    expect(state.settings.sound).toBe(false);
    expect(state.settings.language).toBe('fr');
  });

  it('preserves VsCoin and ledger', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    const ledgerLengthBefore = state.vsCoinLedger.length;
    grantVsCoin(state, 10, 'test:prestige');
    const ledgerAfterGrant = state.vsCoinLedger.length;

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.vsCoin).toBe(10);
    // Ledger should have grown by the grant, and should not be wiped by prestige reset
    expect(state.vsCoinLedger.length).toBe(ledgerAfterGrant);
    expect(state.vsCoinLedger.length).toBeGreaterThan(ledgerLengthBefore);
  });

  it('preserves ownedWallpapers and globalUpgrades', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.ownedWallpapers.push('teal');
    state.globalUpgrades['aura'] = 2;

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.ownedWallpapers).toContain('teal');
    expect(state.globalUpgrades['aura']).toBe(2);
  });

  it('preserves floorGiftClaimed, tutorial.done, and totalEarned', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.floorGiftClaimed = true;
    state.tutorial.done = true;
    const originalEarned = 3e14;
    state.totalEarned = originalEarned;

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.floorGiftClaimed).toBe(true);
    expect(state.tutorial.done).toBe(true);
    expect(state.totalEarned).toBe(originalEarned); // cumulative counter never resets
  });

  it('preserves story.seen beats', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT, 'site-orbital', 'agi-shipped'];
    state.story.queue = []; // queue gets drained by display logic; we preserve seen

    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.story.seen).toContain('dream-achieved');
    expect(state.story.seen).toContain('site-orbital');
    expect(state.story.seen).toContain('agi-shipped');
  });

  it('wipes boosts', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.boosts.push({ mult: 3, remainingSec: 100, source: 'dev' });
    state.boosts.push({ mult: 2, remainingSec: 50, source: 'dev' });

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.boosts).toHaveLength(0);
  });

  it('wipes all countries except the fresh one', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const originalCountryId = state.countries[0].id;

    // Create a second country
    createCountry(state, 'fr', 'Second Startup');
    expect(state.countries).toHaveLength(2);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.countries).toHaveLength(1);
    expect(state.countries[0].id).toBe(originalCountryId);
  });

  it('resets activeCountryId to the fresh country', () => {
    const state = createInitialState(NOW, 'ch');
    skipTutorial(state);
    const originalCountryId = state.countries[0].id;

    createCountry(state, 'ca', 'Branch');
    state.activeCountryId = 'ca'; // switch to second country

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    prestigeReset(state, NOW);

    expect(state.activeCountryId).toBe(originalCountryId);
  });

  it('updates lastSeen to the reset time', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    const resetTime = NOW + 10_000;
    prestigeReset(state, resetTime);

    expect(state.lastSeen).toBe(resetTime);
  });
});

describe('prestige reset sequence', () => {
  it('second reset immediately after first returns noRep error', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    // First reset succeeds
    expect(prestigeReset(state)).toBeNull();
    expect(state.prestige.count).toBe(1);

    // Try immediately again (no new earnings)
    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNoRep');
  });

  it('second reset after raising totalEarned to 1e15 works', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    // First reset
    expect(prestigeReset(state)).toBeNull();
    expect(state.prestige.count).toBe(1);
    expect(state.prestige.reputation).toBe(4);

    // Raise totalEarned to 1e15
    state.totalEarned = 1e15;

    // Second reset
    const error = prestigeReset(state);
    expect(error).toBeNull();
    expect(state.prestige.count).toBe(2);
    expect(state.prestige.reputation).toBe(10); // prestigeRepFor(1e15) = 10
  });

  it('prestige count persists through resets', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 1e15;
    state.prestige = { count: 0, reputation: 0 };

    for (let i = 0; i < 3; i++) {
      expect(prestigeReset(state)).toBeNull();
      expect(state.prestige.count).toBe(i + 1);
      // Earn more for next round
      state.totalEarned *= 10;
    }
  });
});

describe('migrate — prestige block', () => {
  it('adds {count:0,reputation:0} to saves missing prestige', () => {
    const state = createInitialState(NOW);
    const partial = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
    delete (partial as any).prestige;

    const migrated = migrate(partial, NOW);
    expect(migrated.prestige).toEqual({ count: 0, reputation: 0 });
  });

  it('repairs corrupt prestige values to 0', () => {
    const state = createInitialState(NOW);
    const partial = JSON.parse(JSON.stringify(state)) as Partial<GameState>;

    // Negative values
    (partial as any).prestige = { count: -5, reputation: -3 };
    let migrated = migrate(partial, NOW);
    expect(migrated.prestige.count).toBe(0);
    expect(migrated.prestige.reputation).toBe(0);

    // NaN
    (partial as any).prestige = { count: NaN, reputation: NaN };
    migrated = migrate(partial, NOW);
    expect(migrated.prestige.count).toBe(0);
    expect(migrated.prestige.reputation).toBe(0);

    // Strings
    (partial as any).prestige = { count: 'five', reputation: 'ten' };
    migrated = migrate(partial, NOW);
    expect(migrated.prestige.count).toBe(0);
    expect(migrated.prestige.reputation).toBe(0);

    // Infinity
    (partial as any).prestige = { count: Infinity, reputation: -Infinity };
    migrated = migrate(partial, NOW);
    expect(migrated.prestige.count).toBe(0);
    expect(migrated.prestige.reputation).toBe(0);
  });

  it('preserves valid prestige values through migrate', () => {
    const state = createInitialState(NOW);
    state.prestige = { count: 3, reputation: 17 };

    const json = JSON.parse(JSON.stringify(state)) as Partial<GameState>;
    const migrated = migrate(json, NOW);

    expect(migrated.prestige.count).toBe(3);
    expect(migrated.prestige.reputation).toBe(17);
  });

  it('preserves prestige through serialize/load round-trip', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.prestige = { count: 2, reputation: 9 };

    // Simulate serialize
    const json = JSON.parse(JSON.stringify(state));
    // Simulate deserialize via migrate
    const restored = migrate(json, NOW);

    expect(restored.prestige.count).toBe(2);
    expect(restored.prestige.reputation).toBe(9);
  });

  it('floors fractional prestige values', () => {
    const state = createInitialState(NOW);
    const partial = JSON.parse(JSON.stringify(state)) as Partial<GameState>;

    (partial as any).prestige = { count: 2.7, reputation: 5.3 };
    const migrated = migrate(partial, NOW);

    expect(migrated.prestige.count).toBe(2);
    expect(migrated.prestige.reputation).toBe(5);
  });
});

describe('story beat integration', () => {
  it("'new-venture' beat fires after first prestige reset", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    expect(state.story.seen).not.toContain('new-venture');

    prestigeReset(state);

    // advanceStory should now detect the beat
    const fired = advanceStory(state);
    expect(fired).toContain('new-venture');
    expect(state.story.seen).toContain('new-venture');
  });

  it("'new-venture' beat does not fire before first reset", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);

    state.prestige = { count: 0, reputation: 0 };
    expect(advanceStory(state)).not.toContain('new-venture');
  });
});
