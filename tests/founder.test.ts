import { describe, expect, it } from 'vitest';
import {
  ACQ_MIN_EARNED,
  ACQ_FP_K,
  ACQ_FP_EXP,
  IPO_FP_K,
  IPO_FP_EXP,
  SPINOFF_FP_K,
  SPINOFF_FP_EXP,
  FOUNDER_WARCHEST_CASH,
  PRESTIGE_MIN_LIFETIME,
  PRESTIGE_STORY_BEAT,
  COUNTRY_STARTING_MONEY,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyPerk,
  buyWorkstation,
  createCountry,
  createInitialState,
  executeExit,
  exitGate,
  fireWorker,
  founderPreview,
  founderSalaryMult,
  founderTrainFactor,
  founderVisionMult,
  globalOutputMultiplier,
  hireWorker,
  offlineCapSec,
  perkCost,
  perkLevel,
  prestigePreview,
  prestigeReset,
  respecPerks,
  trainDurationSec,
  totalSalaries,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import { skipTutorial } from '../src/game/tutorial';

const NOW = 1_700_000_000_000;

// Helpers
function trackFp(k: number, exp: number, metric: number): number {
  return Math.floor(k * Math.pow(Math.max(0, metric), exp));
}

describe('exitGate', () => {
  describe('acq gate', () => {
    it('returns error below 1e9', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = ACQ_MIN_EARNED - 1;
      expect(exitGate(state, 'acq')).toBe('error.exitAcqLocked');
    });

    it('opens at exactly 1e9', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = ACQ_MIN_EARNED;
      expect(exitGate(state, 'acq')).toBeNull();
    });

    it('opens above 1e9', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 2e9;
      expect(exitGate(state, 'acq')).toBeNull();
    });
  });

  describe('ipo gate', () => {
    it('returns error without story beat', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [];
      expect(exitGate(state, 'ipo')).toBe('ui.prestigeNeedStory');
    });

    it('opens with story beat seen', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [PRESTIGE_STORY_BEAT];
      expect(exitGate(state, 'ipo')).toBeNull();
    });
  });

  describe('spinoff gate', () => {
    it('returns error below SPINOFF_MIN_COUNTRIES', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      // Start with 1 country
      expect(state.countries).toHaveLength(1);
      expect(exitGate(state, 'spinoff')).toBe('error.exitSpinoffLocked');
    });

    it('opens at exactly SPINOFF_MIN_COUNTRIES', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      // Add 2 more countries
      createCountry(state, 'fr');
      createCountry(state, 'de');
      expect(state.countries).toHaveLength(3);
      expect(exitGate(state, 'spinoff')).toBeNull();
    });

    it('opens above SPINOFF_MIN_COUNTRIES', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      createCountry(state, 'fr');
      createCountry(state, 'de');
      createCountry(state, 'it');
      expect(state.countries).toHaveLength(4);
      expect(exitGate(state, 'spinoff')).toBeNull();
    });
  });
});

