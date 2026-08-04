import { describe, expect, it } from 'vitest';
import {
  SKILL_OUTPUT_PER_LEVEL,
  TRAITS,
  TRAIT_CHANCE,
  WORKER_TIERS,
  traitById,
} from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  autoSeat,
  buyWorkstation,
  companySalaries,
  createInitialState,
  hireWorker,
  rollCandidates,
  rollTraits,
  tick,
  tierSalary,
  traitOutputMult,
  traitSalaryMult,
  traitXpMult,
  workerRate,
  workerSalary,
} from '../src/game/engine';
import { migrate, serialize } from '../src/game/save';
import type { WorkerState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function makeWorker(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id: 9999,
    name: 'Test Worker',
    tierId: 'junior',
    specialization: 'Backend',
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
// rollTraits: determinism & distribution
// ---------------------------------------------------------------------------

describe('rollTraits', () => {
  it('returns empty array when rand always returns >= TRAIT_CHANCE', () => {
    const rand = () => TRAIT_CHANCE + 0.01; // always >= 0.35
    const traits = rollTraits(rand);
    expect(traits).toEqual([]);
  });

  it('returns exactly 1 trait when first rand < TRAIT_CHANCE but second >= RARE_TRAIT_CHANCE', () => {
    let calls = 0;
    // First call: < TRAIT_CHANCE (0.35) → trigger trait roll
    // Second call: draw from pool, always >= RARE_TRAIT_CHANCE (0.06) → no second trait
    const values = [0.1, 0.99, 0.2, 0.3, 0.4]; // repeat as needed
    const rand = () => values[calls++ % values.length];

    const traits = rollTraits(rand);
    expect(traits).toHaveLength(1);
    expect(TRAITS.some((t) => t.id === traits[0])).toBe(true);
  });

  it('returns exactly 2 distinct traits when both rolls succeed', () => {
    let calls = 0;
    // First call: < TRAIT_CHANCE → trigger trait roll
    // Second call: pool draw
    // Third call: < RARE_TRAIT_CHANCE → trigger second trait
    // Fourth call: pool draw (excluding first trait)
    const values = [0.1, 0.3, 0.05, 0.2, 0.4];
    const rand = () => values[calls++ % values.length];

    const traits = rollTraits(rand);
    expect(traits).toHaveLength(2);
    expect(traits[0]).not.toBe(traits[1]);
    expect(TRAITS.some((t) => t.id === traits[0])).toBe(true);
    expect(TRAITS.some((t) => t.id === traits[1])).toBe(true);
  });

  it('only includes known trait ids from TRAITS constant', () => {
    const traitIds = new Set(TRAITS.map((t) => t.id));
    // Test many random rolls
    let calls = 0;
    const values = Array.from({ length: 100 }, (_, i) => (i % 10) / 10);
    const rand = () => values[calls++ % values.length];

    for (let i = 0; i < 20; i++) {
      const traits = rollTraits(rand);
      for (const id of traits) {
        expect(traitIds.has(id)).toBe(true);
      }
    }
  });

  it('never returns the same trait twice', () => {
    let calls = 0;
    // Craft values to force both conditions and draw from pool
    const values = [0.1, 0.25, 0.03, 0.15, 0.35, 0.2];
    const rand = () => values[calls++ % values.length];

    for (let i = 0; i < 10; i++) {
      calls = 0;
      const traits = rollTraits(rand);
      if (traits.length === 2) {
        expect(traits[0]).not.toBe(traits[1]);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// rollCandidates: traits array + tutorial Steve Gates
// ---------------------------------------------------------------------------

describe('rollCandidates', () => {
  it('each candidate carries a traits array', () => {
    const state = createInitialState(NOW);
    const candidates = rollCandidates(state);
    expect(candidates).toHaveLength(3);
    for (const candidate of candidates) {
      expect(Array.isArray(candidate.traits)).toBe(true);
      expect(candidate.traits.every((id) => typeof id === 'string')).toBe(true);
    }
  });

  it('is deterministic given a fixed rand sequence', () => {
    const state = createInitialState(NOW);
    let calls = 0;
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05, 0.15, 0.25];
    const fakeRand = () => values[calls++ % values.length];

    const first = rollCandidates(state, fakeRand);
    calls = 0;
    const second = rollCandidates(state, fakeRand);

    expect(first).toEqual(second);
    for (let i = 0; i < 3; i++) {
      expect(first[i].traits).toEqual(second[i].traits);
    }
  });

  it('tutorial Steve Gates (first hire, no prior hires) has no traits', () => {
    const state = createInitialState(NOW);

    let calls = 0;
    const values = Array.from({ length: 50 }, (_, i) => (i % 10) / 10);
    const fakeRand = () => values[calls++ % values.length];

    const candidates = rollCandidates(state, fakeRand);
    // First candidate should be Steve Gates (tutorial not done, no workers yet)
    expect(candidates[0].name).toBe('Steve Gates');
    expect(candidates[0].traits).toEqual([]);
  });

  it('tutorial Steve Gates has no traits even if roll logic would grant them', () => {
    const state = createInitialState(NOW);

    // Return values that would normally trigger trait rolls
    const values = Array.from({ length: 100 }, () => 0.1);
    let calls = 0;
    const fakeRand = () => values[calls++];

    const candidates = rollCandidates(state, fakeRand);
    expect(candidates[0].name).toBe('Steve Gates');
    expect(candidates[0].traits).toEqual([]);
  });

  it('non-tutorial candidates get normal trait rolls', () => {
    const state = createInitialState(NOW);

    // Simulate: hire the tutorial Steve Gates to exit tutorial hire logic
    const country = activeCountry(state);
    country.money = 1_000_000;
    hireWorker(state, 0); // hire first candidate (Steve Gates)

    // Now roll new candidates (all 3 should have normal trait logic)
    let calls = 0;
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.08, 0.9, 0.05, 0.15, 0.25];
    const fakeRand = () => values[calls++ % values.length];

    const candidates = rollCandidates(state, fakeRand);
    // At least one should have traits (given the values)
    const allEmpty = candidates.every((cand) => cand.traits.length === 0);
    expect(allEmpty).toBe(false); // statistically, some should get traits
  });
});

// ---------------------------------------------------------------------------
// Multipliers: output, salary, xp
// ---------------------------------------------------------------------------

describe('traitOutputMult', () => {
  it('returns 1 for empty traits array', () => {
    expect(traitOutputMult([])).toBe(1);
  });

  it('returns exact trait output value for single trait', () => {
    const rockstar = traitById('rockstar');
    expect(traitOutputMult(['rockstar'])).toBe(rockstar.output);

    const quick = traitById('quick-study');
    expect(traitOutputMult(['quick-study'])).toBe(quick.output);
  });

  it('multiplies multiple trait output values (product)', () => {
    const rockstar = traitById('rockstar');
    const frugal = traitById('frugal');
    const expected = rockstar.output * frugal.output;
    expect(traitOutputMult(['rockstar', 'frugal'])).toBeCloseTo(expected, 10);
  });
});

describe('traitSalaryMult', () => {
  it('returns 1 for empty traits array', () => {
    expect(traitSalaryMult([])).toBe(1);
  });

  it('returns exact trait salary value for single trait', () => {
    const frugal = traitById('frugal');
    expect(traitSalaryMult(['frugal'])).toBe(frugal.salary);

    const coffee = traitById('coffee-addict');
    expect(traitSalaryMult(['coffee-addict'])).toBe(coffee.salary);
  });

  it('multiplies multiple trait salary values (product)', () => {
    const rockstar = traitById('rockstar');
    const coffee = traitById('coffee-addict');
    const expected = rockstar.salary * coffee.salary;
    expect(traitSalaryMult(['rockstar', 'coffee-addict'])).toBeCloseTo(expected, 10);
  });
});

describe('traitXpMult', () => {
  it('returns 1 for empty traits array', () => {
    expect(traitXpMult([])).toBe(1);
  });

  it('returns exact trait xp value for single trait', () => {
    const quick = traitById('quick-study');
    expect(traitXpMult(['quick-study'])).toBe(quick.xp);

    const perfect = traitById('perfectionist');
    expect(traitXpMult(['perfectionist'])).toBe(perfect.xp);
  });

  it('multiplies multiple trait xp values (product)', () => {
    const quick = traitById('quick-study');
    const perfect = traitById('perfectionist');
    const expected = quick.xp * perfect.xp;
    expect(traitXpMult(['quick-study', 'perfectionist'])).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// workerRate with traits
// ---------------------------------------------------------------------------

describe('workerRate trait factor', () => {
  it('equals the trait output multiplier times the rate without traits', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push({ id: 1, defId: 'basic' });

    const withoutTraits = makeWorker({
      tierId: 'junior',
      specialization: 'Backend',
      stationId: 1,
      traits: [],
    });
    const withTraits = makeWorker({
      tierId: 'junior',
      specialization: 'Backend',
      stationId: 1,
      traits: ['rockstar'],
    });

    const rateWithout = workerRate(state, c, withoutTraits, 'landing');
    const rateWith = workerRate(state, c, withTraits, 'landing');
    const traitMult = traitById('rockstar').output;

    expect(rateWith).toBeCloseTo(rateWithout * traitMult, 10);
  });

  it('combines multiple traits multiplicatively', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push({ id: 1, defId: 'basic' });

    const base = makeWorker({
      tierId: 'junior',
      specialization: 'Backend',
      stationId: 1,
      traits: [],
    });
    const multiTrait = makeWorker({
      tierId: 'junior',
      specialization: 'Backend',
      stationId: 1,
      traits: ['night-owl', 'coffee-addict'],
    });

    const rateBase = workerRate(state, c, base, 'landing');
    const rateMulti = workerRate(state, c, multiTrait, 'landing');

    const owl = traitById('night-owl');
    const coffee = traitById('coffee-addict');
    const expectedMult = owl.output * coffee.output;

    expect(rateMulti).toBeCloseTo(rateBase * expectedMult, 10);
  });

  it('trait multiplier applies after skill multiplier and desk bonus', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    c.workstations.push({ id: 1, defId: 'standing' }); // 1.25x

    const worker = makeWorker({
      tierId: 'mid',
      specialization: 'Backend',
      skillLevel: 5,
      stationId: 1,
      traits: ['rockstar'],
    });

    const rate = workerRate(state, c, worker, 'landing');
    const tier = WORKER_TIERS.find((t) => t.id === 'mid')!;
    const skillMult = 1 + SKILL_OUTPUT_PER_LEVEL * (5 - 1);
    const deskMult = 1.25;
    const traitMult = traitById('rockstar').output;

    // landing has no spec match (Backend project = Frontend)
    const expected = tier.baseRate * skillMult * deskMult * traitMult * 1; // global mults
    expect(rate).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// workerSalary with traits
// ---------------------------------------------------------------------------

describe('workerSalary with traits', () => {
  it('equals tier salary times the trait salary multiplier', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    const worker = makeWorker({
      tierId: 'senior',
      traits: ['frugal'],
    });

    const salary = workerSalary(c, worker);
    const baseTierSalary = tierSalary(c, 'senior');
    const frugal = traitById('frugal');

    expect(salary).toBeCloseTo(baseTierSalary * frugal.salary, 10);
  });

  it('multiplies multiple trait salary values (product)', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    const worker = makeWorker({
      tierId: 'junior',
      traits: ['coffee-addict', 'rockstar'],
    });

    const salary = workerSalary(c, worker);
    const baseTierSalary = tierSalary(c, 'junior');
    const coffee = traitById('coffee-addict');
    const rockstar = traitById('rockstar');

    expect(salary).toBeCloseTo(baseTierSalary * coffee.salary * rockstar.salary, 10);
  });
});

// ---------------------------------------------------------------------------
// companySalaries with traits
// ---------------------------------------------------------------------------

describe('companySalaries includes trait salary multipliers', () => {
  it('frugal worker lowers the sum by exactly the salary factor', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Add two workers of the same tier, one frugal
    const frugalWorker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      traits: ['frugal'],
    });
    const normalWorker = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      traits: [],
    });

    c.workers.push(frugalWorker, normalWorker);

    const frugalSalary = workerSalary(c, frugalWorker);
    const normalSalary = workerSalary(c, normalWorker);
    const totalSalaries = companySalaries(c);

    const expected = frugalSalary + normalSalary;
    expect(totalSalaries).toBeCloseTo(expected, 10);
    expect(frugalSalary).toBeLessThan(normalSalary);
  });

  it('includes all workers with their trait salary multipliers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    const w1 = makeWorker({ id: state.nextEntityId++, tierId: 'intern', traits: [] });
    const w2 = makeWorker({ id: state.nextEntityId++, tierId: 'junior', traits: ['frugal'] });
    const w3 = makeWorker({ id: state.nextEntityId++, tierId: 'mid', traits: ['rockstar'] });

    c.workers.push(w1, w2, w3);

    const total = companySalaries(c);
    const expected = workerSalary(c, w1) + workerSalary(c, w2) + workerSalary(c, w3);

    expect(total).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// XP gain with trait multiplier
// ---------------------------------------------------------------------------

describe('XP gain with quick-study trait', () => {
  it('quick-study worker gains exactly xp-mult times the other workers xp in same tick', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    buyWorkstation(state, 'basic');
    buyWorkstation(state, 'basic');

    const quick = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      traits: ['quick-study'],
    });
    const normal = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      traits: [],
    });

    c.workers.push(quick, normal);
    autoSeat(c);

    // Both should be seated (2 desks available)
    expect(quick.stationId).not.toBeNull();
    expect(normal.stationId).not.toBeNull();

    // Tick without enough to level up
    const dt = 10;
    tick(state, dt);

    const quickXpMult = traitById('quick-study').xp;
    expect(quick.experience).toBeCloseTo(normal.experience * quickXpMult, 10);
  });

  it('perfectionist worker gains less xp than normal worker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    buyWorkstation(state, 'basic');
    buyWorkstation(state, 'basic');

    const perfect = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      traits: ['perfectionist'],
    });
    const normal = makeWorker({
      id: state.nextEntityId++,
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      traits: [],
    });

    c.workers.push(perfect, normal);
    autoSeat(c);

    tick(state, 10);

    const perfectXpMult = traitById('perfectionist').xp;
    expect(perfect.experience).toBeCloseTo(normal.experience * perfectXpMult, 10);
    expect(perfectXpMult).toBeLessThan(1);
    expect(perfect.experience).toBeLessThan(normal.experience);
  });

  it('xp multiplier does not affect level-up count, only speed', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    buyWorkstation(state, 'basic');

    const quick = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      stationId: 1,
      traits: ['quick-study'],
    });
    const normal = makeWorker({
      id: state.nextEntityId++,
      tierId: 'intern',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      traits: [],
    });

    c.workers.push(quick, normal);
    autoSeat(c);

    // Tick enough that quick-study should have at least one level-up
    tick(state, 200);

    // quick-study should have at least as many level-ups as normal
    expect(quick.skillLevel).toBeGreaterThanOrEqual(normal.skillLevel);
  });
});

