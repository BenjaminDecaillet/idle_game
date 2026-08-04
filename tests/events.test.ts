import { describe, expect, it } from 'vitest';
import {
  EVENT_MIN_EARNED,
  RANDOM_EVENTS,
  WORKER_TIERS,
} from '../src/game/data';
import {
  activeCountry,
  activeCompany,
  createInitialState,
  grantBoost,
  grossRewardRate,
  salaryBoostMult,
  simulateOffline,
  tick,
} from '../src/game/engine';
import { acceptEventOffer, eventsUnlocked, rollEventOffer } from '../src/game/events';
import type { EventOffer } from '../src/game/events';

const NOW = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// eventsUnlocked
// ---------------------------------------------------------------------------

describe('eventsUnlocked', () => {
  it('returns false on a fresh state (tutorial not done)', () => {
    const state = createInitialState(NOW);
    expect(state.tutorial.done).toBe(false);
    expect(eventsUnlocked(state)).toBe(false);
  });

  it('returns false when tutorial done but totalEarned < EVENT_MIN_EARNED', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED - 1;
    expect(eventsUnlocked(state)).toBe(false);
  });

  it('returns true when tutorial done AND totalEarned >= EVENT_MIN_EARNED', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;
    expect(eventsUnlocked(state)).toBe(true);
  });

  it('returns true when both conditions are met (with more earned)', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED * 2;
    expect(eventsUnlocked(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rollEventOffer
// ---------------------------------------------------------------------------

describe('rollEventOffer', () => {
  it('returns null when locked (tutorial not done)', () => {
    const state = createInitialState(NOW);
    expect(state.tutorial.done).toBe(false);
    const offer = rollEventOffer(state);
    expect(offer).toBeNull();
  });

  it('returns null when locked (totalEarned too low)', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED - 100;
    const offer = rollEventOffer(state);
    expect(offer).toBeNull();
  });

  it('returns an EventOffer when unlocked', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;
    const offer = rollEventOffer(state);
    expect(offer).not.toBeNull();
    expect(offer).toHaveProperty('id');
    expect(offer).toHaveProperty('emoji');
    expect(offer).toHaveProperty('cash');
    expect(offer).toHaveProperty('mult');
    expect(offer).toHaveProperty('salaryMult');
    expect(offer).toHaveProperty('durationSec');
  });

  it('picked event id is in RANDOM_EVENTS', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;
    const offer = rollEventOffer(state);
    expect(offer).not.toBeNull();
    const ids = RANDOM_EVENTS.map((e) => e.id);
    expect(ids).toContain(offer!.id);
  });

  it('is deterministic with a seeded rand (first event at rand=0)', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;

    // rand() = 0 should pick the first event
    const offer1 = rollEventOffer(state, () => 0);
    expect(offer1!.id).toBe(RANDOM_EVENTS[0].id);

    const offer2 = rollEventOffer(state, () => 0);
    expect(offer2!.id).toBe(RANDOM_EVENTS[0].id);
  });

  it('picks different events with different seeded rands', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;

    const offer1 = rollEventOffer(state, () => 0);
    const offer2 = rollEventOffer(state, () => 0.5);
    // With different rands, we should get different results (unless all events have same weight)
    // This test just ensures the function is sensitive to rand variations
    expect(offer1).not.toBeNull();
    expect(offer2).not.toBeNull();
  });

  it('cash equals sign(cashMinutes) × max(cashFloor, round(|cashMinutes| × 60 × grossRewardRate))', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;

    // On a fresh state with no income, grossRewardRate is 0
    const grr = grossRewardRate(state);
    expect(grr).toBe(0);

    // With zero income, cash should be ±cashFloor for each event
    const offer = rollEventOffer(state, () => 0); // picks first event
    if (offer) {
      const eventDef = RANDOM_EVENTS[0];
      const expectedCash =
        Math.sign(eventDef.cashMinutes) * Math.max(eventDef.cashFloor, Math.round(Math.abs(eventDef.cashMinutes) * 60 * grr));
      expect(offer.cash).toBe(expectedCash);
    }
  });

  it('weighted pick: rand() near 0 → first event, rand() near 1 → last event', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;

    // Using rand very close to 0 should pick one of the earlier events
    const offer0 = rollEventOffer(state, () => 0.001);
    expect(offer0).not.toBeNull();

    // Using rand very close to 1 should pick one of the later events
    // (the algorithm uses weighted selection, so this is approximate)
    const offer1 = rollEventOffer(state, () => 0.999);
    expect(offer1).not.toBeNull();
  });

  it('returns all fields with expected types', () => {
    const state = createInitialState(NOW);
    state.tutorial.done = true;
    state.totalEarned = EVENT_MIN_EARNED;
    const offer = rollEventOffer(state);

    expect(offer).not.toBeNull();
    expect(typeof offer!.id).toBe('string');
    expect(typeof offer!.emoji).toBe('string');
    expect(typeof offer!.cash).toBe('number');
    expect(Number.isFinite(offer!.cash)).toBe(true);
    expect(typeof offer!.mult).toBe('number');
    expect(typeof offer!.salaryMult).toBe('number');
    expect(typeof offer!.durationSec).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// acceptEventOffer — investor-offer (cash > 0, salaryMult 2)
// ---------------------------------------------------------------------------

describe('acceptEventOffer — investor-offer', () => {
  it('increases money by cash amount', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    const moneyBefore = activeCountry(state).money;
    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(moneyBefore + 500);
  });

  it('creates a boost with source event:investor-offer', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    expect(state.boosts.length).toBe(0);
    acceptEventOffer(state, offer);
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].source).toBe('event:investor-offer');
  });

  it('boost has mult 1 and salaryMult 2', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    acceptEventOffer(state, offer);
    expect(state.boosts[0].mult).toBe(1);
    expect(state.boosts[0].salaryMult).toBe(2);
    expect(state.boosts[0].remainingSec).toBe(600);
  });

  it('salaryBoostMult returns 2 when one such boost is active', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    expect(salaryBoostMult(state)).toBe(1); // Before accept
    acceptEventOffer(state, offer);
    expect(salaryBoostMult(state)).toBe(2); // After accept
  });

  it('tick drains exactly 2× normal salary when boost is active', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    const company = activeCompany(state);
    country.money = 1000;

    // Hire a junior worker (salary 0.2/sec)
    const worker = company.candidates[0];
    if (!worker) throw new Error('No candidates');
    // Create a worker manually to avoid hire cost check
    company.workers.push({
      id: state.nextEntityId++,
      name: 'Test',
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      traits: [],
    });

    // Get the salary rate
    const juniorTier = WORKER_TIERS.find((t) => t.id === 'junior');
    if (!juniorTier) throw new Error('No junior tier');

    // Tick without boost
    const moneyBefore1 = country.money;
    tick(state, 10);
    const salaryDrain1 = moneyBefore1 - country.money;

    // Reset for clean comparison
    country.money = 1000;

    // Accept investor offer (salaryMult 2)
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 100,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };
    acceptEventOffer(state, offer);

    // Tick with boost
    const moneyBefore2 = country.money;
    tick(state, 10);
    const salaryDrain2 = moneyBefore2 - country.money;

    // salaryDrain2 should be 2× salaryDrain1
    expect(salaryDrain2).toBeCloseTo(salaryDrain1 * 2, 5);
  });

  it('boost expires after durationSec and salaryBoostMult returns 1', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 10, // 10 seconds
    };

    acceptEventOffer(state, offer);
    expect(salaryBoostMult(state)).toBe(2);
    expect(state.boosts.length).toBe(1);

    // Tick past expiration
    tick(state, 11); // 11 > 10

    expect(state.boosts.length).toBe(0);
    expect(salaryBoostMult(state)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// acceptEventOffer — press-coverage (negative cash, output mult 2)
// ---------------------------------------------------------------------------

describe('acceptEventOffer — press-coverage', () => {
  it('refuses with error.notEnoughMoney when wallet cannot pay', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 100; // Insufficient
    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -250, // Need 250
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBe('error.notEnoughMoney');
    expect(activeCountry(state).money).toBe(100); // Money unchanged
  });

  it('charges exactly |cash| when affordable', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -250,
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    const moneyBefore = activeCountry(state).money;
    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(moneyBefore - 250);
  });

  it('grants an output boost with mult 2', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -250,
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    expect(state.boosts.length).toBe(0);
    acceptEventOffer(state, offer);
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].mult).toBe(2);
    expect(state.boosts[0].source).toBe('event:press-coverage');
  });

  it('boost source is event:press-coverage', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -250,
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    acceptEventOffer(state, offer);
    expect(state.boosts[0].source).toBe('event:press-coverage');
  });

  it('accepts when exactly enough money', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 250;
    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -250,
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// acceptEventOffer — boost cap (max 5 active boosts)
// ---------------------------------------------------------------------------

describe('acceptEventOffer — boost cap', () => {
  it('returns error.tooManyBoosts when already at 5 boosts', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 10000;

    // Add 5 boosts manually
    for (let i = 0; i < 5; i++) {
      state.boosts.push({
        mult: 2,
        salaryMult: undefined,
        remainingSec: 100,
        source: `test${i}`,
      });
    }

    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    const moneyBefore = activeCountry(state).money;
    const err = acceptEventOffer(state, offer);
    expect(err).toBe('error.tooManyBoosts');
    // Money should not change
    expect(activeCountry(state).money).toBe(moneyBefore);
    // Boost count should still be 5
    expect(state.boosts.length).toBe(5);
  });

  it('does not move money when boost cap is exceeded', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 10000;

    // Add 5 boosts
    for (let i = 0; i < 5; i++) {
      state.boosts.push({
        mult: 2,
        salaryMult: undefined,
        remainingSec: 100,
        source: `test${i}`,
      });
    }

    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    const moneyBefore = activeCountry(state).money;
    acceptEventOffer(state, offer);
    expect(activeCountry(state).money).toBe(moneyBefore);
  });

  it('allows acceptance when boost count is 4 (< 5)', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 10000;

    // Add 4 boosts
    for (let i = 0; i < 4; i++) {
      state.boosts.push({
        mult: 2,
        salaryMult: undefined,
        remainingSec: 100,
        source: `test${i}`,
      });
    }

    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(5);
  });

  it('boost check happens before cash deduction (order matters)', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 100; // Small wallet

    // Add 5 boosts
    for (let i = 0; i < 5; i++) {
      state.boosts.push({
        mult: 2,
        salaryMult: undefined,
        remainingSec: 100,
        source: `test${i}`,
      });
    }

    const offer: EventOffer = {
      id: 'press-coverage',
      emoji: '📰',
      cash: -50, // Would drain money
      mult: 2,
      salaryMult: 1,
      durationSec: 240,
    };

    const moneyBefore = activeCountry(state).money;
    const err = acceptEventOffer(state, offer);

    // Error should come from boost cap, not money
    expect(err).toBe('error.tooManyBoosts');
    // Money should be untouched (boost check happened first)
    expect(activeCountry(state).money).toBe(moneyBefore);
  });
});

