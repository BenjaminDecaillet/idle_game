export type Specialization = 'Frontend' | 'Backend' | 'DevOps' | 'Data Science';

/** Playable countries. Each is a fully independent economy (see CountryState). */
export type CountryId = 'ch' | 'us' | 'ca' | 'it' | 'fr' | 'de' | 'sa' | 'cn';

export interface CountryDef {
  id: CountryId;
  emoji: string; // flag
  /**
   * Parody company names auto-assigned to companies founded in this country
   * (every company except the player's very first one). Recognizable riffs
   * on real companies, never a real trademark verbatim.
   */
  parodyCompanyNames: string[];
}

export interface WorkerTierDef {
  id: string;
  title: string;
  baseRate: number; // work/sec at skill level 1
  salary: number; // $/sec
  hireCost: number;
  /** Grade cap: skill can't grow past this; at the cap the worker can be promoted. */
  maxSkill: number;
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
  /**
   * Site specialty: contracts of this specialization earn SITE_SPEC_BONUS
   * here, making founding a build choice (undefined = generalist site).
   */
  favoredSpec?: Specialization;
  emoji: string;
  blurb: string;
}

/**
 * A Shop cash pack ("funding round"): VsCoin in, cash out. The grant is
 * progression-scaled — max(floorCash, grossRewardRate × 60 × minutes) — so
 * a pack stays meaningful at every stage (see docs/balance.md Phase W).
 */
export interface ShopCashPackDef {
  id: string;
  emoji: string;
  /** Minutes of the active country's gross income the pack grants. */
  minutes: number;
  /** Minimum grant — covers fresh/prestiged countries with ~0 income. */
  floorCash: number;
  vsCoin: number;
  /** Companies required in the active country before the pack unlocks. */
  requiresCompanies: number;
}

/**
 * A VsCoin acquisition SKU. Ids are stable and payment-provider-shaped:
 * grants go through grantVsCoin with source 'shop:<sku>' today and
 * 'iap:<sku>' once real payments ship (see docs/monetization.md).
 */
