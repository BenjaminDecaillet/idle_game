import {
  AURA_OUTPUT_PER_LEVEL,
  BETA_FREE_IAP,
  BUILDER_CASH_COSTS,
  BUILDER_VSCOIN_BASE,
  BUILDER_VSCOIN_COSTS,
  BUILDER_VSCOIN_GROWTH,
  CANDIDATE_REROLL_BASE,
  CANDIDATE_REROLL_GROWTH,
  COMPANY_BUILD_DURATION_BASE,
  COMPANY_BUILD_DURATION_GROWTH,
  COMPANY_COST_GROWTH,
  COMPANY_COST_SCALE_ESCALATION_EXP,
  COMPANY_SALARY_SCALE_ESCALATION_EXP,
  COMPANY_SITES,
  COUNTRY_STARTING_MONEY,
  COUNTRY_UNLOCK_BASE,
  COUNTRY_UNLOCK_GROWTH,
  DEBT_CAP_MIN,
  DEBT_CAP_SALARY_SEC,
  DEBT_CRISIS_MIN,
  DEBT_CRISIS_SALARY_SEC,
  DEBT_INTEREST_PER_SEC,
  DEBT_QUIT_INTERVAL_SEC,
  DEFAULT_COUNTRY,
  DEFAULT_PLAYER_LOOK,
  DESK_UPGRADE_COST_FACTOR,
  DESK_UPGRADE_DURATION_BASE,
  DESK_UPGRADE_DURATION_GROWTH,
  FASTFORWARD_SEC_PER_VSCOIN,
  FIRST_NAMES,
  FLOOR_BASE_COST,
  FLOOR_BUILD_COMPANY_GROWTH,
  FLOOR_BUILD_DURATION_BASE,
  FLOOR_BUILD_FLOOR_GROWTH,
  FLOOR_CAPACITY,
  FLOOR_COST_GROWTH,
  LAST_NAMES,
  MARKETING_COST_SEC,
  MARKETING_DURATION_SEC,
  MARKETING_MIN_COST,
  MARKETING_MULT,
  MAX_FLOORS,
  MENTORSHIP_SPEED_FACTOR,
  MOONSHOT_OUTPUT_PER_LEVEL,
  PROJECT_REWARD_CAP_MULT,
  PROJECT_WORK_SCALE_EXP,
  RARE_TRAIT_CHANCE,
  SITE_SPEC_BONUS,
  petById,
  VAULT_CAP_MIN,
  VAULT_CAP_MINUTES,
  VAULT_OPEN_COST,
  VAULT_RATE,
  TRAIT_CHANCE,
  TRAITS,
  traitById,
  OFFLINE_DOUBLER_COOLDOWN_SEC,
  PROJECTS,
  PRESTIGE_MIN_LIFETIME,
  PRESTIGE_OUTPUT_ALPHA,
  PRESTIGE_OUTPUT_K,
  PRESTIGE_POINTS_PER_DECADE,
  PRESTIGE_STORY_BEAT,
  PROMOTE_COST_FACTOR,
  PROMOTE_DURATION_BASE,
  PROMOTE_DURATION_GROWTH,
  RENAME_CASH_MIN,
  RENAME_COST_GROWTH,
  RENAME_VSCOIN_BASE,
  SKILL_OUTPUT_PER_LEVEL,
  SPEC_MATCH_BONUS,
  SPECIALIZATIONS,
  SYNERGY_OUTPUT_PER_COMPANY,
  TALENT_HIRE_DISCOUNT,
  TIME_SCALES,
  TRAIN_COST_LEVEL_RAMP,
  TRAIN_COST_RATE_FACTOR,
  TRAIN_DURATION_GROWTH,
  TRAIN_DURATION_SEC,
  TRAIN_LEVELS,
  TUTORIAL_FIRST_HIRE_NAME,
  VSCOIN_BOOST_COST,
  VSCOIN_BOOST_DURATION_SEC,
  VSCOIN_BOOST_MULT,
  VSCOIN_LEDGER_CAP,
  WORKER_TIERS,
  WORLD_OUTPUT_PER_COUNTRY,
  countryDefById,
  mapThemeById,
  projectDefById,
  shopPackById,
  siteById,
  vsCoinPackById,
  stationDefById,
  tierById,
  upgradeDefById,
  wallpaperById,
} from './data';
import type {
  Candidate,
  CompanyState,
  CountryId,
  CountryState,
  GameState,
  ProjectState,
  TickEvents,
  TimedAction,
  WorkerState,
} from './types';

// v3: multiple companies on a map (shared wallet)
// v4: story beats, Gabriel tutorial, player identity, language setting
// v5: missions + VsCoin premium currency with ledger
// v6: customizable player avatar look (founder office)
// v7: player.look.portrait — raster portrait picker (0 = drawn look)
// v8: BETA RESET — per-country economies, generic timed actions, employee
//     grades/promotion, debt, soft caps, multi-project companies. Saves
//     below v8 are discarded (see save.ts).
// v9: per-country builder pool gating every timed action, country-level
//     timed actions (company-build), timed floor construction, Gabriel's
//     floor gift + free fast-forward credits, Shop/VsCoin tabs.
export const SAVE_VERSION = 10; // v10: per-floor project slots + company-tier cost scaling

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createInitialState(now = Date.now(), countryId: CountryId = DEFAULT_COUNTRY): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    countries: [],
    activeCountryId: countryId,
    totalEarned: 0,
    projectsCompleted: 0,
    startedAt: now,
    lastSeen: now,
    playTimeSec: 0,
    ownedWallpapers: ['concrete'],
    ownedPets: [],
    defaultWallpaperId: 'concrete',
    ownedMapThemes: ['daylight'],
    mapThemeId: 'daylight',
    boosts: [],
    settings: {
      sound: true,
      particles: true,
      music: false,
      musicVolume: 0.5,
      timeScale: 1,
      language: 'auto',
    },
    story: { seen: [], queue: [] },
    tutorial: { step: 0, done: false, giftGiven: false },
    player: { name: 'Founder', look: { ...DEFAULT_PLAYER_LOOK } },
    vsCoin: 0,
    vsCoinLedger: [],
    missionsClaimed: [],
    daily: { day: -1, contracts: [], baselines: {}, claimed: [] },
    vault: { amount: 0 },
    globalUpgrades: {},
    fastForwardsUsed: 0,
    freeFastForwards: 0,
    floorGiftClaimed: false,
    promotionsDone: 0,
    prestige: { count: 0, reputation: 0 },
    doublerLastClaimedAt: 0,
    offlineDoublesClaimed: 0,
    nextEntityId: 1,
  };
  createCountry(state, countryId, 'My Startup');
  return state;
}

/**
 * Found a country: a fresh, independent economy with a free garage company.
 * The player's very first company keeps the player-chosen name (passed in);
 * every other company — including the garage of later countries — gets a
 * parody name from the country's pool.
 */
export function createCountry(
  state: GameState,
  countryId: CountryId,
  firstCompanyName?: string,
): CountryState {
  const country: CountryState = {
    id: countryId,
    money: COUNTRY_STARTING_MONEY,
    totalEarned: 0,
    projectsCompleted: 0,
    companies: [],
    activeCompanyId: 0,
    debtQuitCooldownSec: DEBT_QUIT_INTERVAL_SEC,
    usedCompanyNames: [],
    builders: { count: 1 }, // #1 is Gabriel's free, named gift
    timedActions: [],
  };
  state.countries.push(country);
  const name = firstCompanyName ?? nextParodyName(country, 'garage');
  const company = createCompany(state, country, 'garage', name, 0);
  country.activeCompanyId = company.id;
  return country;
}

/** Build a fresh company at a site and add it to the country. */
export function createCompany(
  state: GameState,
  country: CountryState,
  siteId: string,
  name: string,
  purchasePrice: number,
): CompanyState {
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
    candidateRerollCost: Math.round(
      CANDIDATE_REROLL_BASE * companyCostScale({ siteId, purchasePrice }),
    ),
    timedActions: [],
    purchasePrice,
    renameCount: 0,
    petId: null,
    floorProjects: [],
  };
  company.projects[0].unlocked = true;
  country.companies.push(company);
  company.candidates = rollCandidates(state, undefined, country);
  return company;
}

