import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/game/data';
import { createInitialState, createCountry } from '../src/game/engine';
import { metricValue } from '../src/game/missions';
import { storyBeatById } from '../src/game/story';

const NOW = 1_700_000_000_000;

describe('builders mission metric', () => {
  it('sums the construction pool across countries', () => {
    const state = createInitialState(NOW);
    expect(metricValue(state, 'builders')).toBe(1); // Gabriel's gift builder

    state.countries[0].builders.count = 3;
    createCountry(state, 'fr');
    expect(metricValue(state, 'builders')).toBe(4); // 3 + the new country's gift
  });

  it('has a builders mission chain with ascending targets', () => {
    const chain = MISSIONS.filter((m) => m.metric === 'builders');
    expect(chain.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].target).toBeGreaterThan(chain[i - 1].target);
    }
  });
});

describe('builders-guild story beat', () => {
  it('fires on the durable floorGiftClaimed flag', () => {
    const state = createInitialState(NOW);
    const beat = storyBeatById('builders-guild');
    expect(beat.trigger(state)).toBe(false);
    state.floorGiftClaimed = true;
    expect(beat.trigger(state)).toBe(true);
  });
});
