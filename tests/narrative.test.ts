import { describe, expect, it } from 'vitest';
import { TUTORIAL_ANGEL_GIFT } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyCompany,
  buyUpgrade,
  buyWorkstation,
  createInitialState,
  setLanguage,
  setStartingCountry,
  siteUnderConstruction,
  tick,
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
    timesTrained: 0,
    promotions: 0,
    ...overrides,
  };
}

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
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

  it('has a translated name for every country', () => {
    for (const id of ['ch', 'us', 'ca', 'it', 'fr', 'de', 'sa', 'cn']) {
      expect(en[`country.${id}.name` as keyof typeof en]).toBeTruthy();
      expect(fr[`country.${id}.name` as keyof typeof fr]).toBeTruthy();
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

  it('lets the player pick a starting country before any progress', () => {
    const state = createInitialState(NOW);
    advanceTutorial(state); // welcome
    expect(currentTutorialStep(state)?.id).toBe('choose-country');
    expect(setStartingCountry(state, 'ch')).toBeNull();
    expect(state.activeCountryId).toBe('ch');
    expect(activeCountry(state).money).toBe(50);
    expect(activeCompany(state).name).toBe('My Startup');
    // Once anything happened, the choice is locked.
    activeCompany(state).workers.push(makeWorker(1));
    expect(setStartingCountry(state, 'de')).toBe('error.journeyBegun');
  });

  it('walks through all steps, paying the angel gift exactly once', () => {
    const state = createInitialState(NOW);
    const country = activeCountry(state);
    expect(advanceTutorial(state)).toBeNull(); // welcome
    expect(advanceTutorial(state)).toBeNull(); // choose-country (keeps default)
    expect(setPlayerName(state, '  Benjamin  ')).toBeNull();
    expect(state.player.name).toBe('Benjamin');
    expect(advanceTutorial(state)).toBeNull(); // name-avatar
    expect(advanceTutorial(state)).toBeNull(); // name-company
    expect(currentTutorialStep(state)?.id).toBe('hire');
    // Auto-steps refuse manual advancing until the deed is done.
    expect(advanceTutorial(state)).toBe('Step not finished yet');
    country.companies[0].workers.push(makeWorker(500));
    expect(refreshTutorial(state)).toBe(true);
    expect(currentTutorialStep(state)?.id).toBe('desk');
    expect(buyWorkstation(state, 'basic')).toBeNull();
    const moneyBefore = country.money;
    expect(refreshTutorial(state)).toBe(true);
    expect(currentTutorialStep(state)?.id).toBe('upgrade');
    expect(country.money).toBe(moneyBefore + TUTORIAL_ANGEL_GIFT);
    expect(state.tutorial.giftGiven).toBe(true);
    expect(buyUpgrade(state, 'coffee')).toBeNull();
    refreshTutorial(state);
    expect(currentTutorialStep(state)?.id).toBe('train');
    expect(trainWorker(state, 500)).toBeNull();
    refreshTutorial(state);
    // Training started → the freebie fast-forward step; it completes once
    // the training is over (waited out here — the freebie is a UI offer).
    expect(currentTutorialStep(state)?.id).toBe('fast-forward');
    tick(state, 150);
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
    activeCountry(state).companies[0].workers.push(makeWorker(600));
    expect(advanceStory(state)).toEqual(['first-hire']);
    state.projectsCompleted = 1;
    state.totalEarned = 150_000;
    const fired = advanceStory(state);
    expect(fired).toEqual(['first-payout', 'first-thousand', 'hundred-k']);
  });

  it('fires debt beats on durable debt conditions', () => {
    const state = freshDone();
    advanceStory(state);
    activeCountry(state).money = -100;
    expect(advanceStory(state)).toEqual(['debt-first']);
    activeCountry(state).money = -100_000;
    expect(advanceStory(state)).toEqual(['debt-crisis']);
  });

  it('fires site beats when companies are founded', () => {
    const state = freshDone();
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    advanceStory(state);
    buyCompany(state, 'loft');
    completeBuild(state, 'loft');
    expect(advanceStory(state)).toContain('site-loft');
  });

  it('ends with the dream once orbital HQ ships the AGI', () => {
    const state = freshDone();
    activeCountry(state).money = Number.MAX_SAFE_INTEGER;
    advanceStory(state);
    buyCompany(state, 'orbital');
    completeBuild(state, 'orbital');
    const orbital = activeCountry(state).companies.find((c) => c.siteId === 'orbital')!;
    orbital.projects.find((p) => p.defId === 'agi')!.completions = 1;
    const fired = advanceStory(state);
    expect(fired).toContain('agi-shipped');
    expect(fired).toContain('site-orbital');
    expect(fired).toContain('dream-achieved');
  });

  it('dismisses beats in queue order', () => {
    const state = freshDone();
    activeCountry(state).companies[0].workers.push(makeWorker(700));
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

describe('narrative fields through save round trips', () => {
  it('keeps tutorial/player/language/story through migrate', () => {
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
    expect(setLanguage(state, 'de')).toBe('error.unknownLanguage');
    expect(setLanguage(state, 'fr')).toBeNull();
    expect(state.settings.language).toBe('fr');
  });
});