/** Next unused parody company name for a country (fallback: site branch). */
export function nextParodyName(country: CountryState, siteId: string): string {
  const pool = countryDefById(country.id).parodyCompanyNames;
  const name = pool.find((n) => !country.usedCompanyNames.includes(n));
  if (!name) return `${siteById(siteId).name} Branch`;
  country.usedCompanyNames.push(name);
  return name;
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
// Country & company accessors
// ---------------------------------------------------------------------------

export function activeCountry(state: GameState): CountryState {
  const c = state.countries.find((c) => c.id === state.activeCountryId);
  if (!c) throw new Error(`No country with id ${state.activeCountryId}`);
  return c;
}

export function countryById(state: GameState, id: string): CountryState | undefined {
  return state.countries.find((c) => c.id === id);
}

/** Every company across every country (global aggregates: missions, story). */
export function allCompanies(state: GameState): CompanyState[] {
  return state.countries.flatMap((c) => c.companies);
}

/** The country a company belongs to. */
export function countryOf(state: GameState, company: CompanyState): CountryState {
  const country = state.countries.find((c) => c.companies.includes(company));
  if (!country) throw new Error(`Company ${company.id} belongs to no country`);
  return country;
}

export function activeCompany(state: GameState): CompanyState {
  const country = activeCountry(state);
  const c = country.companies.find((c) => c.id === country.activeCompanyId);
  if (!c) throw new Error(`No company with id ${country.activeCompanyId}`);
  return c;
}

export function companyById(state: GameState, id: number): CompanyState | undefined {
  return allCompanies(state).find((c) => c.id === id);
}

/** Company at a site in the ACTIVE country's city. */
export function companyAtSite(state: GameState, siteId: string): CompanyState | undefined {
  return activeCountry(state).companies.find((c) => c.siteId === siteId);
}

/** Company at a site in ANY country (story beats: "first time reaching X"). */
export function anyCompanyAtSite(state: GameState, siteId: string): CompanyState | undefined {
  return allCompanies(state).find((c) => c.siteId === siteId);
}

/** Money in the active country's wallet (what the HUD shows). */
export function walletMoney(state: GameState): number {
  return activeCountry(state).money;
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function skillMultiplier(worker: WorkerState): number {
  return 1 + SKILL_OUTPUT_PER_LEVEL * (worker.skillLevel - 1);
}

export function globalOutputMultiplier(state: GameState, company: CompanyState): number {
  const country = countryOf(state, company);
  const coffee = 1 + 0.1 * (company.upgrades['coffee'] ?? 0);
  const fiber = 1 + 0.15 * (company.upgrades['fiber'] ?? 0);
  const synergy =
    1 + SYNERGY_OUTPUT_PER_COMPANY * (company.upgrades['synergy'] ?? 0) * country.companies.length;
  const moonshot = 1 + MOONSHOT_OUTPUT_PER_LEVEL * (company.upgrades['moonshot'] ?? 0);
  const aura = 1 + AURA_OUTPUT_PER_LEVEL * (state.globalUpgrades['aura'] ?? 0);
  const world = 1 + WORLD_OUTPUT_PER_COUNTRY * (state.countries.length - 1);
  let boost = 1;
  for (const b of state.boosts) boost *= b.mult;
  return (
    coffee *
    fiber *
    synergy *
    moonshot *
    aura *
    world *
    prestigeMultiplier(state) *
    boost *
    siteById(company.siteId).outputBonus
  );
}

// ---------------------------------------------------------------------------
// Offline earnings doubler — "Gabriel's blessing" (free while in beta; the
// button is the future rewarded-ad placement, see docs/monetization.md)
// ---------------------------------------------------------------------------

/** The blessing has recharged (once per OFFLINE_DOUBLER_COOLDOWN_SEC). */
export function offlineDoublerReady(state: GameState, now = Date.now()): boolean {
  return now - state.doublerLastClaimedAt >= OFFLINE_DOUBLER_COOLDOWN_SEC * 1000;
}

/**
 * Double the offline earnings just shown: credit the same amount again to
 * the active country's wallet. Counts as real earnings (lifetime totals →
 * missions and reputation), like the simulated income it mirrors.
 */
export function claimOfflineDoubler(
  state: GameState,
  amount: number,
  now = Date.now(),
): string | null {
  if (!(amount > 0)) return 'ui.doublerNothing';
  if (!offlineDoublerReady(state, now)) return 'ui.doublerCooldown';
  const country = activeCountry(state);
  country.money += amount;
  country.totalEarned += amount;
  state.totalEarned += amount;
  state.doublerLastClaimedAt = now;
  state.offlineDoublesClaimed += 1;
  return null;
}

// ---------------------------------------------------------------------------
// Prestige — "IPO & open-source the dream" (docs/balance.md, Phase P)
// ---------------------------------------------------------------------------

/** Cumulative reputation the given all-time earnings are worth. */
export function prestigeRepFor(allTimeEarned: number): number {
  if (allTimeEarned <= PRESTIGE_MIN_LIFETIME) return 0;
  return Math.floor(
    PRESTIGE_POINTS_PER_DECADE * Math.log10(allTimeEarned / PRESTIGE_MIN_LIFETIME),
  );
}

/**
 * Reputation an IPO would bank right now. Delta form against the already
 * banked total, so preview and award can never disagree and fractional
 * decades carry over to the next reset.
 */
export function prestigePreview(state: GameState): number {
  return Math.max(0, prestigeRepFor(state.totalEarned) - state.prestige.reputation);
}

/** Permanent output multiplier from banked reputation. */
export function prestigeMultiplier(state: GameState): number {
  if (state.prestige.reputation <= 0) return 1;
  return 1 + PRESTIGE_OUTPUT_K * Math.pow(state.prestige.reputation, PRESTIGE_OUTPUT_ALPHA);
}

/**
 * IPO: bank reputation and restart every economy from the garage. Keeps
 * everything global — VsCoin (+ledger, +premium upgrades), cosmetics, map
 * themes, avatar, settings, story-seen, missions-claimed, lifetime
 * counters (totalEarned/projectsCompleted/promotionsDone feed missions and
 * reputation and never reset), Gabriel's gifts (floorGiftClaimed,
 * freeFastForwards) and the finished tutorial. Wipes countries, companies
 * and live boosts; restarts in the same starting country.
 */
export function prestigeReset(state: GameState, now = Date.now()): string | null {
  if (!state.story.seen.includes(PRESTIGE_STORY_BEAT)) return 'ui.prestigeNeedStory';
  const gained = prestigePreview(state);
  if (gained < 1) return 'ui.prestigeNoRep';
  const startCountryId = state.countries[0]?.id ?? state.activeCountryId;
  state.prestige.count += 1;
  state.prestige.reputation += gained;
  state.countries = [];
  state.boosts = [];
  state.activeCountryId = startCountryId;
  createCountry(state, startCountryId, 'My Startup');
  state.lastSeen = now;
  return null;
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

/** A desk being renovated is a construction site: unusable, zero output. */
export function stationUnderUpgrade(company: CompanyState, stationInstanceId: number): boolean {
  return company.timedActions.some(
    (a) => a.kind === 'desk-upgrade' && a.targetId === stationInstanceId,
  );
}

export function stationMultiplier(company: CompanyState, stationInstanceId: number | null): number {
  if (stationInstanceId === null) return 0; // no desk, no output
  if (stationUnderUpgrade(company, stationInstanceId)) return 0; // construction site
  const instance = company.workstations.find((w) => w.id === stationInstanceId);
  if (!instance) return 0;
  const base = stationDefById(instance.defId).multiplier;
  const chairBonus = 1 + 0.1 * (company.upgrades['chairs'] ?? 0);
  // Chairs amplify only the bonus part above 1x so the basic desk stays 1x.
  return 1 + (base - 1) * chairBonus;
}

/** Product of a trait multiplier across a worker's traits (1 = none). */
function traitMult(traits: string[], key: 'output' | 'salary' | 'xp'): number {
  let m = 1;
  for (const id of traits) m *= traitById(id)[key];
  return m;
}

export const traitOutputMult = (traits: string[]): number => traitMult(traits, 'output');
export const traitSalaryMult = (traits: string[]): number => traitMult(traits, 'salary');
export const traitXpMult = (traits: string[]): number => traitMult(traits, 'xp');

/** Weighted trait roll at candidate creation (deterministic via rand). */
export function rollTraits(rand: () => number): string[] {
  if (rand() >= TRAIT_CHANCE) return [];
  const draw = (exclude: string[]): string => {
    const pool = TRAITS.filter((t) => !exclude.includes(t.id));
    const total = pool.reduce((sum, t) => sum + t.weight, 0);
    let r = rand() * total;
    for (const t of pool) {
      r -= t.weight;
      if (r <= 0) return t.id;
    }
    return pool[pool.length - 1].id;
  };
  const traits = [draw([])];
  // A second trait makes the candidate "rare" (golden card in the UI).
  if (rand() < RARE_TRAIT_CHANCE) traits.push(draw(traits));
  return traits;
}

export function salaryMultiplier(company: CompanyState): number {
  return Math.max(0.4, 1 - 0.06 * (company.upgrades['hr'] ?? 0));
}

// ---------------------------------------------------------------------------
// Company-tier cost scaling (docs/balance.md Phase S)
// ---------------------------------------------------------------------------

/** Income-parity scale of a site: how much more a company there earns. */
function siteIncomeScale(siteId: string): number {
  const site = siteById(siteId);
  return site.outputBonus * Math.pow(site.projectScale, 1 - PROJECT_WORK_SCALE_EXP);
}

/** How far above its site's list price this company was founded (≥ 1). */
function foundingEscalation(company: Pick<CompanyState, 'siteId' | 'purchasePrice'>): number {
  const site = siteById(company.siteId);
  if (site.cost <= 0 || company.purchasePrice <= 0) return 1;
  return Math.max(1, company.purchasePrice / site.cost);
}

/**
 * Multiplier on a company's capital costs: desks, desk upgrades, hires,
 * training, promotions, cash upgrades, candidate rerolls. Exactly 1 for the
 * first garage company, so the early game keeps today's numbers.
 */
export function companyCostScale(
  company: Pick<CompanyState, 'siteId' | 'purchasePrice'>,
): number {
  return (
    siteIncomeScale(company.siteId) *
    Math.pow(foundingEscalation(company), COMPANY_COST_SCALE_ESCALATION_EXP)
  );
}

/** Multiplier on a company's salaries: income parity only, no escalation. */
export function companySalaryScale(
  company: Pick<CompanyState, 'siteId' | 'purchasePrice'>,
): number {
  return (
    siteIncomeScale(company.siteId) *
    Math.pow(foundingEscalation(company), COMPANY_SALARY_SCALE_ESCALATION_EXP)
  );
}

/** Salary in $/sec a worker of this tier costs in this company. */
export function tierSalary(company: CompanyState, tierId: string): number {
  return tierById(tierId).salary * salaryMultiplier(company) * companySalaryScale(company);
}

/** One worker's actual salary (tier salary × their traits). */
export function workerSalary(company: CompanyState, worker: WorkerState): number {
  return tierSalary(company, worker.tierId) * traitSalaryMult(worker.traits);
}

export function expMultiplier(company: CompanyState): number {
  return 1 + 0.25 * (company.upgrades['agile'] ?? 0);
}

// ---------------------------------------------------------------------------
// Floors, desks & multi-project assignment
// ---------------------------------------------------------------------------

/** Desk slots available in a company's building. */
export function deskCapacity(company: CompanyState): number {
  return company.floors * FLOOR_CAPACITY;
}

/** The floor a workstation sits on (by purchase order). */
export function stationFloor(company: CompanyState, stationInstanceId: number): number {
  const index = company.workstations.findIndex((w) => w.id === stationInstanceId);
  return index < 0 ? 0 : Math.floor(index / FLOOR_CAPACITY);
}

/** The project worked on a given floor (assignment, else the main project). */
export function floorProject(company: CompanyState, floor: number): string {
  const assigned = company.floorProjects[floor];
  if (!assigned) return company.activeProjectId;
  const project = company.projects.find((p) => p.defId === assigned);
  return project?.unlocked ? assigned : company.activeProjectId;
}

/** The project a worker contributes to (via their desk's floor). */
export function workerProject(company: CompanyState, worker: WorkerState): string {
  if (worker.stationId === null) return company.activeProjectId;
  return floorProject(company, stationFloor(company, worker.stationId));
}

/** Distinct projects currently being worked in a company. */
export function assignedProjects(company: CompanyState): string[] {
  const out = new Set<string>([company.activeProjectId]);
  for (let f = 0; f < company.floors; f++) out.add(floorProject(company, f));
  return [...out];
}

/**
 * Assign a floor to a project (null = follow the company's main project).
 * Every floor owns its own slot: a company with N floors can work up to N
 * distinct projects in parallel.
 */
export function assignFloorProject(
  state: GameState,
  floor: number,
  projectId: string | null,
): string | null {
  const company = activeCompany(state);
  if (!Number.isInteger(floor) || floor < 0 || floor >= company.floors) return 'error.noSuchFloor';
  if (projectId !== null) {
    const project = company.projects.find((p) => p.defId === projectId);
    if (!project) return 'error.noSuchProject';
    if (!project.unlocked) return 'error.projectLocked';
  }
  const next = [...company.floorProjects];
  while (next.length < company.floors) next.push(null);
  next[floor] = projectId;
  company.floorProjects = next;
  return null;
}

// ---------------------------------------------------------------------------
// Rates & money flows
// ---------------------------------------------------------------------------

/** Work/sec a single worker contributes to the given project. */
export function workerRate(
  state: GameState,
  company: CompanyState,
  worker: WorkerState,
  projectId: string,
): number {
  const tier = tierById(worker.tierId);
  const projectSpec = projectDefById(projectId).specialization;
  const specBonus = projectSpec === worker.specialization ? SPEC_MATCH_BONUS : 1;
  // Site specialty: this site is simply better at contracts of its favored
  // specialization, whoever works them.
  const siteBonus = siteById(company.siteId).favoredSpec === projectSpec ? SITE_SPEC_BONUS : 1;
  return (
    tier.baseRate *
    skillMultiplier(worker) *
    stationMultiplier(company, worker.stationId) *
    globalOutputMultiplier(state, company) *
    specBonus *
    siteBonus *
    traitOutputMult(worker.traits)
  );
}

/** Total work/sec across all of a company's workers (HUD hero number). */
export function companyWorkRate(state: GameState, company: CompanyState): number {
  let sum = 0;
  for (const w of company.workers) sum += workerRate(state, company, w, workerProject(company, w));
  return sum;
}

/** Work/sec flowing into one specific project of a company. */
export function companyProjectRate(
  state: GameState,
  company: CompanyState,
  projectId: string,
): number {
  let sum = 0;
  for (const w of company.workers) {
    if (workerProject(company, w) !== projectId) continue;
    sum += workerRate(state, company, w, projectId);
  }
  return sum;
}

/** Work/sec of the active company (what the hero card shows). */
export function totalWorkRate(state: GameState): number {
  return companyWorkRate(state, activeCompany(state));
}

/** One company's salaries in $/sec. */
export function companySalaries(company: CompanyState): number {
  let sum = 0;
  for (const w of company.workers) sum += workerSalary(company, w);
  return sum;
}

/** One country's salaries in $/sec (paid from that country's wallet). */
export function countrySalaries(country: CountryState): number {
  let sum = 0;
  for (const c of country.companies) sum += companySalaries(c);
  return sum;
}

/** Salaries of the active country in $/sec (what the HUD shows). */
export function totalSalaries(state: GameState): number {
  return countrySalaries(activeCountry(state)) * salaryBoostMult(state);
}

/** Net income of one company in $/sec (reward rate minus its salaries). */
export function companyIncome(state: GameState, company: CompanyState): number {
  let rewardPerSec = 0;
  for (const projectId of assignedProjects(company)) {
    const project = getProject(company, projectId);
    const rate = companyProjectRate(state, company, projectId);
    if (rate > 0) rewardPerSec += (project.currentReward / project.currentWork) * rate;
  }
  return rewardPerSec - companySalaries(company);
}

/** Estimated net income in $/sec across the active country. */
export function estimatedIncome(state: GameState): number {
  let sum = 0;
  for (const c of activeCountry(state).companies) sum += companyIncome(state, c);
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
  return Math.round(def.baseCost * Math.pow(def.costGrowth, owned) * companyCostScale(company));
}

export function upgradeCost(company: CompanyState, upgradeId: string): number {
  const def = upgradeDefById(upgradeId);
  const level = company.upgrades[upgradeId] ?? 0;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, level) * companyCostScale(company));
}

/** Cost of the next floor for a company's building. */
export function floorCost(company: CompanyState): number {
  return Math.round(
    FLOOR_BASE_COST *
      siteById(company.siteId).floorCostFactor *
      Math.pow(FLOOR_COST_GROWTH, company.floors - 1),
  );
}

/** The company's in-flight floor construction, if any (one at a time). */
export function floorUnderConstruction(company: CompanyState): TimedAction | null {
  return company.timedActions.find((a) => a.kind === 'floor-build') ?? null;
}

/** Build time of the company's next floor (ramps per floor and company). */
export function floorBuildDurationSec(country: CountryState, company: CompanyState): number {
  const floorIndex = company.floors + 1; // the floor being built (2..MAX_FLOORS)
  const companyIndex = Math.max(
    0,
    country.companies.findIndex((c) => c.id === company.id),
  );
  return (
    FLOOR_BUILD_DURATION_BASE *
    Math.pow(FLOOR_BUILD_FLOOR_GROWTH, floorIndex - 2) *
    Math.pow(FLOOR_BUILD_COMPANY_GROWTH, companyIndex)
  );
}

// ---------------------------------------------------------------------------
// Training, promotion & desk upgrades (all generic timed actions)
// ---------------------------------------------------------------------------

/**
 * Cost of a training program. Anchored to the tier's base output rate so the
 * payback time is uniform across tiers, plus a mild ramp per level already
 * gained.
 */
export function trainCost(company: CompanyState, worker: WorkerState): number {
  const tier = tierById(worker.tierId);
  return Math.round(
    tier.baseRate *
      TRAIN_COST_RATE_FACTOR *
      (1 + TRAIN_COST_LEVEL_RAMP * (worker.skillLevel - 1)) *
      companyCostScale(company),
  );
}

/** Skill levels a training program grants (clamped at the tier's cap). */
export function trainLevels(worker: WorkerState): number {
  return Math.min(TRAIN_LEVELS, tierById(worker.tierId).maxSkill - worker.skillLevel);
}

/**
 * Training duration for a worker: the company's base duration (Mentorship
 * Program speeds it up) ramped per program this worker already completed —
 * the first stays ~2 min, later ones drift toward idle/offline territory.
 */
export function trainDurationSec(company: CompanyState, worker?: WorkerState): number {
  const base =
    TRAIN_DURATION_SEC * Math.pow(MENTORSHIP_SPEED_FACTOR, company.upgrades['mentorship'] ?? 0);
  return base * Math.pow(TRAIN_DURATION_GROWTH, worker?.timesTrained ?? 0);
}

/** Seconds of assigned work needed to reach the next skill level. */
export function expToNextLevel(level: number): number {
  return 90 * Math.pow(1.5, level - 1);
}

/** All in-flight timed actions targeting an entity (worker or desk). */
export function timedActionsFor(company: CompanyState, targetId: number): TimedAction[] {
  return company.timedActions.filter((a) => a.targetId === targetId);
}

/** Whether a worker is off the floor (in training or being promoted). */
export function workerBusy(company: CompanyState, workerId: number): boolean {
  return company.timedActions.some(
    (a) => a.targetId === workerId && (a.kind === 'training' || a.kind === 'promotion'),
  );
}

// ---------------------------------------------------------------------------
// Builder pool — the per-country labour that every timed action occupies
// ---------------------------------------------------------------------------

/**
 * Builders occupied right now = every in-flight timed action in the country
 * (company- and country-level alike). Derived, never stored, so it can never
 * desync across save/load or offline simulation.
 */
export function busyBuilders(country: CountryState): number {
  let busy = country.timedActions.length;
  for (const company of country.companies) busy += company.timedActions.length;
  return busy;
}

export function freeBuilders(country: CountryState): number {
  return country.builders.count - busyBuilders(country);
}

/** Price of the country's next builder: cash early, then VsCoin forever. */
export function builderCost(country: CountryState): { cash: number } | { vsCoin: number } {
  const n = country.builders.count + 1; // the builder number being bought
  const cashIndex = n - 2; // builder #2 = index 0
  if (cashIndex < BUILDER_CASH_COSTS.length) return { cash: BUILDER_CASH_COSTS[cashIndex] };
  const vsCoinIndex = cashIndex - BUILDER_CASH_COSTS.length; // builder #4 = index 0
  if (vsCoinIndex < BUILDER_VSCOIN_COSTS.length) {
    return { vsCoin: BUILDER_VSCOIN_COSTS[vsCoinIndex] };
  }
  return { vsCoin: Math.ceil(BUILDER_VSCOIN_BASE * Math.pow(BUILDER_VSCOIN_GROWTH, n - 5)) };
}

/** Hire the active country's next builder off the ladder. */
export function hireBuilder(state: GameState): string | null {
  const country = activeCountry(state);
  const price = builderCost(country);
  if ('cash' in price) {
    if (country.money < price.cash) return 'error.notEnoughMoney';
    country.money -= price.cash;
  } else {
    const err = spendVsCoin(state, price.vsCoin, 'shop:builder');
    if (err) return err;
  }
  country.builders.count += 1;
  return null;
}

/** The tier a worker gets promoted into (null = already at the top). */
export function nextTier(worker: WorkerState): string | null {
  const index = WORKER_TIERS.findIndex((t) => t.id === worker.tierId);
  if (index < 0 || index + 1 >= WORKER_TIERS.length) return null;
  return WORKER_TIERS[index + 1].id;
}

/** Whether a worker is at their tier's skill cap (promotion territory). */
export function atSkillCap(worker: WorkerState): boolean {
  return worker.skillLevel >= tierById(worker.tierId).maxSkill;
}

/** Money price of promoting a worker to the next tier. */
export function promoteCost(company: CompanyState, worker: WorkerState): number | null {
  const to = nextTier(worker);
  if (!to) return null;
  return Math.round(tierById(to).hireCost * PROMOTE_COST_FACTOR * companyCostScale(company));
}

/** Duration of promoting a worker to the next tier. */
export function promoteDurationSec(worker: WorkerState): number | null {
  const to = nextTier(worker);
  if (!to) return null;
  const index = WORKER_TIERS.findIndex((t) => t.id === to);
  return PROMOTE_DURATION_BASE * Math.pow(PROMOTE_DURATION_GROWTH, index);
}

/**
 * Send a worker to a training program. They leave their desk (producing
 * nothing) for the ramped duration and come back trainLevels() stronger.
 */
export function trainWorker(state: GameState, workerId: number): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const worker = company.workers.find((w) => w.id === workerId);
  if (!worker) return 'error.workerNotFound';
  if (workerBusy(company, workerId)) return 'error.workerBusy';
  if (atSkillCap(worker)) {
    return nextTier(worker) ? 'error.promoteInstead' : 'error.maxSkill';
  }
  if (freeBuilders(country) <= 0) return 'error.noFreeBuilders';
  const cost = trainCost(company, worker);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  const duration = trainDurationSec(company, worker);
  company.timedActions.push({
    id: state.nextEntityId++,
    kind: 'training',
    targetId: worker.id,
    remainingSec: duration,
    totalSec: duration,
    levels: trainLevels(worker),
  });
  autoSeat(company); // frees their desk for a colleague
  return null;
}

