import type {
  CompanySiteDef,
  CountryDef,
  CountryId,
  MapThemeDef,
  MissionDef,
  MissionMetric,
  ProjectDef,
  ShopCashPackDef,
  Specialization,
  UpgradeDef,
  VsCoinPackDef,
  WallpaperDef,
  WorkerTierDef,
  WorkstationDef,
} from './types';

export const SPEC_MATCH_BONUS = 1.5;
// Site specialty: contracts matching a site's favoredSpec earn this much
// more there (the garage stays generalist). Makes founding a build choice.
export const SITE_SPEC_BONUS = 1.5;
export const OFFLINE_CAP_HOURS = 24;
export const SKILL_OUTPUT_PER_LEVEL = 0.1; // +10% output per skill level above 1

// Training: a paid program that takes the worker off the floor for a while
// and returns them TRAIN_LEVELS skill levels stronger.
// cost = baseRate * TRAIN_COST_RATE_FACTOR * (1 + TRAIN_COST_LEVEL_RAMP * (skillLevel - 1))
// Anchoring to baseRate keeps the payback time uniform across tiers
// (~5 min of the granted extra output at early reward/work ratios).
// duration = TRAIN_DURATION_SEC * TRAIN_DURATION_GROWTH^timesTrained — the
// first program stays tutorial-friendly (~2 min), later ones drift into
// idle/offline territory (see docs/balance.md).
export const TRAIN_LEVELS = 3;
export const TRAIN_DURATION_SEC = 120;
export const TRAIN_DURATION_GROWTH = 1.6;
export const TRAIN_COST_RATE_FACTOR = 45;
export const TRAIN_COST_LEVEL_RAMP = 0.15;

// Promotion: at their tier's maxSkill cap a worker can be promoted to the
// next tier (keeping their skill level). Costs money and time, both scaling
// with the target tier (see docs/balance.md).
export const PROMOTE_COST_FACTOR = 0.6; // × target tier hireCost
export const PROMOTE_DURATION_BASE = 180;
export const PROMOTE_DURATION_GROWTH = 2; // ^ target tier index (1-based)

// Fast-forward: any timed action can be completed instantly for VsCoin,
// 1 VsCoin per started 10 minutes of remaining time. The first-ever
// fast-forward is free (offered during the tutorial's training step).
export const FASTFORWARD_SEC_PER_VSCOIN = 600;

// Company-tier cost scaling (docs/balance.md Phase S): capital costs
// (desks, hires, training, promotions, cash upgrades) and salaries scale
// with the owning company's league so a trillion-dollar tower never sells a
// $20 desk. The parity base is the site's income scale (outputBonus ×
// projectScale^(1 − PROJECT_WORK_SCALE_EXP)); the founding escalation
// (purchasePrice ÷ site list cost, i.e. COMPANY_COST_GROWTH^n) adds a mild
// premium on capital costs only — never on salaries, which are anchored to
// income so the debt spiral stays fair.
export const COMPANY_COST_SCALE_ESCALATION_EXP = 0.15;
export const COMPANY_SALARY_SCALE_ESCALATION_EXP = 0;

// Candidate reroll: base price scales with the company's cost scale at
// founding, then grows per reroll.
export const CANDIDATE_REROLL_BASE = 10;
export const CANDIDATE_REROLL_GROWTH = 1.5;

// Desk upgrades: raise a desk to the next workstation tier in place, for
// money (cheaper than the buy-new price gap) + time.
export const DESK_UPGRADE_COST_FACTOR = 0.8; // × (next.baseCost - current.baseCost)
export const DESK_UPGRADE_DURATION_BASE = 180;
export const DESK_UPGRADE_DURATION_GROWTH = 2; // ^ target workstation index

// Floor construction: floors are paid up front and built over time by a
// builder. Duration ramps with the floor being built and with the company's
// index in its country (later companies build slower — see balance.md).
export const FLOOR_BUILD_DURATION_BASE = 600; // 10 min — the cheapest floor
export const FLOOR_BUILD_FLOOR_GROWTH = 1.5; // ^ (floorIndex − 2)
export const FLOOR_BUILD_COMPANY_GROWTH = 1.15; // ^ company index in country

// Company founding: pay on start, the base office rises over time. Ramps
// with the companies already founded in the country; the country's first
// company (the garage) is instant (see balance.md).
export const COMPANY_BUILD_DURATION_BASE = 600;
export const COMPANY_BUILD_DURATION_GROWTH = 1.6; // ^ companies founded

// Builder pool ("Workers" in the UI, per country): every in-flight timed
// action occupies one builder. #1 is Gabriel's free gift; #2-#3 cost cash,
// #4-#5 VsCoin, #6+ an open-ended exponential VsCoin sink (see balance.md).
export const BUILDER_CASH_COSTS = [2_500, 250_000]; // builders #2, #3
export const BUILDER_VSCOIN_COSTS = [8, 15]; // builders #4, #5
export const BUILDER_VSCOIN_BASE = 12; // #6+: ceil(base × growth^(n-5))
export const BUILDER_VSCOIN_GROWTH = 1.8;

// Per-company soft cap: a project's reward stops growing at
// baseReward × site.projectScale × PROJECT_REWARD_CAP_MULT; work growth
// freezes with it (plateau, not decline) so a single company stalls and the
// next company becomes the way forward.
export const PROJECT_REWARD_CAP_MULT = 50;

// Debt: a country's wallet can go below zero when wages are due. Interest
// compounds inside tick(); past the crisis threshold employees resign one
// per interval until payroll is sustainable again. Debt is clamped so a
// long offline gap never becomes unrecoverable. See docs/balance.md.
export const DEBT_INTEREST_PER_SEC = 0.0002;
export const DEBT_CAP_SALARY_SEC = 3_600;
export const DEBT_CAP_MIN = 10_000;
export const DEBT_CRISIS_SALARY_SEC = 600;
export const DEBT_CRISIS_MIN = 500;
export const DEBT_QUIT_INTERVAL_SEC = 60;

