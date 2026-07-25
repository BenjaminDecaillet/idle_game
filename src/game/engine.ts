import {
  AURA_OUTPUT_PER_LEVEL,
  COMPANY_COST_GROWTH,
  DEFAULT_PLAYER_LOOK,
  COMPANY_SITES,
  FIRST_NAMES,
  FLOOR_BASE_COST,
  FLOOR_CAPACITY,
  FLOOR_COST_GROWTH,
  MARKETING_COST_SEC,
  MARKETING_DURATION_SEC,
  MARKETING_MIN_COST,
  MARKETING_MULT,
  MAX_FLOORS,
  MENTORSHIP_SPEED_FACTOR,
  MOONSHOT_OUTPUT_PER_LEVEL,
  TIME_SCALES,
  LAST_NAMES,
  PROJECT_WORK_SCALE_EXP,
  PROJECTS,
  SKILL_OUTPUT_PER_LEVEL,
  SPEC_MATCH_BONUS,
  SPECIALIZATIONS,
  SYNERGY_OUTPUT_PER_COMPANY,
  TALENT_HIRE_DISCOUNT,
  VSCOIN_BOOST_COST,
  VSCOIN_BOOST_DURATION_SEC,
  VSCOIN_BOOST_MULT,
  VSCOIN_LEDGER_CAP,
  TRAIN_COST_LEVEL_RAMP,
  TRAIN_COST_RATE_FACTOR,
  TRAIN_DURATION_SEC,
  TRAIN_LEVELS,
  WORKER_TIERS,
  mapThemeById,
  projectDefById,
  siteById,
  stationDefById,
  wallpaperById,
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

// v3: multiple companies on a map (shared wallet)
// v4: story beats, Gabriel tutorial, player identity, language setting
// v5: missions + VsCoin premium currency with ledger
// v6: customizable player avatar look (founder office)
// v7: player.look.portrait — raster portrait picker (0 = drawn look)
export const SAVE_VERSION = 7;

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
    ownedWallpapers: ['concrete'],
    defaultWallpaperId: 'concrete',
    ownedMapThemes: ['daylight'],
    mapThemeId: 'daylight',
    boosts: [],
    settings: { sound: true, particles: true, timeScale: 1, language: 'auto' },
    story: { seen: [], queue: [] },
    tutorial: { step: 0, done: false, giftGiven: false },
    player: { name: 'Founder', look: { ...DEFAULT_PLAYER_LOOK } },
    vsCoin: 0,
    vsCoinLedger: [],
    missionsClaimed: [],
    nextEntityId: 1,
  };
  const company = createCompany(state, 'garage', 'My Startup');
  state.activeCompanyId = company.id;
  return state;
}