/**
 * Promote a worker at their tier's skill cap into the next tier. Costs
 * money and time (both scale with the target grade); the worker keeps
 * their skill level and is off the floor while it runs.
 */
export function promoteWorker(state: GameState, workerId: number): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const worker = company.workers.find((w) => w.id === workerId);
  if (!worker) return 'error.workerNotFound';
  if (workerBusy(company, workerId)) return 'error.workerBusy';
  const to = nextTier(worker);
  if (!to) return 'error.topGrade';
  if (!atSkillCap(worker)) return 'error.notAtCap';
  if (freeBuilders(country) <= 0) return 'error.noFreeBuilders';
  const cost = promoteCost(company, worker)!;
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  const duration = promoteDurationSec(worker)!;
  company.timedActions.push({
    id: state.nextEntityId++,
    kind: 'promotion',
    targetId: worker.id,
    remainingSec: duration,
    totalSec: duration,
    toTierId: to,
  });
  autoSeat(company);
  return null;
}

/** The workstation def a desk upgrades into (null = already the best). */
export function nextStationDef(defId: string): string | null {
  const index = WORKSTATION_ORDER.indexOf(defId);
  if (index < 0 || index + 1 >= WORKSTATION_ORDER.length) return null;
  return WORKSTATION_ORDER[index + 1];
}

