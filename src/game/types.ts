export type Specialization = 'Frontend' | 'Backend' | 'DevOps' | 'Data Science';

export interface WorkerTierDef {
  id: string;
  title: string;
  baseRate: number; // work/sec at skill level 1
  salary: number; // $/sec
  hireCost: number;
  emoji: string;
}

export interface WorkstationDef {
  id: string;
  name: string;
  multiplier: number; // output multiplier for the seated worker
  baseCost: number;
  costGrowth: number; // cost = baseCost * costGrowth^owned
  emoji: string;
}

export interface ProjectDef {
  id: string;
  name: string;
  specialization: Specialization;
  baseWork: number; // required work points at completion 0
  baseReward: number; // $ payout at completion 0
  unlockCost: number; // 0 = unlocked from the start
  workGrowth: number; // required work *= workGrowth per completion
  rewardGrowth: number; // reward *= rewardGrowth per completion
  emoji: string;
}

export interface CompanySiteDef {
  id: string;
  name: string;
  cost: number; // 0 = free starting site
  outputBonus: number; // multiplier on all worker output at this site (1 = none)
  floorCostFactor: number; // scales floor prices at this site
  /**
   * Scale of the projects run at this site: rewards and unlock costs are
   * multiplied by projectScale, required work by
   * projectScale^PROJECT_WORK_SCALE_EXP — later companies run bigger,
   * more lucrative contracts instead of re-doing the garage ones.
   */
  projectScale: number;
  emoji: string;
  blurb: string;
}

/** A purchasable office wallpaper/decor theme (pure cosmetics). */
export interface WallpaperDef {
  id: string;
  name: string;
  cost: number; // 0 = owned from the start (unless vsCoinCost is set)
  /** Premium cosmetic: bought with VsCoin instead of money. */
  vsCoinCost?: number;
  emoji: string;
  /** CSS background value applied to the building interior. */
  css: string;
}

/** A purchasable look for the map screen. */
export interface MapThemeDef {
  id: string;
  name: string;
  cost: number; // 0 = owned from the start
  emoji: string;
  /** CSS background value applied to the map. */
  css: string;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number; // Infinity-like cap via large number
  emoji: string;
  /** Hidden until the player owns this many companies (undefined = always). */
  requiresCompanies?: number;
  /**
   * Premium upgrade: levels are paid in VsCoin instead of money.
   * Cost per level = vsCoinCost * costGrowth^level (baseCost is ignored).
   */
  vsCoinCost?: number;
}

/** Metrics a mission can track — all derived from durable state counters. */
export type MissionMetric =
  | 'projectsCompleted'
  | 'totalEarned'
  | 'workers'
  | 'companies'
  | 'upgradeLevels'
  | 'desks';

export interface MissionDef {
  id: string;
  metric: MissionMetric;
  target: number;
  /** VsCoin granted on claim. */
  reward: number;
  emoji: string;
}

/**
 * One VsCoin grant or spend. `source` tags where it came from/went
 * ('mission:<id>', 'story:<id>', 'shop:<sku>', later 'iap:<sku>') so a
 * future real-money flow and analytics can plug in without refactoring.
 */
export interface VsCoinLedgerEntry {
  amount: number; // positive = grant, negative = spend
  source: string;
}

/** An in-flight training program: the worker is away from their desk. */
export interface TrainingState {
  remainingSec: number;
  totalSec: number;
  levels: number; // skill levels granted on completion
}

export interface WorkerState {
  id: number;
  name: string;
  tierId: string;
  specialization: Specialization;
  skillLevel: number;
  experience: number; // resets each level-up
  stationId: number | null; // assigned workstation instance
  training: TrainingState | null;
}

export interface WorkstationState {
  id: number;
  defId: string;
}

export interface ProjectState {
  defId: string;
  unlocked: boolean;
  progress: number;
  completions: number;
  currentWork: number; // required work for the current run
  currentReward: number; // payout for the current run
}

export interface Settings {
  sound: boolean;
  particles: boolean;
  /** Free simulation speed toggle for the live loop: 1, 2 or 4. */
  timeScale: number;
  /** UI language: explicit choice or browser auto-detection. */
  language: 'auto' | 'en' | 'fr';
}

/** Narrative progress (see src/game/story.ts). */
export interface StoryState {
  /** Beats already triggered (shown or queued) — never re-fire. */
  seen: string[];
  /** Beats waiting to be displayed, oldest first. */
  queue: string[];
}

/** Gabriel tutorial progress (see src/game/tutorial.ts). */
export interface TutorialState {
  /** Index into TUTORIAL_STEPS. */
  step: number;
  /** Completed or skipped — never show again. */
  done: boolean;
  /** Gabriel's one-time seed-money gift was paid out. */
  giftGiven: boolean;
}

/** The player themself (named in the tutorial; look added by customization). */
export interface PlayerState {
  name: string;
}

/**
 * Temporary output multiplier — the delivery vehicle for monetization
 * rewards (rewarded ads, purchased boosts). Counted down inside tick()
 * so it works identically online and offline.
 */
export interface Boost {
  /** e.g. 2 for a "2x income" boost */
  mult: number;
  remainingSec: number;
  /** where it came from, for analytics: 'ad' | 'iap' | 'event' | 'dev' */
  source: string;
}

/**
 * One company on the map. Each company runs independently — its own team,
 * desks, projects and upgrades — but all money flows through the shared
 * player wallet on GameState.
 */
export interface CompanyState {
  id: number;
  name: string;
  siteId: string; // map location (CompanySiteDef)
  floors: number; // unlocked floors; each adds FLOOR_CAPACITY desk slots
  wallpaperId: string | null; // null = use the player's default wallpaper
  workers: WorkerState[];
  workstations: WorkstationState[];
  projects: ProjectState[];
  activeProjectId: string;
  upgrades: Record<string, number>;
  candidates: Candidate[];
  candidateRerollCost: number;
}

export interface GameState {
  version: number;
  money: number; // shared wallet across all companies
  totalEarned: number;
  projectsCompleted: number;
  startedAt: number;
  lastSeen: number; // wall-clock ms, for offline progress
  playTimeSec: number;
  companies: CompanyState[];
  activeCompanyId: number; // company currently shown/managed in the UI
  ownedWallpapers: string[]; // bought once, usable in every company
  defaultWallpaperId: string; // player-level default for companies without one
  ownedMapThemes: string[];
  mapThemeId: string;
  boosts: Boost[];
  settings: Settings;
  story: StoryState;
  tutorial: TutorialState;
  player: PlayerState;
  /** Premium currency, earned through gameplay (missions, story milestones). */
  vsCoin: number;
  /** Audit trail of every VsCoin movement (kept bounded by migrate()). */
  vsCoinLedger: VsCoinLedgerEntry[];
  /** Mission ids whose reward has been collected. */
  missionsClaimed: string[];
  nextEntityId: number;
}

export interface Candidate {
  name: string;
  tierId: string;
  specialization: Specialization;
}

/** Events emitted by a tick, consumed by the UI for effects. */
export interface TickEvents {
  completions: { companyId: number; projectId: string; reward: number }[];
  levelUps: { workerId: number; newLevel: number }[];
  trainingsDone: { companyId: number; workerId: number; newLevel: number }[];
}