// International expansion: further countries are bought with cash from the
// active country once International Business is unlocked (all city sites
// owned). Every unlocked country adds a global output bonus — the prestige
// incentive for starting fresh abroad.
export const COUNTRY_UNLOCK_BASE = 50_000_000_000_000;
export const COUNTRY_UNLOCK_GROWTH = 3;
export const WORLD_OUTPUT_PER_COUNTRY = 0.25;
export const COUNTRY_STARTING_MONEY = 50;
export const DEFAULT_COUNTRY: CountryId = 'us';

// Renaming a company always costs cash AND VsCoin, both escalating per
// rename; the first cash rename is at least the company's purchase price.
export const RENAME_CASH_MIN = 1_000;
export const RENAME_COST_GROWTH = 2;
export const RENAME_VSCOIN_BASE = 2;

// The tutorial's guaranteed first candidate (an affordable intern).
export const TUTORIAL_FIRST_HIRE_NAME = 'Steve Gates';

// Free simulation-speed toggle (live play only, offline stays wall-clock).
export const TIME_SCALES = [1, 2, 4];

// Gabriel's one-time seed-money gift, paid when the tutorial's upgrade step
// starts so a fresh player can afford their first upgrade right away.
export const TUTORIAL_ANGEL_GIFT = 250;

// VsCoin — the premium second currency. Earned only through gameplay for
// now (missions + story milestones); the grantVsCoin() ledger API is the
// future hook for real-money purchases (see docs/monetization.md).
export const VSCOIN_PER_STORY_BEAT = 2;
export const VSCOIN_LEDGER_CAP = 200;
// Premium boost sold for VsCoin in the Missions tab.
export const VSCOIN_BOOST_COST = 3;
export const VSCOIN_BOOST_MULT = 3;
export const VSCOIN_BOOST_DURATION_SEC = 3_600;
// Founder's Aura premium upgrade effect.
export const AURA_OUTPUT_PER_LEVEL = 0.25;

// Player avatar customization: number of options per look field. Must match
// the art option lists in src/ui/persona.ts (which clamp defensively).
// `portrait` selects the raster portrait card: 0 = the drawn look built
// from the other fields, 1..PLAYER_PORTRAIT_COUNT = public/portraits/
// player-NN image (see docs/portraits.md).
export const PLAYER_PORTRAIT_COUNT = 16;

export const PLAYER_LOOK_OPTIONS = {
  skin: 9,
  hair: 11,
  hairstyle: 8,
  eyeStyle: 3,
  mouthStyle: 4,
  facialHair: 4,
  outfit: 8,
  accessory: 6,
  portrait: PLAYER_PORTRAIT_COUNT + 1,
} as const;

export const DEFAULT_PLAYER_LOOK = {
  skin: 2,
  hair: 1,
  hairstyle: 1,
  eyeStyle: 0,
  mouthStyle: 0,
  facialHair: 0,
  outfit: 0,
  accessory: 0,
  portrait: 0,
} as const;

// Marketing campaign: a purchasable output boost — the money sink twin of
// the ad/IAP boosts. Cost is ~MARKETING_COST_SEC seconds of current gross
// income, for MARKETING_DURATION_SEC seconds of MARKETING_MULT x output.
export const MARKETING_MULT = 2;
export const MARKETING_DURATION_SEC = 600;
export const MARKETING_COST_SEC = 300;
export const MARKETING_MIN_COST = 500;

// Company progression difficulty: buying your Nth company multiplies the
// site's list price by COMPANY_COST_GROWTH^(N-2) (the 2nd company costs list
// price, the 3rd costs list * growth, ...). Combined with the site ladder
// this makes every additional company a real long-term goal (~1 week of
// active play to afford the final Orbital HQ).
export const COMPANY_COST_GROWTH = 2.2;

// Later sites run bigger contracts: reward & unlock cost scale linearly with
// site.projectScale while required work grows with this sub-linear exponent,
// so each site tier roughly doubles the $/work of the previous one.
export const PROJECT_WORK_SCALE_EXP = 0.5;

// Company-count upgrade effects (see UPGRADES entries with requiresCompanies).
export const SYNERGY_OUTPUT_PER_COMPANY = 0.04; // per level, per owned company
export const MENTORSHIP_SPEED_FACTOR = 0.85; // training duration mult per level
export const TALENT_HIRE_DISCOUNT = 0.1; // hire cost reduction per level
export const MOONSHOT_OUTPUT_PER_LEVEL = 0.5;

// Buildings: every company building starts with 1 floor; each floor holds
// FLOOR_CAPACITY desks. floor cost = base * site.floorCostFactor * growth^(floors-1)
export const FLOOR_CAPACITY = 4;
export const MAX_FLOORS = 8;
export const FLOOR_BASE_COST = 400;
export const FLOOR_COST_GROWTH = 6;

export const SPECIALIZATIONS: Specialization[] = [
  'Frontend',
  'Backend',
  'DevOps',
  'Data Science',
];

export const WORKER_TIERS: WorkerTierDef[] = [
  { id: 'intern', title: 'Intern', baseRate: 0.5, salary: 0.05, hireCost: 25, maxSkill: 10, emoji: '🎓' },
  { id: 'junior', title: 'Junior Dev', baseRate: 1, salary: 0.15, hireCost: 100, maxSkill: 20, emoji: '🧑‍💻' },
  { id: 'mid', title: 'Mid-level Dev', baseRate: 2.5, salary: 0.5, hireCost: 500, maxSkill: 35, emoji: '👨‍💻' },
  { id: 'senior', title: 'Senior Dev', baseRate: 5, salary: 1.2, hireCost: 2_500, maxSkill: 55, emoji: '🧙' },
  { id: 'architect', title: 'Architect', baseRate: 20, salary: 6, hireCost: 15_000, maxSkill: 75, emoji: '🏛️' },
  { id: 'principal', title: 'Principal Engineer', baseRate: 50, salary: 18, hireCost: 80_000, maxSkill: 100, emoji: '🚀' },
];

