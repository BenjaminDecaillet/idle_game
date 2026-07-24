import { companyAtSite, getProject } from './engine';
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
  return state.companies.reduce((sum, c) => sum + c.workers.length, 0);
}

function anyUpgrade(state: GameState): boolean {
  return state.companies.some((c) => Object.values(c.upgrades).some((lvl) => lvl > 0));
}

function agiCompletions(state: GameState): number {
  let sum = 0;
  for (const c of state.companies) sum += getProject(c, 'agi').completions;
  return sum;
}

export const STORY_BEATS: StoryBeatDef[] = [
  { id: 'dawn', trigger: () => true },
  { id: 'first-hire', trigger: (s) => totalWorkers(s) >= 1 },
  { id: 'first-payout', trigger: (s) => s.projectsCompleted >= 1 },
  { id: 'first-thousand', trigger: (s) => s.totalEarned >= 1_000 },
  { id: 'full-garage', trigger: (s) => totalWorkers(s) >= 4 },
  { id: 'first-upgrade', trigger: anyUpgrade },
  { id: 'hundred-k', trigger: (s) => s.totalEarned >= 100_000 },
  { id: 'site-loft', trigger: (s) => companyAtSite(s, 'loft') !== undefined },
  { id: 'site-paloalto', trigger: (s) => companyAtSite(s, 'paloalto') !== undefined },
  { id: 'ten-million', trigger: (s) => s.totalEarned >= 10_000_000 },
  { id: 'site-campus', trigger: (s) => companyAtSite(s, 'campus') !== undefined },
  { id: 'site-tower', trigger: (s) => companyAtSite(s, 'tower') !== undefined },
  { id: 'one-billion', trigger: (s) => s.totalEarned >= 1_000_000_000 },
  { id: 'site-seattle', trigger: (s) => companyAtSite(s, 'seattle') !== undefined },
  { id: 'site-nyc', trigger: (s) => companyAtSite(s, 'nyc') !== undefined },
  {
    id: 'agi-unlocked',
    trigger: (s) => s.companies.some((c) => getProject(c, 'agi').unlocked),
  },
  { id: 'agi-shipped', trigger: (s) => agiCompletions(s) >= 1 },
  { id: 'site-orbital', trigger: (s) => companyAtSite(s, 'orbital') !== undefined },
  {
    id: 'dream-achieved',
    trigger: (s) => companyAtSite(s, 'orbital') !== undefined && agiCompletions(s) >= 1,
  },
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