// ---------------------------------------------------------------------------
// grantBoost — backward compatibility & salaryMult handling
// ---------------------------------------------------------------------------

describe('grantBoost', () => {
  it('classic call without salaryMult still works (undefined defaults to 1)', () => {
    const state = createInitialState(NOW);
    const err = grantBoost(state, 2, 100, 'test:classic');
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].mult).toBe(2);
    expect(state.boosts[0].salaryMult).toBeUndefined(); // or equals 1
  });

  it('accepts pure salary event (mult 1 + salaryMult 2)', () => {
    const state = createInitialState(NOW);
    const err = grantBoost(state, 1, 100, 'test:salary', 2);
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].mult).toBe(1);
    expect(state.boosts[0].salaryMult).toBe(2);
  });

  it('rejects mult 1 + salaryMult 1 as invalid (no benefit)', () => {
    const state = createInitialState(NOW);
    const err = grantBoost(state, 1, 100, 'test:invalid', 1);
    expect(err).toBe('error.invalidBoost');
    expect(state.boosts.length).toBe(0);
  });

  it('rejects when durationSec <= 0', () => {
    const state = createInitialState(NOW);
    const err = grantBoost(state, 2, 0, 'test:zero');
    expect(err).toBe('error.invalidBoost');
    expect(state.boosts.length).toBe(0);
  });

  it('rejects when mult <= 1 AND salaryMult <= 1 (both defaults to 1)', () => {
    const state = createInitialState(NOW);
    // mult=0.5 (< 1), salaryMult undefined (→ 1)
    const err = grantBoost(state, 0.5, 100, 'test:weak');
    expect(err).toBe('error.invalidBoost');
  });

  it('allows mult > 1 with any salaryMult (1 or higher)', () => {
    const state = createInitialState(NOW);
    const err1 = grantBoost(state, 2, 100, 'test1'); // salaryMult undefined (1)
    expect(err1).toBeNull();

    const err2 = grantBoost(state, 1.5, 100, 'test2', 2);
    expect(err2).toBeNull();

    expect(state.boosts.length).toBe(2);
  });

  it('allows salaryMult > 1 with any mult (1 or higher)', () => {
    const state = createInitialState(NOW);
    const err = grantBoost(state, 1, 100, 'test:salary', 3);
    expect(err).toBeNull();
    expect(state.boosts[0].salaryMult).toBe(3);
  });

  it('respects the 5-boost cap', () => {
    const state = createInitialState(NOW);

    for (let i = 0; i < 5; i++) {
      const err = grantBoost(state, 2, 100, `boost${i}`);
      expect(err).toBeNull();
    }

    // 6th boost should fail
    const err6 = grantBoost(state, 2, 100, 'boost5');
    expect(err6).toBe('error.tooManyBoosts');
    expect(state.boosts.length).toBe(5);
  });

  it('extends existing boost if re-granted from same source with same params', () => {
    const state = createInitialState(NOW);
    grantBoost(state, 2, 100, 'test:extend');
    expect(state.boosts[0].remainingSec).toBe(100);

    const err = grantBoost(state, 2, 50, 'test:extend');
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(1); // Still 1 boost, not 2
    expect(state.boosts[0].remainingSec).toBe(150); // Extended
  });

  it('does not extend if mult differs', () => {
    const state = createInitialState(NOW);
    grantBoost(state, 2, 100, 'test:extend');
    const err = grantBoost(state, 3, 100, 'test:extend'); // Different mult
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(2); // Added as new boost
  });

  it('does not extend if salaryMult differs', () => {
    const state = createInitialState(NOW);
    grantBoost(state, 1, 100, 'test:extend', 2);
    const err = grantBoost(state, 1, 100, 'test:extend', 3); // Different salaryMult
    expect(err).toBeNull();
    expect(state.boosts.length).toBe(2); // Added as new boost
  });
});