/**
 * Playable countries. Mechanically identical economies (for now — see
 * docs/balance.md before adding modifiers); each brings its own city map
 * theme (src/ui/cityMap.ts) and parody-company name pool. Display names
 * live in i18n (`country.<id>.name`); parody names are proper nouns and
 * stay untranslated.
 */
export const COUNTRIES: CountryDef[] = [
  {
    id: 'ch',
    emoji: '🇨🇭',
    parodyCompanyNames: ['Nestlay', 'Novartiz', 'Rosche', 'UBX', 'Swotch', 'Lindtz', 'Logitek', 'Victorinix'],
  },
  {
    id: 'us',
    emoji: '🇺🇸',
    parodyCompanyNames: ['MicroHard', 'Gogol', 'Appel', 'Amazoom', 'Facelook', 'Netflicks', 'Teslo', 'Orbacle'],
  },
  {
    id: 'ca',
    emoji: '🇨🇦',
    parodyCompanyNames: ['Shopifly', 'Blueberry Mobile', 'Bombardeer', 'Lulumelon', 'Tim Hortoons', 'Nortell', 'MapleSoftworks', 'Moose Compute'],
  },
  {
    id: 'it',
    emoji: '🇮🇹',
    parodyCompanyNames: ['Lamborghetti', 'Ferrucci Motors', 'Fiatello', 'Olivettino', 'Espressoft', 'Barilotto', 'Moda Prima', 'Vespucci Scooters'],
  },
  {
    id: 'fr',
    emoji: '🇫🇷',
    parodyCompanyNames: ['Renoh', 'Pigeot', 'Airbousse', 'Loui Filton', 'Ubisoif', 'Clémentine Télécom', 'Dadone', 'Michelout'],
  },
  {
    id: 'de',
    emoji: '🇩🇪',
    parodyCompanyNames: ['Folkswagen', 'BMVau', 'Siemensch', 'ZAP Software', 'Abibas', 'Borsch Tools', 'Sternwagen', 'Waldi Markt'],
  },
  {
    id: 'sa',
    emoji: '🇸🇦',
    parodyCompanyNames: ['Aramgo', 'SandBIC', 'Oasis Telecom', 'Almirage', 'Neoom', 'Flynada', 'Desert Rose Digital', 'Falcon Compute'],
  },
  {
    id: 'cn',
    emoji: '🇨🇳',
    parodyCompanyNames: ['Alibubba', 'Tensent', 'Baidou', 'Huaway', 'Xiaomeow', 'ByteDanze', 'Lenovah', 'Pandragon'],
  },
];

export function countryDefById(id: string): CountryDef {
  const c = COUNTRIES.find((c) => c.id === id);
  if (!c) throw new Error(`Unknown country: ${id}`);
  return c;
}

export const WORKSTATIONS: WorkstationDef[] = [
  { id: 'basic', name: 'Basic Desk', multiplier: 1, baseCost: 20, costGrowth: 1.18, emoji: '🪑' },
  { id: 'standing', name: 'Standing Desk', multiplier: 1.25, baseCost: 250, costGrowth: 1.18, emoji: '🦵' },
  { id: 'dual', name: 'Dual-Monitor Rig', multiplier: 1.6, baseCost: 2_000, costGrowth: 1.2, emoji: '🖥️' },
  { id: 'corner', name: 'Corner Office', multiplier: 2.2, baseCost: 20_000, costGrowth: 1.22, emoji: '🏙️' },
];

/**
 * Map locations. Buying a site founds a new, independent company there.
 * One company per site; the Garage is where every player starts for free.
 * outputBonus rewards later, pricier sites so a fresh company can catch up.
 */
export const COMPANY_SITES: CompanySiteDef[] = [
  { id: 'garage', name: 'The Garage', cost: 0, outputBonus: 1, floorCostFactor: 1, projectScale: 1, emoji: '🏚️', blurb: 'Every empire starts between a lawnmower and a surfboard.' },
  { id: 'loft', name: 'SoMa Loft', cost: 200_000, outputBonus: 1.1, floorCostFactor: 5, projectScale: 4, favoredSpec: 'Frontend', emoji: '🏬', blurb: 'Exposed brick, cold brew on tap, rent that hurts.' },
  { id: 'paloalto', name: 'Palo Alto Office', cost: 3_000_000, outputBonus: 1.25, floorCostFactor: 25, projectScale: 16, favoredSpec: 'Backend', emoji: '🏢', blurb: 'Walking distance from three VC firms and a Nobel laureate.' },
  { id: 'campus', name: 'Mountain View Campus', cost: 40_000_000, outputBonus: 1.5, floorCostFactor: 125, projectScale: 64, favoredSpec: 'Data Science', emoji: '🏛️', blurb: 'Free lunches, nap pods, and a climbing wall nobody uses.' },
  { id: 'tower', name: 'SF Skyline Tower', cost: 500_000_000, outputBonus: 2, floorCostFactor: 625, projectScale: 256, favoredSpec: 'Frontend', emoji: '🌆', blurb: 'Your logo, visible from two bridges.' },
  { id: 'seattle', name: 'Seattle Cloud Campus', cost: 6_000_000_000, outputBonus: 2.5, floorCostFactor: 3_125, projectScale: 1_024, favoredSpec: 'DevOps', emoji: '🌲', blurb: 'Rain outside, servers inside, espresso everywhere.' },
  { id: 'nyc', name: 'NYC Flatiron Hub', cost: 75_000_000_000, outputBonus: 3, floorCostFactor: 15_625, projectScale: 4_096, favoredSpec: 'Backend', emoji: '🗽', blurb: 'Wall Street money meets your changelog.' },
  { id: 'orbital', name: 'Orbital HQ', cost: 1_000_000_000_000, outputBonus: 4, floorCostFactor: 78_125, projectScale: 16_384, favoredSpec: 'Data Science', emoji: '🛰️', blurb: 'Zero gravity, zero distractions — the lab your dream deserves.' },
];