/** Money price of upgrading a desk in place to the next tier. */
export function deskUpgradeCost(company: CompanyState, defId: string): number | null {
  const to = nextStationDef(defId);
  if (!to) return null;
  return Math.round(
    (stationDefById(to).baseCost - stationDefById(defId).baseCost) *
      DESK_UPGRADE_COST_FACTOR *
      companyCostScale(company),
  );
}

/** Duration of upgrading a desk in place to the next tier. */
export function deskUpgradeDurationSec(defId: string): number | null {
  const to = nextStationDef(defId);
  if (!to) return null;
  const index = WORKSTATION_ORDER.indexOf(to);
  return DESK_UPGRADE_DURATION_BASE * Math.pow(DESK_UPGRADE_DURATION_GROWTH, index);
}

/**
 * Upgrade a desk in place to the next workstation tier: money + time.
 * The desk becomes a construction site for the duration: its employee is
 * unseated (autoSeat may find them another free desk) and it produces
 * nothing until the renovation completes.
 */
export function upgradeDesk(state: GameState, stationId: number): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const station = company.workstations.find((w) => w.id === stationId);
  if (!station) return 'error.deskNotFound';
  if (timedActionsFor(company, stationId).some((a) => a.kind === 'desk-upgrade')) {
    return 'error.deskUpgrading';
  }
  const to = nextStationDef(station.defId);
  if (!to) return 'error.bestDesk';
  if (freeBuilders(country) <= 0) return 'error.noFreeBuilders';
  const cost = deskUpgradeCost(company, station.defId)!;
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  const duration = deskUpgradeDurationSec(station.defId)!;
  company.timedActions.push({
    id: state.nextEntityId++,
    kind: 'desk-upgrade',
    targetId: stationId,
    remainingSec: duration,
    totalSec: duration,
    toDefId: to,
  });
  autoSeat(company); // evict the sitter; they may find another free desk
  return null;
}

/**
 * VsCoin price of fast-forwarding a timed action to completion right now.
 * Scaled to remaining time; the first-ever fast-forward is free (the
 * tutorial offers it on the first training).
 */
export function fastForwardCost(state: GameState, action: TimedAction): number {
  if (state.fastForwardsUsed === 0) return 0;
  if (state.freeFastForwards > 0) return 0; // Gabriel's gift credits
  return Math.max(1, Math.ceil(action.remainingSec / FASTFORWARD_SEC_PER_VSCOIN));
}

