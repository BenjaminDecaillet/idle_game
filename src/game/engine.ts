import {
  FIRST_NAMES,
  LAST_NAMES,
  PROJECTS,
  SKILL_OUTPUT_PER_LEVEL,
  SPEC_MATCH_BONUS,
  SPECIALIZATIONS,
  TRAIN_COST_BASE,
  WORKER_TIERS,
  projectDefById,
  stationDefById,
  tierById,
  upgradeDefById,
} from './data';
import type {
  Candidate,
  GameState,
  ProjectState,
  TickEvents,
  WorkerState,
} from './types';

export const SAVE_VERSION = 1;

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createInitialState(now = Date.now()): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    companyName: 'My Startup',
    money: 50,
    totalEarned: 0,
    projectsCompleted: 0,
    startedAt: now,
    lastSeen: now,
    playTimeSec: 0,
    workers: [],
    workstations: [],
    projects: PROJECTS.map(newProjectState),
    activeProjectId: 'landing',
    upgrades: {},
    candidates: [],
    candidateRerollCost: 10,
    settings: { sound: true, particles: true },
    nextEntityId: 1,
  };
  state.projects[0].unlocked = true;
  state.candidates = rollCandidates(state);
  return state;
}

function newProjectState(def: { id: string; baseWork: number; baseReward: number }): ProjectState {
  return {
    defId: def.id,
    unlocked: false,
    progress: 0,
    completions: 0,
    currentWork: def.baseWork,
    currentReward: def.baseReward,
  };
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function skillMultiplier(worker: WorkerState): number {
  return 1 + SKILL_OUTPUT_PER_LEVEL * (worker.skillLevel - 1);
}

export function globalOutputMultiplier(state: GameState): number {
  const coffee = 1 + 0.1 * (state.upgrades['coffee'] ?? 0);
  const fiber = 1 + 0.15 * (state.upgrades['fiber'] ?? 0);
  return coffee * fiber;
}

export function stationMultiplier(state: GameState, stationInstanceId: number | null): number {
  if (stationInstanceId === null) return 0; // no desk, no output
  const instance = state.workstations.find((w) => w.id === stationInstanceId);
  if (!instance) return 0;
  const base = stationDefById(instance.defId).multiplier;
  const chairBonus = 1 + 0.1 * (state.upgrades['chairs'] ?? 0);
  // Chairs amplify only the bonus part above 1x so the basic desk stays 1x.
  return 1 + (base - 1) * chairBonus;
}

export function salaryMultiplier(state: GameState): number {
  return Math.max(0.4, 1 - 0.06 * (state.upgrades['hr'] ?? 0));
}

export function expMultiplier(state: GameState): number {
  return 1 + 0.25 * (state.upgrades['agile'] ?? 0);
}

/** Work/sec a single worker contributes to the given project. */
export function workerRate(state: GameState, worker: WorkerState, projectId: string): number {
  const tier = tierById(worker.tierId);
  const specBonus =
    projectDefById(projectId).specialization === worker.specialization ? SPEC_MATCH_BONUS : 1;
  return (
    tier.baseRate *
    skillMultiplier(worker) *
    stationMultiplier(state, worker.stationId) *
    globalOutputMultiplier(state) *
    specBonus
  );
}

/** Total work/sec flowing into the active project. */
export function totalWorkRate(state: GameState): number {
  let sum = 0;
  for (const w of state.workers) sum += workerRate(state, w, state.activeProjectId);
  return sum;
}

/** Total salaries in $/sec. */
export function totalSalaries(state: GameState): number {
  const mult = salaryMultiplier(state);
  let sum = 0;
  for (const w of state.workers) sum += tierById(w.tierId).salary * mult;
  return sum;
}

/** Estimated net income in $/sec (reward rate minus salaries). */
export function estimatedIncome(state: GameState): number {
  const project = getProject(state, state.activeProjectId);
  const rate = totalWorkRate(state);
  const rewardPerSec = rate > 0 ? (project.currentReward / project.currentWork) * rate : 0;
  return rewardPerSec - totalSalaries(state);
}

export function getProject(state: GameState, id: string): ProjectState {
  const p = state.projects.find((p) => p.defId === id);
  if (!p) throw new Error(`No project state for ${id}`);
  return p;
}

export function stationCost(state: GameState, defId: string): number {
  const def = stationDefById(defId);
  const owned = state.workstations.filter((w) => w.defId === defId).length;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, owned));
}

