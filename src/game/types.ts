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

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number; // Infinity-like cap via large number
  emoji: string;
}

export interface WorkerState {
  id: number;
  name: string;
  tierId: string;
  specialization: Specialization;
  skillLevel: number;
  experience: number; // resets each level-up
  stationId: number | null; // assigned workstation instance
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
}

export interface GameState {
  version: number;
  companyName: string;
  money: number;
  totalEarned: number;
  projectsCompleted: number;
  startedAt: number;
  lastSeen: number; // wall-clock ms, for offline progress
  playTimeSec: number;
  workers: WorkerState[];
  workstations: WorkstationState[];
  projects: ProjectState[];
  activeProjectId: string;
  upgrades: Record<string, number>;
  candidates: Candidate[];
  candidateRerollCost: number;
  settings: Settings;
  nextEntityId: number;
}

export interface Candidate {
  name: string;
  tierId: string;
  specialization: Specialization;
}

/** Events emitted by a tick, consumed by the UI for effects. */
export interface TickEvents {
  completions: { projectId: string; reward: number }[];
  levelUps: { workerId: number; newLevel: number }[];
}