/** Instantly complete a timed action, paying its fast-forward price. */
export function fastForwardAction(state: GameState, actionId: number): string | null {
  const country = activeCountry(state);
  const countryAction = country.timedActions.find((a) => a.id === actionId);
  if (countryAction) {
    const cost = fastForwardCost(state, countryAction);
    if (cost > 0) {
      const err = spendVsCoin(state, cost, `shop:fast-forward-${countryAction.kind}`);
      if (err) return err;
    } else if (state.fastForwardsUsed > 0 && state.freeFastForwards > 0) {
      state.freeFastForwards -= 1;
    }
    state.fastForwardsUsed += 1;
    country.timedActions = country.timedActions.filter((a) => a.id !== actionId);
    completeCountryTimedAction(state, country, countryAction, emptyEvents());
    return null;
  }
  for (const company of activeCountry(state).companies) {
    const action = company.timedActions.find((a) => a.id === actionId);
    if (!action) continue;
    const cost = fastForwardCost(state, action);
    if (cost > 0) {
      const err = spendVsCoin(state, cost, `shop:fast-forward-${action.kind}`);
      if (err) return err;
    } else if (state.fastForwardsUsed > 0 && state.freeFastForwards > 0) {
      state.freeFastForwards -= 1; // the tutorial freebie takes precedence
    }
    state.fastForwardsUsed += 1;
    company.timedActions = company.timedActions.filter((a) => a.id !== actionId);
    completeTimedAction(state, company, action, emptyEvents());
    return null;
  }
  return 'error.nothingToFastForward';
}

/** Apply a finished timed action's effect (the single place effects fire). */
function completeTimedAction(
  state: GameState,
  company: CompanyState,
  action: TimedAction,
  events: TickEvents,
): void {
  switch (action.kind) {
    case 'training': {
      const worker = company.workers.find((w) => w.id === action.targetId);
      if (!worker) return;
      const cap = tierById(worker.tierId).maxSkill;
      worker.skillLevel = Math.min(cap, worker.skillLevel + (action.levels ?? 0));
      worker.experience = 0;
      worker.timesTrained += 1;
      events.trainingsDone.push({
        companyId: company.id,
        workerId: worker.id,
        newLevel: worker.skillLevel,
      });
      autoSeat(company);
      return;
    }
    case 'promotion': {
      const worker = company.workers.find((w) => w.id === action.targetId);
      if (!worker || !action.toTierId) return;
      worker.tierId = action.toTierId;
      worker.experience = 0;
      worker.promotions += 1;
      state.promotionsDone += 1;
      events.promotionsDone.push({
        companyId: company.id,
        workerId: worker.id,
        newTierId: worker.tierId,
      });
      autoSeat(company);
      return;
    }
    case 'desk-upgrade': {
      const station = company.workstations.find((w) => w.id === action.targetId);
      if (!station || !action.toDefId) return;
      station.defId = action.toDefId;
      events.deskUpgradesDone.push({
        companyId: company.id,
        stationId: station.id,
        newDefId: station.defId,
      });
      autoSeat(company); // best workers migrate to the improved desk
      return;
    }
    case 'floor-build': {
      company.floors = Math.min(MAX_FLOORS, company.floors + 1);
      events.floorBuildsDone.push({ companyId: company.id, floors: company.floors });
      return;
    }
  }
}

/**
 * Apply a finished country-level timed action (company-build): the company
 * comes to life, parody-named, at the price paid on start. Deliberately no
 * activeCompanyId switch — completion can happen mid-play or offline, and
 * yanking the player to another office would be hostile; the map (and the
 * companyBuildsDone event) surface the opening instead.
 */
function completeCountryTimedAction(
  state: GameState,
  country: CountryState,
  action: TimedAction,
  events: TickEvents,
): void {
  if (action.kind !== 'company-build' || !action.siteId) return;
  if (country.companies.some((c) => c.siteId === action.siteId)) return; // hygiene
  const company = createCompany(
    state,
    country,
    action.siteId,
    nextParodyName(country, action.siteId),
    action.price ?? 0,
  );
  events.companyBuildsDone.push({
    countryId: country.id,
    companyId: company.id,
    siteId: action.siteId,
  });
}

// ---------------------------------------------------------------------------
// Sites & company purchase (per-country city)
// ---------------------------------------------------------------------------

/** Sites where a company can still be founded in the active country. */
export function availableSites(state: GameState): string[] {
  const country = activeCountry(state);
  return COMPANY_SITES.filter(
    (s) => !companyAtSite(state, s.id) && !siteUnderConstruction(country, s.id),
  ).map((s) => s.id);
}

/** The in-flight founding at a site of this country, if any. */
export function siteUnderConstruction(
  country: CountryState,
  siteId: string,
): TimedAction | null {
  return (
    country.timedActions.find((a) => a.kind === 'company-build' && a.siteId === siteId) ?? null
  );
}

/**
 * Build time of the country's next company. Ramps with the companies
 * already founded there (pending builds included); the country's first
 * company — the tutorial garage, or a fresh start abroad — is instant.
 */
export function companyBuildDurationSec(country: CountryState): number {
  const founded =
    country.companies.length +
    country.timedActions.filter((a) => a.kind === 'company-build').length;
  if (founded === 0) return 0;
  return COMPANY_BUILD_DURATION_BASE * Math.pow(COMPANY_BUILD_DURATION_GROWTH, founded);
}

/**
 * Price of founding a company at a site right now. Every company already
 * owned in this country past the first multiplies the site's list price by
 * COMPANY_COST_GROWTH, so each additional company is a bigger commitment
 * than the previous one regardless of purchase order.
 */
export function companyCost(state: GameState, siteId: string): number {
  const site = siteById(siteId);
  const country = activeCountry(state);
  // Pending foundings count: starting several builds in parallel must not
  // dodge the escalation.
  const pending = country.timedActions.filter((a) => a.kind === 'company-build').length;
  const extraCompanies = Math.max(0, country.companies.length + pending - 1);
  return Math.round(site.cost * Math.pow(COMPANY_COST_GROWTH, extraCompanies));
}