describe('founderPreview', () => {
  it('returns all zeros initially', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const fp = founderPreview(state);
    expect(fp.acq).toBe(0);
    expect(fp.ipo).toBe(0);
    expect(fp.spinoff).toBe(0);
    expect(fp.total).toBe(0);
  });

  describe('acq track', () => {
    it('returns floor(K × (metric)^EXP) - banked', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9; // ACQ_MIN_EARNED
      const expected = trackFp(ACQ_FP_K, ACQ_FP_EXP, 1e9);
      // 3 × (1e9)^0.1 = 3 × 10^0.9 ≈ 23.83, floor = 23
      expect(expected).toBe(23);
      const fp = founderPreview(state);
      expect(fp.acq).toBe(23);
    });

    it('returns delta form (0 until metric grows)', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      const first = founderPreview(state);
      expect(first.acq).toBeGreaterThan(0);

      // Bank it
      state.founder.banked.acq = first.acq;

      // No new growth
      const delta = founderPreview(state);
      expect(delta.acq).toBe(0);

      // Grow metric
      state.totalEarned = 1e10;
      const newGain = founderPreview(state);
      expect(newGain.acq).toBeGreaterThan(0);
    });
  });

  describe('ipo track', () => {
    it('uses peakHeadcount as metric', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.founder.peakHeadcount = 50;
      const expected = trackFp(IPO_FP_K, IPO_FP_EXP, 50);
      // 1 × (50)^0.6 = 50^0.6 ≈ 13.79, floor = 13
      expect(expected).toBeGreaterThan(0);
      const fp = founderPreview(state);
      expect(fp.ipo).toBe(expected);
    });

    it('returns delta form', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.founder.peakHeadcount = 50;
      const first = founderPreview(state);
      expect(first.ipo).toBeGreaterThan(0);

      // Bank it
      state.founder.banked.ipo = first.ipo;

      // No growth
      const delta = founderPreview(state);
      expect(delta.ipo).toBe(0);

      // Grow metric
      state.founder.peakHeadcount = 100;
      const newGain = founderPreview(state);
      expect(newGain.ipo).toBeGreaterThan(0);
    });
  });

  describe('spinoff track', () => {
    it('uses (maxCountries - 1) as metric', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.founder.maxCountries = 3; // metric = 2
      const expected = trackFp(SPINOFF_FP_K, SPINOFF_FP_EXP, 2);
      // 8 × (2)^0.7 ≈ 13.14, floor = 13
      expect(expected).toBeGreaterThan(0);
      const fp = founderPreview(state);
      expect(fp.spinoff).toBe(expected);
    });

    it('returns delta form', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.founder.maxCountries = 3;
      const first = founderPreview(state);
      expect(first.spinoff).toBeGreaterThan(0);

      // Bank it
      state.founder.banked.spinoff = first.spinoff;

      // No growth
      const delta = founderPreview(state);
      expect(delta.spinoff).toBe(0);

      // Grow metric
      state.founder.maxCountries = 4;
      const newGain = founderPreview(state);
      expect(newGain.spinoff).toBeGreaterThan(0);
    });
  });

  it('totals all three tracks', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 1e9;
    state.founder.peakHeadcount = 50;
    state.founder.maxCountries = 3;
    const fp = founderPreview(state);
    expect(fp.total).toBe(fp.acq + fp.ipo + fp.spinoff);
  });
});

