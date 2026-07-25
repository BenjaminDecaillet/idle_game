import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_LOOK, PLAYER_LOOK_OPTIONS } from '../src/game/data';
import { buyCompany, createInitialState, getProject } from '../src/game/engine';
import {
  cyclePlayerLook,
  officeStage,
  PLAYER_LOOK_FIELDS,
  setPlayerLook,
} from '../src/game/player';
import { migrate } from '../src/game/save';

const NOW = 1_700_000_000_000;

describe('player look', () => {
  it('starts with the default look', () => {
    const state = createInitialState(NOW);
    expect(state.player.look).toEqual(DEFAULT_PLAYER_LOOK);
  });

  it('sets valid fields atomically and rejects invalid values', () => {
    const state = createInitialState(NOW);
    expect(setPlayerLook(state, { skin: 4, outfit: 7 })).toBeNull();
    expect(state.player.look.skin).toBe(4);
    expect(state.player.look.outfit).toBe(7);
    expect(setPlayerLook(state, { skin: 1, hair: PLAYER_LOOK_OPTIONS.hair })).toBe(
      'Invalid hair',
    );
    // Atomic: the valid part of a rejected patch must not apply.
    expect(state.player.look.skin).toBe(4);
    expect(setPlayerLook(state, { eyeStyle: -1 })).toBe('Invalid eyeStyle');
    expect(setPlayerLook(state, { mouthStyle: 1.5 })).toBe('Invalid mouthStyle');
  });

  it('cycles every field with wrap-around in both directions', () => {
    const state = createInitialState(NOW);
    for (const field of PLAYER_LOOK_FIELDS) {
      const count = PLAYER_LOOK_OPTIONS[field];
      state.player.look[field] = count - 1;
      expect(cyclePlayerLook(state, field, 1)).toBeNull();
      expect(state.player.look[field]).toBe(0);
      expect(cyclePlayerLook(state, field, -1)).toBeNull();
      expect(state.player.look[field]).toBe(count - 1);
    }
  });
});

describe('office stage', () => {
  it('progresses from garage to orbital study with the dream', () => {
    const state = createInitialState(NOW);
    state.money = Number.MAX_SAFE_INTEGER;
    expect(officeStage(state)).toBe(0);
    buyCompany(state, 'loft');
    expect(officeStage(state)).toBe(1);
    buyCompany(state, 'paloalto');
    buyCompany(state, 'campus');
    expect(officeStage(state)).toBe(1);
    buyCompany(state, 'tower');
    expect(officeStage(state)).toBe(2); // 5 companies
    buyCompany(state, 'orbital');
    expect(officeStage(state)).toBe(2); // orbital owned but AGI not shipped
    const orbital = state.companies.find((c) => c.siteId === 'orbital')!;
    getProject(orbital, 'agi').completions = 1;
    expect(officeStage(state)).toBe(3);
  });

  it('reaches stage 2 through AGI research alone', () => {
    const state = createInitialState(NOW);
    getProject(state.companies[0], 'agi').unlocked = true;
    expect(officeStage(state)).toBe(2);
  });
});

describe('save migration v6', () => {
  it('gives old saves the default look', () => {
    const state = createInitialState(NOW);
    const raw = JSON.parse(JSON.stringify(state)) as { player?: unknown };
    raw.player = { name: 'Ada' }; // v4/v5 shape without look
    const migrated = migrate(raw as never, NOW);
    expect(migrated.player.name).toBe('Ada');
    expect(migrated.player.look).toEqual(DEFAULT_PLAYER_LOOK);
  });

  it('v7: v6 saves without a portrait field default to the drawn look', () => {
    const state = createInitialState(NOW);
    const raw = JSON.parse(JSON.stringify(state)) as { player: { look: Record<string, unknown> } };
    delete raw.player.look.portrait; // v6 shape
    const migrated = migrate(raw as never, NOW);
    expect(migrated.player.look.portrait).toBe(0);
  });

  it('v7: valid portrait picks survive, corrupt ones reset', () => {
    const state = createInitialState(NOW);
    setPlayerLook(state, { portrait: 5 });
    const roundTrip = migrate(JSON.parse(JSON.stringify(state)), NOW);
    expect(roundTrip.player.look.portrait).toBe(5);

    const raw = JSON.parse(JSON.stringify(state));
    raw.player.look.portrait = PLAYER_LOOK_OPTIONS.portrait; // out of range
    expect(migrate(raw, NOW).player.look.portrait).toBe(DEFAULT_PLAYER_LOOK.portrait);
  });

  it('repairs corrupt look indexes field by field', () => {
    const state = createInitialState(NOW);
    setPlayerLook(state, { hair: 3, outfit: 5 });
    const raw = JSON.parse(JSON.stringify(state));
    raw.player.look.skin = 99;
    raw.player.look.accessory = -2;
    raw.player.look.mouthStyle = 'x';
    const migrated = migrate(raw, NOW);
    expect(migrated.player.look.skin).toBe(DEFAULT_PLAYER_LOOK.skin);
    expect(migrated.player.look.accessory).toBe(DEFAULT_PLAYER_LOOK.accessory);
    expect(migrated.player.look.mouthStyle).toBe(DEFAULT_PLAYER_LOOK.mouthStyle);
    expect(migrated.player.look.hair).toBe(3); // valid values survive
    expect(migrated.player.look.outfit).toBe(5);
  });
});