export const PROJECTS: ProjectDef[] = [
  { id: 'landing', name: 'Landing Page Refresh', specialization: 'Frontend', baseWork: 30, baseReward: 15, unlockCost: 0, workGrowth: 1.13, rewardGrowth: 1.1, emoji: '🎨' },
  { id: 'todo', name: 'To-Do App MVP', specialization: 'Frontend', baseWork: 120, baseReward: 70, unlockCost: 75, workGrowth: 1.13, rewardGrowth: 1.1, emoji: '📝' },
  { id: 'api', name: 'REST API Gateway', specialization: 'Backend', baseWork: 450, baseReward: 300, unlockCost: 400, workGrowth: 1.14, rewardGrowth: 1.1, emoji: '🔌' },
  { id: 'payments', name: 'Payments Integration', specialization: 'Backend', baseWork: 1_500, baseReward: 1_100, unlockCost: 1_500, workGrowth: 1.14, rewardGrowth: 1.1, emoji: '💳' },
  { id: 'ci', name: 'CI/CD Pipeline', specialization: 'DevOps', baseWork: 5_000, baseReward: 4_000, unlockCost: 6_000, workGrowth: 1.14, rewardGrowth: 1.1, emoji: '🔁' },
  { id: 'search', name: 'Search Engine v2', specialization: 'Backend', baseWork: 16_000, baseReward: 14_000, unlockCost: 20_000, workGrowth: 1.15, rewardGrowth: 1.1, emoji: '🔍' },
  { id: 'feed', name: 'Social Feed Algorithm', specialization: 'Data Science', baseWork: 50_000, baseReward: 48_000, unlockCost: 70_000, workGrowth: 1.15, rewardGrowth: 1.1, emoji: '📱' },
  { id: 'autoscale', name: 'Cloud Auto-Scaling', specialization: 'DevOps', baseWork: 160_000, baseReward: 165_000, unlockCost: 250_000, workGrowth: 1.15, rewardGrowth: 1.1, emoji: '☁️' },
  { id: 'recsys', name: 'AI Recommendation Engine', specialization: 'Data Science', baseWork: 500_000, baseReward: 560_000, unlockCost: 900_000, workGrowth: 1.15, rewardGrowth: 1.1, emoji: '🤖' },
  { id: 'wallet', name: 'Crypto Wallet Platform', specialization: 'Backend', baseWork: 1_600_000, baseReward: 1_950_000, unlockCost: 3_000_000, workGrowth: 1.16, rewardGrowth: 1.1, emoji: '🪙' },
  { id: 'metaverse', name: 'Metaverse Office Suite', specialization: 'Frontend', baseWork: 5_000_000, baseReward: 6_600_000, unlockCost: 10_000_000, workGrowth: 1.16, rewardGrowth: 1.1, emoji: '🕶️' },
  { id: 'agi', name: 'AGI Research Lab', specialization: 'Data Science', baseWork: 16_000_000, baseReward: 23_000_000, unlockCost: 40_000_000, workGrowth: 1.17, rewardGrowth: 1.1, emoji: '🧠' },
];

/**
 * Office wallpapers (pure cosmetics, one purchase unlocks them everywhere).
 * Applied per company; the player also picks a global default.
 */
export const WALLPAPERS: WallpaperDef[] = [
  { id: 'concrete', name: 'Bare Concrete', cost: 0, emoji: '🧱', css: 'linear-gradient(180deg, #1b2331, #151b26)' },
  { id: 'startup', name: 'Startup White', cost: 5_000, emoji: '⬜', css: 'linear-gradient(180deg, #2a3446, #1d2534)' },
  { id: 'jungle', name: 'Urban Jungle', cost: 30_000, emoji: '🪴', css: 'linear-gradient(160deg, #14301f, #10231a)' },
  { id: 'sunset', name: 'Sunset Loft', cost: 150_000, emoji: '🌇', css: 'linear-gradient(160deg, #3b1d33, #241423)' },
  { id: 'neon', name: 'Neon Arcade', cost: 1_000_000, emoji: '🕹️', css: 'linear-gradient(160deg, #1a1038, #2a0f2e)' },
  { id: 'zen', name: 'Zen Garden', cost: 5_000_000, emoji: '🎋', css: 'linear-gradient(160deg, #1e2b23, #26221a)' },
  { id: 'gold', name: 'Gold Executive', cost: 50_000_000, emoji: '🏆', css: 'linear-gradient(160deg, #33270e, #241a08)' },
  { id: 'diamond', name: 'Diamond Penthouse', cost: 0, vsCoinCost: 8, emoji: '💎', css: 'linear-gradient(160deg, #14273a, #1d1a38)' },
];

