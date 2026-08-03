import type {
  CompanySiteDef,
  CountryDef,
  CountryId,
  MapThemeDef,
  MissionDef,
  ProjectDef,
  Specialization,
  UpgradeDef,
  WallpaperDef,
  WorkerTierDef,
  WorkstationDef,
} from './types';

export const SPEC_MATCH_BONUS = 1.5;
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

// Multi-project slots: slot k+1 unlocks once the building has
// PROJECT_SLOT_FLOOR_REQ[k-1] floors, for PROJECT_SLOT_COSTS[k-1] × projectScale.
export const PROJECT_SLOT_FLOOR_REQ = [4, 8];
export const PROJECT_SLOT_COSTS = [25_000, 250_000];

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
  { id: 'loft', name: 'SoMa Loft', cost: 200_000, outputBonus: 1.1, floorCostFactor: 5, projectScale: 4, emoji: '🏬', blurb: 'Exposed brick, cold brew on tap, rent that hurts.' },
  { id: 'paloalto', name: 'Palo Alto Office', cost: 3_000_000, outputBonus: 1.25, floorCostFactor: 25, projectScale: 16, emoji: '🏢', blurb: 'Walking distance from three VC firms and a Nobel laureate.' },
  { id: 'campus', name: 'Mountain View Campus', cost: 40_000_000, outputBonus: 1.5, floorCostFactor: 125, projectScale: 64, emoji: '🏛️', blurb: 'Free lunches, nap pods, and a climbing wall nobody uses.' },
  { id: 'tower', name: 'SF Skyline Tower', cost: 500_000_000, outputBonus: 2, floorCostFactor: 625, projectScale: 256, emoji: '🌆', blurb: 'Your logo, visible from two bridges.' },
  { id: 'seattle', name: 'Seattle Cloud Campus', cost: 6_000_000_000, outputBonus: 2.5, floorCostFactor: 3_125, projectScale: 1_024, emoji: '🌲', blurb: 'Rain outside, servers inside, espresso everywhere.' },
  { id: 'nyc', name: 'NYC Flatiron Hub', cost: 75_000_000_000, outputBonus: 3, floorCostFactor: 15_625, projectScale: 4_096, emoji: '🗽', blurb: 'Wall Street money meets your changelog.' },
  { id: 'orbital', name: 'Orbital HQ', cost: 1_000_000_000_000, outputBonus: 4, floorCostFactor: 78_125, projectScale: 16_384, emoji: '🛰️', blurb: 'Zero gravity, zero distractions — the lab your dream deserves.' },
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