describe('executeExit', () => {
  describe('acq exit', () => {
    it('succeeds with open gate and fp.total >= 1', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.founder.peakHeadcount = 50;
      state.story.seen = [];
      const fp = founderPreview(state);
      expect(fp.total).toBeGreaterThan(0);

      const error = executeExit(state, 'acq');
      expect(error).toBeNull();
      expect(state.founder.exits.acq).toBe(1);
    });

    it('returns error below gate', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = ACQ_MIN_EARNED - 1;
      const error = executeExit(state, 'acq');
      expect(error).toBe('error.exitAcqLocked');
      expect(state.founder.exits.acq).toBe(0);
    });

    it('returns error with gate open but fp.total 0', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      // No peakHeadcount or maxCountries growth
      state.founder.peakHeadcount = 0;
      state.founder.maxCountries = 1;
      // Bank everything from acq track to zero it
      const fp = founderPreview(state);
      state.founder.banked.acq = fp.acq + 1; // Make it impossible to gain
      state.founder.banked.ipo = fp.ipo + 1;
      state.founder.banked.spinoff = fp.spinoff + 1;

      const error = executeExit(state, 'acq');
      expect(error).toBe('error.exitNothingToBank');
    });

    it('banks all three tracks', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.founder.peakHeadcount = 50;
      state.founder.maxCountries = 3;
      const fpBefore = founderPreview(state);

      executeExit(state, 'acq');

      const fpAfter = founderPreview(state);
      // After banking, new fp should be 0
      expect(fpAfter.total).toBe(0);
      expect(state.founder.banked.acq).toBe(fpBefore.acq);
      expect(state.founder.banked.ipo).toBe(fpBefore.ipo);
      expect(state.founder.banked.spinoff).toBe(fpBefore.spinoff);
    });

    it('adds fp.total to founder.points', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.founder.peakHeadcount = 50;
      state.founder.points = 0;
      const fp = founderPreview(state);

      executeExit(state, 'acq');

      expect(state.founder.points).toBe(fp.total);
    });

    it('increments founder.exits.acq', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.founder.exits.acq = 0;

      executeExit(state, 'acq');
      expect(state.founder.exits.acq).toBe(1);

      state.founder.peakHeadcount = 100; // Grow for next exit
      executeExit(state, 'acq');
      expect(state.founder.exits.acq).toBe(2);
    });

    it('grants 1 freeRespec', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.founder.freeRespecs = 0;

      executeExit(state, 'acq');

      expect(state.founder.freeRespecs).toBe(1);
    });

    it('resets countries to single garage in starting country', () => {
      const state = createInitialState(NOW, 'ch');
      skipTutorial(state);
      const originalCountryId = state.countries[0].id;

      // Add more countries
      createCountry(state, 'fr');
      createCountry(state, 'de');
      expect(state.countries).toHaveLength(3);

      state.totalEarned = 1e9;
      executeExit(state, 'acq');

      expect(state.countries).toHaveLength(1);
      expect(state.countries[0].id).toBe(originalCountryId);
      expect(state.countries[0].companies).toHaveLength(1);
      expect(state.countries[0].companies[0].name).toBe('My Startup');
    });

    it('wipes boosts', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.totalEarned = 1e9;
      state.boosts.push({ mult: 2, remainingSec: 100, source: 'dev' });
      expect(state.boosts).toHaveLength(1);

      executeExit(state, 'acq');

      expect(state.boosts).toHaveLength(0);
    });

    it('does not affect prestigePreview below 1e14', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [PRESTIGE_STORY_BEAT];
      state.totalEarned = 1e9;
      state.prestige.reputation = 0;

      const repBefore = prestigePreview(state);
      executeExit(state, 'acq');
      const repAfter = prestigePreview(state);

      expect(repAfter).toBe(repBefore);
    });
  });

  describe('ipo exit', () => {
    it('requires story beat', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [];
      state.totalEarned = PRESTIGE_MIN_LIFETIME + 1e14;

      const error = executeExit(state, 'ipo');
      expect(error).toBe('ui.prestigeNeedStory');
    });

    it('requires reputation gain >= 1', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [PRESTIGE_STORY_BEAT];
      state.totalEarned = PRESTIGE_MIN_LIFETIME; // gain = 0
      state.prestige.reputation = 0;

      const error = executeExit(state, 'ipo');
      expect(error).toBe('ui.prestigeNoRep');
    });

    it('succeeds with reputation gain >= 1', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [PRESTIGE_STORY_BEAT];
      state.totalEarned = 3e14; // gain = 4
      state.prestige.reputation = 0;

      const error = executeExit(state, 'ipo');
      expect(error).toBeNull();
      expect(state.founder.exits.ipo).toBe(1);
    });

    it('banks reputation (classic prestige)', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      state.story.seen = [PRESTIGE_STORY_BEAT];
      state.totalEarned = 3e14;
      state.prestige.reputation = 0;

      executeExit(state, 'ipo');

      expect(state.prestige.reputation).toBe(4);
    });
  });

  describe('spinoff exit', () => {
    it('requires SPINOFF_MIN_COUNTRIES', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      expect(state.countries).toHaveLength(1);

      const error = executeExit(state, 'spinoff');
      expect(error).toBe('error.exitSpinoffLocked');
    });

    it('succeeds with enough countries', () => {
      const state = createInitialState(NOW);
      skipTutorial(state);
      createCountry(state, 'fr');
      createCountry(state, 'de');
      state.founder.maxCountries = 3;
      state.founder.peakHeadcount = 10;

      const error = executeExit(state, 'spinoff');
      expect(error).toBeNull();
      expect(state.founder.exits.spinoff).toBe(1);
    });
  });

  it('increments prestige.count on ipo', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    executeExit(state, 'ipo');

    expect(state.prestige.count).toBe(1);
  });
});

describe('prestigeReset delegates to executeExit', () => {
  it('calls executeExit with type ipo', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = 3e14;
    state.prestige = { count: 0, reputation: 0 };

    const error = prestigeReset(state);
    expect(error).toBeNull();
    expect(state.founder.exits.ipo).toBe(1);
  });

  it("returns 'ui.prestigeNeedStory' without story beat", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [];
    state.totalEarned = 3e14;

    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNeedStory');
  });

  it("returns 'ui.prestigeNoRep' with story but no reputation gain", () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.story.seen = [PRESTIGE_STORY_BEAT];
    state.totalEarned = PRESTIGE_MIN_LIFETIME;
    state.prestige = { count: 0, reputation: 0 };

    const error = prestigeReset(state);
    expect(error).toBe('ui.prestigeNoRep');
  });
});

describe('perkLevel', () => {
  it('returns 0 for unpurchased perk', () => {
    const state = createInitialState(NOW);
    expect(perkLevel(state, 'vision')).toBe(0);
  });

  it('returns owned level', () => {
    const state = createInitialState(NOW);
    state.founder.perks['vision'] = 2;
    expect(perkLevel(state, 'vision')).toBe(2);
  });
});

