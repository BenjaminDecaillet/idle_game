import {
  COMPANY_SITES,
  FIRST_NAMES,
  LAST_NAMES,
  PROJECTS,
  SKILL_OUTPUT_PER_LEVEL,
  SPEC_MATCH_BONUS,
  SPECIALIZATIONS,
  TRAIN_COST_BASE,
  WORKER_TIERS,
  projectDefById,
  siteById,
  stationDefById,
  tierById,
  upgradeDefById,
} from './data';
import type {
  Candidate,
  CompanyState,
  GameState,
  ProjectState,
  TickEvents,
  WorkerState,
} from './types';

export const SAVE_VERSION = 3; // v3: multiple companies on a map (shared wallet)

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createInitialState(now = Date.now()): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    money: 50,
    totalEarned: 0,
    projectsCompleted: 0,
    startedAt: now,
    lastSeen: now,
    playTimeSec: 0,
    companies: [],
    activeCompanyId: 0,
    boosts: [],
    settings: { sound: true, particles: true, timeScale: 1 },
    nextEntityId: 1,
  };
  const company = createCompany(state, 'garage', 'My Startup');
  state.activeCompanyId = company.id;
  return state;
}

/** Build a fresh company at a site and add it to the state. */
export function createCompany(state: GameState, siteId: string, name: string): CompanyState {
  const company: CompanyState = {
    id: state.nextEntityId++,
    name,
    siteId,
    workers: [],
    workstations: [],
    projects: PROJECTS.map(newProjectState),
    activeProjectId: PROJECTS[0].id,
    upgrades: {},
    candidates: [],
    candidateRerollCost: 10,
  };
  company.projects[0].unlocked = true;
  company.candidates = rollCandidates(state);
  state.companies.push(company);
  return company;
}

export function newProjectState(def: {
  id: string;
  baseWork: number;
  baseReward: number;
}): ProjectState {
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
// Company accessors
// ---------------------------------------------------------------------------

export function activeCompany(state: GameState): CompanyState {
  const c = state.companies.find((c) => c.id === state.activeCompanyId);
  if (!c) throw new Error(`No company with id ${state.activeCompanyId}`);
  return c;
}

export function companyById(state: GameState, id: number): CompanyState | undefined {
  return state.companies.find((c) => c.id === id);
}

export function companyAtSite(state: GameState, siteId: string): CompanyState | undefined {
  return state.companies.find((c) => c.siteId === siteId);
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function skillMultiplier(worker: WorkerState): number {
  return 1 + SKILL_OUTPUT_PER_LEVEL * (worker.skillLevel - 1);
}

export function globalOutputMultiplier(state: GameState, company: CompanyState): number {
  const coffee = 1 + 0.1 * (company.upgrades['coffee'] ?? 0);
  const fiber = 1 + 0.15 * (company.upgrades['fiber'] ?? 0);
  let boost = 1;
  for (const b of state.boosts) boost *= b.mult;
  return coffee * fiber * boost * siteById(company.siteId).outputBonus;
}

/** Strongest currently-active boost, for HUD display. Null if none. */
export function activeBoost(state: GameState): { mult: number; remainingSec: number } | null {
  if (state.boosts.length === 0) return null;
  let mult = 1;
  let remainingSec = 0;
  for (const b of state.boosts) {
    mult *= b.mult;
    remainingSec = Math.max(remainingSec, b.remainingSec);
  }
  return { mult, remainingSec };
}

export function stationMultiplier(company: CompanyState, stationInstanceId: number | null): number {
  if (stationInstanceId === null) return 0; // no desk, no output
  const instance = company.workstations.find((w) => w.id === stationInstanceId);
  if (!instance) return 0;
  const base = stationDefById(instance.defId).multiplier;
  const chairBonus = 1 + 0.1 * (company.upgrades['chairs'] ?? 0);
  // Chairs amplify only the bonus part above 1x so the basic desk stays 1x.
  return 1 + (base - 1) * chairBonus;
}

export function salaryMultiplier(company: CompanyState): number {
  return Math.max(0.4, 1 - 0.06 * (company.upgrades['hr'] ?? 0));
}

export function expMultiplier(company: CompanyState): number {
  return 1 + 0.25 * (company.upgrades['agile'] ?? 0);
}

/** Work/sec a single worker contributes to the given project. */
export function workerRate(
  state: GameState,
  company: CompanyState,
  worker: WorkerState,
  projectId: string,
): number {
  const tier = tierById(worker.tierId);
  const specBonus =
    projectDefById(projectId).specialization === worker.specialization ? SPEC_MATCH_BONUS : 1;
  return (
    tier.baseRate *
    skillMultiplier(worker) *
    stationMultiplier(company, worker.stationId) *
    globalOutputMultiplier(state, company) *
    specBonus
  );
}

/** Total work/sec flowing into one company's active project. */
export function companyWorkRate(state: GameState, company: CompanyState): number {
  let sum = 0;
  for (const w of company.workers) sum += workerRate(state, company, w, company.activeProjectId);
  return sum;
}

/** Work/sec of the active company (what the hero card shows). */
export function totalWorkRate(state: GameState): number {
  return companyWorkRate(state, activeCompany(state));
}

/** One company's salaries in $/sec. */
export function companySalaries(company: CompanyState): number {
  const mult = salaryMultiplier(company);
  let sum = 0;
  for (const w of company.workers) sum += tierById(w.tierId).salary * mult;
  return sum;
}

/** Salaries across all companies in $/sec (paid from the shared wallet). */
export function totalSalaries(state: GameState): number {
  let sum = 0;
  for (const c of state.companies) sum += companySalaries(c);
  return sum;
}

/** Net income of one company in $/sec (reward rate minus its salaries). */
export function companyIncome(state: GameState, company: CompanyState): number {
  const project = getProject(company, company.activeProjectId);
  const rate = companyWorkRate(state, company);
  const rewardPerSec = rate > 0 ? (project.currentReward / project.currentWork) * rate : 0;
  return rewardPerSec - companySalaries(company);
}

/** Estimated net income in $/sec across all companies. */
export function estimatedIncome(state: GameState): number {
  let sum = 0;
  for (const c of state.companies) sum += companyIncome(state, c);
  return sum;
}

export function getProject(company: CompanyState, id: string): ProjectState {
  const p = company.projects.find((p) => p.defId === id);
  if (!p) throw new Error(`No project state for ${id}`);
  return p;
}

export function stationCost(company: CompanyState, defId: string): number {
  const def = stationDefById(defId);
  const owned = company.workstations.filter((w) => w.defId === defId).length;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, owned));
}