/** Looks for the map screen (player-level, purchasable). */
export const MAP_THEMES: MapThemeDef[] = [
  { id: 'daylight', name: 'Daylight Valley', cost: 0, emoji: '☀️', css: 'linear-gradient(180deg, #16202e, #131a25)' },
  { id: 'dusk', name: 'Dusk Drive', cost: 100_000, emoji: '🌆', css: 'linear-gradient(180deg, #251a2e, #171220)' },
  { id: 'satellite', name: 'Satellite View', cost: 2_000_000, emoji: '🛰️', css: 'linear-gradient(180deg, #0d1a14, #0b131c)' },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'coffee',
    name: 'Espresso Machine',
    description: '+10% output from all workers per level',
    baseCost: 200,
    costGrowth: 2.4,
    maxLevel: 25,
    emoji: '☕',
  },
  {
    id: 'fiber',
    name: 'Fiber Internet',
    description: '+15% output from all workers per level',
    baseCost: 1_500,
    costGrowth: 3,
    maxLevel: 15,
    emoji: '🌐',
  },
  {
    id: 'agile',
    name: 'Agile Coaching',
    description: 'Workers gain experience 25% faster per level',
    baseCost: 800,
    costGrowth: 2.6,
    maxLevel: 12,
    emoji: '🏃',
  },
  {
    id: 'hr',
    name: 'HR Department',
    description: 'Salaries cost 6% less per level',
    baseCost: 2_500,
    costGrowth: 2.8,
    maxLevel: 8,
    emoji: '🧾',
  },
  {
    id: 'chairs',
    name: 'Ergonomic Chairs',
    description: 'Workstation bonuses are 10% stronger per level',
    baseCost: 5_000,
    costGrowth: 3,
    maxLevel: 10,
    emoji: '💺',
  },
  // --- Company-count unlocks: long-term goals for the multi-company game ---
  {
    id: 'synergy',
    name: 'Holding Synergy',
    description: '+4% output per company you own, per level',
    baseCost: 50_000,
    costGrowth: 3,
    maxLevel: 10,
    emoji: '🤝',
    requiresCompanies: 2,
  },
  {
    id: 'mentorship',
    name: 'Mentorship Program',
    description: 'Training programs finish 15% faster per level',
    baseCost: 250_000,
    costGrowth: 3,
    maxLevel: 5,
    emoji: '🧑‍🏫',
    requiresCompanies: 3,
  },
  {
    id: 'talent',
    name: 'Talent Network',
    description: 'Hiring costs 10% less per level',
    baseCost: 5_000_000,
    costGrowth: 3,
    maxLevel: 6,
    emoji: '🧲',
    requiresCompanies: 5,
  },
  {
    id: 'moonshot',
    name: 'Moonshot Lab',
    description: '+50% output from all workers per level',
    baseCost: 250_000_000,
    costGrowth: 4,
    maxLevel: 5,
    emoji: '🌙',
    requiresCompanies: 7,
  },
  // --- Premium (VsCoin) upgrade: exclusive, gameplay-earned currency ------
  {
    id: 'aura',
    name: "Founder's Aura",
    description: '+25% output from all workers per level',
    baseCost: 0,
    costGrowth: 2,
    maxLevel: 4,
    emoji: '💎',
    vsCoinCost: 2,
  },
];

/**
 * Missions: concrete objectives rewarding VsCoin. Grouped in chains per
 * metric; the UI shows the first unclaimed mission of each chain. Progress
 * is always derived from durable state counters — no extra bookkeeping.
 */
// Random events (docs/balance.md Phase E): live opportunity dialogs with a
// real trade-off, rolled by the UI layer on a wall-clock cadence (briefcase
// pattern — never during offline simulation) and resolved through engine
// actions. Cash amounts are minutes of gross income at roll time (negative =
// an upfront price), |cash| floored at cashFloor.
export interface RandomEventDef {
  id: string;
  emoji: string;
  weight: number;
  /** Minutes of gross income granted (+) or charged (−) on accept. */
  cashMinutes: number;
  /** Floor on |cash| so fresh economies still feel the stakes. */
  cashFloor: number;
  /** Output multiplier while active (1 = none). */
  mult: number;
  /** Salary multiplier while active (1 = none — the trade-off lever). */
  salaryMult: number;
  durationSec: number;
}
export const RANDOM_EVENTS: RandomEventDef[] = [
  { id: 'investor-offer', emoji: '💼', weight: 3, cashMinutes: 30, cashFloor: 1_000, mult: 1, salaryMult: 2, durationSec: 600 },
  { id: 'press-coverage', emoji: '📰', weight: 3, cashMinutes: -5, cashFloor: 250, mult: 2, salaryMult: 1, durationSec: 240 },
  { id: 'crunch-pizza', emoji: '🍕', weight: 2, cashMinutes: -2, cashFloor: 100, mult: 1.5, salaryMult: 1.5, durationSec: 600 },
  { id: 'conference-keynote', emoji: '🎤', weight: 2, cashMinutes: -10, cashFloor: 500, mult: 2.5, salaryMult: 1, durationSec: 180 },
];
/** Events stay quiet until the player has an economy worth trading with. */
export const EVENT_MIN_EARNED = 5_000;
/** UI scheduler window between offers (seconds). */
export const EVENT_INTERVAL_MIN_SEC = 360;
export const EVENT_INTERVAL_MAX_SEC = 660;

// Viral moments (docs/balance.md Phase B): presence-gated bonus clickables
// (the golden-cookie analog). The UI spawns them on a wall-clock cadence —
// online-only BY DESIGN, offline sim never compensates. Cash is minutes of
// gross income; a small jackpot chance pays 1 VsCoin, capped per UTC day so
// realized VsCoin (~0.6-0.8/day) stays below the daily contracts' 2.5-3.5.
export const VIRAL_MIN_EARNED = 5_000;
export const VIRAL_MIN_INTERVAL_SEC = 480;
export const VIRAL_MAX_INTERVAL_SEC = 900;
export const VIRAL_LIFETIME_SEC = 18;
export const VIRAL_REWARD_MINUTES = 3;
export const VIRAL_REWARD_FLOOR = 250;
export const VIRAL_JACKPOT_CHANCE = 0.08;
export const VIRAL_JACKPOT_VSCOIN = 1;
export const VIRAL_JACKPOT_DAILY_CAP = 2;

