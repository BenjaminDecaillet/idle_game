import { VSCOIN_PER_STORY_BEAT } from './data';
import {
  allCompanies,
  anyCompanyAtSite,
  getProject,
  grantVsCoin,
  inDebt,
  inDebtCrisis,
  worldUnlocked,
} from './engine';
import type { GameState } from './types';

/**
 * The narrative red thread: from a garage nobody to an AI that helps
 * everyone, free as sunlight — shipped to the whole world from your
 * Orbital HQ. Beats trigger once, in definition order, on durable state
 * conditions (counters/ownership, never transient flags), so they are
 * robust across offline progress and old saves.
 *
 * Text lives in src/i18n (keys `story.<id>.title` / `story.<id>.text`);
 * this module is pure logic and knows nothing about languages or the DOM.
 */
export interface StoryBeatDef {
  id: string;
  /** Durable condition on the state; evaluated only until the beat fires. */
  trigger: (state: GameState) => boolean;
}

function totalWorkers(state: GameState): number {
  return allCompanies(state).reduce((sum, c) => sum + c.workers.length, 0);
}

function anyUpgrade(state: GameState): boolean {
  return allCompanies(state).some((c) => Object.values(c.upgrades).some((lvl) => lvl > 0));
}

function agiCompletions(state: GameState): number {
  let sum = 0;
  for (const c of allCompanies(state)) sum += getProject(c, 'agi').completions;
  return sum;
}

export const STORY_BEATS: StoryBeatDef[] = [
  { id: 'dawn', trigger: () => true },
  { id: 'first-hire', trigger: (s) => totalWorkers(s) >= 1 },
  { id: 'first-payout', trigger: (s) => s.projectsCompleted >= 1 },
  { id: 'first-thousand', trigger: (s) => s.totalEarned >= 1_000 },
  { id: 'full-garage', trigger: (s) => totalWorkers(s) >= 4 },
  { id: 'first-upgrade', trigger: anyUpgrade },
  // Gabriel's floor gift claimed — the builder economy introduces itself.
  { id: 'builders-guild', trigger: (s) => s.floorGiftClaimed },
  // Gabriel's debt warnings: one-shot per severity, on durable conditions
  // (the HUD alarm carries the ongoing signal; see docs/decisions.md #9).
  { id: 'debt-first', trigger: (s) => s.countries.some(inDebt) },
  { id: 'debt-crisis', trigger: (s) => s.countries.some(inDebtCrisis) },
  { id: 'hundred-k', trigger: (s) => s.totalEarned >= 100_000 },
  { id: 'site-loft', trigger: (s) => anyCompanyAtSite(s, 'loft') !== undefined },
  { id: 'site-paloalto', trigger: (s) => anyCompanyAtSite(s, 'paloalto') !== undefined },
  { id: 'ten-million', trigger: (s) => s.totalEarned >= 10_000_000 },
  { id: 'site-campus', trigger: (s) => anyCompanyAtSite(s, 'campus') !== undefined },
  { id: 'site-tower', trigger: (s) => anyCompanyAtSite(s, 'tower') !== undefined },
  { id: 'one-billion', trigger: (s) => s.totalEarned >= 1_000_000_000 },
  { id: 'site-seattle', trigger: (s) => anyCompanyAtSite(s, 'seattle') !== undefined },
  { id: 'site-nyc', trigger: (s) => anyCompanyAtSite(s, 'nyc') !== undefined },
  {
    id: 'agi-unlocked',
    trigger: (s) => allCompanies(s).some((c) => getProject(c, 'agi').unlocked),
  },
  { id: 'agi-shipped', trigger: (s) => agiCompletions(s) >= 1 },
  { id: 'site-orbital', trigger: (s) => anyCompanyAtSite(s, 'orbital') !== undefined },
  // International Business: the world opens up once a city is fully owned.
  { id: 'world-unlocked', trigger: worldUnlocked },
  { id: 'second-country', trigger: (s) => s.countries.length >= 2 },
  { id: 'world-conqueror', trigger: (s) => s.countries.length >= 8 },
  {
    id: 'dream-achieved',
    trigger: (s) => anyCompanyAtSite(s, 'orbital') !== undefined && agiCompletions(s) >= 1,
  },
  // Epilogue: fires right after the first IPO reset (durable counter).
  { id: 'new-venture', trigger: (s) => s.prestige.count >= 1 },
];

export function storyBeatById(id: string): StoryBeatDef {
  const b = STORY_BEATS.find((b) => b.id === id);
  if (!b) throw new Error(`Unknown story beat: ${id}`);
  return b;
}

/**
 * Evaluate triggers and queue newly reached beats for display.
 * Beats stay quiet while the tutorial runs (Gabriel can only say one
 * thing at a time). Returns the ids that were newly queued.
 */
export function advanceStory(state: GameState): string[] {
  if (!state.tutorial.done) return [];
  const fired: string[] = [];
  for (const beat of STORY_BEATS) {
    if (state.story.seen.includes(beat.id)) continue;
    if (!beat.trigger(state)) continue;
    state.story.seen.push(beat.id);
    state.story.queue.push(beat.id);
    grantVsCoin(state, VSCOIN_PER_STORY_BEAT, `story:${beat.id}`);
    fired.push(beat.id);
  }
  return fired;
}

/**
 * Mark every currently-satisfied beat as already seen without queueing it.
 * Used when migrating pre-story saves so veterans don't get a wall of
 * dialogs for milestones they passed long ago.
 */
export function backfillStory(state: GameState): void {
  for (const beat of STORY_BEATS) {
    if (!state.story.seen.includes(beat.id) && beat.trigger(state)) {
      state.story.seen.push(beat.id);
    }
  }
}

/** The beat currently on display, if any. */
export function currentStoryBeat(state: GameState): string | null {
  return state.story.queue[0] ?? null;
}

/** Player dismissed the current story dialog. */
export function dismissStoryBeat(state: GameState): string | null {
  if (state.story.queue.length === 0) return 'No story to dismiss';
  state.story.queue.shift();
  return null;
}