export function upgradeCost(company: CompanyState, upgradeId: string): number {
  const def = upgradeDefById(upgradeId);
  const level = company.upgrades[upgradeId] ?? 0;
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

/** Sites where a company can still be founded (not yet owned). */
export function availableSites(state: GameState): string[] {
  return COMPANY_SITES.filter((s) => !companyAtSite(state, s.id)).map((s) => s.id);
}

// ---------------------------------------------------------------------------
// Tick — the heart of the idle loop
// ---------------------------------------------------------------------------

/**
 * Advance the simulation by dt seconds. Mutates state and returns the events
 * that occurred (project completions, level-ups) so the UI can react.
 * Every company progresses in parallel; salaries and payouts all flow
 * through the shared wallet.
 */
export function tick(state: GameState, dt: number): TickEvents {
  const events: TickEvents = { completions: [], levelUps: [] };
  if (dt <= 0) return events;

  state.playTimeSec += dt;

  // 1. Pay salaries (money floors at 0 — your loyal teams work on IOUs).
  state.money = Math.max(0, state.money - totalSalaries(state) * dt);

  // Boosts that expire mid-tick only cover part of dt: correct the full
  // multiplier baked into companyWorkRate down to the covered fraction.
  let boostCorrection = 1;
  for (const b of state.boosts) {
    if (b.remainingSec < dt && b.mult !== 0) {
      const frac = b.remainingSec / dt;
      boostCorrection *= (1 + (b.mult - 1) * frac) / b.mult;
    }
  }

  for (const company of state.companies) {
    // 2. Generate work and gain experience.
    const project = getProject(company, company.activeProjectId);
    const rate = companyWorkRate(state, company) * boostCorrection;
    project.progress += rate * dt;

    const expGain = dt * expMultiplier(company);
    for (const worker of company.workers) {
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
      events.completions.push({
        companyId: company.id,
        projectId: project.defId,
        reward: project.currentReward,
      });
      project.currentWork *= def.workGrowth;
      project.currentReward *= def.rewardGrowth;
      guard++;
    }
  }

  // Count down and expire boosts (after they contributed to this tick).
  if (state.boosts.length > 0) {
    for (const b of state.boosts) b.remainingSec -= dt;
    state.boosts = state.boosts.filter((b) => b.remainingSec > 0);
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
// Player actions — each returns an error message or null on success.
// Team/office/project actions operate on the active company.
// ---------------------------------------------------------------------------

export function hireWorker(state: GameState, candidateIndex: number): string | null {
  const company = activeCompany(state);
  const candidate = company.candidates[candidateIndex];
  if (!candidate) return 'Candidate not found';
  const tier = tierById(candidate.tierId);
  if (state.money < tier.hireCost) return 'Not enough money';
  state.money -= tier.hireCost;
  company.workers.push({
    id: state.nextEntityId++,
    name: candidate.name,
    tierId: candidate.tierId,
    specialization: candidate.specialization,
    skillLevel: 1,
    experience: 0,
    stationId: null,
  });
  company.candidates.splice(candidateIndex, 1);
  if (company.candidates.length === 0) company.candidates = rollCandidates(state);
  autoSeat(company);
  return null;
}

export function fireWorker(state: GameState, workerId: number): string | null {
  const company = activeCompany(state);
  const index = company.workers.findIndex((w) => w.id === workerId);
  if (index === -1) return 'Worker not found';
  company.workers.splice(index, 1);
  autoSeat(company);
  return null;
}

export function trainWorker(state: GameState, workerId: number): string | null {
  const company = activeCompany(state);
  const worker = company.workers.find((w) => w.id === workerId);
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
  const company = activeCompany(state);
  const cost = stationCost(company, defId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  company.workstations.push({ id: state.nextEntityId++, defId });
  autoSeat(company);
  return null;
}

export function setActiveProject(state: GameState, projectId: string): string | null {
  const company = activeCompany(state);
  const project = getProject(company, projectId);
  if (!project.unlocked) return 'Project is locked';
  company.activeProjectId = projectId;
  autoSeat(company);
  return null;
}

export function unlockProject(state: GameState, projectId: string): string | null {
  const company = activeCompany(state);
  const project = getProject(company, projectId);
  if (project.unlocked) return 'Already unlocked';
  const def = projectDefById(projectId);
  if (state.money < def.unlockCost) return 'Not enough money';
  state.money -= def.unlockCost;
  project.unlocked = true;
  return null;
}

export function buyUpgrade(state: GameState, upgradeId: string): string | null {
  const company = activeCompany(state);
  const def = upgradeDefById(upgradeId);
  const level = company.upgrades[upgradeId] ?? 0;
  if (level >= def.maxLevel) return 'Already at max level';
  const cost = upgradeCost(company, upgradeId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  company.upgrades[upgradeId] = level + 1;
  return null;
}

export function rerollCandidates(state: GameState): string | null {
  const company = activeCompany(state);
  if (state.money < company.candidateRerollCost) return 'Not enough money';
  state.money -= company.candidateRerollCost;
  company.candidates = rollCandidates(state);
  company.candidateRerollCost = Math.round(company.candidateRerollCost * 1.5);
  return null;
}

/** Found a new company at a free map site, paid from the shared wallet. */
export function buyCompany(
  state: GameState,
  siteId: string,
  name?: string,
): string | null {
  const site = siteById(siteId);
  if (companyAtSite(state, siteId)) return 'Site already occupied';
  if (state.money < site.cost) return 'Not enough money';
  state.money -= site.cost;
  const company = createCompany(state, siteId, name?.trim().slice(0, 30) || `${site.name} Branch`);
  state.activeCompanyId = company.id;
  return null;
}

export function setActiveCompany(state: GameState, companyId: number): string | null {
  if (!companyById(state, companyId)) return 'Company not found';
  state.activeCompanyId = companyId;
  return null;
}

/**
 * Grant a temporary output boost (monetization reward delivery: rewarded
 * ads, purchases, events). Re-granting from the same source extends the
 * existing boost instead of stacking it.
 */
export function grantBoost(
  state: GameState,
  mult: number,
  durationSec: number,
  source: string,
): string | null {
  if (mult <= 1 || durationSec <= 0) return 'Invalid boost';
  const existing = state.boosts.find((b) => b.source === source && b.mult === mult);
  if (existing) {
    existing.remainingSec += durationSec;
  } else {
    if (state.boosts.length >= 5) return 'Too many active boosts';
    state.boosts.push({ mult, remainingSec: durationSec, source });
  }
  return null;
}

/**
 * Instantly simulate `seconds` of progression (a purchasable/ad-rewarded
 * "time skip"). Runs through the exact same tick rules as live play.
 * Returns the money earned.
 */
export function timeSkip(state: GameState, seconds: number): number {
  if (seconds <= 0) return 0;
  return simulateOffline(state, seconds, seconds);
}

export function renameCompany(state: GameState, name: string): string | null {
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return 'Name cannot be empty';
  activeCompany(state).name = trimmed;
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assign a company's workers to its workstations automatically: strongest
 * workers (for the active project) get the best desks. Workers without a
 * desk produce nothing.
 */
export function autoSeat(company: CompanyState): void {
  const stations = [...company.workstations].sort(
    (a, b) => stationDefById(b.defId).multiplier - stationDefById(a.defId).multiplier,
  );
  const potential = (w: WorkerState) => {
    const tier = tierById(w.tierId);
    const specBonus =
      projectDefById(company.activeProjectId).specialization === w.specialization
        ? SPEC_MATCH_BONUS
        : 1;
    return tier.baseRate * skillMultiplier(w) * specBonus;
  };
  const workers = [...company.workers].sort((a, b) => potential(b) - potential(a));
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
