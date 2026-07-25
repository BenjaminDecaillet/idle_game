import { describe, expect, it } from 'vitest';
import { PLAYER_PORTRAIT_COUNT } from '../src/game/data';
import { hashSeed, portraitSlot } from '../src/ui/persona';
import {
  EMPLOYEE_PORTRAIT_COUNT,
  employeePortrait,
  gabrielDialogPortrait,
  playerPortrait,
  portraitNames,
} from '../src/ui/portraits';
import { DEFAULT_PLAYER_LOOK } from '../src/game/data';

describe('portrait slot mapping', () => {
  it('is deterministic and in range for any seed', () => {
    for (const seed of ['w:1:Ada', 'w:2:Linus', 'c:Grace:senior', 'x', '']) {
      const slot = portraitSlot(seed, EMPLOYEE_PORTRAIT_COUNT);
      expect(slot).toBe(portraitSlot(seed, EMPLOYEE_PORTRAIT_COUNT));
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(EMPLOYEE_PORTRAIT_COUNT);
      expect(Number.isInteger(slot)).toBe(true);
    }
  });

  it('rides its own hash shift — existing persona traits stay untouched', () => {
    // The slot must read bits 16+ of the same FNV-1a hash the face traits
    // use; spot-check the formula so a refactor can't silently reshuffle
    // every player's roster portraits.
    const seed = 'w:42:Margaret';
    expect(portraitSlot(seed, 24)).toBe((hashSeed(seed) >>> 16) % 24);
  });

  it('spreads a real-ish roster across the pool', () => {
    const slots = new Set<number>();
    for (let i = 0; i < 200; i++) slots.add(portraitSlot(`w:${i}:Worker ${i}`, 24));
    expect(slots.size).toBeGreaterThan(16); // not everyone on the same card
  });
});

describe('portrait file inventory', () => {
  it('lists every file the pipeline can consume', () => {
    const names = portraitNames();
    expect(names).toHaveLength(EMPLOYEE_PORTRAIT_COUNT + PLAYER_PORTRAIT_COUNT + 4);
    expect(names).toContain('employee-01');
    expect(names).toContain(`employee-${String(EMPLOYEE_PORTRAIT_COUNT).padStart(2, '0')}`);
    expect(names).toContain('player-01');
    expect(names).toContain(`player-${String(PLAYER_PORTRAIT_COUNT).padStart(2, '0')}`);
    for (const pose of ['idle', 'point', 'cheer', 'think']) {
      expect(names).toContain(`gabriel-${pose}`);
    }
    expect(new Set(names).size).toBe(names.length); // no duplicates
  });
});

describe('SVG fallbacks (no raster assets present)', () => {
  it('employee portraits fall back to a painted SVG bust', () => {
    const svg = employeePortrait('w:1:Ada', 'Frontend', 'senior', 44);
    expect(svg).toContain('<svg');
    expect(svg).toContain('portrait-svg');
  });

  it('player portraits fall back to painting the drawn look', () => {
    for (const portrait of [0, 3]) {
      const svg = playerPortrait({ ...DEFAULT_PLAYER_LOOK, portrait }, 96);
      expect(svg).toContain('<svg');
    }
  });

  it('gabriel falls back to the painted robot portrait per pose', () => {
    for (const pose of ['idle', 'point', 'cheer', 'think'] as const) {
      const svg = gabrielDialogPortrait(pose, 62);
      expect(svg).toContain('<svg');
    }
  });

  it('two different personas never share gradient ids in the same DOM', () => {
    const a = employeePortrait('w:1:Ada', 'Frontend', 'intern', 44);
    const b = employeePortrait('w:2:Bob', 'Backend', 'principal', 44);
    const ids = (svg: string): string[] =>
      [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    const overlap = ids(a).filter((id) => ids(b).includes(id));
    expect(overlap).toEqual([]);
  });
});
