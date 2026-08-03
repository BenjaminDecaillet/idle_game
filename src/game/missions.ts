import { MISSIONS, missionById } from './data';
import { allCompanies, grantVsCoin } from './engine';
import type { GameState, MissionDef, MissionMetric } from './types';

/**
 * Mission system: concrete objectives that reward VsCoin. Progress is
 * always derived from durable state counters (nothing to track per tick),
 * completion is `progress >= target`, and rewards are collected explicitly
 * via claimMission() so the player gets their satisfying "Claim" moment.
 */

/** Current value of a mission metric (aggregated across every country). */
export function metricValue(state: GameState, metric: MissionMetric): number {
  const companies = allCompanies(state);
  switch (metric) {
    case 'projectsCompleted':
      return state.projectsCompleted;
    case 'totalEarned':
      return state.totalEarned;
    case 'workers':
      return companies.reduce((sum, c) => sum + c.workers.length, 0);
    case 'companies':
      return companies.length;
    case 'upgradeLevels':
      return companies.reduce(
        (sum, c) => sum + Object.values(c.upgrades).reduce((a, b) => a + b, 0),
        0,
      );
    case 'desks':
      return companies.reduce((sum, c) => sum + c.workstations.length, 0);
    case 'promotions':
      return state.promotionsDone;
    case 'countries':
      return state.countries.length;
    case 'builders':
      // Construction pool size across all countries (Gabriel's gift included).
      return state.countries.reduce((sum, c) => sum + c.builders.count, 0);
  }
}

export function missionProgress(state: GameState, def: MissionDef): number {
  return Math.min(metricValue(state, def.metric), def.target);
}

export function missionCompleted(state: GameState, def: MissionDef): boolean {
  return metricValue(state, def.metric) >= def.target;
}

export function missionClaimed(state: GameState, id: string): boolean {
  return state.missionsClaimed.includes(id);
}

/**
 * Missions shown in the UI: for every chain (= metric), all completed
 * unclaimed missions plus the first uncompleted one. Later chain links
 * stay hidden so the list stays short and goals feel reachable.
 */
export function visibleMissions(state: GameState): MissionDef[] {
  const out: MissionDef[] = [];
  const chainOpen = new Set<MissionMetric>();
  for (const def of MISSIONS) {
    if (missionClaimed(state, def.id)) continue;
    if (missionCompleted(state, def)) {
      out.push(def);
    } else if (!chainOpen.has(def.metric)) {
      chainOpen.add(def.metric);
      out.push(def);
    }
  }
  return out;
}

/** Completed, unclaimed missions (the ones with a Claim button). */
export function claimableMissions(state: GameState): MissionDef[] {
  return MISSIONS.filter(
    (def) => !missionClaimed(state, def.id) && missionCompleted(state, def),
  );
}

/** Collect a completed mission's VsCoin reward. */
export function claimMission(state: GameState, id: string): string | null {
  const def = missionById(id);
  if (missionClaimed(state, id)) return 'Mission already claimed';
  if (!missionCompleted(state, def)) return 'Mission not completed yet';
  state.missionsClaimed.push(id);
  grantVsCoin(state, def.reward, `mission:${id}`);
  return null;
}