// Office pets: zero-power VsCoin cosmetics (the cosmetic-first premium
// catalog). Bought once globally, then picked per company; the active pet
// wanders the ground floor. Deliberately no gameplay effect.
export interface PetDef {
  id: string;
  name: string;
  emoji: string;
  vsCoinCost: number;
}
export const PETS: PetDef[] = [
  { id: 'cat', name: 'Office Cat', emoji: '🐈', vsCoinCost: 4 },
  { id: 'corgi', name: 'Standup Corgi', emoji: '🐕', vsCoinCost: 4 },
  { id: 'duck', name: 'Rubber-Duck Debugger', emoji: '🦆', vsCoinCost: 6 },
  { id: 'trex', name: 'Legacy T-Rex', emoji: '🦖', vsCoinCost: 10 },
];
export function petById(id: string): PetDef {
  const p = PETS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown pet: ${id}`);
  return p;
}

// Earned automation (docs/balance.md Phase A): auto-restart training,
// auto-hire and auto-buy desks unlock at account-level milestone counters
// (or a VsCoin early-unlock — convenience-speed, not power), then toggle
// per company, default OFF. The pass runs inside tick() on a fixed cadence
// so offline simulation automates identically. Promotions are deliberately
// never automated (grade changes stay a player decision).
export type AutomationKind = 'train' | 'hire' | 'desks';
export const AUTOMATION_CHECK_INTERVAL_SEC = 5;
export const AUTO_TRAIN_UNLOCK_TRAININGS = 25;
export const AUTO_HIRE_UNLOCK_HIRES = 40;
export const AUTO_DESK_UNLOCK_DESKS = 75;
export const AUTOMATION_VSCOIN_COSTS: Record<AutomationKind, number> = {
  train: 6,
  hire: 8,
  desks: 10,
};
/** Auto-hire only fires when cash covers this much of the hire's salary. */
export const AUTO_HIRE_SALARY_COVER_SEC = 1_800;
/** Auto-desks only buys desks that pay for themselves within this time. */
export const AUTO_DESK_PAYBACK_MAX_SEC = 1_800;
/** Automation never spends below cost × this reserve (debt protection). */
export const AUTO_CASH_RESERVE_FACTOR = 2;
/** Builders automation must leave free for manual actions. */
export const AUTO_BUILDER_RESERVE = 1;

// Recruiters (docs/balance.md Phase R): per-company recruiting capacity.
// Each level widens the candidate pool to 3 + level (max 8) and delivers a
// fresh candidate every RECRUITER_INTERVAL_SEC / level. Priced off
// companyCostScale so it matters at 50+ employee scale and is irrelevant
// early.
export const RECRUITER_BASE_COST = 50_000;
export const RECRUITER_COST_GROWTH = 3;
export const RECRUITER_MAX_LEVEL = 5;
export const RECRUITER_INTERVAL_SEC = 600;

// Market-scouting expeditions (docs/balance.md Phase X): a timed action
// that must precede every country unlock — expansion becomes an authored
// chapter opening. Costs a small fraction of the unlock price, occupies a
// builder, and the returned market report grants a permanent output bonus
// per scouted market (surviving prestige — knowledge outlives the exit).
export const EXPEDITION_COST_FRACTION = 0.02;
export const EXPEDITION_DURATION_BASE_SEC = 14_400; // 4 h for the first
export const EXPEDITION_DURATION_GROWTH = 1.3; // ^ (countries owned − 1)
export const EXPEDITION_OUTPUT_BONUS = 0.05;

// Ownership milestones (docs/balance.md Phase M): stepped per-company
// output bonuses at desk/headcount counts, turning the soft-cap decay into
// a goal staircase. Steps map onto the floor ladder (fill floor 2 / half
// tower / full house — the 8×4 building caps both counts at 32). Bonuses
// are additive within a track; the desks and workers tracks multiply.
export const COMPANY_MILESTONE_STEPS = [8, 16, 32];
export const COMPANY_MILESTONE_BONUS = [0.05, 0.1, 0.15];

// Market seasons (docs/balance.md Phase K): a deterministic quarterly cycle
// derived from playTimeSec inside tick() — no state, no randomness,
// offline-exact. Boom favors one specialization per cycle (rotating), and
// the cycle mean is exactly 1.0 at a ¼ spec share so long-run pacing (and
// the Phase H guards) stay anchored.
export const SEASON_LENGTH_SEC = 21_600; // 6 h per season, 24 h per cycle
export const SEASON_ORDER = ['stable', 'boom', 'crunch', 'recovery'] as const;
export const SEASON_BOOM_SPEC_MULT = 1.6; // boom, favored spec only
export const SEASON_CRUNCH_MULT = 0.8;
export const SEASON_RECOVERY_MULT = 1.05;

// Piggy vault (docs/balance.md Phase V): VAULT_RATE of every project payout
// accrues ON TOP into a global vault (a bonus pool, not a tax — skimming
// from payouts would silently distort income, missions and the balance
// phases). Capped at VAULT_CAP_MINUTES of gross income (floor
// VAULT_CAP_MIN), opened for VAULT_OPEN_COST VsCoin into the active wallet.
export const VAULT_RATE = 0.05;
export const VAULT_CAP_MINUTES = 120;
export const VAULT_CAP_MIN = 10_000;
export const VAULT_OPEN_COST = 5;

// Worker traits (docs/balance.md Phase T): rolled once at candidate
// creation via the injectable rand. TRAIT_CHANCE of candidates carry one
// trait; RARE_TRAIT_CHANCE additionally roll a second one and present as
// "rare" (golden card). Multipliers are 1 = neutral and deliberately mild —
// the point is hiring excitement, not a new growth axis: the expected
// output bonus across all candidates is ≈ +5%.
export interface TraitDef {
  id: string;
  emoji: string;
  /** Output multiplier on workerRate. */
  output: number;
  /** Salary multiplier on top of tierSalary. */
  salary: number;
  /** XP-gain multiplier. */
  xp: number;
  /** Relative draw weight within the pool. */
  weight: number;
}
export const TRAITS: TraitDef[] = [
  { id: 'night-owl', emoji: '🦉', output: 1.15, salary: 1, xp: 1, weight: 3 },
  { id: 'coffee-addict', emoji: '☕', output: 1.25, salary: 1.1, xp: 1, weight: 3 },
  { id: 'quick-study', emoji: '📚', output: 1, salary: 1, xp: 1.5, weight: 3 },
  { id: 'frugal', emoji: '🧾', output: 1, salary: 0.85, xp: 1, weight: 3 },
  { id: 'perfectionist', emoji: '🔍', output: 1.1, salary: 1, xp: 0.85, weight: 2 },
  { id: 'rockstar', emoji: '🎸', output: 1.4, salary: 1.25, xp: 1, weight: 1 },
];
export const TRAIT_CHANCE = 0.35;
export const RARE_TRAIT_CHANCE = 0.06;
export function traitById(id: string): TraitDef {
  const t = TRAITS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown trait: ${id}`);
  return t;
}