/** Hire price for a tier in a company (Talent Network discount applied). */
export function hireCost(company: CompanyState, tierId: string): number {
  const discount = Math.max(
    0.1,
    1 - TALENT_HIRE_DISCOUNT * (company.upgrades['talent'] ?? 0),
  );
  return Math.round(tierById(tierId).hireCost * discount * companyCostScale(company));
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

/** Per-project reward ceiling at a company's site (see docs/balance.md). */
export function projectRewardCap(company: CompanyState, projectId: string): number {
  return (
    projectDefById(projectId).baseReward *
    siteById(company.siteId).projectScale *
    PROJECT_REWARD_CAP_MULT
  );
}

// ---------------------------------------------------------------------------
// Debt (per-country; see docs/balance.md)
// ---------------------------------------------------------------------------

/** Debt beyond which employees start resigning. */
export function debtCrisisThreshold(country: CountryState): number {
  return Math.max(DEBT_CRISIS_MIN, countrySalaries(country) * DEBT_CRISIS_SALARY_SEC);
}

/** The floor a country's balance can sink to. */
export function debtCap(country: CountryState): number {
  return Math.max(DEBT_CAP_MIN, countrySalaries(country) * DEBT_CAP_SALARY_SEC);
}

/** Whether a country is in debt at all (HUD alarm). */
export function inDebt(country: CountryState): boolean {
  return country.money < 0;
}

/** Whether a country's debt is past the resignation threshold. */
export function inDebtCrisis(country: CountryState): boolean {
  return country.money < -debtCrisisThreshold(country);
}

function countryWorkerCount(country: CountryState): number {
  return country.companies.reduce((sum, c) => sum + c.workers.length, 0);
}

/** The employee who resigns next in a debt crisis (cheapest first). */
function pickQuitter(country: CountryState): { company: CompanyState; worker: WorkerState } | null {
  let best: { company: CompanyState; worker: WorkerState } | null = null;
  let bestScore = Infinity;
  for (const company of country.companies) {
    for (const worker of company.workers) {
      const score =
        WORKER_TIERS.findIndex((t) => t.id === worker.tierId) * 1_000 + worker.skillLevel;
      if (score < bestScore) {
        bestScore = score;
        best = { company, worker };
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Tick — the heart of the idle loop
// ---------------------------------------------------------------------------

function emptyEvents(): TickEvents {
  return {
    completions: [],
    levelUps: [],
    trainingsDone: [],
    promotionsDone: [],
    deskUpgradesDone: [],
    floorBuildsDone: [],
    companyBuildsDone: [],
    quits: [],
  };
}

/**
 * Advance the simulation by dt seconds. Mutates state and returns the events
 * that occurred so the UI can react. Every country and every company
 * progresses in parallel; each country's money flows through its own wallet
 * (which can go below zero — debt).
 */
export function tick(state: GameState, dt: number): TickEvents {
  const events = emptyEvents();
  if (dt <= 0) return events;

  state.playTimeSec += dt;

  // Boosts that expire mid-tick only cover part of dt: correct the full
  // multiplier baked into workerRate down to the covered fraction.
  let boostCorrection = 1;
  for (const b of state.boosts) {
    if (b.remainingSec < dt && b.mult !== 0) {
      const frac = b.remainingSec / dt;
      boostCorrection *= (1 + (b.mult - 1) * frac) / b.mult;
    }
  }

  for (const country of state.countries) {
    tickCountry(state, country, dt, boostCorrection, events);
  }

  // Count down and expire boosts (after they contributed to this tick).
  if (state.boosts.length > 0) {
    for (const b of state.boosts) b.remainingSec -= dt;
    state.boosts = state.boosts.filter((b) => b.remainingSec > 0);
  }

  // Clamp the piggy vault to its income-scaled cap (once per tick — the
  // payout loop accrues uncapped).
  if (state.vault.amount > 0) {
    state.vault.amount = Math.min(state.vault.amount, vaultCap(state));
  }

  return events;
}

function tickCountry(
  state: GameState,
  country: CountryState,
  dt: number,
  boostCorrection: number,
  events: TickEvents,
): void {
  // 1. Pay salaries — the wallet CAN go below zero (debt). Event boosts can
  // temporarily raise wages (salaryMult on Boost).
  country.money -= countrySalaries(country) * salaryBoostMult(state) * dt;

  // 2. Debt: interest compounds while under water; past the crisis
  //    threshold one employee resigns per interval (never the last one —
  //    someone always believes in you). With nobody left on payroll the
  //    debt decays instead, so recovery is always possible.
  if (country.money < 0) {
    if (countryWorkerCount(country) > 0) {
      country.money -= -country.money * DEBT_INTEREST_PER_SEC * dt;
    } else {
      country.money = Math.min(
        0,
        country.money + (-country.money * DEBT_INTEREST_PER_SEC * 2 + 1) * dt,
      );
    }
    country.money = Math.max(country.money, -debtCap(country));
    if (inDebtCrisis(country) && countryWorkerCount(country) > 1) {
      country.debtQuitCooldownSec -= dt;
      while (country.debtQuitCooldownSec <= 0 && countryWorkerCount(country) > 1) {
        const quitter = pickQuitter(country);
        if (!quitter) break;
        quitter.company.workers = quitter.company.workers.filter(
          (w) => w.id !== quitter.worker.id,
        );
        quitter.company.timedActions = quitter.company.timedActions.filter(
          (a) => a.targetId !== quitter.worker.id || a.kind === 'desk-upgrade',
        );
        autoSeat(quitter.company);
        events.quits.push({
          companyId: quitter.company.id,
          workerId: quitter.worker.id,
          name: quitter.worker.name,
        });
        country.debtQuitCooldownSec += DEBT_QUIT_INTERVAL_SEC;
      }
    } else {
      country.debtQuitCooldownSec = DEBT_QUIT_INTERVAL_SEC;
    }
  } else {
    country.debtQuitCooldownSec = DEBT_QUIT_INTERVAL_SEC;
  }

  for (const company of country.companies) {
    // 3. Generate work (per assigned project) and gain experience.
    const progressed = new Set<string>();
    for (const worker of company.workers) {
      if (worker.stationId === null) continue;
      const projectId = workerProject(company, worker);
      const project = getProject(company, projectId);
      project.progress += workerRate(state, company, worker, projectId) * boostCorrection * dt;
      progressed.add(projectId);
    }

    const expGain = dt * expMultiplier(company);
    for (const worker of company.workers) {
      if (worker.stationId === null) continue;
      const cap = tierById(worker.tierId).maxSkill;
      if (worker.skillLevel >= cap) continue;
      worker.experience += expGain * traitXpMult(worker.traits);
      let need = expToNextLevel(worker.skillLevel);
      while (worker.experience >= need && worker.skillLevel < cap) {
        worker.experience -= need;
        worker.skillLevel += 1;
        events.levelUps.push({ workerId: worker.id, newLevel: worker.skillLevel });
        need = expToNextLevel(worker.skillLevel);
      }
    }

    // 4. Timed actions run down; effects fire exactly once on completion.
    if (company.timedActions.length > 0) {
      const finished: TimedAction[] = [];
      for (const action of company.timedActions) {
        action.remainingSec -= dt;
        if (action.remainingSec <= 0) finished.push(action);
      }
      if (finished.length > 0) {
        company.timedActions = company.timedActions.filter((a) => a.remainingSec > 0);
        for (const action of finished) completeTimedAction(state, company, action, events);
      }
    }

    // 5. Complete projects (possibly several times in one long tick).
    //    Auto-repeat: progress rolls over; required work and reward scale up
    //    until the site's reward cap, where both freeze (soft-cap plateau).
    for (const projectId of progressed) {
      const project = getProject(company, projectId);
      const def = projectDefById(projectId);
      const cap = projectRewardCap(company, projectId);
      let guard = 0;
      while (project.progress >= project.currentWork && guard < 10_000) {
        project.progress -= project.currentWork;
        country.money += project.currentReward;
        // Piggy vault: a bonus share accrues on top of the payout (clamped
        // once per tick — see VAULT_CAP_MINUTES).
        state.vault.amount += project.currentReward * VAULT_RATE;
        country.totalEarned += project.currentReward;
        country.projectsCompleted += 1;
        state.totalEarned += project.currentReward;
        state.projectsCompleted += 1;
        project.completions += 1;
        events.completions.push({
          companyId: company.id,
          projectId: project.defId,
          reward: project.currentReward,
        });
        if (project.currentReward < cap) {
          project.currentWork *= def.workGrowth;
          project.currentReward = Math.min(cap, project.currentReward * def.rewardGrowth);
        }
        guard++;
      }
    }
  }

  // 6. Country-level timed actions (company-build) run down the same way.
  if (country.timedActions.length > 0) {
    const finished: TimedAction[] = [];
    for (const action of country.timedActions) {
      action.remainingSec -= dt;
      if (action.remainingSec <= 0) finished.push(action);
    }
    if (finished.length > 0) {
      country.timedActions = country.timedActions.filter((a) => a.remainingSec > 0);
      for (const action of finished) completeCountryTimedAction(state, country, action, events);
    }
  }
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
  const country = activeCountry(state);
  const company = activeCompany(state);
  const candidate = company.candidates[candidateIndex];
  if (!candidate) return 'error.candidateNotFound';
  const cost = hireCost(company, candidate.tierId);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  company.workers.push({
    id: state.nextEntityId++,
    name: candidate.name,
    tierId: candidate.tierId,
    specialization: candidate.specialization,
    skillLevel: 1,
    experience: 0,
    stationId: null,
    timesTrained: 0,
    promotions: 0,
    traits: candidate.traits,
  });
  company.candidates.splice(candidateIndex, 1);
  if (company.candidates.length === 0) company.candidates = rollCandidates(state);
  autoSeat(company);
  return null;
}

export function fireWorker(state: GameState, workerId: number): string | null {
  const company = activeCompany(state);
  const index = company.workers.findIndex((w) => w.id === workerId);
  if (index === -1) return 'error.workerNotFound';
  company.workers.splice(index, 1);
  // Orphaned personal actions (training/promotion) die with the departure.
  company.timedActions = company.timedActions.filter(
    (a) => a.targetId !== workerId || a.kind === 'desk-upgrade',
  );
  autoSeat(company);
  return null;
}

export function buyWorkstation(state: GameState, defId: string): string | null {
  return buyWorkstations(state, defId, 1);
}

/**
 * Total cost of the next n workstations of a def. Summed buy-by-buy (each
 * step rounds like stationCost) so bulk price === n sequential purchases.
 */
export function stationCostN(company: CompanyState, defId: string, n: number): number {
  const def = stationDefById(defId);
  const owned = company.workstations.filter((w) => w.defId === defId).length;
  const scale = companyCostScale(company);
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += Math.round(def.baseCost * Math.pow(def.costGrowth, owned + i) * scale);
  }
  return total;
}

/** How many desks of a def the wallet and remaining slots allow right now. */
export function maxAffordableStations(state: GameState, defId: string): number {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const room = Math.max(0, deskCapacity(company) - company.workstations.length);
  let n = 0;
  while (n < room && country.money >= stationCostN(company, defId, n + 1)) n++;
  return n;
}

/** Buy n workstations of a def at once — all-or-nothing, no partial buys. */
export function buyWorkstations(state: GameState, defId: string, n: number): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  if (n < 1) return 'error.officeFull';
  if (company.workstations.length + n > deskCapacity(company)) {
    return 'error.officeFull';
  }
  const cost = stationCostN(company, defId, n);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  for (let i = 0; i < n; i++) {
    company.workstations.push({ id: state.nextEntityId++, defId });
  }
  autoSeat(company);
  return null;
}

/**
 * Start building the next floor of the active company's building: paid up
 * front, raised by a builder over floorBuildDurationSec, the floor exists
 * only on completion.
 */
export function buyFloor(state: GameState): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  if (company.floors >= MAX_FLOORS) return 'error.maxHeight';
  if (floorUnderConstruction(company)) return 'error.floorAlreadyBuilding';
  if (freeBuilders(country) <= 0) return 'error.noFreeBuilders';
  const cost = floorCost(company);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  const duration = floorBuildDurationSec(country, company);
  company.timedActions.push({
    id: state.nextEntityId++,
    kind: 'floor-build',
    targetId: company.id,
    remainingSec: duration,
    totalSec: duration,
  });
  return null;
}

/**
 * Gabriel's once-per-game floor gift: available on the second floor of the
 * player's very first company (first country, first company) only.
 */
export function floorGiftAvailable(state: GameState): boolean {
  if (state.floorGiftClaimed) return false;
  const firstCountry = state.countries[0];
  if (!firstCountry || state.activeCountryId !== firstCountry.id) return false;
  const company = activeCompany(state);
  if (firstCountry.companies[0]?.id !== company.id) return false;
  return company.floors === 1 && !floorUnderConstruction(company);
}

/**
 * Claim Gabriel's gift: the second floor appears instantly and free, and a
 * free fast-forward credit comes with it (teaching the skip mechanic).
 * Both effects are durable counters, so offline simulation is unaffected.
 */
export function claimFloorGift(state: GameState): string | null {
  if (!floorGiftAvailable(state)) return 'error.floorGiftUnavailable';
  const company = activeCompany(state);
  company.floors = 2;
  state.floorGiftClaimed = true;
  state.freeFastForwards += 1;
  return null;
}

export function setActiveProject(state: GameState, projectId: string): string | null {
  const company = activeCompany(state);
  const project = getProject(company, projectId);
  if (!project.unlocked) return 'error.projectLocked';
  company.activeProjectId = projectId;
  autoSeat(company);
  return null;
}

export function unlockProject(state: GameState, projectId: string): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const project = getProject(company, projectId);
  if (project.unlocked) return 'error.alreadyUnlocked';
  const cost = projectUnlockCost(company, projectId);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  project.unlocked = true;
  return null;
}

export function buyUpgrade(state: GameState, upgradeId: string): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  const def = upgradeDefById(upgradeId);
  const required = def.requiresCompanies ?? 1;
  if (country.companies.length < required) {
    return `Requires ${required} companies`;
  }
  if (def.vsCoinCost !== undefined) {
    // Premium upgrades are global: one purchase applies everywhere.
    const level = state.globalUpgrades[upgradeId] ?? 0;
    if (level >= def.maxLevel) return 'error.maxLevel';
    const err = spendVsCoin(state, upgradeVsCoinCost(state, upgradeId)!, `shop:${upgradeId}`);
    if (err) return err;
    state.globalUpgrades[upgradeId] = level + 1;
    return null;
  }
  const level = company.upgrades[upgradeId] ?? 0;
  if (level >= def.maxLevel) return 'error.maxLevel';
  const cost = upgradeCost(company, upgradeId);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  company.upgrades[upgradeId] = level + 1;
  return null;
}