export interface VsCoinPackDef {
  id: string;
  emoji: string;
  coins: number;
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
  | 'desks'
  | 'promotions'
  | 'countries'
  | 'builders';

export interface MissionDef {
  id: string;
  metric: MissionMetric;
  target: number;
  /** VsCoin granted on claim. */
  reward: number;
  emoji: string;
}

/** One rolled daily contract (a delta-progress mission for a single day). */
export interface DailyContract {
  id: string;
  metric: MissionMetric;
  /** Delta target relative to the day-start baseline. */
  target: number;
  reward: number;
  emoji: string;
}

/**
 * Daily contracts board: regenerated when the UTC day number changes (the
 * day is computed in the UI layer — src/game/** never reads the clock).
 * Progress = metricValue − baselines[metric], so contracts measure what the
 * player did today, not lifetime totals.
 */
export interface DailyState {
  /** UTC day number (floor(ms / 86_400_000)) the board was rolled for. */
  day: number;
  contracts: DailyContract[];
  /** Metric snapshot at roll time (delta baseline). */
  baselines: Record<string, number>;
  /** Contract ids already claimed today. */
  claimed: string[];
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

/**
 * A generic in-flight timed action. All time-consuming mechanics (training,
 * promotion, desk upgrades, ...) run through this one system: they advance
 * only inside tick() (so offline simulation is exact) and every one can be
 * fast-forwarded with VsCoin. See .claude/skills/add-timed-action.
 */
export type TimedActionKind =
  | 'training'
  | 'promotion'
  | 'desk-upgrade'
  | 'floor-build'
  | 'company-build';

export interface TimedAction {
  id: number;
  kind: TimedActionKind;
  /**
   * Worker id (training/promotion), workstation id (desk-upgrade) or
   * company id (floor-build). company-build has no target entity yet:
   * targetId is 0 and siteId identifies the map site.
   */
  targetId: number;
  remainingSec: number;
  totalSec: number;
  /** training: skill levels granted on completion. */
  levels?: number;
  /** promotion: tier the worker graduates into. */
  toTierId?: string;
  /** desk-upgrade: workstation def the desk turns into. */
  toDefId?: string;
  /** company-build: the map site the new company rises on. */
  siteId?: string;
  /** company-build: what founding cost (floor for rename pricing later). */
  price?: number;
}

export interface WorkerState {
  id: number;
  name: string;
  tierId: string;
  specialization: Specialization;
  skillLevel: number;
  experience: number; // resets each level-up
  stationId: number | null; // assigned workstation instance
  /** Completed training programs — ramps the next training's duration. */
  timesTrained: number;
  /** Completed promotions (lifetime, feeds the promotions mission metric). */
  promotions: number;
  /** Trait ids inherited from the hired candidate (see TRAITS in data.ts). */
  traits: string[];
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
  /** Chiptune theme loop — off by default; audio starts on a user gesture. */
  music: boolean;
  /** Music volume 0..1 (independent of sound effects). */
  musicVolume: number;
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

/**
 * The player avatar's appearance — every field is an index into the art
 * option lists (counts in PLAYER_LOOK_OPTIONS in data.ts). Unlike employee
 * personas (hash-derived), this is explicit player choice.
 */
export interface PlayerLook {
  skin: number;
  hair: number;
  hairstyle: number;
  eyeStyle: number;
  mouthStyle: number;
  facialHair: number;
  outfit: number;
  accessory: number;
  /** Portrait card: 0 = drawn from the fields above, 1..N = raster file. */
  portrait: number;
}

/** The player themself (named in the tutorial; look fully customizable). */
export interface PlayerState {
  name: string;
  look: PlayerLook;
}

/**
 * Temporary output multiplier — the delivery vehicle for monetization
 * rewards (rewarded ads, purchased boosts). Counted down inside tick()
 * so it works identically online and offline. Global across countries.
 */
export interface Boost {
  /** e.g. 2 for a "2x income" boost */
  mult: number;
  /** Salary multiplier while active — events trade cash for higher wages. */
  salaryMult?: number;
  remainingSec: number;
  /** where it came from, for analytics: 'ad' | 'iap' | 'event' | 'dev' */
  source: string;
}

/**
 * One company on a country's city map. Each company runs independently —
 * its own team, desks, projects and upgrades — and all money flows through
 * its country's wallet.
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
  /** In-flight timed actions (training, promotions, desk upgrades). */
  timedActions: TimedAction[];
  /** What founding this company cost (floor for rename pricing). */
  purchasePrice: number;
  /** Paid renames so far — rename price escalates with it. */
  renameCount: number;
  /** Active office pet wandering this building (null = none). */
  petId: string | null;
  /**
   * Per-floor project assignment (index = floor). null/missing = the
   * company's main activeProjectId. Every floor owns its own slot, so a
   * company with N floors works up to N distinct projects in parallel;
   * desks on a floor work that floor's project.
   */
  floorProjects: (string | null)[];
}

/**
 * The construction labour pool.
 *
 * DELIBERATE code-vs-UI naming split — do not "fix" it: `WorkerState` above
 * already means seated *employees* who produce project work (displayed as
 * "Employees" / "Employés"). Builders are a separate per-country pool that
 * the player sees as "Workers" (EN) / "Ouvriers" (FR). Renaming either type
 * to match the other would collide the two concepts.
 */
export interface BuilderState {
  /** Builders owned in this country. #1 is Gabriel's free, named gift. */
  count: number;
}

/**
 * One country = one fully independent economy: its own wallet (which CAN go
 * below zero — debt), companies, employees, projects, floors and cash
 * upgrades. VsCoin, story, missions, cosmetics and the avatar are global.
 */
export interface CountryState {
  id: CountryId;
  money: number;
  totalEarned: number;
  projectsCompleted: number;
  companies: CompanyState[];
  activeCompanyId: number;
  /** Seconds until the next debt-driven resignation while in crisis. */
  debtQuitCooldownSec: number;
  /** Parody names already assigned in this country (never reused). */
  usedCompanyNames: string[];
  /**
   * Construction labour pool shared by every company in this country. Each
   * in-flight timed action (any kind, company- or country-level) occupies
   * one builder; availability is DERIVED from the in-flight actions, never
   * stored (see freeBuilders() in engine.ts).
   */
  builders: BuilderState;
  /**
   * Country-level timed actions: company-build lives here because a company
   * under construction has no CompanyState yet to carry it.
   */
  timedActions: TimedAction[];
}

/**
 * Prestige: reputation banked by IPO-ing ("open-sourcing the dream") after
 * the story epilogue. `reputation` is cumulative and only ever grows;
 * the permanent output multiplier derives from it (see engine.ts).
 */
export interface PrestigeState {
  /** Completed prestige resets. */
  count: number;
  /** Cumulative reputation points across all resets. */
  reputation: number;
}

export interface GameState {
  version: number;
  countries: CountryState[];
  activeCountryId: CountryId;
  /** Lifetime aggregates across all countries (missions/story feed on these). */
  totalEarned: number;
  projectsCompleted: number;
  startedAt: number;
  lastSeen: number; // wall-clock ms, for offline progress
  playTimeSec: number;
  ownedWallpapers: string[]; // bought once, usable in every company
  /** Office pets owned (global, like wallpapers — see PETS in data.ts). */
  ownedPets: string[];
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
  /** Daily contracts board (see DailyState). */
  daily: DailyState;
  /**
   * Piggy vault: a capped bonus pool fed by VAULT_RATE of every payout,
   * opened with VsCoin. Global — survives prestige like VsCoin does.
   */
  vault: { amount: number };
  /**
   * Levels of VsCoin-bought upgrades. Premium upgrades are global: one
   * purchase applies in every company of every country (cash upgrades stay
   * per-company).
   */
  globalUpgrades: Record<string, number>;
  /** Lifetime fast-forwards bought — the very first one is free (tutorial). */
  fastForwardsUsed: number;
  /** Free fast-forward credits (Gabriel's gifts), consumed before VsCoin. */
  freeFastForwards: number;
  /** Gabriel's once-per-game free second floor has been claimed. */
  floorGiftClaimed: boolean;
  /** Lifetime completed promotions (mission metric). */
  promotionsDone: number;
  /** IPO resets & banked reputation (permanent output multiplier). */
  prestige: PrestigeState;
  /** Last claim of the offline-earnings doubler (wall-clock ms, 0 = never). */
  doublerLastClaimedAt: number;
  /** Lifetime doubler claims (analytics / future missions). */
  offlineDoublesClaimed: number;
  nextEntityId: number;
}

export interface Candidate {
  name: string;
  tierId: string;
  specialization: Specialization;
  /** Trait ids rolled at creation (see TRAITS in data.ts); 2 = rare. */
  traits: string[];
}

/** Events emitted by a tick, consumed by the UI for effects. */
export interface TickEvents {
  completions: { companyId: number; projectId: string; reward: number }[];
  levelUps: { workerId: number; newLevel: number }[];
  trainingsDone: { companyId: number; workerId: number; newLevel: number }[];
  promotionsDone: { companyId: number; workerId: number; newTierId: string }[];
  deskUpgradesDone: { companyId: number; stationId: number; newDefId: string }[];
  floorBuildsDone: { companyId: number; floors: number }[];
  companyBuildsDone: { countryId: CountryId; companyId: number; siteId: string }[];
  /** Debt-crisis resignations (the UI toasts them). */
  quits: { companyId: number; workerId: number; name: string }[];
}