export function upgradeCost(state: GameState, upgradeId: string): number {
  const def = upgradeDefById(upgradeId);
  const level = state.upgrades[upgradeId] ?? 0;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, level));
}

export function trainCost(worker: WorkerState): number {
  const tierIndex = WORKER_TIERS.findIndex((t) => t.id === worker.tierId);
  const tierFactor = Math.pow(4, tierIndex);
  return Math.round(TRAIN_COST_BASE * tierFactor * Math.pow(worker.skillLevel, 2));
}

/** Seconds of assigned work needed to reach the next skill level. */
export function expToNextLevel(level: number): number {
  return 90 * Math.pow(1.5, level - 1);
}

// ---------------------------------------------------------------------------
// Tick — the heart of the idle loop
// ---------------------------------------------------------------------------

/**
 * Advance the simulation by dt seconds. Mutates state and returns the events
 * that occurred (project completions, level-ups) so the UI can react.
 */
export function tick(state: GameState, dt: number): TickEvents {
  const events: TickEvents = { completions: [], levelUps: [] };
  if (dt <= 0) return events;

  state.playTimeSec += dt;

  // 1. Pay salaries (money floors at 0 — your loyal team works on IOUs).
  state.money = Math.max(0, state.money - totalSalaries(state) * dt);

  // 2. Generate work and gain experience.
  const project = getProject(state, state.activeProjectId);
  const rate = totalWorkRate(state);
  project.progress += rate * dt;

  const expGain = dt * expMultiplier(state);
  for (const worker of state.workers) {
    if (worker.stationId === null) continue;
    worker.experience += expGain;
    let need = expToNextLevel(worker.skillLevel);
    while (worker.experience >= need && worker.skillLevel < 100) {
      worker.experience -= need;
      worker.skillLevel += 1;
      events.levelUps.push({ workerId: worker.id, newLevel: worker.skillLevel });
      need = expToNextLevel(worker.skillLevel);
    }
  }

  // 3. Complete projects (possibly several times in one long tick).
  //    Auto-repeat: progress rolls over, required work and reward scale up.
  const def = projectDefById(project.defId);
  let guard = 0;
  while (project.progress >= project.currentWork && guard < 10_000) {
    project.progress -= project.currentWork;
    state.money += project.currentReward;
    state.totalEarned += project.currentReward;
    state.projectsCompleted += 1;
    project.completions += 1;
    events.completions.push({ projectId: project.defId, reward: project.currentReward });
    project.currentWork *= def.workGrowth;
    project.currentReward *= def.rewardGrowth;
    guard++;
  }

  return events;
}

/**
 * Simulate offline time in coarse chunks using the same tick logic, so
 * offline progress obeys exactly the same rules as online play.
 * Returns total money earned while away.
 */
export function simulateOffline(state: GameState, elapsedSec: number, capSec: number): number {
  const simSec = Math.min(elapsedSec, capSec);
  const before = state.totalEarned;
  const CHUNK = 60;
  let remaining = simSec;
  while (remaining > 0) {
    const dt = Math.min(CHUNK, remaining);
    tick(state, dt);
    remaining -= dt;
  }
  return state.totalEarned - before;
}

// ---------------------------------------------------------------------------
// Player actions — each returns an error message or null on success
// ---------------------------------------------------------------------------

export function hireWorker(state: GameState, candidateIndex: number): string | null {
  const candidate = state.candidates[candidateIndex];
  if (!candidate) return 'Candidate not found';
  const tier = tierById(candidate.tierId);
  if (state.money < tier.hireCost) return 'Not enough money';
  state.money -= tier.hireCost;
  state.workers.push({
    id: state.nextEntityId++,
    name: candidate.name,
    tierId: candidate.tierId,
    specialization: candidate.specialization,
    skillLevel: 1,
    experience: 0,
    stationId: null,
  });
  state.candidates.splice(candidateIndex, 1);
  if (state.candidates.length === 0) state.candidates = rollCandidates(state);
  autoSeat(state);
  return null;
}