export function rerollCandidates(state: GameState): string | null {
  const country = activeCountry(state);
  const company = activeCompany(state);
  if (country.money < company.candidateRerollCost) return 'error.notEnoughMoney';
  country.money -= company.candidateRerollCost;
  company.candidates = rollCandidates(state);
  company.candidateRerollCost = Math.round(
    company.candidateRerollCost * CANDIDATE_REROLL_GROWTH,
  );
  return null;
}

/**
 * Found a new company at a free site of the active country's city, paid
 * from that country's wallet. The company names itself: a parody name from
 * the country's pool (only the player's very first company is player-named).
 */
export function buyCompany(state: GameState, siteId: string): string | null {
  const country = activeCountry(state);
  siteById(siteId);
  if (companyAtSite(state, siteId)) return 'error.siteOccupied';
  if (siteUnderConstruction(country, siteId)) return 'error.siteAlreadyBuilding';
  const duration = companyBuildDurationSec(country);
  if (duration > 0 && freeBuilders(country) <= 0) return 'error.noFreeBuilders';
  const cost = companyCost(state, siteId);
  if (country.money < cost) return 'error.notEnoughMoney';
  country.money -= cost;
  if (duration <= 0) {
    // A country's first company is instant (tutorial / fresh start abroad).
    const company = createCompany(state, country, siteId, nextParodyName(country, siteId), cost);
    country.activeCompanyId = company.id;
    return null;
  }
  country.timedActions.push({
    id: state.nextEntityId++,
    kind: 'company-build',
    targetId: 0, // no CompanyState exists yet; siteId identifies the build
    remainingSec: duration,
    totalSec: duration,
    siteId,
    price: cost,
  });
  return null;
}

export function setActiveCompany(state: GameState, companyId: number): string | null {
  const country = activeCountry(state);
  if (!country.companies.some((c) => c.id === companyId)) return 'error.companyNotFound';
  country.activeCompanyId = companyId;
  return null;
}

// ---------------------------------------------------------------------------
// International expansion
// ---------------------------------------------------------------------------

/** International Business unlocks once any country's city is fully owned. */
export function worldUnlocked(state: GameState): boolean {
  return state.countries.some((c) => c.companies.length >= COMPANY_SITES.length);
}

/** Price of unlocking the next country (cash from the active country). */
export function countryUnlockCost(state: GameState): number {
  return Math.round(
    COUNTRY_UNLOCK_BASE * Math.pow(COUNTRY_UNLOCK_GROWTH, state.countries.length - 1),
  );
}

/**
 * Unlock a new country: pay from the active country's wallet, found a fresh
 * economy there (garage company, parody-named) and travel to it.
 */
export function unlockCountry(state: GameState, countryId: string): string | null {
  countryDefById(countryId);
  if (countryById(state, countryId)) return 'error.countryUnlocked';
  if (!worldUnlocked(state)) return 'error.ownCityFirst';
  const from = activeCountry(state);
  const cost = countryUnlockCost(state);
  if (from.money < cost) return 'error.notEnoughMoney';
  from.money -= cost;
  createCountry(state, countryId as CountryId);
  state.activeCountryId = countryId as CountryId;
  return null;
}

/** Travel to an already-unlocked country (free, any time). */
export function setActiveCountry(state: GameState, countryId: string): string | null {
  if (!countryById(state, countryId)) return 'error.countryLocked';
  state.activeCountryId = countryId as CountryId;
  return null;
}

/**
 * Pick the starting country. Only possible during the tutorial before any
 * progress was made (it rebuilds the starting economy in the new country).
 */
export function setStartingCountry(state: GameState, countryId: string): string | null {
  countryDefById(countryId);
  if (state.tutorial.done) return 'error.journeyBegun';
  if (state.totalEarned > 0 || state.projectsCompleted > 0 || allCompanies(state).some((c) => c.workers.length > 0)) {
    return 'error.journeyBegun';
  }
  if (state.activeCountryId === countryId) return null;
  const previousName = activeCompany(state).name;
  state.countries = [];
  state.activeCountryId = countryId as CountryId;
  createCountry(state, countryId as CountryId, previousName);
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
  if (!Number.isFinite(amount) || amount <= 0) return 'error.invalidAmount';
  state.vsCoin += amount;
  pushLedger(state, { amount, source });
  return null;
}

