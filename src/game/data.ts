import type {
  CompanySiteDef,
  MapThemeDef,
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
export const TRAIN_LEVELS = 3;
export const TRAIN_DURATION_SEC = 120;
export const TRAIN_COST_RATE_FACTOR = 45;
export const TRAIN_COST_LEVEL_RAMP = 0.15;

// Free simulation-speed toggle (live play only, offline stays wall-clock).
export const TIME_SCALES = [1, 2, 4];

// Marketing campaign: a purchasable output boost — the money sink twin of
// the ad/IAP boosts. Cost is ~MARKETING_COST_SEC seconds of current gross
// income, for MARKETING_DURATION_SEC seconds of MARKETING_MULT x output.
export const MARKETING_MULT = 2;
export const MARKETING_DURATION_SEC = 600;
export const MARKETING_COST_SEC = 300;
export const MARKETING_MIN_COST = 500;

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
  { id: 'intern', title: 'Intern', baseRate: 0.5, salary: 0.05, hireCost: 25, emoji: '🎓' },
  { id: 'junior', title: 'Junior Dev', baseRate: 1, salary: 0.15, hireCost: 100, emoji: '🧑‍💻' },
  { id: 'mid', title: 'Mid-level Dev', baseRate: 2.5, salary: 0.5, hireCost: 500, emoji: '👨‍💻' },
  { id: 'senior', title: 'Senior Dev', baseRate: 5, salary: 1.2, hireCost: 2_500, emoji: '🧙' },
  { id: 'architect', title: 'Architect', baseRate: 20, salary: 6, hireCost: 15_000, emoji: '🏛️' },
  { id: 'principal', title: 'Principal Engineer', baseRate: 50, salary: 18, hireCost: 80_000, emoji: '🚀' },
];

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
  { id: 'garage', name: 'The Garage', cost: 0, outputBonus: 1, floorCostFactor: 1, emoji: '🏚️', blurb: 'Every empire starts between a lawnmower and a surfboard.' },
  { id: 'loft', name: 'SoMa Loft', cost: 200_000, outputBonus: 1.1, floorCostFactor: 5, emoji: '🏬', blurb: 'Exposed brick, cold brew on tap, rent that hurts.' },
  { id: 'paloalto', name: 'Palo Alto Office', cost: 3_000_000, outputBonus: 1.25, floorCostFactor: 25, emoji: '🏢', blurb: 'Walking distance from three VC firms and a Nobel laureate.' },
  { id: 'campus', name: 'Mountain View Campus', cost: 40_000_000, outputBonus: 1.5, floorCostFactor: 125, emoji: '🏛️', blurb: 'Free lunches, nap pods, and a climbing wall nobody uses.' },
  { id: 'tower', name: 'SF Skyline Tower', cost: 500_000_000, outputBonus: 2, floorCostFactor: 625, emoji: '🌆', blurb: 'Your logo, visible from two bridges.' },
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
];

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