// ---------------------------------------------------------------------------
// hireWorker copies traits from candidate
// ---------------------------------------------------------------------------

describe('hireWorker copies traits from candidate', () => {
  it('copies candidate traits to hired worker', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    // Manually set up a candidate with traits
    c.candidates = [
      {
        name: 'Test Candidate',
        tierId: 'junior',
        specialization: 'Frontend',
        traits: ['frugal', 'quick-study'],
      },
    ];

    hireWorker(state, 0);

    expect(c.workers).toHaveLength(1);
    expect(c.workers[0].traits).toEqual(['frugal', 'quick-study']);
    expect(c.workers[0].name).toBe('Test Candidate');
  });

  it('copies empty traits array when candidate has none', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    c.candidates = [
      {
        name: 'No Traits',
        tierId: 'intern',
        specialization: 'DevOps',
        traits: [],
      },
    ];

    hireWorker(state, 0);

    expect(c.workers).toHaveLength(1);
    expect(c.workers[0].traits).toEqual([]);
  });

  it('copies multiple traits correctly', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);
    const country = activeCountry(state);
    country.money = 1_000_000;

    c.candidates = [
      {
        name: 'Multi Trait',
        tierId: 'mid',
        specialization: 'Data Science',
        traits: ['night-owl', 'coffee-addict', 'perfectionist'],
      },
    ];

    hireWorker(state, 0);

    expect(c.workers[0].traits).toEqual(['night-owl', 'coffee-addict', 'perfectionist']);
  });
});

