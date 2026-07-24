import { describe, expect, it } from 'vitest';
import { TUTORIAL_ANGEL_GIFT } from '../src/game/data';
import {
  buyCompany,
  buyUpgrade,
  buyWorkstation,
  createInitialState,
  setLanguage,
  trainWorker,
} from '../src/game/engine';
import { migrate } from '../src/game/save';
import {
  advanceStory,
  backfillStory,
  currentStoryBeat,
  dismissStoryBeat,
  STORY_BEATS,
} from '../src/game/story';
import {
  advanceTutorial,
  currentTutorialStep,
  refreshTutorial,
  setPlayerName,
  skipTutorial,
  TUTORIAL_STEPS,
} from '../src/game/tutorial';
import type { GameState, WorkerState } from '../src/game/types';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { lookup, resolveLang, setCurrentLang, t } from '../src/i18n';

const NOW = 1_700_000_000_000;

function makeWorker(id: number, overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    id,
    name: 'Test Worker',
    tierId: 'intern',
    specialization: 'Frontend',
    skillLevel: 1,
    experience: 0,
    stationId: null,
    training: null,
    ...overrides,
  };
}

describe('i18n', () => {
  it('french covers exactly the english keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it('has story text for every beat and tutorial text for every step', () => {
    for (const beat of STORY_BEATS) {
      expect(en[`story.${beat.id}.title` as keyof typeof en]).toBeTruthy();
      expect(en[`story.${beat.id}.text` as keyof typeof en]).toBeTruthy();
    }
    for (const step of TUTORIAL_STEPS) {
      expect(en[`tutorial.${step.id}.text` as keyof typeof en]).toBeTruthy();
    }
  });

  it('resolves auto against the browser language', () => {
    expect(resolveLang('auto', 'fr-CH')).toBe('fr');
    expect(resolveLang('auto', 'de-DE')).toBe('en');
    expect(resolveLang('auto', '')).toBe('en');
    expect(resolveLang('fr', 'en-US')).toBe('fr');
    expect(resolveLang('en', 'fr-FR')).toBe('en');
  });

  it('translates and interpolates in the current language', () => {
    setCurrentLang('fr');
    expect(t('ui.continue')).toBe('Continuer');
    expect(t('ui.tutorialStep', { step: 2, total: 8 })).toBe('Étape 2 / 8');
    setCurrentLang('en');
    expect(t('ui.continue')).toBe('Continue');
    expect(lookup('story.dawn.title')).toBe(en['story.dawn.title']);
    expect(lookup('no.such.key')).toBe('no.such.key');
  });
});

describe('tutorial', () => {
  it('starts at the welcome step for new games', () => {
    const state = createInitialState(NOW);
    expect(state.tutorial.done).toBe(false);
    expect(currentTutorialStep(state)?.id).toBe('welcome');
  });

  it('walks through all steps, paying the angel gift exactly once', () => {
    const state = createInitialState(NOW);
    expect(advanceTutorial(state)).toBeNull(); // welcome
    expect(setPlayerName(state, '  Benjamin  ')).toBeNull();
    expect(state.player.name).toBe('Benjamin');
    expect(advanceTutorial(state)).toBeNull(); // name-avatar
    expect(advanceTutorial(state)).toBeNull(); // name-company
    expect(currentTutorialStep(state)?.id).toBe('hire');
    // Auto-steps refuse manual advancing until the deed is done.
    expect(advanceTutorial(state)).toBe('Step not finished yet');
    state.companies[0].workers.push(makeWorker(500));
    expect(refreshTutorial(state)).toBe(true);
    expect(currentTutorialStep(state)?.id).toBe('desk');
    expect(buyWorkstation(state, 'basic')).toBeNull();
    const moneyBefore = state.money;
    expect(refreshTutorial(state)).toBe(true);
    expect(currentTutorialStep(state)?.id).toBe('upgrade');
    expect(state.money).toBe(moneyBefore + TUTORIAL_ANGEL_GIFT);
    expect(state.tutorial.giftGiven).toBe(true);
    expect(buyUpgrade(state, 'coffee')).toBeNull();
    refreshTutorial(state);
    expect(currentTutorialStep(state)?.id).toBe('train');
    expect(trainWorker(state, 500)).toBeNull();
    refreshTutorial(state);
    expect(currentTutorialStep(state)?.id).toBe('outro');
    expect(advanceTutorial(state)).toBeNull();
    expect(state.tutorial.done).toBe(true);
    expect(currentTutorialStep(state)).toBeNull();
    expect(advanceTutorial(state)).toBe('Tutorial is already over');
  });

  it('is skippable and stays done', () => {
    const state = createInitialState(NOW);
    expect(skipTutorial(state)).toBeNull();
    expect(state.tutorial.done).toBe(true);
    expect(skipTutorial(state)).toBe('Tutorial is already over');
  });

  it('rejects empty player names', () => {
    const state = createInitialState(NOW);
    expect(setPlayerName(state, '   ')).toBe('Name cannot be empty');
    expect(state.player.name).toBe('Founder');
  });

  it('resumes from the persisted step after a save/load', () => {
    const state = createInitialState(NOW);
    advanceTutorial(state);
    advanceTutorial(state);
    const reloaded = migrate(JSON.parse(JSON.stringify(state)), NOW);
    expect(reloaded.tutorial.done).toBe(false);
    expect(currentTutorialStep(reloaded)?.id).toBe(TUTORIAL_STEPS[2].id);
  });
});