export function fireWorker(state: GameState, workerId: number): string | null {
  const index = state.workers.findIndex((w) => w.id === workerId);
  if (index === -1) return 'Worker not found';
  state.workers.splice(index, 1);
  autoSeat(state);
  return null;
}

export function trainWorker(state: GameState, workerId: number): string | null {
  const worker = state.workers.find((w) => w.id === workerId);
  if (!worker) return 'Worker not found';
  if (worker.skillLevel >= 100) return 'Already at max skill level';
  const cost = trainCost(worker);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  worker.skillLevel += 1;
  worker.experience = 0;
  return null;
}

export function buyWorkstation(state: GameState, defId: string): string | null {
  const cost = stationCost(state, defId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  state.workstations.push({ id: state.nextEntityId++, defId });
  autoSeat(state);
  return null;
}

export function setActiveProject(state: GameState, projectId: string): string | null {
  const project = getProject(state, projectId);
  if (!project.unlocked) return 'Project is locked';
  state.activeProjectId = projectId;
  autoSeat(state);
  return null;
}

export function unlockProject(state: GameState, projectId: string): string | null {
  const project = getProject(state, projectId);
  if (project.unlocked) return 'Already unlocked';
  const def = projectDefById(projectId);
  if (state.money < def.unlockCost) return 'Not enough money';
  state.money -= def.unlockCost;
  project.unlocked = true;
  return null;
}

export function buyUpgrade(state: GameState, upgradeId: string): string | null {
  const def = upgradeDefById(upgradeId);
  const level = state.upgrades[upgradeId] ?? 0;
  if (level >= def.maxLevel) return 'Already at max level';
  const cost = upgradeCost(state, upgradeId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  state.upgrades[upgradeId] = level + 1;
  return null;
}

export function rerollCandidates(state: GameState): string | null {
  if (state.money < state.candidateRerollCost) return 'Not enough money';
  state.money -= state.candidateRerollCost;
  state.candidates = rollCandidates(state);
  state.candidateRerollCost = Math.round(state.candidateRerollCost * 1.5);
  return null;
}

export function renameCompany(state: GameState, name: string): string | null {
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return 'Name cannot be empty';
  state.companyName = trimmed;
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assign workers to workstations automatically: strongest workers (for the
 * active project) get the best desks. Workers without a desk produce nothing.
 */
export function autoSeat(state: GameState): void {
  const stations = [...state.workstations].sort(
    (a, b) => stationDefById(b.defId).multiplier - stationDefById(a.defId).multiplier,
  );
  const potential = (w: WorkerState) => {
    const tier = tierById(w.tierId);
    const specBonus =
      projectDefById(state.activeProjectId).specialization === w.specialization
        ? SPEC_MATCH_BONUS
        : 1;
    return tier.baseRate * skillMultiplier(w) * specBonus;
  };
  const workers = [...state.workers].sort((a, b) => potential(b) - potential(a));
  for (let i = 0; i < workers.length; i++) {
    workers[i].stationId = i < stations.length ? stations[i].id : null;
  }
}

/** Roll 3 hire candidates, weighted toward tiers the player can nearly afford. */
export function rollCandidates(state: GameState, rand: () => number = Math.random): Candidate[] {
  const budget = Math.max(state.money, state.totalEarned * 0.25, 50);
  const affordable = WORKER_TIERS.filter((t) => t.hireCost <= budget * 4);
  const pool = affordable.length > 0 ? affordable : [WORKER_TIERS[0]];
  const out: Candidate[] = [];
  for (let i = 0; i < 3; i++) {
    // Bias toward the higher tiers in the affordable pool.
    const idx = Math.min(pool.length - 1, Math.floor(Math.pow(rand(), 0.7) * pool.length));
    const tier = pool[idx];
    out.push({
      name: `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`,
      tierId: tier.id,
      specialization: pick(SPECIALIZATIONS, rand),
    });
  }
  return out;
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}
