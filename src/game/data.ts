import type {
  ProjectDef,
  Specialization,
  UpgradeDef,
  WorkerTierDef,
  WorkstationDef,
} from './types';

export const SPEC_MATCH_BONUS = 1.5;
export const OFFLINE_CAP_HOURS = 24;
export const SKILL_OUTPUT_PER_LEVEL = 0.1; // +10% output per skill level above 1
export const TRAIN_COST_BASE = 150; // train cost = base * tierFactor * level^2

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