describe('story', () => {
  function freshDone(): GameState {
    const state = createInitialState(NOW);
    skipTutorial(state);
    return state;
  }

  it('stays quiet while the tutorial runs', () => {
    const state = createInitialState(NOW);
    expect(advanceStory(state)).toEqual([]);
    expect(currentStoryBeat(state)).toBeNull();
  });

  it('opens with the dawn beat once the tutorial is over', () => {
    const state = freshDone();
    expect(advanceStory(state)).toEqual(['dawn']);
    expect(currentStoryBeat(state)).toBe('dawn');
    // Beats never fire twice.
    expect(advanceStory(state)).toEqual([]);
  });

  it('fires milestone beats when their condition is reached', () => {
    const state = freshDone();
    advanceStory(state);
    state.companies[0].workers.push(makeWorker(600));
    expect(advanceStory(state)).toEqual(['first-hire']);
    state.projectsCompleted = 1;
    state.totalEarned = 150_000;
    const fired = advanceStory(state);
    expect(fired).toEqual(['first-payout', 'first-thousand', 'hundred-k']);
  });

  it('fires site beats when companies are founded', () => {
    const state = freshDone();
    state.money = Number.MAX_SAFE_INTEGER;
    advanceStory(state);
    buyCompany(state, 'loft');
    expect(advanceStory(state)).toContain('site-loft');
  });

  it('ends with the dream once orbital HQ ships the AGI', () => {
    const state = freshDone();
    state.money = Number.MAX_SAFE_INTEGER;
    advanceStory(state);
    buyCompany(state, 'orbital');
    const orbital = state.companies.find((c) => c.siteId === 'orbital')!;
    orbital.projects.find((p) => p.defId === 'agi')!.completions = 1;
    const fired = advanceStory(state);
    expect(fired).toContain('agi-shipped');
    expect(fired).toContain('site-orbital');
    expect(fired).toContain('dream-achieved');
  });

  it('dismisses beats in queue order', () => {
    const state = freshDone();
    state.companies[0].workers.push(makeWorker(700));
    advanceStory(state);
    expect(currentStoryBeat(state)).toBe('dawn');
    expect(dismissStoryBeat(state)).toBeNull();
    expect(currentStoryBeat(state)).toBe('first-hire');
    dismissStoryBeat(state);
    expect(dismissStoryBeat(state)).toBe('No story to dismiss');
  });

  it('backfill marks reached beats as seen without queueing', () => {
    const state = freshDone();
    state.totalEarned = 2_000;
    backfillStory(state);
    expect(state.story.seen).toContain('first-thousand');
    expect(state.story.queue).toEqual([]);
  });
});

describe('save migration v4', () => {
  function legacySave(): Record<string, unknown> {
    const state = createInitialState(NOW) as unknown as Record<string, unknown>;
    delete state.story;
    delete state.tutorial;
    delete state.player;
    delete (state.settings as Record<string, unknown>).language;
    return JSON.parse(JSON.stringify(state));
  }

  it('marks the tutorial done for pre-v4 saves and backfills their story', () => {
    const legacy = legacySave();
    (legacy as { totalEarned: number }).totalEarned = 500_000;
    const migrated = migrate(legacy, NOW);
    expect(migrated.tutorial.done).toBe(true);
    expect(migrated.story.seen).toContain('hundred-k');
    expect(migrated.story.queue).toEqual([]);
    expect(migrated.player.name).toBe('Founder');
    expect(migrated.settings.language).toBe('auto');
  });

  it('keeps v4 fields through save/load round trips', () => {
    const state = createInitialState(NOW);
    skipTutorial(state);
    setPlayerName(state, 'Ada');
    setLanguage(state, 'fr');
    advanceStory(state);
    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    expect(migrated.tutorial.done).toBe(true);
    expect(migrated.player.name).toBe('Ada');
    expect(migrated.settings.language).toBe('fr');
    expect(migrated.story.queue).toContain('dawn');
  });

  it('drops unknown story ids and invalid languages', () => {
    const state = createInitialState(NOW);
    const raw = JSON.parse(JSON.stringify(state));
    raw.story = { seen: ['dawn', 'zzz-removed'], queue: ['zzz-removed'] };
    raw.settings.language = 'klingon';
    const migrated = migrate(raw, NOW);
    expect(migrated.story.seen).toEqual(['dawn']);
    expect(migrated.story.queue).toEqual([]);
    expect(migrated.settings.language).toBe('auto');
  });

  it('rejects bad languages via the action', () => {
    const state = createInitialState(NOW);
    expect(setLanguage(state, 'de')).toBe('Unknown language');
    expect(setLanguage(state, 'fr')).toBeNull();
    expect(state.settings.language).toBe('fr');
  });
});