// Daily contracts: 3 delta-progress missions rolled per UTC day from this
// pool, seeded by the day number (docs/balance.md Phase D). totalEarned's
// target is dynamic — DAILY_EARN_MINUTES of gross income at roll time.
export const DAILY_CONTRACTS_PER_DAY = 3;
export const DAILY_EARN_MINUTES = 30;
export const DAILY_EARN_FLOOR = 500;
export interface DailyContractPoolEntry {
  metric: MissionMetric;
  /** Fixed delta target; 0 = dynamic (totalEarned uses DAILY_EARN_MINUTES). */
  target: number;
  reward: number;
  emoji: string;
}
export const DAILY_CONTRACT_POOL: DailyContractPoolEntry[] = [
  { metric: 'projectsCompleted', target: 15, reward: 1, emoji: '📦' },
  { metric: 'totalEarned', target: 0, reward: 2, emoji: '💰' },
  { metric: 'workers', target: 2, reward: 1, emoji: '🤝' },
  { metric: 'desks', target: 3, reward: 1, emoji: '🖥️' },
  { metric: 'upgradeLevels', target: 4, reward: 1, emoji: '⚙️' },
  { metric: 'promotions', target: 1, reward: 2, emoji: '🎖️' },
];

export const MISSIONS: MissionDef[] = [
  { id: 'ship-10', metric: 'projectsCompleted', target: 10, reward: 1, emoji: '📦' },
  { id: 'ship-100', metric: 'projectsCompleted', target: 100, reward: 2, emoji: '📦' },
  { id: 'ship-1000', metric: 'projectsCompleted', target: 1_000, reward: 4, emoji: '📦' },
  { id: 'ship-10000', metric: 'projectsCompleted', target: 10_000, reward: 8, emoji: '📦' },
  { id: 'earn-1k', metric: 'totalEarned', target: 1_000, reward: 1, emoji: '💰' },
  { id: 'earn-100k', metric: 'totalEarned', target: 100_000, reward: 2, emoji: '💰' },
  { id: 'earn-10m', metric: 'totalEarned', target: 10_000_000, reward: 4, emoji: '💰' },
  { id: 'earn-1b', metric: 'totalEarned', target: 1_000_000_000, reward: 6, emoji: '💰' },
  { id: 'earn-100b', metric: 'totalEarned', target: 100_000_000_000, reward: 10, emoji: '💰' },
  { id: 'team-3', metric: 'workers', target: 3, reward: 1, emoji: '🧑‍💻' },
  { id: 'team-5', metric: 'workers', target: 5, reward: 2, emoji: '🧑‍💻' },
  { id: 'team-12', metric: 'workers', target: 12, reward: 3, emoji: '🧑‍💻' },
  { id: 'team-30', metric: 'workers', target: 30, reward: 6, emoji: '🧑‍💻' },
  { id: 'company-2', metric: 'companies', target: 2, reward: 2, emoji: '🏬' },
  { id: 'company-3', metric: 'companies', target: 3, reward: 3, emoji: '🏢' },
  { id: 'company-5', metric: 'companies', target: 5, reward: 5, emoji: '🌆' },
  { id: 'company-8', metric: 'companies', target: 8, reward: 12, emoji: '🛰️' },
  { id: 'upgrade-5', metric: 'upgradeLevels', target: 5, reward: 1, emoji: '⚙️' },
  { id: 'upgrade-20', metric: 'upgradeLevels', target: 20, reward: 3, emoji: '⚙️' },
  { id: 'upgrade-50', metric: 'upgradeLevels', target: 50, reward: 6, emoji: '⚙️' },
  { id: 'desk-8', metric: 'desks', target: 8, reward: 1, emoji: '🪑' },
  { id: 'desk-20', metric: 'desks', target: 20, reward: 3, emoji: '🪑' },
  { id: 'desk-48', metric: 'desks', target: 48, reward: 6, emoji: '🪑' },
  { id: 'promote-1', metric: 'promotions', target: 1, reward: 2, emoji: '🎖️' },
  { id: 'promote-5', metric: 'promotions', target: 5, reward: 4, emoji: '🎖️' },
  { id: 'promote-15', metric: 'promotions', target: 15, reward: 8, emoji: '🎖️' },
  { id: 'builders-2', metric: 'builders', target: 2, reward: 2, emoji: '👷' },
  { id: 'builders-3', metric: 'builders', target: 3, reward: 3, emoji: '👷' },
  { id: 'builders-5', metric: 'builders', target: 5, reward: 6, emoji: '🏗️' },
  { id: 'country-2', metric: 'countries', target: 2, reward: 10, emoji: '🌍' },
  { id: 'country-4', metric: 'countries', target: 4, reward: 20, emoji: '🌍' },
  { id: 'country-8', metric: 'countries', target: 8, reward: 40, emoji: '🌍' },
];

