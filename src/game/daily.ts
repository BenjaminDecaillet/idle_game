import {
  DAILY_CONTRACTS_PER_DAY,
  DAILY_CONTRACT_POOL,
  DAILY_EARN_FLOOR,
  DAILY_EARN_MINUTES,
} from './data';
import { deskCapacity, grantVsCoin, grossRewardRate } from './engine';
import { metricValue } from './missions';
import type { DailyContract, DailyState, GameState } from './types';

/**
 * Daily contracts: a rotating board of DAILY_CONTRACTS_PER_DAY delta-progress
 * missions, rolled deterministically from the UTC day number. The day is
 * computed by the UI layer (floor(now / 86_400_000)) — this module never
 * reads the clock, per the src/game/** purity rule.
 */

/** Deterministic PRNG (mulberry32) so a given day rolls the same board. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDailyState(): DailyState {
  return { day: -1, contracts: [], baselines: {}, claimed: [] };
}

/**
 * A pool entry is eligible when the player can physically complete it today
 * (docs/balance.md Phase D): desks need free capacity at roll time — a full
 * empire (or one blocked on floor construction) must not draw a dead card.
 */
function dailyEligible(state: GameState, entry: (typeof DAILY_CONTRACT_POOL)[number]): boolean {
  if (entry.metric !== 'desks') return true;
  let free = 0;
  for (const country of state.countries) {
    for (const company of country.companies) {
      free += deskCapacity(company) - company.workstations.length;
    }
  }
  return free >= entry.target;
}

/** Roll the board for a day: a deterministic sample of the eligible pool. */
export function rollDailyContracts(state: GameState, day: number): DailyContract[] {
  const rand = mulberry32(day);
  const pool = DAILY_CONTRACT_POOL.filter((e) => dailyEligible(state, e));
  const contracts: DailyContract[] = [];
  const count = Math.min(DAILY_CONTRACTS_PER_DAY, pool.length);
  for (let n = 0; n < count; n++) {
    const entry = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const target =
      entry.metric === 'totalEarned'
        ? Math.max(DAILY_EARN_FLOOR, Math.round(grossRewardRate(state) * 60 * DAILY_EARN_MINUTES))
        : entry.target;
    contracts.push({
      id: `daily-${day}-${entry.metric}`,
      metric: entry.metric,
      target,
      reward: entry.reward,
      emoji: entry.emoji,
    });
  }
  return contracts;
}

/**
 * Regenerate the board when the day changed. Call from the UI layer with the
 * current UTC day number (idempotent, cheap when the day is unchanged).
 */
export function ensureDaily(state: GameState, day: number): void {
  if (state.daily.day === day) return;
  const contracts = rollDailyContracts(state, day);
  const baselines: Record<string, number> = {};
  for (const c of contracts) baselines[c.metric] = metricValue(state, c.metric);
  state.daily = { day, contracts, baselines, claimed: [] };
}

/** Progress made today toward a contract (delta from the day baseline). */
export function dailyProgress(state: GameState, contract: DailyContract): number {
  const baseline = state.daily.baselines[contract.metric] ?? 0;
  const delta = metricValue(state, contract.metric) - baseline;
  return Math.max(0, Math.min(delta, contract.target));
}

export function dailyCompleted(state: GameState, contract: DailyContract): boolean {
  return dailyProgress(state, contract) >= contract.target;
}

export function dailyClaimed(state: GameState, id: string): boolean {
  return state.daily.claimed.includes(id);
}

/** Contracts finished but not yet claimed (feeds the tab badge). */
export function claimableDailyContracts(state: GameState): DailyContract[] {
  return state.daily.contracts.filter(
    (c) => dailyCompleted(state, c) && !dailyClaimed(state, c.id),
  );
}

export function claimDailyContract(state: GameState, id: string): string | null {
  const contract = state.daily.contracts.find((c) => c.id === id);
  if (!contract) return 'No such contract';
  if (dailyClaimed(state, id)) return 'Already claimed';
  if (!dailyCompleted(state, contract)) return 'Contract not finished yet';
  state.daily.claimed.push(id);
  return grantVsCoin(state, contract.reward, `daily:${id}`);
}
