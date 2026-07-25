import { TUTORIAL_ANGEL_GIFT } from './data';
import { activeCompany } from './engine';
import type { GameState } from './types';

/**
 * Gabriel's first-launch tutorial: a linear list of declarative steps.
 * Steps either auto-complete when their predicate holds (the player did
 * the thing) or advance manually via a Next button. Progress is persisted
 * in the save (`state.tutorial`), so it is resumable and never shown again
 * once done. Skippable at any time.
 *
 * Text lives in src/i18n under `tutorial.<stepId>.text`.
 */
export interface TutorialStepDef {
  id: string;
  /** Tab the step directs the player to (UI highlights that tab button). */
  tab?: 'map' | 'projects' | 'team' | 'office' | 'upgrades' | 'stats';
  /**
   * CSS selector of the element the step explains. The coach popup anchors
   * next to it (never covering it) and highlights it. When the selector
   * matches nothing (player is on another tab), the UI falls back to
   * anchoring on the step's tab button, then to the docked position.
   */
  target?: string;
  /** Auto-advance condition. Undefined = manual step (Next button). */
  isComplete?: (state: GameState) => boolean;
  /** Special input rendering: name the avatar / the company. */
  input?: 'avatar-name' | 'company-name';
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  { id: 'welcome' },
  { id: 'name-avatar', input: 'avatar-name' },
  { id: 'name-company', input: 'company-name' },
  {
    id: 'hire',
    tab: 'team',
    target: '[data-action^="hire:"]',
    isComplete: (s) => activeCompany(s).workers.length >= 1,
  },
  {
    id: 'desk',
    tab: 'office',
    target: '[data-action^="buy-station:"]',
    isComplete: (s) => activeCompany(s).workstations.length >= 1,
  },
  {
    id: 'upgrade',
    tab: 'upgrades',
    target: '[data-action^="buy-upgrade:"]',
    isComplete: (s) => Object.values(activeCompany(s).upgrades).some((lvl) => lvl > 0),
  },
  {
    id: 'train',
    tab: 'team',
    target: '[data-action^="train:"]',
    isComplete: (s) =>
      activeCompany(s).workers.some((w) => w.training !== null || w.skillLevel > 1),
  },
  { id: 'outro' },
];

/** The step the player is currently on, or null when the tutorial is over. */
export function currentTutorialStep(state: GameState): TutorialStepDef | null {
  if (state.tutorial.done) return null;
  return TUTORIAL_STEPS[state.tutorial.step] ?? null;
}

/**
 * Auto-advance through steps whose condition is already met and hand out
 * step entry rewards. Call it every UI refresh; it is idempotent and cheap.
 * Returns true if the visible step changed.
 */
export function refreshTutorial(state: GameState): boolean {
  let changed = false;
  let step = currentTutorialStep(state);
  while (step && step.isComplete && step.isComplete(state)) {
    completeCurrentStep(state);
    changed = true;
    step = currentTutorialStep(state);
  }
  return changed;
}

/** Player pressed Next on a manual step. */
export function advanceTutorial(state: GameState): string | null {
  const step = currentTutorialStep(state);
  if (!step) return 'Tutorial is already over';
  if (step.isComplete && !step.isComplete(state)) return 'Step not finished yet';
  completeCurrentStep(state);
  return null;
}

function completeCurrentStep(state: GameState): void {
  state.tutorial.step += 1;
  if (state.tutorial.step >= TUTORIAL_STEPS.length) {
    state.tutorial.done = true;
    return;
  }
  // Gabriel's angel-investor gift: seed money handed out when the upgrade
  // step starts, so a brand-new player can actually afford an upgrade.
  const next = TUTORIAL_STEPS[state.tutorial.step];
  if (next.id === 'upgrade' && !state.tutorial.giftGiven) {
    state.tutorial.giftGiven = true;
    state.money += TUTORIAL_ANGEL_GIFT;
  }
}

/** Skip the whole tutorial (still counts as done forever). */
export function skipTutorial(state: GameState): string | null {
  if (state.tutorial.done) return 'Tutorial is already over';
  state.tutorial.done = true;
  state.tutorial.step = TUTORIAL_STEPS.length;
  return null;
}

/** Name the player avatar (from the tutorial, editable later). */
export function setPlayerName(state: GameState, name: string): string | null {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return 'Name cannot be empty';
  state.player.name = trimmed;
  return null;
}