export function missionById(id: string): MissionDef {
  const m = MISSIONS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown mission: ${id}`);
  return m;
}

export const FIRST_NAMES = [
  'Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Elon', 'Sundar', 'Satya',
  'Marissa', 'Sheryl', 'Jack', 'Evan', 'Brian', 'Drew', 'Melanie', 'Sam',
  'Dario', 'Jensen', 'Lisa', 'Tim', 'Susan', 'Reid', 'Peter', 'Max',
];

export const LAST_NAMES = [
  'Lovelace', 'Torvalds', 'Hopper', 'Turing', 'Hamilton', 'Nakamoto',
  'Chen', 'Patel', 'Kim', 'Garcia', 'Müller', 'Rossi', 'Dubois', 'Silva',
  'Novak', 'Ivanov', 'Tanaka', 'Okafor', 'Berg', 'Costa', 'Haber', 'Wu',
];

// Shop: VsCoin → cash "funding rounds". Grant = max(floorCash,
// grossRewardRate × 60 × minutes); requiresCompanies (in the active
// country) is the anti-trivialization gate — a pack can never pre-pay the
// milestone it would skip (see balance.md Phase W).
export const SHOP_CASH_PACKS: ShopCashPackDef[] = [
  { id: 'seed', emoji: '🌱', minutes: 5, floorCash: 1_000, vsCoin: 4, requiresCompanies: 1 },
  { id: 'series-a', emoji: '💼', minutes: 15, floorCash: 10_000, vsCoin: 10, requiresCompanies: 2 },
  { id: 'series-b', emoji: '🏦', minutes: 40, floorCash: 100_000, vsCoin: 20, requiresCompanies: 3 },
  { id: 'series-c', emoji: '🏛️', minutes: 100, floorCash: 1_000_000, vsCoin: 40, requiresCompanies: 5 },
  { id: 'ipo', emoji: '🔔', minutes: 240, floorCash: 10_000_000, vsCoin: 75, requiresCompanies: 7 },
];

// VsCoin acquisition SKUs (IAP-shaped, payment-provider-ready ids). While
// BETA_FREE_IAP is true the starter pack is free and unlimited (we want
// sink telemetry, and the beta reset policy wipes hoards before 1.0);
// larger packs render disabled. Flipping the flag converts the tab to real
// SKUs: grants then move from source 'shop:<sku>' to 'iap:<sku>'
// (docs/monetization.md, Phase 3).
export const BETA_FREE_IAP = true;

// While true, every deploy force-refreshes running clients: the service
// worker re-checks for updates aggressively (interval + on focus) and the
// page saves + reloads the moment a new version takes control (src/main.ts).
// Flip to false before testing with real users so sessions are never
// interrupted by a mid-play reload (docs/decisions.md #17).
export const BETA_FORCE_REFRESH = true;

// Offline earnings doubler ("Gabriel's blessing"): the Welcome-back modal
// offers a free ×2 on the earnings just simulated, at most once per
// cooldown window. Free while in beta — the button doubles as the future
// rewarded-ad placement (docs/monetization.md), so the habit loop and the
// placement get measured before any SDK exists. 20 h keeps a forgiving
// daily cadence (a "daily" that drifts later never gets lost).
export const OFFLINE_DOUBLER_COOLDOWN_SEC = 20 * 3600;
export const VSCOIN_PACKS: VsCoinPackDef[] = [
  { id: 'vsc-starter', emoji: '☕', coins: 20 }, // future CHF 2.00
  { id: 'vsc-angel', emoji: '😇', coins: 50 }, // future CHF 4.00
  { id: 'vsc-venture', emoji: '💎', coins: 150 }, // future CHF 9.00
  { id: 'vsc-growth', emoji: '📈', coins: 400 }, // future CHF 19.00
  { id: 'vsc-unicorn', emoji: '🦄', coins: 1000 }, // future CHF 39.00
];

export function vsCoinPackById(id: string): VsCoinPackDef {
  const p = VSCOIN_PACKS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown VsCoin pack: ${id}`);
  return p;
}

export function shopPackById(id: string): ShopCashPackDef {
  const p = SHOP_CASH_PACKS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown shop pack: ${id}`);
  return p;
}

export function tierById(id: string): WorkerTierDef {
  const t = WORKER_TIERS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown worker tier: ${id}`);
  return t;
}

export function stationDefById(id: string): WorkstationDef {
  const s = WORKSTATIONS.find((s) => s.id === id);
  if (!s) throw new Error(`Unknown workstation: ${id}`);
  return s;
}

export function wallpaperById(id: string): WallpaperDef {
  const w = WALLPAPERS.find((w) => w.id === id);
  if (!w) throw new Error(`Unknown wallpaper: ${id}`);
  return w;
}

export function mapThemeById(id: string): MapThemeDef {
  const t = MAP_THEMES.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown map theme: ${id}`);
  return t;
}

// ---------------------------------------------------------------------------
// Prestige — "IPO & open-source the dream" (docs/balance.md, Phase P).
// totalRep(E) = E <= MIN ? 0 : floor(POINTS_PER_DECADE * log10(E / MIN)) on
// the never-reset all-time earnings; award = totalRep(E) - reputation (delta
// form, so preview and grant can never disagree and fractional decades carry
// over). Output mult = 1 + K * reputation^ALPHA.
// ---------------------------------------------------------------------------

export const PRESTIGE_MIN_LIFETIME = 100_000_000_000_000; // 1e14 — log anchor & hard floor
export const PRESTIGE_POINTS_PER_DECADE = 10; // rep per ×10 of all-time earnings
export const PRESTIGE_OUTPUT_K = 0.5;
export const PRESTIGE_OUTPUT_ALPHA = 0.5; // sqrt — heavy diminishing returns
export const PRESTIGE_STORY_BEAT = 'dream-achieved'; // epilogue gate (story-seen survives prestige)

export function siteById(id: string): CompanySiteDef {
  const s = COMPANY_SITES.find((s) => s.id === id);
  if (!s) throw new Error(`Unknown company site: ${id}`);
  return s;
}

export function projectDefById(id: string): ProjectDef {
  const p = PROJECTS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown project: ${id}`);
  return p;
}

export function upgradeDefById(id: string): UpgradeDef {
  const u = UPGRADES.find((u) => u.id === id);
  if (!u) throw new Error(`Unknown upgrade: ${id}`);
  return u;
}