describe('perkCost', () => {
  it('returns first-level cost for unpurchased', () => {
    const state = createInitialState(NOW);
    const cost = perkCost(state, 'vision');
    expect(cost).toBe(1);
  });

  it('returns next-level cost', () => {
    const state = createInitialState(NOW);
    state.founder.perks['vision'] = 1;
    const cost = perkCost(state, 'vision');
    expect(cost).toBe(2);
  });

  it('returns null when maxed', () => {
    const state = createInitialState(NOW);
    state.founder.perks['vision'] = 5; // max is 5
    const cost = perkCost(state, 'vision');
    expect(cost).toBeNull();
  });
});

describe('buyPerk', () => {
  it('costs FP from state.founder.points', () => {
    const state = createInitialState(NOW);
    state.founder.points = 10;
    const cost = perkCost(state, 'vision')!;
    expect(cost).toBe(1);

    const error = buyPerk(state, 'vision');
    expect(error).toBeNull();
    expect(state.founder.points).toBe(9);
    expect(perkLevel(state, 'vision')).toBe(1);
  });

  it('increments perk level', () => {
    const state = createInitialState(NOW);
    state.founder.points = 10;
    expect(perkLevel(state, 'vision')).toBe(0);

    buyPerk(state, 'vision');
    expect(perkLevel(state, 'vision')).toBe(1);

    buyPerk(state, 'vision');
    expect(perkLevel(state, 'vision')).toBe(2);
  });

  it("returns 'error.notEnoughFp' when short", () => {
    const state = createInitialState(NOW);
    state.founder.points = 0;
    const error = buyPerk(state, 'vision');
    expect(error).toBe('error.notEnoughFp');
    expect(perkLevel(state, 'vision')).toBe(0);
  });

  it("returns 'error.maxLevel' when maxed", () => {
    const state = createInitialState(NOW);
    state.founder.points = 100;
    state.founder.perks['vision'] = 5;
    const error = buyPerk(state, 'vision');
    expect(error).toBe('error.maxLevel');
  });

  it('works for all perk types', () => {
    const state = createInitialState(NOW);
    state.founder.points = 100;

    expect(buyPerk(state, 'vision')).toBeNull();
    expect(buyPerk(state, 'alumni')).toBeNull();
    expect(buyPerk(state, 'lean-ops')).toBeNull();
    expect(buyPerk(state, 'cloud')).toBeNull();
    expect(buyPerk(state, 'war-chest')).toBeNull();

    expect(perkLevel(state, 'vision')).toBe(1);
    expect(perkLevel(state, 'alumni')).toBe(1);
    expect(perkLevel(state, 'lean-ops')).toBe(1);
    expect(perkLevel(state, 'cloud')).toBe(1);
    expect(perkLevel(state, 'war-chest')).toBe(1);
  });
});

describe('respecPerks', () => {
  it('refunds all perk FP costs', () => {
    const state = createInitialState(NOW);
    state.founder.points = 10;
    state.founder.freeRespecs = 1;

    buyPerk(state, 'vision'); // costs 1, now points = 9
    buyPerk(state, 'vision'); // costs 2, now points = 7
    buyPerk(state, 'alumni'); // costs 1, now points = 6

    const refund = 1 + 2 + 1; // 4
    respecPerks(state);

    expect(state.founder.points).toBe(6 + refund);
    expect(perkLevel(state, 'vision')).toBe(0);
    expect(perkLevel(state, 'alumni')).toBe(0);
  });

  it('clears all perk levels', () => {
    const state = createInitialState(NOW);
    state.founder.points = 100;
    state.founder.freeRespecs = 1;

    buyPerk(state, 'vision');
    buyPerk(state, 'alumni');
    buyPerk(state, 'cloud');

    respecPerks(state);

    expect(Object.keys(state.founder.perks)).toHaveLength(0);
  });

  it('consumes one freeRespec', () => {
    const state = createInitialState(NOW);
    state.founder.points = 10;
    state.founder.freeRespecs = 2;
    buyPerk(state, 'vision');

    respecPerks(state);
    expect(state.founder.freeRespecs).toBe(1);
  });

  it("returns 'error.noRespec' at 0", () => {
    const state = createInitialState(NOW);
    state.founder.points = 10;
    state.founder.freeRespecs = 0;
    buyPerk(state, 'vision');

    const error = respecPerks(state);
    expect(error).toBe('error.noRespec');
    expect(perkLevel(state, 'vision')).toBe(1);
  });

  it("returns 'error.noPerks' with none owned", () => {
    const state = createInitialState(NOW);
    state.founder.freeRespecs = 1;

    const error = respecPerks(state);
    expect(error).toBe('error.noPerks');
  });
});