// ---------------------------------------------------------------------------
// migrate: drops unknown trait ids, preserves valid ones
// ---------------------------------------------------------------------------

describe('migrate: trait id hygiene', () => {
  it('drops unknown trait ids from workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // Manually corrupt a worker with a fake trait
    c.workers.push({
      id: 1,
      name: 'Corrupted',
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      traits: ['rockstar', 'removed-trait-x', 'quick-study'],
    });

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const worker = migrated.countries[0]!.companies[0]!.workers[0];
    expect(worker.traits).toEqual(['rockstar', 'quick-study']);
    expect(worker.traits).not.toContain('removed-trait-x');
  });

  it('keeps valid trait ids', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    c.workers.push({
      id: 1,
      name: 'Valid',
      tierId: 'senior',
      specialization: 'Backend',
      skillLevel: 1,
      experience: 0,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      traits: ['night-owl', 'frugal', 'perfectionist'],
    });

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const worker = migrated.countries[0]!.companies[0]!.workers[0];
    expect(worker.traits).toEqual(['night-owl', 'frugal', 'perfectionist']);
  });

  it('defaults missing traits field to empty array for workers', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // Create a worker without traits field (pre-trait save)
    const corrupted: any = {
      id: 1,
      name: 'Old Save',
      tierId: 'intern',
      specialization: 'Frontend',
      skillLevel: 1,
      experience: 0,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      // no traits field
    };
    c.workers.push(corrupted);

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const worker = migrated.countries[0]!.companies[0]!.workers[0];
    expect(worker.traits).toEqual([]);
  });

  it('drops unknown trait ids from candidates', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // Manually corrupt a candidate
    c.candidates = [
      {
        name: 'Bad Candidate',
        tierId: 'junior',
        specialization: 'Backend',
        traits: ['rockstar', 'unknown-trait', 'coffee-addict'],
      },
    ];

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const candidate = migrated.countries[0]!.companies[0]!.candidates[0];
    expect(candidate.traits).toEqual(['rockstar', 'coffee-addict']);
    expect(candidate.traits).not.toContain('unknown-trait');
  });

  it('defaults missing traits field to empty array for candidates', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    // Create a candidate without traits field (pre-trait save)
    const corrupted: any = {
      name: 'Old Candidate',
      tierId: 'mid',
      specialization: 'Backend',
      // no traits field
    };
    c.candidates = [corrupted];

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const candidate = migrated.countries[0]!.companies[0]!.candidates[0];
    expect(candidate.traits).toEqual([]);
  });

  it('JSON round-trip preserves valid traits in workers and candidates', () => {
    const state = createInitialState(NOW);
    const c = activeCompany(state);

    c.workers.push({
      id: 1,
      name: 'Worker',
      tierId: 'junior',
      specialization: 'Backend',
      skillLevel: 2,
      experience: 10,
      stationId: null,
      timesTrained: 0,
      promotions: 0,
      traits: ['rockstar', 'quick-study'],
    });

    c.candidates = [
      {
        name: 'Candidate',
        tierId: 'mid',
        specialization: 'Frontend',
        traits: ['frugal', 'night-owl'],
      },
    ];

    const json = serialize(state);
    const parsed = JSON.parse(json) as Partial<typeof state>;
    const migrated = migrate(parsed);

    const worker = migrated.countries[0]!.companies[0]!.workers[0];
    const candidate = migrated.countries[0]!.companies[0]!.candidates[0];

    expect(worker.traits).toEqual(['rockstar', 'quick-study']);
    expect(candidate.traits).toEqual(['frugal', 'night-owl']);
  });
});