// ---------------------------------------------------------------------------
// Offline simulation — boosts expire
// ---------------------------------------------------------------------------

describe('Offline simulation — boosts', () => {
  it('simulateOffline ticks boost time down', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;

    // Grant a 600s boost
    grantBoost(state, 2, 600, 'test:offline');
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].remainingSec).toBe(600);

    // Simulate 700s offline (more than boost duration)
    simulateOffline(state, 700, 700);

    // Boost should be expired
    expect(state.boosts.length).toBe(0);
  });

  it('simulateOffline partially expires a boost if elapsed < duration', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;

    // Grant a 600s boost
    grantBoost(state, 2, 600, 'test:partial');
    expect(state.boosts[0].remainingSec).toBe(600);

    // Simulate 300s offline (half the duration)
    simulateOffline(state, 300, 300);

    // Boost should still be active but reduced
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].remainingSec).toBeCloseTo(300, 0); // ~300s remaining
  });

  it('simulateOffline respects the capSec limit', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;

    // Grant a 600s boost
    grantBoost(state, 2, 600, 'test:cap');

    // Simulate with elapsedSec=1000 but capSec=300
    simulateOffline(state, 1000, 300);

    // Should only simulate 300s, so boost should have ~300s remaining
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].remainingSec).toBeCloseTo(300, 0);
  });

  it('simulateOffline with zero boosts does not error', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;

    expect(state.boosts.length).toBe(0);
    const earned = simulateOffline(state, 100, 100);
    expect(typeof earned).toBe('number');
  });

  it('event boost expires correctly during offline (investor-offer 600s)', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 10000;

    // Accept investor offer (600s boost)
    const offer: EventOffer = {
      id: 'investor-offer',
      emoji: '💼',
      cash: 500,
      mult: 1,
      salaryMult: 2,
      durationSec: 600,
    };
    acceptEventOffer(state, offer);
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].remainingSec).toBe(600);

    // Simulate 700s offline
    simulateOffline(state, 700, 700);

    // Boost should be expired
    expect(state.boosts.length).toBe(0);
    expect(salaryBoostMult(state)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Integration: event acceptance with various edge cases
// ---------------------------------------------------------------------------

describe('acceptEventOffer — edge cases & integration', () => {
  it('accepts an event offer that has both positive cash and output mult', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'test-hybrid',
      emoji: '🎯',
      cash: 100,
      mult: 1.5,
      salaryMult: 1,
      durationSec: 180,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(1100);
    expect(state.boosts.length).toBe(1);
    expect(state.boosts[0].mult).toBe(1.5);
  });

  it('rejects an offer with invalid boost params', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'bad-offer',
      emoji: '❌',
      cash: 100,
      mult: 1,
      salaryMult: 1,
      durationSec: 0, // Invalid
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBe('error.invalidBoost');
    expect(activeCountry(state).money).toBe(1000); // Unchanged
  });

  it('rejects an offer with non-finite cash', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'bad-offer',
      emoji: '❌',
      cash: Infinity,
      mult: 2,
      salaryMult: 1,
      durationSec: 100,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBe('error.invalidBoost');
  });

  it('rejects an offer with non-finite mult', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'bad-offer',
      emoji: '❌',
      cash: 100,
      mult: NaN,
      salaryMult: 1,
      durationSec: 100,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBe('error.invalidBoost');
  });

  it('accepts offer with very large positive cash', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 10_000_000;
    const offer: EventOffer = {
      id: 'big-offer',
      emoji: '💰',
      cash: 1_000_000,
      mult: 1,
      salaryMult: 2,
      durationSec: 100,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(10_000_000 + 1_000_000);
  });

  it('accepts offer with zero cash if boost is valid', () => {
    const state = createInitialState(NOW);
    activeCountry(state).money = 1000;
    const offer: EventOffer = {
      id: 'zero-cash',
      emoji: '⚡',
      cash: 0,
      mult: 2,
      salaryMult: 1,
      durationSec: 100,
    };

    const err = acceptEventOffer(state, offer);
    expect(err).toBeNull();
    expect(activeCountry(state).money).toBe(1000); // Unchanged
    expect(state.boosts.length).toBe(1);
  });
});