/** Build a fresh company at a site and add it to the state. */
export function createCompany(state: GameState, siteId: string, name: string): CompanyState {
  const scale = siteById(siteId).projectScale;
  const company: CompanyState = {
    id: state.nextEntityId++,
    name,
    siteId,
    floors: 1,
    wallpaperId: null,
    workers: [],
    workstations: [],
    projects: PROJECTS.map((def) => newProjectState(def, scale)),
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

/** Required work for a project at a site with the given projectScale. */
export function scaledProjectWork(baseWork: number, projectScale: number): number {
  return baseWork * Math.pow(projectScale, PROJECT_WORK_SCALE_EXP);
}

export function newProjectState(
  def: {
    id: string;
    baseWork: number;
    baseReward: number;
  },
  projectScale = 1,
): ProjectState {
  return {
    defId: def.id,
    unlocked: false,
    progress: 0,
    completions: 0,
    currentWork: scaledProjectWork(def.baseWork, projectScale),
    currentReward: def.baseReward * projectScale,
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
  const synergy =
    1 + SYNERGY_OUTPUT_PER_COMPANY * (company.upgrades['synergy'] ?? 0) * state.companies.length;
  const moonshot = 1 + MOONSHOT_OUTPUT_PER_LEVEL * (company.upgrades['moonshot'] ?? 0);
  const aura = 1 + AURA_OUTPUT_PER_LEVEL * (company.upgrades['aura'] ?? 0);
  let boost = 1;
  for (const b of state.boosts) boost *= b.mult;
  return coffee * fiber * synergy * moonshot * aura * boost * siteById(company.siteId).outputBonus;
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

/** Desk slots available in a company's building. */
export function deskCapacity(company: CompanyState): number {
  return company.floors * FLOOR_CAPACITY;
}

/** Cost of the next floor for a company's building. */
export function floorCost(company: CompanyState): number {
  return Math.round(
    FLOOR_BASE_COST *
      siteById(company.siteId).floorCostFactor *
      Math.pow(FLOOR_COST_GROWTH, company.floors - 1),
  );
}

/**
 * Cost of a training program. Anchored to the tier's base output rate so the
 * payback time is uniform across tiers, plus a mild ramp per level already
 * gained. Replaces the old `150 * 4^tier * level^2` formula that made
 * training strictly worse than hiring a second worker.
 */
export function trainCost(worker: WorkerState): number {
  const tier = tierById(worker.tierId);
  return Math.round(
    tier.baseRate *
      TRAIN_COST_RATE_FACTOR *
      (1 + TRAIN_COST_LEVEL_RAMP * (worker.skillLevel - 1)),
  );
}

/** Skill levels a training program grants (capped at level 100). */
export function trainLevels(worker: WorkerState): number {
  return Math.min(TRAIN_LEVELS, 100 - worker.skillLevel);
}

/** Seconds of assigned work needed to reach the next skill level. */
export function expToNextLevel(level: number): number {
  return 90 * Math.pow(1.5, level - 1);
}

/** Sites where a company can still be founded (not yet owned). */
export function availableSites(state: GameState): string[] {
  return COMPANY_SITES.filter((s) => !companyAtSite(state, s.id)).map((s) => s.id);
}

/**
 * Price of founding a company at a site right now. Every company already
 * owned past the first multiplies the site's list price by
 * COMPANY_COST_GROWTH, so each additional company is a bigger commitment
 * than the previous one regardless of purchase order.
 */
export function companyCost(state: GameState, siteId: string): number {
  const site = siteById(siteId);
  const extraCompanies = Math.max(0, state.companies.length - 1);
  return Math.round(site.cost * Math.pow(COMPANY_COST_GROWTH, extraCompanies));
}

/** Hire price for a tier in a company (Talent Network discount applied). */
export function hireCost(company: CompanyState, tierId: string): number {
  const discount = Math.max(
    0.1,
    1 - TALENT_HIRE_DISCOUNT * (company.upgrades['talent'] ?? 0),
  );
  return Math.round(tierById(tierId).hireCost * discount);
}

/** Training duration for a company (Mentorship Program speeds it up). */
export function trainDurationSec(company: CompanyState): number {
  return TRAIN_DURATION_SEC * Math.pow(MENTORSHIP_SPEED_FACTOR, company.upgrades['mentorship'] ?? 0);
}

/** Unlock price of a project in a company (scaled by the site's contracts). */
export function projectUnlockCost(company: CompanyState, projectId: string): number {
  return Math.round(
    projectDefById(projectId).unlockCost * siteById(company.siteId).projectScale,
  );
}

/** Companies the player must own before an upgrade appears (1 = always). */
export function upgradeCompanyRequirement(upgradeId: string): number {
  return upgradeDefById(upgradeId).requiresCompanies ?? 1;
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
  const events: TickEvents = { completions: [], levelUps: [], trainingsDone: [] };
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

    // Training programs run down; graduates return to the floor stronger.
    // Runs after the exp loop so the graduating tick grants no seated XP —
    // the worker was away for that whole stretch.
    let graduated = false;
    for (const worker of company.workers) {
      if (!worker.training) continue;
      worker.training.remainingSec -= dt;
      if (worker.training.remainingSec <= 0) {
        worker.skillLevel = Math.min(100, worker.skillLevel + worker.training.levels);
        worker.experience = 0;
        worker.training = null;
        graduated = true;
        events.trainingsDone.push({
          companyId: company.id,
          workerId: worker.id,
          newLevel: worker.skillLevel,
        });
      }
    }
    if (graduated) autoSeat(company);

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
  const cost = hireCost(company, candidate.tierId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  company.workers.push({
    id: state.nextEntityId++,
    name: candidate.name,
    tierId: candidate.tierId,
    specialization: candidate.specialization,
    skillLevel: 1,
    experience: 0,
    stationId: null,
    training: null,
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

/**
 * Send a worker to a training program. They leave their desk (producing
 * nothing) for TRAIN_DURATION_SEC and come back trainLevels() stronger.
 */
export function trainWorker(state: GameState, workerId: number): string | null {
  const company = activeCompany(state);
  const worker = company.workers.find((w) => w.id === workerId);
  if (!worker) return 'Worker not found';
  if (worker.training) return 'Already in training';
  if (worker.skillLevel >= 100) return 'Already at max skill level';
  const cost = trainCost(worker);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  const duration = trainDurationSec(company);
  worker.training = {
    remainingSec: duration,
    totalSec: duration,
    levels: trainLevels(worker),
  };
  autoSeat(company); // frees their desk for a colleague
  return null;
}

export function buyWorkstation(state: GameState, defId: string): string | null {
  const company = activeCompany(state);
  if (company.workstations.length >= deskCapacity(company)) {
    return 'No office space left — unlock a new floor';
  }
  const cost = stationCost(company, defId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  company.workstations.push({ id: state.nextEntityId++, defId });
  autoSeat(company);
  return null;
}

/** Unlock the next floor of the active company's building. */
export function buyFloor(state: GameState): string | null {
  const company = activeCompany(state);
  if (company.floors >= MAX_FLOORS) return 'Building is already at max height';
  const cost = floorCost(company);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  company.floors += 1;
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
  const cost = projectUnlockCost(company, projectId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  project.unlocked = true;
  return null;
}

export function buyUpgrade(state: GameState, upgradeId: string): string | null {
  const company = activeCompany(state);
  const def = upgradeDefById(upgradeId);
  const required = def.requiresCompanies ?? 1;
  if (state.companies.length < required) {
    return `Requires ${required} companies`;
  }
  const level = company.upgrades[upgradeId] ?? 0;
  if (level >= def.maxLevel) return 'Already at max level';
  if (def.vsCoinCost !== undefined) {
    const err = spendVsCoin(state, upgradeVsCoinCost(company, upgradeId)!, `shop:${upgradeId}`);
    if (err) return err;
  } else {
    const cost = upgradeCost(company, upgradeId);
    if (state.money < cost) return 'Not enough money';
    state.money -= cost;
  }
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
  const cost = companyCost(state, siteId);
  if (state.money < cost) return 'Not enough money';
  state.money -= cost;
  const company = createCompany(state, siteId, name?.trim().slice(0, 30) || `${site.name} Branch`);
  state.activeCompanyId = company.id;
  return null;
}

export function setActiveCompany(state: GameState, companyId: number): string | null {
  if (!companyById(state, companyId)) return 'Company not found';
  state.activeCompanyId = companyId;
  return null;
}

// ---------------------------------------------------------------------------
// VsCoin — the premium second currency (earned in-game; monetization-ready)
// ---------------------------------------------------------------------------

/**
 * Grant VsCoin from any source. THE entry point for every future
 * monetization flow too (source 'iap:<sku>' / 'ad:<placement>') — new
 * flows plug in here without touching anything else. Every movement is
 * recorded in the ledger for restore/debug/analytics.
 */
export function grantVsCoin(state: GameState, amount: number, source: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Invalid amount';
  state.vsCoin += amount;
  pushLedger(state, { amount, source });
  return null;
}

/** Spend VsCoin on a sink (premium upgrades, cosmetics, boosts). */
export function spendVsCoin(state: GameState, amount: number, sink: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Invalid amount';
  if (state.vsCoin < amount) return 'Not enough VsCoin';
  state.vsCoin -= amount;
  pushLedger(state, { amount: -amount, source: sink });
  return null;
}

function pushLedger(state: GameState, entry: { amount: number; source: string }): void {
  state.vsCoinLedger.push(entry);
  if (state.vsCoinLedger.length > VSCOIN_LEDGER_CAP) {
    state.vsCoinLedger.splice(0, state.vsCoinLedger.length - VSCOIN_LEDGER_CAP);
  }
}

/** VsCoin price of the next level of a premium upgrade (null = money one). */
export function upgradeVsCoinCost(company: CompanyState, upgradeId: string): number | null {
  const def = upgradeDefById(upgradeId);
  if (def.vsCoinCost === undefined) return null;
  const level = company.upgrades[upgradeId] ?? 0;
  return Math.round(def.vsCoinCost * Math.pow(def.costGrowth, level));
}

/** Buy the premium output boost with VsCoin. */
export function buyVsCoinBoost(state: GameState): string | null {
  const existing = state.boosts.find((b) => b.source === 'vscoin');
  if (!existing && state.boosts.length >= 5) return 'Too many active boosts';
  const err = spendVsCoin(state, VSCOIN_BOOST_COST, 'shop:boost');
  if (err) return err;
  return grantBoost(state, VSCOIN_BOOST_MULT, VSCOIN_BOOST_DURATION_SEC, 'vscoin');
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

/** Gross reward rate across all companies in $/sec (before salaries). */
export function grossRewardRate(state: GameState): number {
  let sum = 0;
  for (const c of state.companies) {
    const project = getProject(c, c.activeProjectId);
    const rate = companyWorkRate(state, c);
    if (rate > 0) sum += (project.currentReward / project.currentWork) * rate;
  }
  return sum;
}

/** Price of a marketing campaign: ~MARKETING_COST_SEC of gross income. */
export function marketingCost(state: GameState): number {
  return Math.max(MARKETING_MIN_COST, Math.round(grossRewardRate(state) * MARKETING_COST_SEC));
}

/**
 * Buy a marketing campaign: a MARKETING_MULT x output boost for
 * MARKETING_DURATION_SEC, paid with project money. Re-buying extends it.
 */
export function buyMarketingCampaign(state: GameState): string | null {
  const cost = marketingCost(state);
  if (state.money < cost) return 'Not enough money';
  const err = grantBoost(state, MARKETING_MULT, MARKETING_DURATION_SEC, 'marketing');
  if (err) return err;
  state.money -= cost;
  return null;
}

/** Set the free live-play simulation speed (1, 2 or 4). */
export function setTimeScale(state: GameState, scale: number): string | null {
  if (!TIME_SCALES.includes(scale)) return 'Invalid speed';
  state.settings.timeScale = scale;
  return null;
}

/** Persist the UI language choice ('auto' follows the browser). */
export function setLanguage(state: GameState, language: string): string | null {
  if (language !== 'auto' && language !== 'en' && language !== 'fr') {
    return 'Unknown language';
  }
  state.settings.language = language;
  return null;
}

// ---------------------------------------------------------------------------
// Cosmetics — wallpapers & map themes (one purchase unlocks everywhere)
// ---------------------------------------------------------------------------

/** The wallpaper actually shown for a company (own pick or player default). */
export function effectiveWallpaper(state: GameState, company: CompanyState): string {
  const id = company.wallpaperId ?? state.defaultWallpaperId;
  return state.ownedWallpapers.includes(id) ? id : state.defaultWallpaperId;
}

export function buyWallpaper(state: GameState, wallpaperId: string): string | null {
  const def = wallpaperById(wallpaperId);
  if (state.ownedWallpapers.includes(wallpaperId)) return 'Already owned';
  if (def.vsCoinCost !== undefined) {
    const err = spendVsCoin(state, def.vsCoinCost, `shop:wallpaper-${wallpaperId}`);
    if (err) return err;
  } else {
    if (state.money < def.cost) return 'Not enough money';
    state.money -= def.cost;
  }
  state.ownedWallpapers.push(wallpaperId);
  return null;
}

/** Apply a wallpaper to the active company. null = follow the player default. */
export function setCompanyWallpaper(
  state: GameState,
  wallpaperId: string | null,
): string | null {
  if (wallpaperId !== null) {
    wallpaperById(wallpaperId);
    if (!state.ownedWallpapers.includes(wallpaperId)) return 'Wallpaper not owned';
  }
  activeCompany(state).wallpaperId = wallpaperId;
  return null;
}

/** Set the player-level default wallpaper (companies without a pick use it). */
export function setDefaultWallpaper(state: GameState, wallpaperId: string): string | null {
  wallpaperById(wallpaperId);
  if (!state.ownedWallpapers.includes(wallpaperId)) return 'Wallpaper not owned';
  state.defaultWallpaperId = wallpaperId;
  return null;
}

export function buyMapTheme(state: GameState, themeId: string): string | null {
  const def = mapThemeById(themeId);
  if (state.ownedMapThemes.includes(themeId)) return 'Already owned';
  if (state.money < def.cost) return 'Not enough money';
  state.money -= def.cost;
  state.ownedMapThemes.push(themeId);
  state.mapThemeId = themeId; // buying selects it right away
  return null;
}

export function setMapTheme(state: GameState, themeId: string): string | null {
  mapThemeById(themeId);
  if (!state.ownedMapThemes.includes(themeId)) return 'Map theme not owned';
  state.mapThemeId = themeId;
  return null;
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
  // Workers in training are off the floor and hold no desk.
  for (const w of company.workers) if (w.training) w.stationId = null;
  const workers = company.workers
    .filter((w) => !w.training)
    .sort((a, b) => potential(b) - potential(a));
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
