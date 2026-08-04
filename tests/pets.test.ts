import { describe, expect, it } from 'vitest';
import { PETS, petById } from '../src/game/data';
import {
  activeCompany,
  buyPet,
  createInitialState,
  grantVsCoin,
  setCompanyPet,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import type { GameState } from '../src/game/types';

const NOW = 1_700_000_000_000;

describe('office pets (zero-power cosmetics)', () => {
  it('buyPet spends VsCoin once and refuses a re-buy', () => {
    const state = createInitialState(NOW);
    const pet = PETS[0];
    expect(buyPet(state, pet.id)).toBe('error.notEnoughVsCoin');
    grantVsCoin(state, 50, 'test');
    expect(buyPet(state, pet.id)).toBeNull();
    expect(state.ownedPets).toContain(pet.id);
    const tail = state.vsCoinLedger[state.vsCoinLedger.length - 1];
    expect(tail).toEqual(
      expect.objectContaining({ amount: -pet.vsCoinCost, source: `shop:pet-${pet.id}` }),
    );
    expect(buyPet(state, pet.id)).toBe('error.alreadyOwned');
  });

  it('setCompanyPet requires ownership and can dismiss', () => {
    const state = createInitialState(NOW);
    expect(setCompanyPet(state, 'duck')).toBe('error.petNotOwned');
    grantVsCoin(state, 50, 'test');
    buyPet(state, 'duck');
    expect(setCompanyPet(state, 'duck')).toBeNull();
    expect(activeCompany(state).petId).toBe('duck');
    expect(setCompanyPet(state, null)).toBeNull();
    expect(activeCompany(state).petId).toBeNull();
  });

  it('migrate drops unknown pets, defaults missing fields, keeps valid ones', () => {
    const state = createInitialState(NOW);
    grantVsCoin(state, 50, 'test');
    buyPet(state, 'cat');
    setCompanyPet(state, 'cat');
    const saved = JSON.parse(JSON.stringify(state)) as GameState;
    (saved.ownedPets as string[]).push('removed-pet');
    const migrated = migrate(saved, NOW);
    expect(migrated.ownedPets).toEqual(['cat']);
    expect(migrated.countries[0].companies[0].petId).toBe('cat');

    (saved.countries[0].companies[0] as { petId: string | null }).petId = 'removed-pet';
    delete (saved as Partial<GameState>).ownedPets;
    const repaired = migrate(saved, NOW);
    expect(repaired.ownedPets).toEqual([]);
    expect(repaired.countries[0].companies[0].petId).toBeNull();
  });

  it('every pet id resolves and costs VsCoin', () => {
    for (const pet of PETS) {
      expect(petById(pet.id)).toBe(pet);
      expect(pet.vsCoinCost).toBeGreaterThan(0);
    }
  });
});