/** Spend VsCoin on a sink (premium upgrades, cosmetics, boosts). */
export function spendVsCoin(state: GameState, amount: number, sink: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'error.invalidAmount';
  if (state.vsCoin < amount) return 'error.notEnoughVsCoin';
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
export function upgradeVsCoinCost(state: GameState, upgradeId: string): number | null {
  const def = upgradeDefById(upgradeId);
  if (def.vsCoinCost === undefined) return null;
  const level = state.globalUpgrades[upgradeId] ?? 0;
  return Math.round(def.vsCoinCost * Math.pow(def.costGrowth, level));
}

/** Buy the premium output boost with VsCoin. */
export function buyVsCoinBoost(state: GameState): string | null {
  const existing = state.boosts.find((b) => b.source === 'vscoin');
  if (!existing && state.boosts.length >= 5) return 'error.tooManyBoosts';
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
  salaryMult?: number,
): string | null {
  // Events may trade pure salary pain (mult 1 + salaryMult > 1); classic
  // boosts still require an output gain.
  if ((mult <= 1 && (salaryMult ?? 1) <= 1) || durationSec <= 0) return 'error.invalidBoost';
  const existing = state.boosts.find(
    (b) => b.source === source && b.mult === mult && (b.salaryMult ?? 1) === (salaryMult ?? 1),
  );
  if (existing) {
    existing.remainingSec += durationSec;
  } else {
    if (state.boosts.length >= 5) return 'error.tooManyBoosts';
    state.boosts.push({ mult, salaryMult, remainingSec: durationSec, source });
  }
  return null;
}

/** The vault's cap: VAULT_CAP_MINUTES of gross income, floored. */
export function vaultCap(state: GameState): number {
  return Math.max(VAULT_CAP_MIN, Math.round(grossRewardRate(state) * 60 * VAULT_CAP_MINUTES));
}

/** Crack the vault open: VsCoin out, the pool into the active wallet. */
export function openVault(state: GameState): string | null {
  if (state.vault.amount <= 0) return 'error.vaultEmpty';
  const err = spendVsCoin(state, VAULT_OPEN_COST, 'vault:open');
  if (err) return err;
  activeCountry(state).money += state.vault.amount;
  state.vault.amount = 0;
  return null;
}

/** Buy an office pet once with VsCoin — usable in every company forever. */
export function buyPet(state: GameState, petId: string): string | null {
  const pet = petById(petId);
  if (state.ownedPets.includes(pet.id)) return 'error.alreadyOwned';
  const err = spendVsCoin(state, pet.vsCoinCost, `shop:pet-${pet.id}`);
  if (err) return err;
  state.ownedPets.push(pet.id);
  return null;
}

/** Let an owned pet roam the active company's building (null = none). */
export function setCompanyPet(state: GameState, petId: string | null): string | null {
  if (petId !== null && !state.ownedPets.includes(petId)) return 'error.petNotOwned';
  activeCompany(state).petId = petId;
  return null;
}

/** Product of active salary multipliers (events raising wages; 1 = none). */
export function salaryBoostMult(state: GameState): number {
  let m = 1;
  for (const b of state.boosts) m *= b.salaryMult ?? 1;
  return m;
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

/** Gross reward rate across the active country in $/sec (before salaries). */
export function grossRewardRate(state: GameState): number {
  let sum = 0;
  for (const c of activeCountry(state).companies) {
    for (const projectId of assignedProjects(c)) {
      const project = getProject(c, projectId);
      const rate = companyProjectRate(state, c, projectId);
      if (rate > 0) sum += (project.currentReward / project.currentWork) * rate;
    }
  }
  return sum;
}

/** Price of a marketing campaign: ~MARKETING_COST_SEC of gross income. */
export function marketingCost(state: GameState): number {
  return Math.max(MARKETING_MIN_COST, Math.round(grossRewardRate(state) * MARKETING_COST_SEC));
}

// ---------------------------------------------------------------------------
// Shop — VsCoin → cash funding rounds
// ---------------------------------------------------------------------------

/** Cash a shop pack grants right now (progression-scaled, never trivial). */
export function shopPackCash(state: GameState, packId: string): number {
  const pack = shopPackById(packId);
  return Math.max(pack.floorCash, Math.round(grossRewardRate(state) * 60 * pack.minutes));
}

/** Whether the active country has enough companies to unlock a pack. */
export function shopPackUnlocked(state: GameState, packId: string): boolean {
  return activeCountry(state).companies.length >= shopPackById(packId).requiresCompanies;
}

/**
 * Claim a VsCoin acquisition SKU. In beta only the starter pack is
 * claimable — free and unlimited while BETA_FREE_IAP is true; the larger
 * packs wait for real payments (their grant will arrive through the
 * payment callback with source 'iap:<sku>').
 */
export function claimVsCoinPack(state: GameState, skuId: string): string | null {
  const pack = vsCoinPackById(skuId);
  // Beta: every SKU is a free claim (placeholder until real payments ship,
  // when the source becomes 'iap:<sku>').
  if (!BETA_FREE_IAP) return 'error.iapComingSoon';
  return grantVsCoin(state, pack.coins, `shop:${pack.id}`);
}

/**
 * Buy a funding round: VsCoin out (audited, sink 'shop:<sku>'), cash into
 * the active country's wallet. In debt the credit pays the debt down first
 * — it is the same wallet. Deliberately NOT added to totalEarned: missions
 * and story feed on earnings and must not be purchasable.
 */
export function buyShopPack(state: GameState, packId: string): string | null {
  const pack = shopPackById(packId);
  if (!shopPackUnlocked(state, packId)) return 'error.packLocked';
  const cash = shopPackCash(state, packId);
  const err = spendVsCoin(state, pack.vsCoin, `shop:${pack.id}`);
  if (err) return err;
  activeCountry(state).money += cash;
  return null;
}

/**
 * Buy a marketing campaign: a MARKETING_MULT x output boost for
 * MARKETING_DURATION_SEC, paid with project money. Re-buying extends it.
 */
export function buyMarketingCampaign(state: GameState): string | null {
  const country = activeCountry(state);
  const cost = marketingCost(state);
  if (country.money < cost) return 'error.notEnoughMoney';
  const err = grantBoost(state, MARKETING_MULT, MARKETING_DURATION_SEC, 'marketing');
  if (err) return err;
  country.money -= cost;
  return null;
}

/** Set the free live-play simulation speed (1, 2 or 4). */
export function setTimeScale(state: GameState, scale: number): string | null {
  if (!TIME_SCALES.includes(scale)) return 'error.invalidSpeed';
  state.settings.timeScale = scale;
  return null;
}

/** Persist the UI language choice ('auto' follows the browser). */
export function setLanguage(state: GameState, language: string): string | null {
  if (language !== 'auto' && language !== 'en' && language !== 'fr') {
    return 'error.unknownLanguage';
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
  const country = activeCountry(state);
  const def = wallpaperById(wallpaperId);
  if (state.ownedWallpapers.includes(wallpaperId)) return 'error.alreadyOwned';
  if (def.vsCoinCost !== undefined) {
    const err = spendVsCoin(state, def.vsCoinCost, `shop:wallpaper-${wallpaperId}`);
    if (err) return err;
  } else {
    if (country.money < def.cost) return 'error.notEnoughMoney';
    country.money -= def.cost;
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
    if (!state.ownedWallpapers.includes(wallpaperId)) return 'error.wallpaperNotOwned';
  }
  activeCompany(state).wallpaperId = wallpaperId;
  return null;
}

/** Set the player-level default wallpaper (companies without a pick use it). */
export function setDefaultWallpaper(state: GameState, wallpaperId: string): string | null {
  wallpaperById(wallpaperId);
  if (!state.ownedWallpapers.includes(wallpaperId)) return 'error.wallpaperNotOwned';
  state.defaultWallpaperId = wallpaperId;
  return null;
}

export function buyMapTheme(state: GameState, themeId: string): string | null {
  const country = activeCountry(state);
  const def = mapThemeById(themeId);
  if (state.ownedMapThemes.includes(themeId)) return 'error.alreadyOwned';
  if (country.money < def.cost) return 'error.notEnoughMoney';
  country.money -= def.cost;
  state.ownedMapThemes.push(themeId);
  state.mapThemeId = themeId; // buying selects it right away
  return null;
}

export function setMapTheme(state: GameState, themeId: string): string | null {
  mapThemeById(themeId);
  if (!state.ownedMapThemes.includes(themeId)) return 'error.mapThemeNotOwned';
  state.mapThemeId = themeId;
  return null;
}

// ---------------------------------------------------------------------------
// Renaming — free while the tutorial names the first company, paid forever
// after (cash AND VsCoin, both escalating per rename)
// ---------------------------------------------------------------------------

/** Cash price of the active company's next rename. */
export function renameCashCost(company: CompanyState): number {
  return Math.round(
    Math.max(company.purchasePrice, RENAME_CASH_MIN) *
      Math.pow(RENAME_COST_GROWTH, company.renameCount),
  );
}

/** VsCoin price of the active company's next rename. */
export function renameVsCoinCost(company: CompanyState): number {
  return Math.round(RENAME_VSCOIN_BASE * Math.pow(RENAME_COST_GROWTH, company.renameCount));
}

export function renameCompany(state: GameState, name: string): string | null {
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return 'error.emptyName';
  const country = activeCountry(state);
  const company = activeCompany(state);
  // The tutorial's naming of the very first company is the free creation
  // naming; every rename after the tutorial is a paid vanity move.
  if (!state.tutorial.done) {
    company.name = trimmed;
    return null;
  }
  const cash = renameCashCost(company);
  const coins = renameVsCoinCost(company);
  if (country.money < cash) return 'error.notEnoughMoney';
  if (state.vsCoin < coins) return 'error.notEnoughVsCoin';
  const err = spendVsCoin(state, coins, 'shop:rename');
  if (err) return err;
  country.money -= cash;
  company.renameCount += 1;
  company.name = trimmed;
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSTATION_ORDER = ['basic', 'standing', 'dual', 'corner'];

/**
 * Assign a company's workers to its workstations automatically: strongest
 * workers (for the active project) get the best desks. Workers without a
 * desk produce nothing.
 */
export function autoSeat(company: CompanyState): void {
  // Desks under renovation are construction sites — nobody sits there.
  const stations = company.workstations
    .filter((w) => !stationUnderUpgrade(company, w.id))
    .sort((a, b) => stationDefById(b.defId).multiplier - stationDefById(a.defId).multiplier);
  const potential = (w: WorkerState) => {
    const tier = tierById(w.tierId);
    const specBonus =
      projectDefById(company.activeProjectId).specialization === w.specialization
        ? SPEC_MATCH_BONUS
        : 1;
    return tier.baseRate * skillMultiplier(w) * specBonus;
  };
  // Workers in training or being promoted are off the floor: no desk.
  for (const w of company.workers) {
    if (workerBusy(company, w.id)) w.stationId = null;
  }
  const workers = company.workers
    .filter((w) => !workerBusy(company, w.id))
    .sort((a, b) => potential(b) - potential(a));
  for (let i = 0; i < workers.length; i++) {
    workers[i].stationId = i < stations.length ? stations[i].id : null;
  }
}

/**
 * Roll 3 hire candidates, weighted toward tiers the player can nearly
 * afford. While the tutorial runs and nobody was ever hired, the first
 * candidate is always Steve Gates, an affordable intern (the scripted
 * first hire).
 */
export function rollCandidates(
  state: GameState,
  rand: () => number = Math.random,
  country?: CountryState,
): Candidate[] {
  const home = country ?? activeCountry(state);
  const budget = Math.max(home.money, home.totalEarned * 0.25, 50);
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
      traits: rollTraits(rand),
    });
  }
  if (!state.tutorial.done && allCompanies(state).every((c) => c.workers.length === 0)) {
    out[0] = {
      name: TUTORIAL_FIRST_HIRE_NAME,
      tierId: 'intern',
      specialization: pick(SPECIALIZATIONS, rand),
      traits: [],
    };
  }
  return out;
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}