describe('founderVisionMult', () => {
  it('equals 1 + 0.05×level', () => {
    const state = createInitialState(NOW);
    expect(founderVisionMult(state)).toBe(1);

    state.founder.perks['vision'] = 1;
    expect(founderVisionMult(state)).toBeCloseTo(1.05, 5);

    state.founder.perks['vision'] = 2;
    expect(founderVisionMult(state)).toBeCloseTo(1.10, 5);

    state.founder.perks['vision'] = 5;
    expect(founderVisionMult(state)).toBeCloseTo(1.25, 5);
  });

  it('integrates into globalOutputMultiplier', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const company = activeCompany(state);
    buyWorkstation(state, 'basic');

    activeCountry(state).money = 1_000_000;
    hireWorker(state, 0);
    const worker = company.workers[0];
    worker.stationId = company.workstations[0].id;

    state.founder.perks['vision'] = 0;
    const multiBase = globalOutputMultiplier(state, company);

    state.founder.perks['vision'] = 2;
    const multiVision = globalOutputMultiplier(state, company);

    // Ratio should be 1.10 / 1.0
    expect(multiVision / multiBase).toBeCloseTo(1.10, 5);
  });
});

describe('founderTrainFactor', () => {
  it('equals 0.9^level (training duration factor)', () => {
    const state = createInitialState(NOW);
    expect(founderTrainFactor(state)).toBe(1);

    state.founder.perks['alumni'] = 1;
    expect(founderTrainFactor(state)).toBeCloseTo(0.9, 5);

    state.founder.perks['alumni'] = 2;
    expect(founderTrainFactor(state)).toBeCloseTo(0.81, 5);
  });

  it('shortens trainDurationSec', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const company = activeCompany(state);

    state.founder.perks['alumni'] = 0;
    const durationBase = trainDurationSec(state, company);

    state.founder.perks['alumni'] = 1;
    const durationReduced = trainDurationSec(state, company);

    expect(durationReduced).toBeCloseTo(durationBase * 0.9, 1);
  });
});

describe('founderSalaryMult', () => {
  it('equals 0.95^level (salary factor)', () => {
    const state = createInitialState(NOW);
    expect(founderSalaryMult(state)).toBe(1);

    state.founder.perks['lean-ops'] = 1;
    expect(founderSalaryMult(state)).toBeCloseTo(0.95, 5);

    state.founder.perks['lean-ops'] = 2;
    expect(founderSalaryMult(state)).toBeCloseTo(0.9025, 5);
  });

  it('lowers totalSalaries', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    activeCountry(state).money = 1_000_000;
    hireWorker(state, 0);

    state.founder.perks['lean-ops'] = 0;
    const salariesBase = totalSalaries(state);

    state.founder.perks['lean-ops'] = 1;
    const salariesReduced = totalSalaries(state);

    expect(salariesReduced).toBeCloseTo(salariesBase * 0.95, 5);
  });
});

describe('offlineCapSec', () => {
  it('equals (24 + 4×level)×3600', () => {
    const state = createInitialState(NOW);
    expect(offlineCapSec(state)).toBe(24 * 3600);

    state.founder.perks['cloud'] = 1;
    expect(offlineCapSec(state)).toBe((24 + 4) * 3600);

    state.founder.perks['cloud'] = 2;
    expect(offlineCapSec(state)).toBe((24 + 8) * 3600);

    state.founder.perks['cloud'] = 3;
    expect(offlineCapSec(state)).toBe((24 + 12) * 3600);
  });
});

describe('war-chest perk', () => {
  it('provides COUNTRY_STARTING_MONEY + WARCHEST_CASH[level-1] on restart', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 1e9;

    // Buy war-chest to level 2
    state.founder.points = 10;
    buyPerk(state, 'war-chest');
    buyPerk(state, 'war-chest');

    executeExit(state, 'acq');

    const countryAfter = activeCountry(state);
    const expectedMoney = COUNTRY_STARTING_MONEY + FOUNDER_WARCHEST_CASH[1]; // level 2
    expect(countryAfter.money).toBe(expectedMoney);
  });

  it('clamps to max WARCHEST_CASH array index', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    state.totalEarned = 1e9;

    // Set level beyond array length (which is 3)
    state.founder.perks['war-chest'] = 5;

    executeExit(state, 'acq');

    const expectedMoney = COUNTRY_STARTING_MONEY + FOUNDER_WARCHEST_CASH[2]; // clamped to last
    expect(activeCountry(state).money).toBe(expectedMoney);
  });
});

describe('peakHeadcount', () => {
  it('starts at 0', () => {
    const state = createInitialState(NOW);
    expect(state.founder.peakHeadcount).toBe(0);
  });

  it('tracks high-water of current headcount', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const company = activeCompany(state);
    const country = activeCountry(state);
    country.money = 100_000_000;

    // Hire 2 workers
    hireWorker(state, 0);
    hireWorker(state, 0);

    expect(company.workers).toHaveLength(2);
    expect(state.founder.peakHeadcount).toBe(2);

    // Hire 2 more (total 4)
    hireWorker(state, 0);
    hireWorker(state, 0);

    expect(company.workers).toHaveLength(4);
    expect(state.founder.peakHeadcount).toBe(4);
  });

  it('never decreases on fireWorker', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const company = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Hire 3
    hireWorker(state, 0);
    hireWorker(state, 0);
    hireWorker(state, 0);
    expect(state.founder.peakHeadcount).toBe(3);

    // Fire 1
    fireWorker(state, company.workers[0].id);
    expect(company.workers).toHaveLength(2);
    expect(state.founder.peakHeadcount).toBe(3); // unchanged
  });
});

describe('migrate — founder block', () => {
  it('adds default founder state to saves missing it', () => {
    const state = createInitialState(NOW);
    const partial = JSON.parse(JSON.stringify(state)) as Partial<typeof state>;
    delete (partial as any).founder;

    const migrated = migrate(partial, NOW);
    expect(migrated.founder).toBeDefined();
    expect(migrated.founder.points).toBe(0);
    expect(migrated.founder.banked).toEqual({ acq: 0, ipo: 0, spinoff: 0 });
    expect(migrated.founder.perks).toEqual({});
    expect(migrated.founder.peakHeadcount).toBe(0);
    expect(migrated.founder.maxCountries).toBeGreaterThanOrEqual(1);
    expect(migrated.founder.freeRespecs).toBe(0);
    expect(migrated.founder.exits).toEqual({ acq: 0, ipo: 0, spinoff: 0 });
  });

  it('sets peakHeadcount to at least live headcount', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Hire 3 workers
    hireWorker(state, 0);
    hireWorker(state, 0);
    hireWorker(state, 0);

    const json = JSON.parse(JSON.stringify(state));
    json.founder.peakHeadcount = 1; // artificially low

    const migrated = migrate(json, NOW);
    expect(migrated.founder.peakHeadcount).toBe(3);
  });

  it('sets maxCountries to at least current country count', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    createCountry(state, 'fr');
    createCountry(state, 'de');
    expect(state.countries).toHaveLength(3);

    const json = JSON.parse(JSON.stringify(state));
    json.founder.maxCountries = 1; // artificially low

    const migrated = migrate(json, NOW);
    expect(migrated.founder.maxCountries).toBeGreaterThanOrEqual(3);
  });

  it('drops unknown perk ids', () => {
    const state = createInitialState(NOW);
    const json = JSON.parse(JSON.stringify(state));
    json.founder.perks = {
      'vision': 1,
      'unknown-perk': 2,
      'alumni': 1,
    };

    const migrated = migrate(json, NOW);
    expect(migrated.founder.perks['vision']).toBe(1);
    expect(migrated.founder.perks['alumni']).toBe(1);
    expect(migrated.founder.perks['unknown-perk']).toBeUndefined();
  });

  it('clamps perk levels to defined max', () => {
    const state = createInitialState(NOW);
    const json = JSON.parse(JSON.stringify(state));
    json.founder.perks = {
      'vision': 10, // max is 5
      'alumni': 2, // max is 4
    };

    const migrated = migrate(json, NOW);
    expect(migrated.founder.perks['vision']).toBe(5);
    expect(migrated.founder.perks['alumni']).toBe(2);
  });

  it('repairs corrupt founder values to 0', () => {
    const state = createInitialState(NOW);
    const json = JSON.parse(JSON.stringify(state));
    json.founder.points = -5;
    json.founder.banked.acq = NaN;
    json.founder.freeRespecs = 'invalid';

    const migrated = migrate(json, NOW);
    expect(migrated.founder.points).toBe(0);
    expect(migrated.founder.banked.acq).toBe(0);
    expect(migrated.founder.freeRespecs).toBe(0);
  });
});
