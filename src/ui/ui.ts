import {
  BETA_FREE_IAP,
  COMPANY_SITES,
  PRESTIGE_STORY_BEAT,
  COUNTRIES,
  FLOOR_CAPACITY,
  MAP_THEMES,
  MARKETING_DURATION_SEC,
  MARKETING_MULT,
  MAX_FLOORS,
  PETS,
  SITE_SPEC_BONUS,
  petById,
  VAULT_OPEN_COST,
  VAULT_RATE,
  traitById,
  PROJECTS,
  SHOP_CASH_PACKS,
  TIME_SCALES,
  TUTORIAL_ANGEL_GIFT,
  UPGRADES,
  VSCOIN_BOOST_COST,
  VSCOIN_BOOST_DURATION_SEC,
  VSCOIN_BOOST_MULT,
  VSCOIN_PACKS,
  WALLPAPERS,
  WORKSTATIONS,
  WORLD_OUTPUT_PER_COUNTRY,
  projectDefById,
  siteById,
  stationDefById,
  tierById,
  vsCoinPackById,
} from '../game/data';
import {
  activeBoost,
  activeCompany,
  activeCountry,
  allCompanies,
  assignFloorProject,
  atSkillCap,
  builderCost,
  buyCompany,
  buyShopPack,
  claimFloorGift,
  claimVsCoinPack,
  shopPackCash,
  shopPackUnlocked,
  countryUnlockCost,
  floorGiftAvailable,
  floorUnderConstruction,
  freeBuilders,
  hireBuilder,
  siteUnderConstruction,
  deskUpgradeCost,
  deskUpgradeDurationSec,
  fastForwardAction,
  fastForwardCost,
  nextStationDef,
  nextTier,
  projectRewardCap,
  promoteCost,
  promoteWorker,
  renameCashCost,
  renameVsCoinCost,
  setActiveCountry,
  setStartingCountry,
  trainDurationSec,
  unlockCountry,
  upgradeDesk,
  walletMoney,
  workerBusy,
  worldUnlocked,
  buyFloor,
  buyMapTheme,
  buyMarketingCampaign,
  buyUpgrade,
  buyWallpaper,
  buyWorkstation,
  companyAtSite,
  companyIncome,
  companySalaries,
  companyWorkRate,
  deskCapacity,
  effectiveWallpaper,
  floorCost,
  floorProject,
  marketingCost,
  setActiveCompany,
  setCompanyWallpaper,
  setDefaultWallpaper,
  setMapTheme,
  setLanguage,
  setTimeScale,
  estimatedIncome,
  expToNextLevel,
  fireWorker,
  getProject,
  hireWorker,
  renameCompany,
  rerollCandidates,
  setActiveProject,
  stationCost,
  buyVsCoinBoost,
  companyCost,
  hireCost,
  projectUnlockCost,
  upgradeVsCoinCost,
  totalSalaries,
  claimOfflineDoubler,
  offlineDoublerReady,
  prestigeMultiplier,
  prestigePreview,
  prestigeReset,
  totalWorkRate,
  buyPet,
  openVault,
  setCompanyPet,
  tierSalary,
  traitSalaryMult,
  trainCost,
  vaultCap,
  workerSalary,
  trainLevels,
  trainWorker,
  unlockProject,
  upgradeCost,
  workerRate,
} from '../game/engine';
import { formatDuration, formatMoney, formatNumber, formatRate } from './format';
import {
  claimableMissions,
  claimMission,
  missionCompleted,
  missionProgress,
  visibleMissions,
} from '../game/missions';
import { acceptEventOffer } from '../game/events';
import type { EventOffer } from '../game/events';
import {
  claimableDailyContracts,
  claimDailyContract,
  dailyClaimed,
  dailyCompleted,
  dailyProgress,
} from '../game/daily';
import {
  cyclePlayerLook,
  officeStage,
  PLAYER_LOOK_FIELDS,
  type PlayerLookField,
} from '../game/player';
import { nextGoalHint } from '../game/goals';
import type { GoalHint } from '../game/goals';
import { exportSave, importSave, resetGame, saveGame } from '../game/save';
import {
  STORY_BEATS,
  advanceStory,
  currentStoryBeat,
  dismissStoryBeat,
} from '../game/story';
import {
  TUTORIAL_STEPS,
  advanceTutorial,
  currentTutorialStep,
  refreshTutorial,
  setPlayerName,
  skipTutorial,
  type TutorialStepDef,
} from '../game/tutorial';
import type { CompanyState, GameState, WorkerState } from '../game/types';
import { lookup, resolveLang, setCurrentLang, t } from '../i18n';
import type { StringKey } from '../i18n';
import { placeCoach } from './coachPlacement';
import type { Fx } from './fx';
import { type GabrielPose } from './gabriel';
import {
  employeePortrait,
  gabrielDialogPortrait,
  initPortraits,
  playerPortrait,
} from './portraits';
import { cityMapSvg, type SiteView } from './cityMap';
import { icon, type IconName } from './icons';
import { constructionDecor, lobbyDecor, officeWallVars, roofDecor, wallDecor } from './officeScene';
import { projectArt, stationArt, upgradeArt, upgradeProp } from './itemArt';
import { emptyDeskSvg, founderOffice, personaAtDesk, personaStanding } from './persona';

const SPEECH_LINES = [
  'Shipping it! 🚀',
  'Just one more line…',
  'Compiling… ☕',
  'It works on my machine!',
  'Refactoring… again',
  'LGTM 👍',
  '99 little bugs in the code…',
  'Standup in 5!',
  'Deploy on Friday? 😱',
  'Rubber duck says hi 🦆',
  'Have you tried turning it off and on?',
  'TODO: fix later',
];

type Tab = 'map' | 'office' | 'shop' | 'vscoin' | 'stats';

/** Drill-down level inside the Office tab. */
type OfficeLevel = 'companies' | 'building' | 'floor' | 'staff';

// `icon` overrides the tab-bar icon when a tab has no icon of its own name.
// Labels resolve through i18n at build time (ui.tab.<id>); the tab bar is
// rebuilt on language change (see 'set-language').
const TABS: { id: Tab; icon?: IconName }[] = [
  { id: 'map' },
  { id: 'office' },
  { id: 'shop', icon: 'coin' },
  { id: 'vscoin', icon: 'vscoin' },
  { id: 'stats' },
];

export class UI {
  private root: HTMLElement;
  private fx: Fx;
  private state: GameState;
  private tab: Tab = 'office';
  private rebuildTimer = 0;
  private officeDirty = true;
  /** Office drill-down: company list → building → one floor / staff room. */
  private officeLevel: OfficeLevel = 'building';
  private officeFloorIdx = 0;
  /** Candidate popup (bottom sheet on the Office tab). */
  private hireOpen = false;
  /** Live random-event offer awaiting a choice (modal on any tab). */
  private pendingEvent: EventOffer | null = null;
  /** Offline earnings shown by the current Welcome-back modal (doubler). */
  private pendingOfflineEarnings = 0;
  private sheetSiteId: string | null = null;
  /** Tutorial step currently rendered in the coach card ('' = force redraw). */
  private coachStep: string | null | '' = '';
  /** Element the coach popup is currently anchored to / highlighting. */
  private coachTargetEl: Element | null = null;
  /** step:tab key of the last target auto-scrolled into view. */
  private coachScrollKey = '';
  /**
   * Missions already seen completed (for the live "mission complete" toast).
   * null = baseline not taken yet; completions present at baseline (e.g.
   * from offline progress) get the badge dot but no toast spam.
   */
  private knownCompleted: Set<string> | null = null;
  private onStateReplaced: (next: GameState) => void;

  constructor(
    root: HTMLElement,
    state: GameState,
    fx: Fx,
    onStateReplaced: (next: GameState) => void,
  ) {
    this.root = root;
    this.state = state;
    this.fx = fx;
    this.onStateReplaced = onStateReplaced;
    initPortraits();
    this.buildSkeleton();
    this.rebuildTab();
    this.root.addEventListener('click', (e) => this.handleClick(e));
    this.root.addEventListener('change', (e) => this.handleChange(e));
    // The coach popup anchors to on-screen elements: track every layout
    // change (resize, any panel scrolling) so it never drifts over its target.
    window.addEventListener('resize', () => this.positionCoach());
    window.addEventListener('scroll', () => this.positionCoach(), true);
  }

  // -------------------------------------------------------------------------
  // Skeleton
  // -------------------------------------------------------------------------

  private buildSkeleton(): void {
    this.root.innerHTML = `
      <header class="hud">
        <div class="hud-row">
          <button class="company" data-action="rename-company" title="${t('ui.renameCompanyTitle')}">
            ${icon('office', 16)} <span id="company-name"></span>
          </button>
          <div class="hud-badges">
            <span class="badge badge-boost" id="hud-boost" hidden title="${t('ui.activeBoostTitle')}">
              ${icon('boost', 13)}<span id="hud-boost-text"></span>
            </span>
            <button class="badge badge-vault" id="hud-vault" hidden data-action="tab:shop"
                    title="${t('ui.vaultTitle')}">🐷<span id="hud-vault-text"></span></button>
            <span class="badge badge-income" id="hud-income" title="${t('ui.netIncomeTitle')}"></span>
            <button class="badge badge-vscoin" id="hud-vscoin" data-action="tab:vscoin" title="VsCoin">
              ${icon('vscoin', 13)}<span id="hud-vscoin-text">0</span>
            </button>
          </div>
        </div>
        <div class="money-row">
          <span class="money-coin">${icon('coin', 30)}</span>
          <div class="money" id="hud-money">$0</div>
          <div class="money-sub" id="hud-salary"></div>
        </div>
      </header>
      <section class="hero card" id="hero">
        <div class="hero-head">
          <span class="hero-emoji" id="hero-emoji"></span>
          <div class="hero-title">
            <h2 id="hero-name"></h2>
            <span class="spec-badge" id="hero-spec"></span>
          </div>
          <div class="hero-reward">
            <span class="muted">reward</span>
            <strong id="hero-reward"></strong>
          </div>
        </div>
        <div class="progress hero-progress">
          <div class="progress-fill" id="hero-fill"></div>
          <span class="progress-label" id="hero-label"></span>
        </div>
        <div class="hero-stats">
          <span class="hstat">${icon('energy', 15)}<span id="hero-rate"></span></span>
          <span class="hstat">${icon('clock', 15)}<span id="hero-eta"></span></span>
          <span class="hstat">${icon('check', 15)}<span id="hero-completions"></span></span>
        </div>
      </section>
      <button class="goal-chip" id="goal-chip" hidden></button>
      <main id="tab-content"></main>
      <nav class="tabbar">
        ${TABS.map(
          (tab) => `
          <button class="tab-btn" data-action="tab:${tab.id}" id="tab-btn-${tab.id}">
            <span class="tab-icon">${icon(tab.icon ?? (tab.id as IconName), 24)}</span><span>${t(`ui.tab.${tab.id}`)}</span>
          </button>`,
        ).join('')}
      </nav>
      <div id="coach-zone"></div>
      <div id="sheet-zone"></div>
      <div id="toast-zone"></div>
      <div id="modal-zone"></div>
    `;
  }

  // -------------------------------------------------------------------------
  // Per-frame + periodic updates
  // -------------------------------------------------------------------------

  frame(dt: number): void {
    const s = this.state;
    this.text('hud-money', formatMoney(walletMoney(s)));
    document.getElementById('hud-money')?.classList.toggle('negative', walletMoney(s) < 0);
    const income = estimatedIncome(s);
    const incomeEl = document.getElementById('hud-income');
    if (incomeEl) {
      incomeEl.textContent = `${income >= 0 ? '▲' : '▼'} ${formatMoney(income)}/s`;
      incomeEl.classList.toggle('negative', income < 0);
    }
    this.text('hud-salary', `salaries ${formatMoney(totalSalaries(s))}/s`);
    this.text('company-name', activeCompany(s).name);
    this.text('hud-vscoin-text', formatNumber(s.vsCoin));

    // Missions badge: dot while anything is claimable (offline included);
    // live completions additionally toast (baseline taken silently).
    const claimable = claimableMissions(s);
    document
      .getElementById('tab-btn-vscoin')
      ?.classList.toggle(
        'has-badge',
        claimable.length > 0 || claimableDailyContracts(s).length > 0,
      );
    if (this.knownCompleted === null) {
      this.knownCompleted = new Set(claimable.map((m) => m.id));
    } else {
      for (const m of claimable) {
        if (!this.knownCompleted.has(m.id)) {
          this.knownCompleted.add(m.id);
          this.toast(`🏅 ${t('ui.missionComplete')}`, 'info');
        }
      }
    }

    const vaultEl = document.getElementById('hud-vault');
    if (vaultEl) {
      vaultEl.hidden = s.vault.amount <= 0;
      if (s.vault.amount > 0) this.text('hud-vault-text', formatMoney(s.vault.amount));
    }
    const boost = activeBoost(s);
    const boostEl = document.getElementById('hud-boost');
    if (boostEl) {
      boostEl.hidden = boost === null;
      if (boost) {
        this.text('hud-boost-text', `×${boost.mult} ${formatDuration(boost.remainingSec)}`);
      }
    }

    const company = activeCompany(s);
    const project = getProject(company, company.activeProjectId);
    const def = projectDefById(project.defId);
    const rate = totalWorkRate(s);
    const heroArt = document.getElementById('hero-emoji');
    if (heroArt && heroArt.dataset.art !== def.id) {
      heroArt.dataset.art = def.id;
      heroArt.innerHTML = projectArt(def.id, 42);
    }
    this.text('hero-name', def.name);
    this.text('hero-spec', def.specialization);
    this.text('hero-reward', formatMoney(project.currentReward));
    const pct = Math.min(100, (project.progress / project.currentWork) * 100);
    const fill = document.getElementById('hero-fill');
    if (fill) fill.style.width = `${pct}%`;
    this.text(
      'hero-label',
      `${formatNumber(project.progress)} / ${formatNumber(project.currentWork)}`,
    );
    this.text('hero-rate', formatRate(rate));
    this.text(
      'hero-eta',
      rate > 0 ? formatDuration((project.currentWork - project.progress) / rate) : '—',
    );
    this.text('hero-completions', `×${project.completions}`);

    // Rebuild the active tab a couple of times per second to refresh costs,
    // affordability and progress details without redoing it every frame.
    this.rebuildTimer += dt;
    if (this.rebuildTimer >= 0.5) {
      this.rebuildTimer = 0;
      this.rebuildTab();
      this.updateNarrative();
    }
  }

  // -------------------------------------------------------------------------
  // Narrative: Gabriel tutorial coach + story beats
  // -------------------------------------------------------------------------

  /** Advance tutorial/story state and sync their DOM. Cheap and idempotent. */
  private updateNarrative(): void {
    const s = this.state;
    const progressed = refreshTutorial(s);
    if (progressed) saveGame(s);
    const step = currentTutorialStep(s);
    if ((step?.id ?? null) !== this.coachStep) {
      this.coachStep = step?.id ?? null;
      this.renderCoach(step);
    }
    advanceStory(s);
    const beat = currentStoryBeat(s);
    const zone = document.getElementById('modal-zone');
    if (beat && zone && zone.childElementCount === 0) {
      this.showStoryModal(beat);
    }
  }

  private renderCoach(step: TutorialStepDef | null): void {
    const zone = document.getElementById('coach-zone');
    if (!zone) return;
    for (const tab of TABS) {
      document.getElementById(`tab-btn-${tab.id}`)?.classList.remove('tab-attention');
    }
    if (!step) {
      zone.innerHTML = '';
      return;
    }
    if (step.tab) {
      document.getElementById(`tab-btn-${step.tab}`)?.classList.add('tab-attention');
    }
    const idx = TUTORIAL_STEPS.findIndex((def) => def.id === step.id);
    const pose: GabrielPose = step.tab ? 'point' : step.id === 'outro' ? 'cheer' : 'idle';
    const text = lookup(`tutorial.${step.id}.text`, {
      gift: formatMoney(TUTORIAL_ANGEL_GIFT),
      name: this.state.player.name,
    });
    const input =
      step.input === 'country'
        ? `<div class="coach-country-grid">
             ${COUNTRIES.map(
               (c) => `
               <button class="btn btn-small ${this.state.activeCountryId === c.id ? 'btn-primary' : ''}"
                       data-action="tutorial-country:${c.id}">
                 ${c.emoji} ${lookup(`country.${c.id}.name`)}
               </button>`,
             ).join('')}
           </div>`
        : step.input
          ? `<div class="coach-input-row">
               <input id="tut-input" class="coach-input" type="text"
                      maxlength="${step.input === 'avatar-name' ? 20 : 30}"
                      placeholder="${step.input === 'avatar-name' ? t('ui.namePlaceholder') : t('ui.companyPlaceholder')}" />
               <button class="btn btn-primary btn-small" data-action="tutorial-submit">
                 ${t('ui.confirm')}
               </button>
             </div>`
          : '';
    const next =
      !step.input && !step.isComplete
        ? `<button class="btn btn-primary btn-small" data-action="tutorial-next">${t('ui.next')}</button>`
        : '';
    zone.innerHTML = `
      <div class="coach card">
        <div class="coach-gabriel">${gabrielDialogPortrait(pose, 62)}</div>
        <div class="coach-main">
          <div class="coach-head">
            <strong>${t('ui.gabriel')}</strong>
            <span class="muted">${t('ui.tutorialStep', { step: idx + 1, total: TUTORIAL_STEPS.length })}</span>
          </div>
          <p class="coach-text">${text}</p>
          ${input}
          <div class="coach-actions">
            ${next}
            <button class="btn btn-ghost btn-small" data-action="tutorial-skip">
              ${t('ui.skipTutorial')}
            </button>
          </div>
        </div>
      </div>`;
    this.positionCoach();
  }

  /**
   * Anchor the coach card next to the current step's target and keep the
   * target highlighted — the popup must never cover the element it is
   * explaining. Target resolution: the step's own target selector (when
   * visible) → the step's tab button (player is on another tab) → docked
   * bottom card (steps with no target, e.g. naming). Re-run on every 2 Hz
   * rebuild, resize and scroll: tab re-renders replace target nodes freely.
   */
  private positionCoach(): void {
    const card = document.querySelector<HTMLElement>('#coach-zone .coach');
    const step = card ? currentTutorialStep(this.state) : null;
    let el: Element | null = null;
    let inPage = false;
    if (step) {
      if (step.target) {
        el = document.querySelector(step.target);
        // Ignore matches hidden inside collapsed/other-tab containers.
        if (el && (el as HTMLElement).offsetParent === null) el = null;
        inPage = el !== null;
      }
      if (!el && step.tab && step.tab !== this.tab) {
        el = document.getElementById(`tab-btn-${step.tab}`);
      }
    }
    // Bring the in-page target into view once per step+tab, so popup and
    // target are both visible when the step starts or the tab opens —
    // without fighting the player's own scrolling afterwards.
    const scrollKey = step && el && inPage ? `${step.id}:${this.tab}` : '';
    if (scrollKey && scrollKey !== this.coachScrollKey) {
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    this.coachScrollKey = scrollKey;
    if (this.coachTargetEl !== el) {
      this.coachTargetEl?.classList.remove('coach-target');
      this.coachTargetEl = el;
    }
    // Re-add every pass: innerHTML rebuilds recreate the node without it.
    el?.classList.add('coach-target');
    if (!card) return;
    if (!el) {
      card.classList.remove('coach-anchored');
      card.style.left = '';
      card.style.top = '';
      card.style.width = '';
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(560, vw - 20);
    card.classList.add('coach-anchored');
    card.style.width = `${width}px`;
    const t = el.getBoundingClientRect();
    const pos = placeCoach(
      { width, height: card.offsetHeight },
      { left: t.left, top: t.top, width: t.width, height: t.height },
      { width: vw, height: vh },
    );
    card.style.left = `${pos.left}px`;
    card.style.top = `${pos.top}px`;
  }

  /** Avatar customization dialog (re-rendered in place on every change). */
  private renderCustomizer(): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    const look = this.state.player.look;
    const rows = PLAYER_LOOK_FIELDS.map((field) => {
      // The portrait row picks a raster card: 0 = the drawn look below.
      const value =
        field === 'portrait'
          ? look.portrait === 0
            ? t('look.portraitClassic')
            : `#${look.portrait}`
          : String(look[field] + 1);
      return `
      <div class="customizer-row">
        <span class="customizer-label">${t(`look.${field}`)}</span>
        <div class="customizer-controls">
          <button class="btn btn-small" data-action="look-prev:${field}">‹</button>
          <span class="customizer-value">${value}</span>
          <button class="btn btn-small" data-action="look-next:${field}">›</button>
        </div>
      </div>`;
    }).join('');
    zone.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card customizer-modal">
          <h2>${t('ui.customize')}</h2>
          <div class="customizer-preview">${playerPortrait(look, 96)}</div>
          <div class="customizer-rows">${rows}</div>
          <button class="btn btn-primary" data-action="close-modal">${t('ui.done')}</button>
        </div>
      </div>`;
  }

  /**
   * Offer a random event (called by main.ts's scheduler). Returns false when
   * a story modal or another offer occupies the modal zone — the scheduler
   * just tries again later.
   */
  offerEvent(offer: EventOffer): boolean {
    const zone = document.getElementById('modal-zone');
    if (!zone || zone.childElementCount > 0 || this.pendingEvent) return false;
    this.pendingEvent = offer;
    const params = {
      cash: formatMoney(Math.abs(offer.cash)),
      duration: formatDuration(offer.durationSec),
      mult: offer.mult,
      salaryMult: offer.salaryMult,
    };
    zone.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card story-modal event-modal">
          <div class="story-gabriel">${gabrielDialogPortrait('think', 84)}</div>
          <span class="story-kicker">${offer.emoji} ${t('ui.eventKicker')}</span>
          <h2>${lookup(`event.${offer.id}.title`)}</h2>
          <p class="story-text">${lookup(`event.${offer.id}.text`, params)}</p>
          <div class="event-actions">
            <button class="btn btn-primary" data-action="event-accept">${t('ui.eventAccept')}</button>
            <button class="btn btn-ghost" data-action="event-decline">${t('ui.eventDecline')}</button>
          </div>
        </div>
      </div>`;
    this.fx.click();
    return true;
  }

  private closeEventModal(): void {
    this.pendingEvent = null;
    const zone = document.getElementById('modal-zone');
    if (zone) zone.innerHTML = '';
  }

  private showStoryModal(beatId: string): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    this.fx.storyChime();
    const pose: GabrielPose =
      beatId === 'agi-shipped' || beatId === 'dream-achieved' || beatId === 'new-venture'
        ? 'cheer'
        : 'think';
    zone.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card story-modal">
          <div class="story-gabriel">${gabrielDialogPortrait(pose, 84)}</div>
          <span class="story-kicker">${t('ui.storyTitle')}</span>
          <h2>${lookup(`story.${beatId}.title`)}</h2>
          <p class="story-text">${lookup(`story.${beatId}.text`)}</p>
          <button class="btn btn-primary" data-action="story-continue">${t('ui.continue')}</button>
        </div>
      </div>`;
  }

  /** Viewport point where payout FX should originate (hero progress bar). */
  payoutOrigin(): { x: number; y: number } {
    const el = document.getElementById('hero-fill')?.parentElement;
    if (!el) return { x: window.innerWidth / 2, y: 160 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  toast(message: string, kind: 'error' | 'info' = 'error'): void {
    const zone = document.getElementById('toast-zone');
    if (!zone) return;
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.textContent = message;
    zone.appendChild(el);
    setTimeout(() => el.classList.add('gone'), 1600);
    setTimeout(() => el.remove(), 2100);
  }

  /** Generic informational modal (e.g. the one-time beta-reset notice). */
  notice(title: string, text: string): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    zone.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal card">
          <h2>${title}</h2>
          <p>${text}</p>
          <button class="btn btn-primary" data-action="close-modal">${t('ui.continue')}</button>
        </div>
      </div>`;
  }

  welcomeBack(offlineSec: number, earnings: number): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    // The doubler button is the future rewarded-ad slot (free while in
    // beta): remember what the modal showed so the claim doubles exactly it.
    this.pendingOfflineEarnings = earnings;
    const blessing =
      earnings > 0 && offlineDoublerReady(this.state)
        ? `<button class="btn btn-primary" data-action="double-offline">
             😇 ${t('ui.doublerButton')}
           </button>`
        : '';
    zone.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal card">
          <h2>👋 Welcome back!</h2>
          <p>While you were away for <strong>${formatDuration(offlineSec)}</strong>,
          your team kept shipping:</p>
          <div class="modal-earnings">+${formatMoney(earnings)}</div>
          ${blessing}
          <button class="btn ${blessing ? '' : 'btn-primary'}" data-action="close-modal">Back to work</button>
        </div>
      </div>`;
  }

  // -------------------------------------------------------------------------
  // Tab rendering
  // -------------------------------------------------------------------------

  /**
   * Gabriel's next-best-action chip (2 Hz, with the tab rebuild). Hidden
   * during the tutorial and at endgame; "save up" styling when the step
   * isn't affordable yet.
   */
  private updateGoalChip(): void {
    const chip = document.getElementById('goal-chip') as HTMLButtonElement | null;
    if (!chip) return;
    const hint = nextGoalHint(this.state);
    if (!hint) {
      chip.hidden = true;
      return;
    }
    const GOAL_KEYS: Record<GoalHint['kind'], StringKey> = {
      hire: 'ui.goal.hire',
      desk: 'ui.goal.desk',
      'unlock-project': 'ui.goal.unlockProject',
      upgrade: 'ui.goal.upgrade',
      floor: 'ui.goal.floor',
      company: 'ui.goal.company',
      country: 'ui.goal.country',
    };
    const goal = t(GOAL_KEYS[hint.kind], { name: hint.targetName ?? '' });
    const label = hint.affordable
      ? t('ui.goalNext', { goal, cost: formatMoney(hint.cost) })
      : t('ui.goalSave', { goal, cost: formatMoney(hint.cost) });
    chip.hidden = false;
    chip.textContent = `💡 ${label}`;
    chip.classList.toggle('goal-chip-save', !hint.affordable);
    chip.dataset.action = `goal:${hint.tab}`;
  }

  private rebuildTab(): void {
    const content = document.getElementById('tab-content');
    if (!content) return;
    this.updateGoalChip();
    for (const t of TABS) {
      document.getElementById(`tab-btn-${t.id}`)?.classList.toggle('active', t.id === this.tab);
    }
    switch (this.tab) {
      case 'map':
        content.innerHTML = this.renderMap();
        this.refreshSheet();
        break;
      case 'office': {
        // The office scene holds looping CSS animations (typing personas) —
        // rebuilding it at 2 Hz would visibly reset them. Only rebuild the
        // scene on structural changes; refresh just the management sections
        // (#office-shop) otherwise. Levels without animations rebuild fully.
        const animated = this.officeLevel === 'building' || this.officeLevel === 'floor';
        const scene = document.getElementById('office-floor');
        if (!animated || !scene || this.officeDirty) {
          content.innerHTML = this.renderOffice();
          this.officeDirty = false;
        } else {
          const shop = document.getElementById('office-shop');
          if (shop) {
            shop.innerHTML =
              this.officeLevel === 'floor'
                ? this.renderFloorManage(this.officeFloorIdx)
                : this.renderOfficeShop();
          }
        }
        this.refreshHireSheet();
        break;
      }
      case 'shop':
        content.innerHTML = this.renderShop();
        break;
      case 'vscoin':
        content.innerHTML = `<div class="stack">${this.renderDailyContracts()}${this.renderMissions()}${this.renderVsCoinShop()}</div>`;
        break;
      case 'stats':
        content.innerHTML = this.renderStats();
        break;
    }
    // Tab content just changed under the coach popup — re-anchor it.
    this.positionCoach();
  }

  /** Shop tab: funding rounds — VsCoin in, progression-scaled cash out. */
  private renderShop(): string {
    const s = this.state;
    const inDebt = walletMoney(s) < 0;
    const cards = SHOP_CASH_PACKS.map((pack) => {
      const name = lookup(`shop.pack.${pack.id}.name`);
      if (!shopPackUnlocked(s, pack.id)) {
        return `
        <div class="card">
          <div class="card-row">
            <span class="muted">${pack.emoji} <b>${name}</b></span>
            <span class="muted">${icon('lock', 14)} ${t('ui.packRequires', {
              count: pack.requiresCompanies,
            })}</span>
          </div>
        </div>`;
      }
      const cash = shopPackCash(s, pack.id);
      const affordable = s.vsCoin >= pack.vsCoin;
      return `
        <div class="card">
          <div class="card-row">
            <span>${pack.emoji} <b>${name}</b></span>
            <strong>+${formatMoney(cash)}</strong>
          </div>
          <p class="muted">${lookup(`shop.pack.${pack.id}.blurb`)}</p>
          <div class="card-row">
            <span></span>
            <button class="btn btn-small ${affordable ? 'btn-primary' : ''}"
                    ${affordable ? '' : 'disabled'} data-action="buy-pack:${pack.id}">
              ${icon('vscoin', 14)} ${pack.vsCoin}
            </button>
          </div>
        </div>`;
    }).join('');
    const cap = vaultCap(s);
    const vaultPct = Math.min(100, (s.vault.amount / cap) * 100);
    const canOpen = s.vault.amount > 0 && s.vsCoin >= VAULT_OPEN_COST;
    const vaultCard = `
      <div class="card vault-card">
        <div class="card-row">
          <span class="card-emoji">🐷</span>
          <div class="card-main">
            <h3>${t('ui.vaultTitle')}${s.vault.amount >= cap ? ` <span class="cap-tag">${t('ui.vaultFull')}</span>` : ''}</h3>
            <span class="muted">${formatMoney(s.vault.amount)} / ${formatMoney(cap)}</span>
          </div>
          <button class="btn ${canOpen ? 'btn-primary' : ''}" ${canOpen ? '' : 'disabled'}
                  data-action="open-vault">
            🔨 ${t('ui.vaultOpen')} ${icon('vscoin', 14)} ${VAULT_OPEN_COST}
          </button>
        </div>
        <div class="progress mini"><div class="progress-fill" style="width:${vaultPct}%"></div></div>
        <p class="hint">${t('ui.vaultHint', { rate: Math.round(VAULT_RATE * 100) })}</p>
      </div>`;
    return `
      <div class="stack">
        <div class="section-head"><h2>💸 ${t('ui.shopTitle')}</h2>
          <span class="muted">${icon('vscoin', 16)} ${formatNumber(s.vsCoin)}</span>
        </div>
        ${vaultCard}
        <p class="hint">${t('ui.shopHint')}</p>
        ${inDebt ? `<div class="warning-banner">⚠️ ${t('ui.shopDebtNote')}</div>` : ''}
        ${cards}
      </div>`;
  }

  /** VsCoin tab: IAP-shaped SKUs; the starter pack is free during beta. */
  private renderVsCoinShop(): string {
    const s = this.state;
    const cards = VSCOIN_PACKS.map((pack) => {
      const name = lookup(`vscoin.pack.${pack.id}.name`);
      const freeBeta = BETA_FREE_IAP;
      if (freeBeta) {
        return `
        <div class="card">
          <div class="card-row">
            <span>${pack.emoji} <b>${name}</b>
              <span class="badge badge-vscoin">${t('ui.betaBadge')}</span></span>
            <strong>${icon('vscoin', 16)} ${pack.coins}</strong>
          </div>
          <p class="muted">${t('ui.vscoinBetaNote')}</p>
          <div class="card-row">
            <span></span>
            <button class="btn btn-small btn-primary" data-action="claim-vscoin:${pack.id}">
              🎁 ${t('ui.claimFree')}
            </button>
          </div>
        </div>`;
      }
      return `
        <div class="card">
          <div class="card-row">
            <span class="muted">${pack.emoji} <b>${name}</b></span>
            <span class="muted">${icon('vscoin', 16)} ${pack.coins}</span>
          </div>
          <div class="card-row">
            <span></span>
            <button class="btn btn-small" disabled>${icon('lock', 14)} ${t('ui.comingSoon')}</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="stack">
        <div class="section-head"><h2>${icon('vscoin', 20)} ${t('ui.vscoinTitle')}</h2>
          <span class="muted">${icon('vscoin', 16)} ${formatNumber(s.vsCoin)}</span>
        </div>
        <p class="hint">${t('ui.vscoinHint')}</p>
        ${cards}
      </div>`;
  }

  /** The map: an illustrated city where every site is a tappable building. */
  private renderMap(): string {
    const s = this.state;
    const country = activeCountry(s);
    const sites: SiteView[] = COMPANY_SITES.map((site) => {
      const company = companyAtSite(s, site.id);
      if (!company) {
        const building = siteUnderConstruction(country, site.id);
        return {
          id: site.id,
          status: 'free' as const,
          label: building ? `🏗️ ${site.name}` : site.name,
        };
      }
      return {
        id: site.id,
        status: company.id === country.activeCompanyId ? ('active' as const) : ('owned' as const),
        label: company.name,
      };
    });
    const themes = MAP_THEMES.map((def) => {
      const owned = s.ownedMapThemes.includes(def.id);
      const active = s.mapThemeId === def.id;
      const affordable = country.money >= def.cost;
      if (owned) {
        return `<button class="btn btn-small ${active ? 'btn-primary' : ''}"
                        ${active ? 'disabled' : ''} data-action="set-map-theme:${def.id}">
                  ${def.emoji} ${def.name}${active ? ' ✓' : ''}
                </button>`;
      }
      return `<button class="btn btn-small" ${affordable ? '' : 'disabled'}
                      data-action="buy-map-theme:${def.id}">
                ${def.emoji} ${def.name} · ${formatMoney(def.cost)}
              </button>`;
    }).join('');

    return `
      <div class="stack map-screen">
        <div class="section-head"><h2>${lookup(`country.${country.id}.name`)}</h2>
          <span class="muted">${t('ui.sitesOwned', { owned: country.companies.length, total: COMPANY_SITES.length })}</span>
        </div>
        ${cityMapSvg(s.mapThemeId, sites, country.id)}
        ${this.renderWorld()}
        <div class="section-head"><h2>${t('ui.mapStyle')}</h2></div>
        <div class="settings-row">${themes}</div>
        <p class="hint">💡 ${t('ui.mapHint')}</p>
      </div>`;
  }

  /**
   * International Business: visible once any city is fully owned. Travel
   * freely between unlocked countries; buy the next one with local cash.
   */
  private renderWorld(): string {
    const s = this.state;
    if (!worldUnlocked(s) && s.countries.length <= 1) return '';
    const cost = countryUnlockCost(s);
    const rows = COUNTRIES.map((def) => {
      const owned = s.countries.find((c) => c.id === def.id);
      if (owned) {
        const here = s.activeCountryId === def.id;
        const income = owned.money;
        return `
        <div class="card">
          <div class="card-row">
            <span class="card-emoji">${def.emoji}</span>
            <div class="card-main">
              <h3>${lookup(`country.${def.id}.name`)}</h3>
              <span class="muted">${owned.companies.length}/${COMPANY_SITES.length} sites ·
                ${formatMoney(income)}</span>
            </div>
            ${
              here
                ? `<span class="active-tag">${t('ui.youAreHere')}</span>`
                : `<button class="btn btn-primary" data-action="travel:${def.id}">
                     ✈️ ${t('ui.travel')}</button>`
            }
          </div>
        </div>`;
      }
      const affordable = walletMoney(s) >= cost;
      return `
        <div class="card ${worldUnlocked(s) ? '' : 'locked'}">
          <div class="card-row">
            <span class="card-emoji">${def.emoji}</span>
            <div class="card-main">
              <h3>${lookup(`country.${def.id}.name`)}</h3>
              <span class="muted">${t('ui.freshEconomyHint')}</span>
            </div>
            <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                    data-action="unlock-country:${def.id}">
              🌍 ${formatMoney(cost)}
            </button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="section-head"><h2>🌍 ${t('ui.world')}</h2>
        <span class="muted">${s.countries.length}/${COUNTRIES.length}</span>
      </div>
      <p class="hint">${t('ui.worldHint', {
        bonus: Math.round((s.countries.length - 1) * WORLD_OUTPUT_PER_COUNTRY * 100),
      })}</p>
      ${rows}`;
  }

  /** Bottom-sheet body for the currently selected map site. */
  private renderSiteSheet(): string {
    const s = this.state;
    const site = siteById(this.sheetSiteId!);
    const company = companyAtSite(s, site.id);
    if (company) {
      const active = company.id === activeCountry(s).activeCompanyId;
      const income = companyIncome(s, company);
      const seats = company.workstations.length;
      return `
        <div class="sheet-head">
          <h2>${company.name}</h2>
          ${active ? `<span class="active-tag">${t('ui.managing')}</span>` : ''}
        </div>
        <p class="sheet-blurb">${site.name} — ${site.blurb}</p>
        <div class="sheet-stats">
          <div class="sheet-stat"><span>${t('ui.statIncome')}</span>
            <strong class="${income < 0 ? 'negative' : ''}">${income >= 0 ? '▲' : '▼'} ${formatMoney(income)}/s</strong></div>
          <div class="sheet-stat"><span>${t('ui.statSiteBonus')}</span><strong>×${site.outputBonus}</strong></div>
          ${site.favoredSpec ? `<div class="sheet-stat"><span>${t('ui.siteSpecialty')}</span><strong>${site.favoredSpec} +${Math.round((SITE_SPEC_BONUS - 1) * 100)}%</strong></div>` : ''}
          <div class="sheet-stat"><span>${t('ui.statTeam')}</span><strong>${t('ui.teamStat', { people: company.workers.length, desks: seats })}</strong></div>
          <div class="sheet-stat"><span>${t('ui.statSalaries')}</span><strong>${formatMoney(companySalaries(company))}/s</strong></div>
          <div class="sheet-stat"><span>${t('ui.statOutput')}</span><strong>${formatRate(companyWorkRate(s, company))}</strong></div>
          <div class="sheet-stat"><span>${t('ui.statFloors')}</span><strong>${company.floors}/${MAX_FLOORS}</strong></div>
        </div>
        <div class="sheet-actions">
          ${
            active
              ? `<button class="btn" data-action="rename-company">${icon('pencil', 15)} Rename</button>
                 <button class="btn btn-primary" disabled>✓ ${t('ui.managingBtn')}</button>`
              : `<button class="btn btn-primary" data-action="switch-company:${company.id}">
                   ${t('ui.manageCompany')}</button>`
          }
        </div>`;
    }
    const building = siteUnderConstruction(activeCountry(s), site.id);
    if (building) {
      const pct = Math.min(100, (1 - building.remainingSec / building.totalSec) * 100);
      const ffCost = fastForwardCost(s, building);
      return `
        <div class="sheet-head"><h2>🏗️ ${site.name}</h2></div>
        <p class="sheet-blurb">${t('ui.siteBuilding', {
          time: formatDuration(building.remainingSec),
        })} · 👷 ${t('ui.builderOnSite')}</p>
        <div class="progress mini training">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-primary" ${ffCost === 0 || s.vsCoin >= ffCost ? '' : 'disabled'}
                  data-action="fast-forward:${building.id}">
            ⚡ ${ffCost === 0 ? t('ui.free') : `${icon('vscoin', 14)} ${ffCost}`}
          </button>
        </div>`;
    }
    const price = companyCost(s, site.id);
    const affordable = walletMoney(s) >= price;
    return `
      <div class="sheet-head"><h2>${site.name}</h2></div>
      <p class="sheet-blurb">${site.blurb}</p>
      <div class="sheet-stats">
        <div class="sheet-stat"><span>${t('ui.statPrice')}</span><strong>${formatMoney(price)}</strong></div>
        <div class="sheet-stat"><span>${t('ui.statSiteBonus')}</span><strong>×${site.outputBonus}</strong></div>
          ${site.favoredSpec ? `<div class="sheet-stat"><span>${t('ui.siteSpecialty')}</span><strong>${site.favoredSpec} +${Math.round((SITE_SPEC_BONUS - 1) * 100)}%</strong></div>` : ''}
        <div class="sheet-stat"><span>${t('ui.contractScale')}</span><strong>×${formatNumber(site.projectScale)} rewards</strong></div>
      </div>
      <div class="sheet-actions">
        <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                data-action="found-company:${site.id}">
          🏗️ ${t('ui.foundCompanyBtn', { price: formatMoney(price) })}
        </button>
      </div>`;
  }

  private openSheet(siteId: string): void {
    this.sheetSiteId = siteId;
    const zone = document.getElementById('sheet-zone');
    if (!zone) return;
    zone.innerHTML = `
      <div class="sheet-backdrop" data-action="close-sheet"></div>
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div id="sheet-body">${this.renderSiteSheet()}</div>
      </div>`;
  }

  /** Keep an open sheet's numbers fresh without restarting its animation. */
  private refreshSheet(): void {
    if (!this.sheetSiteId) return;
    const body = document.getElementById('sheet-body');
    if (body) body.innerHTML = this.renderSiteSheet();
  }

  private closeSheet(): void {
    this.sheetSiteId = null;
    this.hireOpen = false;
    const zone = document.getElementById('sheet-zone');
    if (zone) zone.innerHTML = '';
  }

  /** Contracts: the company's project portfolio (unlock + main project). */
  private renderContracts(): string {
    const s = this.state;
    const c = activeCompany(s);
    const lastUnlockedIdx = PROJECTS.reduce(
      (acc, def, i) => (getProject(c, def.id).unlocked ? i : acc),
      0,
    );
    const cards = PROJECTS.map((def, i) => {
      const p = getProject(c, def.id);
      if (p.unlocked) {
        const active = c.activeProjectId === def.id;
        const pct = Math.min(100, (p.progress / p.currentWork) * 100);
        return `
        <button class="card project-card ${active ? 'active-project' : ''}"
                data-action="select-project:${def.id}">
          <div class="card-row">
            <span class="card-emoji">${projectArt(def.id, 38)}</span>
            <div class="card-main">
              <h3>${def.name}</h3>
              <span class="spec-badge spec-${def.specialization.replace(' ', '')}">
                ${def.specialization}${siteById(c.siteId).favoredSpec === def.specialization ? ` ★${SITE_SPEC_BONUS}x` : ''}
              </span>
            </div>
            <div class="card-right">
              <strong>${formatMoney(p.currentReward)}</strong>
              <span class="muted">×${p.completions}${
                p.currentReward >= projectRewardCap(c, def.id)
                  ? ` · <span class="cap-tag" title="${t('ui.softCapHint')}">${t('ui.softCap')}</span>`
                  : ''
              }</span>
            </div>
          </div>
          <div class="progress mini"><div class="progress-fill" style="width:${pct}%"></div></div>
          ${active ? '<span class="active-tag">ACTIVE</span>' : ''}
        </button>`;
      }
      if (i <= lastUnlockedIdx + 2) {
        const unlockPrice = projectUnlockCost(c, def.id);
        const affordable = walletMoney(s) >= unlockPrice;
        return `
        <div class="card project-card locked">
          <div class="card-row">
            <span class="card-emoji locked-art">${projectArt(def.id, 38)}</span>
            <div class="card-main">
              <h3>${def.name}</h3>
              <span class="spec-badge">${def.specialization}</span>
            </div>
            <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                    data-action="unlock-project:${def.id}">
              ${t('ui.unlockBtn', { price: formatMoney(unlockPrice) })}
            </button>
          </div>
        </div>`;
      }
      return '';
    }).join('');
    return `
      <div class="section-head"><h2>📋 ${t('ui.contracts')}</h2></div>
      ${cards}`;
  }

  /** Trait badges (emoji + name, description in the tooltip). */
  private traitBadges(traits: string[]): string {
    return traits
      .map(
        (id) => `
        <span class="trait-badge" title="${lookup(`trait.${id}.desc`)}">
          ${traitById(id).emoji} ${lookup(`trait.${id}.name`)}
        </span>`,
      )
      .join('');
  }

  /** Hiring popup: candidate cards + reroll, as a bottom sheet. */
  private openHire(): void {
    this.hireOpen = true;
    const zone = document.getElementById('sheet-zone');
    if (!zone) return;
    zone.innerHTML = `
      <div class="sheet-backdrop" data-action="close-sheet"></div>
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div id="sheet-body">${this.renderHireSheet()}</div>
      </div>`;
  }

  /** Keep the open hire sheet fresh without restarting its animations. */
  private refreshHireSheet(): void {
    if (!this.hireOpen) return;
    const body = document.getElementById('sheet-body');
    if (body) body.innerHTML = this.renderHireSheet();
  }

  private renderHireSheet(): string {
    const s = this.state;
    const c = activeCompany(s);
    const candidates = c.candidates
      .map((cand, i) => {
        const tier = tierById(cand.tierId);
        const price = hireCost(c, cand.tierId);
        const affordable = walletMoney(s) >= price;
        const rare = cand.traits.length >= 2;
        const salary = tierSalary(c, cand.tierId) * traitSalaryMult(cand.traits);
        return `
        <div class="card candidate-card ${rare ? 'candidate-rare' : ''}">
          <span class="card-emoji persona-slot">${employeePortrait(`c:${cand.name}:${cand.tierId}`, cand.specialization, cand.tierId)}</span>
          <div class="card-main">
            <h3>${cand.name}${rare ? ` <span class="rare-tag">★ ${t('ui.rareBadge')}</span>` : ''}</h3>
            <span class="muted">${tier.title} · ${formatRate(tier.baseRate)} · ${formatMoney(salary)}/s</span>
            <span class="spec-badge spec-${cand.specialization.replace(' ', '')}">${cand.specialization}</span>
            ${this.traitBadges(cand.traits)}
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="hire:${i}">
            ${t('ui.hire')} ${formatMoney(price)}
          </button>
        </div>`;
      })
      .join('');
    return `
      <div class="section-head">
        <h2>🤝 ${t('ui.candidates')}</h2>
        <button class="btn btn-ghost" data-action="reroll"
                ${walletMoney(s) >= c.candidateRerollCost ? '' : 'disabled'}>
          ${icon('dice', 16)} ${t('ui.newBatch')} ${formatMoney(c.candidateRerollCost)}
        </button>
      </div>
      ${candidates}
      <button class="btn btn-ghost" data-action="close-sheet">${t('ui.close')}</button>`;
  }

  private renderWorkerCard(w: WorkerState): string {
    const s = this.state;
    const c = activeCompany(s);
    const tier = tierById(w.tierId);
    const rate = workerRate(s, c, w, c.activeProjectId);
    const specMatch =
      projectDefById(c.activeProjectId).specialization === w.specialization;
    const station = c.workstations.find((st) => st.id === w.stationId);
    const deskLabel = station
      ? `${stationDefById(station.defId).emoji} ${stationDefById(station.defId).name}`
      : `⚠️ ${t('ui.noDesk')}`;
    const expPct = Math.min(100, (w.experience / expToNextLevel(w.skillLevel)) * 100);
    const cost = trainCost(c, w);
    const action = c.timedActions.find(
      (a) => a.targetId === w.id && (a.kind === 'training' || a.kind === 'promotion'),
    );
    const actionPct = action
      ? Math.min(100, (1 - action.remainingSec / action.totalSec) * 100)
      : 0;
    const capped = atSkillCap(w);
    const statusLabel = action
      ? action.kind === 'training'
        ? `🎓 ${t('ui.inTraining', { levels: action.levels ?? 0, time: formatDuration(action.remainingSec) })}`
        : `🎖️ ${t('ui.inPromotion', { title: tierById(action.toTierId!).title, time: formatDuration(action.remainingSec) })}`
      : `${tier.title} · ${deskLabel}`;
    const progressBar = action
      ? `<div class="progress mini training" title="${action.kind}">
           <div class="progress-fill" style="width:${actionPct}%"></div>
         </div>`
      : `<div class="progress mini exp" title="${t('ui.expTitle')}">
           <div class="progress-fill" style="width:${expPct}%"></div>
         </div>`;
    const ffCost = action ? fastForwardCost(s, action) : 0;
    const ffBtn = action
      ? `<button class="btn btn-small btn-primary" ${ffCost === 0 || s.vsCoin >= ffCost ? '' : 'disabled'}
                 data-action="fast-forward:${action.id}">
           ⚡ ${ffCost === 0 ? t('ui.free') : `${icon('vscoin', 14)} ${ffCost}`}
         </button>`
      : '';
    const promote = capped && nextTier(w) !== null;
    const actionBtn = action
      ? ''
      : promote
        ? `<button class="btn btn-small ${walletMoney(s) >= promoteCost(c, w)! ? 'btn-primary' : ''}"
                   ${walletMoney(s) >= promoteCost(c, w)! ? '' : 'disabled'}
                   data-action="promote:${w.id}"
                   title="${tierById(nextTier(w)!).title}">
             🎖️ ${t('ui.promote')} ${formatMoney(promoteCost(c, w)!)}
           </button>`
        : capped
          ? `<span class="muted">🏔️ ${t('ui.maxGrade')}</span>`
          : `<button class="btn btn-small" ${walletMoney(s) >= cost ? '' : 'disabled'}
                     data-action="train:${w.id}"
                     title="+${trainLevels(w)} levels, ${formatDuration(trainDurationSec(c, w))} off the floor">
               ${icon('train', 15)} ${t('ui.trainBtn', { price: formatMoney(cost) })}
             </button>`;
    return `
      <div class="card worker-card ${station || action ? '' : 'benched'} ${action ? 'training' : ''}">
        <div class="card-row">
          <span class="card-emoji persona-slot">${employeePortrait(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}</span>
          <div class="card-main">
            <h3>${w.name} <span class="lvl">Lv ${w.skillLevel}${capped ? ` / ${tier.maxSkill}` : ''}</span></h3>
            <span class="muted">${statusLabel}</span>
            <span class="spec-badge spec-${w.specialization.replace(' ', '')}">
              ${w.specialization}${specMatch ? ' ★1.5x' : ''}
            </span>
            ${this.traitBadges(w.traits)}
          </div>
          <div class="card-right">
            <strong>${formatRate(rate)}</strong>
            <span class="muted">-${formatMoney(workerSalary(c, w))}/s</span>
          </div>
        </div>
        ${progressBar}
        <div class="card-actions">
          ${actionBtn}
          ${ffBtn}
          <button class="btn btn-small btn-danger" data-action="fire:${w.id}">${t('ui.fireBtn')}</button>
        </div>
      </div>`;
  }

  private renderOffice(): string {
    switch (this.officeLevel) {
      case 'companies':
        return this.renderCompanyList();
      case 'floor':
        return this.renderFloorView(this.officeFloorIdx);
      case 'staff':
        return this.renderStaffRoom();
      default:
        return `
      <div class="stack">
        <div id="office-floor">${this.renderOfficeFloor()}</div>
        <div id="office-shop">${this.renderOfficeShop()}</div>
      </div>`;
    }
  }

  /** Office level 1: the country's companies; tap one to enter its building. */
  private renderCompanyList(): string {
    const s = this.state;
    const country = activeCountry(s);
    const cards = country.companies
      .map((c) => {
        const site = siteById(c.siteId);
        const active = c.id === country.activeCompanyId;
        return `
        <button class="card company-card ${active ? 'active-project' : ''}"
                data-action="office-open:${c.id}">
          <div class="card-row">
            <span class="card-emoji">${site.emoji}</span>
            <div class="card-main">
              <h3>${c.name}</h3>
              <span class="muted">${site.name} · ${c.floors}/${MAX_FLOORS} 🏢</span>
            </div>
            <div class="card-right">
              <strong>👥 ${c.workers.length}</strong>
              <span class="muted">🖥️ ${c.workstations.length}</span>
            </div>
          </div>
        </button>`;
      })
      .join('');
    return `
      <div class="stack">
        <div class="section-head"><h2>${t('ui.officeCompanies')}</h2></div>
        ${cards}
        <p class="hint">🗺️ ${t('ui.foundOnMap')}</p>
      </div>`;
  }

  /** Office level 3: one floor, enlarged — desks, people and project slot. */
  private renderFloorView(f: number): string {
    const s = this.state;
    const c = activeCompany(s);
    if (f < 0 || f >= c.floors) {
      this.officeLevel = 'building';
      return this.renderOffice();
    }
    const wpId = effectiveWallpaper(s, c);
    const slots: ({ id: number; defId: string } | null)[] = c.workstations.slice(
      f * FLOOR_CAPACITY,
      (f + 1) * FLOOR_CAPACITY,
    );
    while (slots.length < FLOOR_CAPACITY) slots.push(null);
    const tiles = slots.map((st) => this.renderDeskTile(c, st)).join('');
    const perks = UPGRADES.filter((u) => (c.upgrades[u.id] ?? 0) > 0)
      .map((u) => upgradeProp(u.id))
      .join('');
    const wall = f === 0 && perks ? perks : wallDecor(wpId, f);
    const label = f === 0 ? t('ui.groundFloor') : t('ui.floorN', { floor: f + 1 });
    return `
      <div class="stack">
        <div class="section-head">
          <button class="btn btn-small btn-ghost" data-action="office-building">
            ${t('ui.officeBackToBuilding')}
          </button>
          <h2>${label}</h2>
          <button class="btn btn-small btn-primary" data-action="open-hire">
            🤝 ${t('ui.hireEmployees')}
          </button>
        </div>
        <div id="office-floor">
          <div class="building card floor-zoom" style="${officeWallVars(wpId)}">
            <div class="floor-block">
              <div class="floor-wall">
                <span class="floor-label">${label}</span>
                ${wall}
              </div>
              <div class="office-grid">${tiles}</div>
            </div>
          </div>
        </div>
        <div id="office-shop">${this.renderFloorManage(f)}</div>
      </div>`;
  }

  /** Management sections of the enlarged floor (refreshed at 2 Hz). */
  private renderFloorManage(f: number): string {
    const s = this.state;
    const c = activeCompany(s);
    const floorStations = c.workstations
      .map((st, i) => ({ st, i }))
      .filter(({ i }) => Math.floor(i / FLOOR_CAPACITY) === f)
      .map(({ st }) => st);

    // This floor's project slot.
    const current = c.floorProjects[f] ?? '';
    const options = [
      `<option value="" ${current === '' ? 'selected' : ''}>${t('ui.mainProject')}</option>`,
      ...c.projects
        .filter((p) => p.unlocked)
        .map(
          (p) => `
          <option value="${p.defId}" ${current === p.defId ? 'selected' : ''}>
            ${projectDefById(p.defId).name}
          </option>`,
        ),
    ].join('');
    const projectCard = `
      <div class="card">
        <div class="section-head"><h2>${t('ui.floorProjectTitle')}</h2></div>
        <p class="hint">${t('ui.projectSlotsHint')}</p>
        <div class="settings-row">
          <span class="settings-label">${projectDefById(floorProject(c, f)).name}</span>
          <select class="coach-input" data-select="floor-project:${f}">${options}</select>
        </div>
      </div>`;

    // Desks on this floor: in-place renovations, one card per desk.
    const inFlight = c.timedActions.filter((a) => a.kind === 'desk-upgrade');
    const byTarget = new Map(inFlight.map((a) => [a.targetId, a]));
    const deskCards = floorStations
      .map((st) => {
        const def = stationDefById(st.defId);
        const action = byTarget.get(st.id);
        if (action && action.toDefId) {
          const pct = Math.min(100, (1 - action.remainingSec / action.totalSec) * 100);
          const ffCost = fastForwardCost(s, action);
          return `
        <div class="card">
          <div class="card-row">
            <span class="card-emoji">🛠️</span>
            <div class="card-main">
              <h3>${def.name} → ${stationDefById(action.toDefId).name}</h3>
              <span class="muted">${t('ui.deskUpgrading', { time: formatDuration(action.remainingSec) })}</span>
            </div>
            <button class="btn btn-small btn-primary" ${ffCost === 0 || s.vsCoin >= ffCost ? '' : 'disabled'}
                    data-action="fast-forward:${action.id}">
              ⚡ ${ffCost === 0 ? t('ui.free') : `${icon('vscoin', 14)} ${ffCost}`}
            </button>
          </div>
          <div class="progress mini training"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
        }
        const to = nextStationDef(st.defId);
        if (!to) {
          return `
        <div class="card">
          <div class="card-row">
            <span class="card-emoji">${stationArt(st.defId, 38)}</span>
            <div class="card-main">
              <h3>${def.name}</h3>
              <span class="muted">×${def.multiplier} · 🏔️ ${t('ui.maxGrade')}</span>
            </div>
          </div>
        </div>`;
        }
        const toDef = stationDefById(to);
        const cost = deskUpgradeCost(c, st.defId)!;
        const duration = deskUpgradeDurationSec(st.defId)!;
        const affordable = walletMoney(s) >= cost;
        return `
        <div class="card">
          <div class="card-row">
            <span class="card-emoji">${stationArt(st.defId, 38)}</span>
            <div class="card-main">
              <h3>${def.name} → ${toDef.name}</h3>
              <span class="muted">×${def.multiplier} → ×${toDef.multiplier} · ${formatDuration(duration)}</span>
            </div>
            <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                    data-action="upgrade-desk:${st.id}">
              ${t('ui.upgradeDesk')} ${formatMoney(cost)}
            </button>
          </div>
        </div>`;
      })
      .join('');

    // New desks land on the lowest floor with free slots — offer the shop
    // here only when that floor is this one.
    const nextIdx = c.workstations.length;
    const buyHere =
      nextIdx < deskCapacity(c) && Math.floor(nextIdx / FLOOR_CAPACITY) === f
        ? this.renderWorkstationShop()
        : '';

    // People seated on this floor.
    const floorIds = new Set(floorStations.map((st) => st.id));
    const workers = c.workers.filter((w) => w.stationId !== null && floorIds.has(w.stationId));
    const roster = workers.length
      ? workers.map((w) => this.renderWorkerCard(w)).join('')
      : `<div class="empty-hint">${t('ui.noFloorWorkers')}</div>`;

    return `
      ${projectCard}
      <div class="section-head"><h2>🖥️ ${t('ui.renovations')}</h2></div>
      ${deskCards}
      ${buyHere}
      <div class="section-head"><h2>👥 ${t('ui.floorEmployees')}</h2></div>
      ${roster}`;
  }

  /** The staff room: every company upgrade, marketing and decor in one spot. */
  private renderStaffRoom(): string {
    return `
      <div class="stack">
        <div class="section-head">
          <button class="btn btn-small btn-ghost" data-action="office-building">
            ${t('ui.officeBackToBuilding')}
          </button>
          <h2>☕ ${t('ui.staffRoom')}</h2>
        </div>
        <p class="hint">${t('ui.staffRoomHint')}</p>
        ${this.renderUpgrades()}
        ${this.renderPetShop()}
        ${this.renderDecorShop()}
      </div>`;
  }

  /** Pet corner: zero-power VsCoin companions, picked per company. */
  private renderPetShop(): string {
    const s = this.state;
    const c = activeCompany(s);
    const cards = PETS.map((pet) => {
      const owned = s.ownedPets.includes(pet.id);
      const active = c.petId === pet.id;
      const affordable = s.vsCoin >= pet.vsCoinCost;
      const action = owned
        ? `<button class="btn btn-small" ${active ? 'disabled' : ''}
                   data-action="set-pet:${pet.id}">
             ${active ? `✓ ${t('ui.petHere')}` : t('ui.petAdopt')}
           </button>`
        : `<button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                   data-action="buy-pet:${pet.id}">
             ${t('ui.buyBtn', { price: `${pet.vsCoinCost}` })} ${icon('vscoin', 14)}
           </button>`;
      return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${pet.emoji}</span>
          <div class="card-main">
            <h3>${pet.name}</h3>
            <span class="muted">${owned ? t('ui.decorOwned') : t('ui.petHint')}</span>
          </div>
          ${action}
        </div>
      </div>`;
    }).join('');
    const dismiss =
      c.petId !== null
        ? `<button class="btn btn-ghost" data-action="set-pet:none">🏠 ${t('ui.petDismiss')}</button>`
        : '';
    return `
      <div class="section-head"><h2>🐾 ${t('ui.petsTitle')}</h2></div>
      ${cards}
      ${dismiss}`;
  }

  /** One desk tile: occupied (persona typing), empty desk, or free slot. */
  private renderDeskTile(
    c: CompanyState,
    st: { id: number; defId: string } | null,
  ): string {
    if (st === null) {
      return `
        <div class="desk-tile free" title="${t('ui.freeSlotTitle')}">
          <span class="free-slot">＋</span>
          <span class="desk-name muted">${t('ui.freeSlot')}</span>
        </div>`;
    }
    const def = stationDefById(st.defId);
    const worker = c.workers.find((w) => w.stationId === st.id);
    if (worker) {
      const tier = tierById(worker.tierId);
      return `
        <button class="desk-tile occupied" data-action="poke:${worker.id}"
                title="${worker.name} — ${tier.title} at a ${def.name}">
          ${personaAtDesk(`w:${worker.id}:${worker.name}`, worker.specialization, worker.tierId, def.id)}
          <span class="desk-name">${worker.name.split(' ')[0]}</span>
          <span class="desk-info">×${def.multiplier}</span>
        </button>`;
    }
    return `
        <div class="desk-tile empty" title="${def.name} — ${t('ui.emptyDesk')}">
          ${emptyDeskSvg(def.id)}
          <span class="desk-name muted">${t('ui.emptyDesk')}</span>
          <span class="desk-info">×${def.multiplier}</span>
        </div>`;
  }

  /** The building: floors top-down, each holding FLOOR_CAPACITY desk slots. */
  private renderOfficeFloor(): string {
    const s = this.state;
    const c = activeCompany(s);
    // Purchase order: desk index ÷ FLOOR_CAPACITY IS the engine's floor
    // (stationFloor), so what you see on a floor is what works its project.
    const stations: ({ id: number; defId: string } | null)[] = [...c.workstations];
    const wpId = effectiveWallpaper(s, c);
    // Bought upgrades show up as real props on the ground floor ("perks floor").
    const perks = UPGRADES.filter((u) => (c.upgrades[u.id] ?? 0) > 0)
      .map((u) => upgradeProp(u.id))
      .join('');
    const floorBlocks: string[] = [];
    for (let f = c.floors; f >= 1; f--) {
      const slots = stations.slice((f - 1) * FLOOR_CAPACITY, f * FLOOR_CAPACITY);
      while (slots.length < FLOOR_CAPACITY) slots.push(null);
      const tiles = slots.map((st) => this.renderDeskTile(c, st)).join('');
      const wall = f === 1 && perks ? perks : wallDecor(wpId, f - 1);
      floorBlocks.push(`
        <div class="floor-block">
          <div class="floor-wall">
            <span class="floor-label">${f === 1 ? t('ui.groundFloor') : t('ui.floorN', { floor: f })}</span>
            <button class="btn btn-small btn-ghost floor-manage" data-action="office-floor:${f - 1}">
              🔍 ${t('ui.manageFloor')}
            </button>
            ${wall}
          </div>
          <div class="office-grid">${tiles}</div>
        </div>`);
    }
    // The staff room tops the building — enter it like any floor.
    floorBlocks.unshift(`
        <div class="floor-block staff-room">
          <div class="floor-wall">
            <span class="floor-label">☕ ${t('ui.staffRoom')}</span>
            <button class="btn btn-small btn-ghost floor-manage" data-action="office-staff">
              🔍 ${t('ui.manageFloor')}
            </button>
          </div>
        </div>`);
    const atMax = c.floors >= MAX_FLOORS;
    const nextCost = floorCost(c);
    const building = floorUnderConstruction(c);
    if (building) {
      // The rising floor tops the building as scaffolding while it builds.
      floorBlocks.unshift(`
        <div class="floor-block" style="opacity:.65">
          <div class="floor-wall">
            <span class="floor-label">🏗️ ${t('ui.floorBuildingShort')}</span>
            ${constructionDecor()}
          </div>
        </div>`);
    }
    const buildPct = building
      ? Math.min(100, (1 - building.remainingSec / building.totalSec) * 100)
      : 0;
    const buildFfCost = building ? fastForwardCost(s, building) : 0;
    const floorBtn = building
      ? `<div class="card" style="flex:1">
           <div class="card-row">
             <span>🏗️ ${t('ui.floorBuilding', {
               floor: c.floors + 1,
               time: formatDuration(building.remainingSec),
             })} · 👷 ${t('ui.builderOnSite')}</span>
             <button class="btn btn-small btn-primary"
                     ${buildFfCost === 0 || s.vsCoin >= buildFfCost ? '' : 'disabled'}
                     data-action="fast-forward:${building.id}">
               ⚡ ${buildFfCost === 0 ? t('ui.free') : `${icon('vscoin', 14)} ${buildFfCost}`}
             </button>
           </div>
           <div class="progress mini training">
             <div class="progress-fill" style="width:${buildPct}%"></div>
           </div>
         </div>`
      : atMax
        ? `<span class="muted">🏁 ${t('ui.maxHeight')}</span>`
        : floorGiftAvailable(s)
          ? `<button class="btn btn-primary" data-action="claim-floor-gift">
               🎁 ${t('ui.floorGift')}
             </button>`
          : `<button class="btn ${walletMoney(s) >= nextCost ? 'btn-primary' : ''}"
                 ${walletMoney(s) >= nextCost ? '' : 'disabled'} data-action="buy-floor">
           ${icon('floor-up', 16)} ${t('ui.addFloorBtn', { price: formatMoney(nextCost) })}
         </button>`;

    const country = activeCountry(s);
    const free = freeBuilders(country);
    const price = builderCost(country);
    const canHire = 'cash' in price ? walletMoney(s) >= price.cash : s.vsCoin >= price.vsCoin;
    const priceLabel =
      'cash' in price ? formatMoney(price.cash) : `${icon('vscoin', 14)} ${price.vsCoin}`;
    const builderBar = `
      <div class="floor-actions" title="${t('ui.builderGiftHint', { name: t('ui.builderGiftName') })}">
        <span class="${free > 0 ? '' : 'muted'}">👷 <b>${t('ui.builders')}</b> ·
          ${t('ui.buildersFree', { free, total: country.builders.count })}</span>
        <button class="btn btn-small ${canHire ? 'btn-primary' : ''}" ${canHire ? '' : 'disabled'}
                data-action="hire-builder">
          ${t('ui.hireBuilder')} ${priceLabel}
        </button>
      </div>`;

    const standing = c.workers
      .filter((w) => w.stationId === null && !workerBusy(c, w.id))
      .map(
        (w) => `
        <button class="stand-slot" data-action="poke:${w.id}" title="${w.name} — needs a desk!">
          ${personaStanding(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}
          <span class="desk-name">${w.name.split(' ')[0]}</span>
        </button>`,
      )
      .join('');

    const inTraining = c.workers
      .filter((w) => workerBusy(c, w.id))
      .map((w) => {
        const action = c.timedActions.find(
          (a) => a.targetId === w.id && (a.kind === 'training' || a.kind === 'promotion'),
        )!;
        return `
        <button class="stand-slot training" data-action="poke:${w.id}"
                title="${w.name} — back in ${formatDuration(action.remainingSec)}">
          ${personaStanding(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}
          <span class="desk-name">${action.kind === 'training' ? '🎓' : '🎖️'} ${w.name.split(' ')[0]}</span>
        </button>`;
      })
      .join('');

    const companyNav =
      activeCountry(s).companies.length > 1
        ? `<button class="btn btn-small btn-ghost" data-action="office-companies">
             ${t('ui.officeAllCompanies')}
           </button>`
        : '';
    return `
      <div class="section-head">
        ${companyNav}
        <h2>${c.name}</h2>
        <button class="btn btn-small btn-primary" data-action="open-hire">
          🤝 ${t('ui.hireEmployees')}
        </button>
      </div>
      <div class="section-head">
        <span class="muted">${t('ui.desksUsed', { used: c.workstations.length, total: deskCapacity(c) })} ·
          ${c.floors}/${MAX_FLOORS} 🏢</span>
      </div>
      ${builderBar}
      <div class="floor-actions">${floorBtn}</div>
      <div class="building card" style="${officeWallVars(wpId)}">
        <div class="roof-band">${roofDecor(wpId)}</div>
        ${floorBlocks.join('')}
        <div class="lobby-band">${lobbyDecor(wpId)}${
          c.petId ? `<span class="office-pet os-anim-bob" title="${petById(c.petId).name}">${petById(c.petId).emoji}</span>` : ''
        }</div>
      </div>
      ${
        standing
          ? `<div class="warning-banner">⚠️ ${t('ui.waitingDesk')}</div>
             <div class="stand-row card">${standing}</div>`
          : ''
      }
      ${
        inTraining
          ? `<div class="section-head"><h2>🎓 ${t('ui.awayTraining')}</h2></div>
             <div class="stand-row card">${inTraining}</div>`
          : ''
      }
      <p class="hint">💡 ${t('ui.officeHint', { slots: FLOOR_CAPACITY })}</p>`;
  }

  private renderOfficeShop(): string {
    const c = activeCompany(this.state);
    const benched = c.workers.filter((w) => w.stationId === null);
    const benchedCards = benched.length
      ? `<div class="section-head"><h2>${t('ui.offFloor', { count: benched.length })}</h2></div>
         ${benched.map((w) => this.renderWorkerCard(w)).join('')}`
      : '';
    return `
      <div class="stack">
        ${this.renderWorkstationShop()}
        ${this.renderDeskUpgrades()}
        ${benchedCards}
        ${this.renderContracts()}
      </div>`;
  }

  /** Workstation shop: buy the next desk (it lands on the lowest open slot). */
  private renderWorkstationShop(): string {
    const s = this.state;
    const c = activeCompany(s);
    const full = c.workstations.length >= deskCapacity(c);
    const shop = WORKSTATIONS.map((def) => {
      const owned = c.workstations.filter((w) => w.defId === def.id).length;
      const cost = stationCost(c, def.id);
      const affordable = !full && walletMoney(s) >= cost;
      return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${stationArt(def.id, 38)}</span>
          <div class="card-main">
            <h3>${def.name}</h3>
            <span class="muted">×${def.multiplier} output · owned ${owned}</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="buy-station:${def.id}">
            ${t('ui.buyBtn', { price: formatMoney(cost) })}
          </button>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="section-head"><h2>${t('ui.buyWorkstations')}</h2>
        ${full ? `<span class="muted">🈵 ${t('ui.officeFullBadge')}</span>` : ''}
      </div>
      ${shop}`;
  }

  /** Renovations: upgrade owned desks in place (money + time per desk). */
  private renderDeskUpgrades(): string {
    const s = this.state;
    const c = activeCompany(s);
    const inFlight = c.timedActions.filter((a) => a.kind === 'desk-upgrade');
    const upgradingIds = new Set(inFlight.map((a) => a.targetId));
    const cards = WORKSTATIONS.map((def) => {
      const to = nextStationDef(def.id);
      if (!to) return '';
      const candidates = c.workstations.filter(
        (w) => w.defId === def.id && !upgradingIds.has(w.id),
      );
      if (candidates.length === 0) return '';
      const toDef = stationDefById(to);
      const cost = deskUpgradeCost(c, def.id)!;
      const duration = deskUpgradeDurationSec(def.id)!;
      const affordable = walletMoney(s) >= cost;
      return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${stationArt(def.id, 38)}</span>
          <div class="card-main">
            <h3>${def.name} → ${toDef.name}</h3>
            <span class="muted">×${def.multiplier} → ×${toDef.multiplier} output ·
              ${formatDuration(duration)} · ${candidates.length} available</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="upgrade-desk:${candidates[0].id}">
            ${t('ui.upgradeDesk')} ${formatMoney(cost)}
          </button>
        </div>
      </div>`;
    }).join('');
    const running = inFlight
      .map((a) => {
        const station = c.workstations.find((w) => w.id === a.targetId);
        if (!station || !a.toDefId) return '';
        const pct = Math.min(100, (1 - a.remainingSec / a.totalSec) * 100);
        const ffCost = fastForwardCost(s, a);
        return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">🛠️</span>
          <div class="card-main">
            <h3>${stationDefById(station.defId).name} → ${stationDefById(a.toDefId).name}</h3>
            <span class="muted">${t('ui.deskUpgrading', { time: formatDuration(a.remainingSec) })}</span>
          </div>
          <button class="btn btn-small btn-primary" ${ffCost === 0 || s.vsCoin >= ffCost ? '' : 'disabled'}
                  data-action="fast-forward:${a.id}">
            ⚡ ${ffCost === 0 ? t('ui.free') : `${icon('vscoin', 14)} ${ffCost}`}
          </button>
        </div>
        <div class="progress mini training"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
      })
      .join('');
    if (!cards && !running) return '';
    return `
      <div class="section-head"><h2>${t('ui.renovations')}</h2></div>
      ${running}${cards}`;
  }

  /** Wallpaper shop: buy once, then apply per company or as player default. */
  private renderDecorShop(): string {
    const s = this.state;
    const c = activeCompany(s);
    const applied = effectiveWallpaper(s, c);
    const cards = WALLPAPERS.map((def) => {
      const owned = s.ownedWallpapers.includes(def.id);
      const isApplied = applied === def.id;
      const isDefault = s.defaultWallpaperId === def.id;
      const affordable =
        def.vsCoinCost !== undefined ? s.vsCoin >= def.vsCoinCost : walletMoney(s) >= def.cost;
      const priceLabel =
        def.vsCoinCost !== undefined
          ? `${icon('vscoin', 14)} ${def.vsCoinCost}`
          : formatMoney(def.cost);
      const actions = owned
        ? `
          <button class="btn btn-small" ${isApplied ? 'disabled' : ''}
                  data-action="apply-wallpaper:${def.id}">
            ${isApplied ? `✓ ${t('ui.applied')}` : t('ui.applyHere')}
          </button>
          <button class="btn btn-small btn-ghost" ${isDefault ? 'disabled' : ''}
                  data-action="default-wallpaper:${def.id}">
            ${isDefault ? `✓ ${t('ui.isDefault')}` : t('ui.setDefault')}
          </button>`
        : `
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="buy-wallpaper:${def.id}">
            ${t('ui.buyBtn', { price: priceLabel })}
          </button>`;
      return `
      <div class="card decor-card ${isApplied ? 'applied' : ''}">
        <div class="card-row">
          <span class="decor-swatch" style="${officeWallVars(def.id)}">${def.emoji}</span>
          <div class="card-main">
            <h3>${def.name}</h3>
            <span class="muted">${owned ? t('ui.decorOwned') : t('ui.decorUnlocks')}</span>
          </div>
          <div class="card-actions">${actions}</div>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="section-head"><h2>${t('ui.decorTitle')}</h2>
        <span class="muted">${c.wallpaperId === null ? t('ui.decorFollowsDefault') : t('ui.decorFollowsOwn')}</span>
      </div>
      ${cards}
      ${
        c.wallpaperId !== null
          ? `<button class="btn btn-ghost" data-action="apply-wallpaper:default">
               ↩️ ${t('ui.followDefault')}</button>`
          : ''
      }`;
  }

  private renderUpgrades(): string {
    const s = this.state;
    const c = activeCompany(s);
    const mkCost = marketingCost(s);
    const mkAffordable = walletMoney(s) >= mkCost;
    const marketing = `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${upgradeArt('marketing', 38)}</span>
          <div class="card-main">
            <h3>${t('ui.marketingName')}</h3>
            <span class="muted">${t('ui.marketingDesc', { mult: MARKETING_MULT, duration: formatDuration(MARKETING_DURATION_SEC) })}</span>
          </div>
          <button class="btn ${mkAffordable ? 'btn-primary' : ''}" ${mkAffordable ? '' : 'disabled'}
                  data-action="buy-marketing">
            ${t('ui.launchBtn', { price: formatMoney(mkCost) })}
          </button>
        </div>
      </div>`;
    const owned = activeCountry(s).companies.length;
    const cards = UPGRADES.map((def) => {
      const required = def.requiresCompanies ?? 1;
      if (owned < required) {
        return `
      <div class="card locked">
        <div class="card-row">
          <span class="card-emoji locked-art">${upgradeArt(def.id, 38)}</span>
          <div class="card-main">
            <h3>${def.name}</h3>
            <span class="muted">${def.description}</span>
          </div>
          <span class="lock-hint">${icon('lock', 16)} ${t('ui.companiesReq', { count: required })}</span>
        </div>
      </div>`;
      }
      const premium = def.vsCoinCost !== undefined;
      const level = premium ? (s.globalUpgrades[def.id] ?? 0) : (c.upgrades[def.id] ?? 0);
      const maxed = level >= def.maxLevel;
      const premiumCost = upgradeVsCoinCost(s, def.id);
      const cost = premiumCost ?? upgradeCost(c, def.id);
      const affordable =
        !maxed && (premiumCost !== null ? s.vsCoin >= premiumCost : walletMoney(s) >= cost);
      const priceLabel =
        premiumCost !== null ? `${icon('vscoin', 14)} ${premiumCost}` : formatMoney(cost);
      return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${upgradeArt(def.id, 38)}</span>
          <div class="card-main">
            <h3>${def.name} <span class="lvl">Lv ${level}${maxed ? ' MAX' : ''}</span></h3>
            <span class="muted">${def.description}</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="buy-upgrade:${def.id}">
            ${maxed ? 'MAX' : t('ui.buyBtn', { price: priceLabel })}
          </button>
        </div>
      </div>`;
    }).join('');
    return `<div class="stack">${marketing}${cards}</div>`;
  }

  /** Today's contracts: the rotating daily board (VsCoin tab, above missions). */
  private renderDailyContracts(): string {
    const s = this.state;
    if (s.daily.contracts.length === 0) return '';
    const cards = s.daily.contracts
      .map((c) => {
        const progress = dailyProgress(s, c);
        const done = dailyCompleted(s, c);
        const claimed = dailyClaimed(s, c.id);
        const pct = Math.min(100, (progress / c.target) * 100);
        const money = c.metric === 'totalEarned';
        const label = t(`mission.${c.metric}`, {
          target: money ? formatMoney(c.target) : formatNumber(c.target),
        });
        const progressText = money
          ? `${formatMoney(progress)} / ${formatMoney(c.target)}`
          : `${formatNumber(progress)} / ${formatNumber(c.target)}`;
        const action = claimed
          ? `<span class="muted">✓ ${t('ui.claimed')}</span>`
          : done
            ? `<button class="btn btn-primary" data-action="claim-daily:${c.id}">
                 ${icon('vscoin', 15)} +${c.reward} ${t('ui.claim')}
               </button>`
            : `<span class="mission-reward">${icon('vscoin', 15)} +${c.reward}</span>`;
        return `
        <div class="card mission-card ${done ? 'mission-done' : ''}">
          <div class="card-row">
            <span class="card-emoji">${c.emoji}</span>
            <div class="card-main">
              <h3>${label}</h3>
              <span class="muted">${progressText}</span>
            </div>
            ${action}
          </div>
          <div class="progress mini"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join('');
    return `
      <div class="section-head"><h2>📅 ${t('ui.dailyTitle')}</h2></div>
      <p class="hint">${t('ui.dailyHint')}</p>
      ${cards}`;
  }

  private renderMissions(): string {
    const s = this.state;
    const cards = visibleMissions(s)
      .map((def) => {
        const progress = missionProgress(s, def);
        const done = missionCompleted(s, def);
        const pct = Math.min(100, (progress / def.target) * 100);
        const label = t(`mission.${def.metric}`, {
          target: def.metric === 'totalEarned' ? formatMoney(def.target) : formatNumber(def.target),
        });
        const progressText =
          def.metric === 'totalEarned'
            ? `${formatMoney(progress)} / ${formatMoney(def.target)}`
            : `${formatNumber(progress)} / ${formatNumber(def.target)}`;
        return `
        <div class="card mission-card ${done ? 'mission-done' : ''}">
          <div class="card-row">
            <span class="card-emoji">${def.emoji}</span>
            <div class="card-main">
              <h3>${label}</h3>
              <span class="muted">${progressText}</span>
            </div>
            ${
              done
                ? `<button class="btn btn-primary" data-action="claim-mission:${def.id}">
                     ${icon('vscoin', 15)} +${def.reward} ${t('ui.claim')}
                   </button>`
                : `<span class="mission-reward">${icon('vscoin', 15)} +${def.reward}</span>`
            }
          </div>
          <div class="progress mini"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join('');
    const boostAffordable = s.vsCoin >= VSCOIN_BOOST_COST;
    const shop = `
      <div class="card">
        <h2 class="card-title">${icon('vscoin', 18)} ${t('ui.vsCoinShop')}</h2>
        <p class="hint">${t('ui.vsCoinShopHint')}</p>
        <div class="card-row">
          <span class="card-emoji">🚀</span>
          <div class="card-main">
            <h3>${t('ui.vsCoinBoost', {
              mult: VSCOIN_BOOST_MULT,
              duration: formatDuration(VSCOIN_BOOST_DURATION_SEC),
            })}</h3>
          </div>
          <button class="btn ${boostAffordable ? 'btn-primary' : ''}"
                  ${boostAffordable ? '' : 'disabled'} data-action="buy-vscoin-boost">
            ${icon('vscoin', 15)} ${VSCOIN_BOOST_COST}
          </button>
        </div>
      </div>`;
    return `<div class="stack">${shop}${cards}</div>`;
  }

  /**
   * "Your story" journal: seen beats, re-readable, in arc order. Beats are
   * durable (story.seen), so this is a pure lookup — no state changes.
   */
  private renderStoryJournal(): string {
    const s = this.state;
    const seenBeats = STORY_BEATS.filter((b) => s.story.seen.includes(b.id));
    const body =
      seenBeats.length === 0
        ? `<p class="hint">${t('ui.storyJournalEmpty')}</p>`
        : seenBeats
            .map(
              (b) => `
          <details class="journal-beat">
            <summary>${lookup(`story.${b.id}.title`)}</summary>
            <p>${lookup(`story.${b.id}.text`)}</p>
          </details>`,
            )
            .join('');
    return `
      <div class="card">
        <h2 class="card-title">📖 ${t('ui.storyJournal')}</h2>
        <p class="hint">${t('ui.storyJournalProgress', {
          seen: seenBeats.length,
          total: STORY_BEATS.length,
        })}</p>
        ${body}
      </div>`;
  }

  private renderStats(): string {
    const s = this.state;
    const c = activeCompany(s);
    const companies = allCompanies(s);
    const employees = companies.reduce((sum, co) => sum + co.workers.length, 0);
    const desks = companies.reduce((sum, co) => sum + co.workstations.length, 0);
    const rows: [string, string, string][] = [
      [icon('coin', 16), t('ui.stat.totalEarned'), formatMoney(s.totalEarned)],
      [icon('check', 16), t('ui.stat.projects'), formatNumber(s.projectsCompleted)],
      [icon('office', 16), t('ui.stat.companies'), String(companies.length)],
      [icon('team', 16), t('ui.stat.employees'), String(employees)],
      [icon('star', 16), t('ui.stat.workstations'), String(desks)],
      [icon('energy', 16), t('ui.stat.output'), formatRate(totalWorkRate(s))],
      [icon('salary', 16), t('ui.stat.salaries'), `${formatMoney(totalSalaries(s))}/s`],
      [icon('clock', 16), t('ui.stat.timePlayed'), formatDuration(s.playTimeSec)],
      [icon('boost', 16), t('ui.stat.founded'), new Date(s.startedAt).toLocaleDateString()],
    ];
    const founder = `
      <div class="card founder-card">
        <h2 class="card-title">${icon('star', 18)} ${t('ui.founderOffice')}</h2>
        <div class="founder-scene">${founderOffice(s.player.look, officeStage(s))}</div>
        <div class="founder-bar">
          <strong class="founder-name">${s.player.name}</strong>
          <div class="founder-actions">
            <button class="btn btn-small" data-action="rename-player">
              ${icon('pencil', 14)} ${t('ui.renameAvatar')}
            </button>
            <button class="btn btn-small btn-primary" data-action="customize-avatar">
              ${t('ui.customize')}
            </button>
          </div>
        </div>
      </div>`;
    const prestigeUnlocked = s.story.seen.includes(PRESTIGE_STORY_BEAT);
    const prestigeGain = prestigePreview(s);
    const prestigeCard = `
      <div class="card">
        <h2 class="card-title">${icon('boost', 18)} ${t('ui.prestigeTitle')}</h2>
        ${
          prestigeUnlocked
            ? `
        <table class="stats-table">
          <tr><td><span class="stat-label">${icon('star', 16)}${t('ui.prestigeRep')}</span></td>
              <td>${formatNumber(s.prestige.reputation)}</td></tr>
          <tr><td><span class="stat-label">${icon('energy', 16)}${t('ui.prestigeMult')}</span></td>
              <td>×${prestigeMultiplier(s).toFixed(2)}</td></tr>
          <tr><td><span class="stat-label">${icon('coin', 16)}${t('ui.prestigeGain')}</span></td>
              <td>+${formatNumber(prestigeGain)}</td></tr>
        </table>
        <button class="btn btn-primary" data-action="prestige" ${prestigeGain < 1 ? 'disabled' : ''}>
          ${icon('boost', 16)} ${t('ui.prestigeButton')}
        </button>
        <p class="hint">${t('ui.prestigeHint')}</p>`
            : `<p class="hint">${t('ui.prestigeLocked')}</p>`
        }
      </div>`;
    return `
      <div class="stack">
        ${founder}
        ${prestigeCard}
        <div class="card">
          <h2 class="card-title">${icon('stats', 18)} ${c.name}</h2>
          <table class="stats-table">
            ${rows
              .map(
                ([i, k, v]) =>
                  `<tr><td><span class="stat-label">${i}${k}</span></td><td>${v}</td></tr>`,
              )
              .join('')}
          </table>
        </div>
        ${this.renderStoryJournal()}
        <div class="card">
          <h2 class="card-title">${t('ui.settingsTitle')}</h2>
          <div class="settings-row">
            <button class="btn" data-action="toggle-sound">
              ${s.settings.sound ? `${icon('sound-on', 16)} ${t('ui.soundOn')}` : `${icon('sound-off', 16)} ${t('ui.soundOff')}`}
            </button>
            <button class="btn" data-action="toggle-particles">
              ${icon('sparkles', 16)} ${s.settings.particles ? t('ui.effectsOn') : t('ui.effectsOff')}
            </button>
            <button class="btn" data-action="cycle-speed" title="${t('ui.speedTitle')}">
              ${icon('speed', 16)} ${t('ui.speedBtn', { scale: s.settings.timeScale })}
            </button>
          </div>
          <div class="settings-row">
            <button class="btn" data-action="toggle-music">
              ${s.settings.music ? `🎵 ${t('ui.musicOn')}` : `🎵 ${t('ui.musicOff')}`}
            </button>
            <span class="settings-label">${t('ui.musicVolume')}</span>
            <input type="range" min="0" max="100" step="5" class="music-volume"
                   value="${Math.round(s.settings.musicVolume * 100)}"
                   data-select="music-volume" ${s.settings.music ? '' : 'disabled'} />
          </div>
          <div class="settings-row">
            <span class="settings-label">${t('ui.language')}</span>
            ${(['auto', 'en', 'fr'] as const)
              .map(
                (lang) => `
              <button class="btn btn-small ${s.settings.language === lang ? 'btn-primary' : ''}"
                      ${s.settings.language === lang ? 'disabled' : ''}
                      data-action="set-language:${lang}">
                ${t(`ui.lang.${lang}`)}
              </button>`,
              )
              .join('')}
          </div>
          <div class="settings-row">
            <button class="btn" data-action="export-save">${icon('save-export', 16)} ${t('ui.exportSave')}</button>
            <button class="btn" data-action="import-save">${icon('save-import', 16)} ${t('ui.importSave')}</button>
            <button class="btn btn-danger" data-action="reset-game">${icon('trash', 16)} ${t('ui.resetGame')}</button>
          </div>
          <p class="hint">${t('ui.autosaveHint')}</p>
          <p class="hint">${t('ui.build')} ${__BUILD_SHA__} · ${__BUILD_DATE__}</p>
        </div>
      </div>`;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private handleClick(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || target.hasAttribute('disabled')) return;
    const [action, arg] = target.dataset.action!.split(':');
    const s = this.state;
    let error: string | null = null;
    let structural = true;

    switch (action) {
      case 'tab':
        this.tab = arg as Tab;
        this.closeSheet();
        break;
      case 'goal':
        // The goal chip: jump to the tab where the suggested step happens.
        this.tab = arg as Tab;
        this.closeSheet();
        break;
      case 'site':
        this.openSheet(arg);
        this.fx.click();
        structural = false;
        break;
      case 'close-sheet':
        this.closeSheet();
        structural = false;
        break;
      case 'select-project':
        error = setActiveProject(s, arg);
        break;
      case 'switch-company':
        error = setActiveCompany(s, Number(arg));
        break;
      case 'found-company':
        // No naming prompt: only the very first company is player-named;
        // every other company auto-assigns a local parody name on opening.
        error = buyCompany(s, arg);
        if (!error) {
          this.toast(`🏗️ ${t('ui.companyBuildStarted')}`, 'info');
          this.refreshSheet();
        }
        break;
      case 'unlock-project':
        error = unlockProject(s, arg);
        if (!error) this.toast(`🎉 ${t('ui.projectUnlocked')}`, 'info');
        break;
      case 'hire':
        error = hireWorker(s, Number(arg));
        if (!error) this.toast(`🤝 ${t('ui.welcomeAboard')}`, 'info');
        this.officeDirty = true;
        this.refreshHireSheet();
        break;
      case 'reroll':
        error = rerollCandidates(s);
        this.refreshHireSheet();
        break;
      case 'open-hire':
        this.openHire();
        break;
      case 'office-open':
        error = setActiveCompany(s, Number(arg));
        this.officeLevel = 'building';
        this.officeDirty = true;
        break;
      case 'office-companies':
        this.officeLevel = 'companies';
        this.officeDirty = true;
        break;
      case 'office-building':
        this.officeLevel = 'building';
        this.officeDirty = true;
        break;
      case 'office-floor':
        this.officeLevel = 'floor';
        this.officeFloorIdx = Number(arg);
        this.officeDirty = true;
        break;
      case 'office-staff':
        this.officeLevel = 'staff';
        this.officeDirty = true;
        break;
      case 'train':
        error = trainWorker(s, Number(arg));
        if (!error) this.toast(`🎓 ${t('ui.offToWorkshop')}`, 'info');
        break;
      case 'promote':
        error = promoteWorker(s, Number(arg));
        if (!error) this.toast(`🎖️ ${t('ui.promotionStarted')}`, 'info');
        break;
      case 'fast-forward':
        error = fastForwardAction(s, Number(arg));
        if (!error) this.toast(`⚡ ${t('ui.fastForwarded')}`, 'info');
        break;
      case 'fire': {
        const worker = activeCompany(s).workers.find((w) => w.id === Number(arg));
        if (worker && confirm(t('ui.fireConfirm', { name: worker.name }))) {
          error = fireWorker(s, Number(arg));
        }
        break;
      }
      case 'buy-station':
        error = buyWorkstation(s, arg);
        break;
      case 'upgrade-desk':
        error = upgradeDesk(s, Number(arg));
        if (!error) this.toast(`🛠️ ${t('ui.deskUpgradeStarted')}`, 'info');
        break;
      case 'buy-floor':
        error = buyFloor(s);
        if (!error) this.toast(`🏗️ ${t('ui.floorBuildStarted')}`, 'info');
        break;
      case 'claim-floor-gift':
        error = claimFloorGift(s);
        if (!error) this.toast(`🎁 ${t('ui.floorGiftClaimed')}`, 'info');
        break;
      case 'hire-builder':
        error = hireBuilder(s);
        if (!error) this.toast(`👷 ${t('ui.hireBuilder')} ✓`, 'info');
        break;
      case 'claim-vscoin': {
        const coins = vsCoinPackById(arg).coins;
        error = claimVsCoinPack(s, arg);
        if (!error) {
          this.toast(`${t('ui.vscoinClaimed', { coins })}`, 'info');
          this.fx.coinChime();
        }
        break;
      }
      case 'buy-pet':
        error = buyPet(s, arg);
        if (!error) this.toast(`🐾 ${t('ui.petAdopted')}`, 'info');
        break;
      case 'set-pet':
        error = setCompanyPet(s, arg === 'none' ? null : arg);
        break;
      case 'open-vault':
        error = openVault(s);
        if (!error) {
          this.toast(`🐷 ${t('ui.vaultOpened')}`, 'info');
          this.fx.coinChime();
        }
        break;
      case 'buy-pack':
        error = buyShopPack(s, arg);
        if (!error) {
          this.toast(
            `💸 ${t('ui.packBought', {
              name: lookup(`shop.pack.${arg}.name`),
              cash: formatMoney(shopPackCash(s, arg)),
            })}`,
            'info',
          );
        }
        break;
      case 'buy-wallpaper':
        error = buyWallpaper(s, arg);
        if (!error) this.toast(`🎨 ${t('ui.wallpaperUnlocked')}`, 'info');
        break;
      case 'apply-wallpaper':
        error = setCompanyWallpaper(s, arg === 'default' ? null : arg);
        break;
      case 'default-wallpaper':
        error = setDefaultWallpaper(s, arg);
        break;
      case 'buy-map-theme':
        error = buyMapTheme(s, arg);
        if (!error) this.toast(`🗺️ ${t('ui.newMapStyle')}`, 'info');
        break;
      case 'set-map-theme':
        error = setMapTheme(s, arg);
        break;
      case 'poke': {
        // Pure fun: poked workers talk. No progress impact — core stays idle.
        const bubble = document.createElement('span');
        bubble.className = 'speech-bubble';
        bubble.textContent = SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)];
        target.appendChild(bubble);
        setTimeout(() => bubble.remove(), 2200);
        this.fx.click();
        structural = false;
        break;
      }
      case 'buy-upgrade':
        error = buyUpgrade(s, arg);
        break;
      case 'claim-mission':
        error = claimMission(s, arg);
        if (!error) {
          this.toast(`💎 ${t('ui.claimed')}`, 'info');
          this.fx.claimChime();
        }
        break;
      case 'claim-daily':
        error = claimDailyContract(s, arg);
        if (!error) {
          this.toast(`📅 ${t('ui.claimed')}`, 'info');
          this.fx.claimChime();
        }
        break;
      case 'buy-vscoin-boost':
        error = buyVsCoinBoost(s);
        if (!error) this.toast(`🚀 ${t('ui.vsCoinBoostBought')}`, 'info');
        break;
      case 'rename-company': {
        const company = activeCompany(s);
        if (s.tutorial.done) {
          const ok = confirm(
            t('ui.renameCostConfirm', {
              cash: formatMoney(renameCashCost(company)),
              coins: renameVsCoinCost(company),
            }),
          );
          if (!ok) break;
        }
        const name = prompt(t('ui.companyPlaceholder'), company.name);
        if (name !== null) error = renameCompany(s, name);
        break;
      }
      case 'travel':
        error = setActiveCountry(s, arg);
        if (!error) {
          this.closeSheet();
          this.toast(`✈️ ${lookup(`country.${arg}.name`)}`, 'info');
        }
        break;
      case 'unlock-country':
        error = unlockCountry(s, arg);
        if (!error) {
          this.closeSheet();
          this.toast(`🌍 ${t('ui.countryUnlocked', { name: lookup(`country.${arg}.name`) })}`, 'info');
        }
        break;
      case 'buy-marketing':
        error = buyMarketingCampaign(s);
        if (!error) this.toast(`📣 ${t('ui.campaignLive')}`, 'info');
        break;
      case 'cycle-speed': {
        const idx = TIME_SCALES.indexOf(s.settings.timeScale);
        error = setTimeScale(s, TIME_SCALES[(idx + 1) % TIME_SCALES.length]);
        break;
      }
      case 'toggle-sound':
        s.settings.sound = !s.settings.sound;
        this.fx.soundEnabled = s.settings.sound;
        break;
      case 'toggle-music':
        // In a click handler = user gesture, so the AudioContext may start.
        s.settings.music = !s.settings.music;
        this.fx.setMusicVolume(s.settings.musicVolume);
        this.fx.setMusic(s.settings.music);
        break;
      case 'toggle-particles':
        s.settings.particles = !s.settings.particles;
        this.fx.enabled = s.settings.particles;
        break;
      case 'export-save': {
        const code = exportSave(s);
        navigator.clipboard?.writeText(code).catch(() => {});
        prompt(t('ui.saveCodeCopied'), code);
        structural = false;
        break;
      }
      case 'import-save': {
        const code = prompt(t('ui.pasteSaveCode'));
        if (code) {
          try {
            const next = importSave(code);
            this.state = next;
            this.onStateReplaced(next);
            this.toast(`✅ ${t('ui.saveImported')}`, 'info');
          } catch {
            error = t('ui.invalidSaveCode');
          }
        }
        break;
      }
      case 'double-offline': {
        const amount = this.pendingOfflineEarnings;
        error = claimOfflineDoubler(s, amount);
        if (!error) {
          this.pendingOfflineEarnings = 0;
          const zone = document.getElementById('modal-zone');
          if (zone) zone.innerHTML = '';
          this.toast(`😇 ${t('ui.doublerDone', { amount: formatMoney(amount) })}`, 'info');
        }
        break;
      }
      case 'prestige': {
        if (confirm(t('ui.prestigeConfirm'))) {
          error = prestigeReset(s);
          if (!error) {
            this.officeNeedsRebuild();
            this.toast(`🚀 ${t('ui.prestigeDone')}`, 'info');
          }
        }
        break;
      }
      case 'reset-game': {
        if (confirm('Really start over? Your company will be gone forever.')) {
          const next = resetGame();
          this.state = next;
          this.onStateReplaced(next);
          this.toast('🌱 Fresh start!', 'info');
        }
        break;
      }
      case 'close-modal': {
        // Ignore clicks inside the modal card unless they hit the button itself.
        const inModal = (e.target as HTMLElement).closest('.modal');
        if (inModal && !target.classList.contains('btn')) break;
        const zone = document.getElementById('modal-zone');
        if (zone) zone.innerHTML = '';
        structural = false;
        break;
      }
      case 'tutorial-next':
        error = advanceTutorial(s);
        if (!error) this.updateNarrative();
        break;
      case 'tutorial-skip':
        error = skipTutorial(s);
        if (!error) this.updateNarrative();
        break;
      case 'tutorial-submit': {
        const inputEl = document.getElementById('tut-input') as HTMLInputElement | null;
        const value = inputEl?.value ?? '';
        const step = currentTutorialStep(s);
        error =
          step?.input === 'avatar-name' ? setPlayerName(s, value) : renameCompany(s, value);
        if (!error) error = advanceTutorial(s);
        if (!error) this.updateNarrative();
        break;
      }
      case 'tutorial-country': {
        error = setStartingCountry(s, arg);
        if (!error) error = advanceTutorial(s);
        if (!error) this.updateNarrative();
        break;
      }
      case 'event-accept': {
        if (this.pendingEvent) {
          error = acceptEventOffer(s, this.pendingEvent);
          if (!error) {
            this.toast(`🤝 ${t('ui.eventAccepted')}`, 'info');
            this.closeEventModal();
          }
        }
        structural = false;
        break;
      }
      case 'event-decline':
        this.closeEventModal();
        structural = false;
        break;
      case 'story-continue': {
        error = dismissStoryBeat(s);
        const zone = document.getElementById('modal-zone');
        if (zone) zone.innerHTML = '';
        break;
      }
      case 'customize-avatar':
        this.renderCustomizer();
        structural = false;
        break;
      case 'look-prev':
      case 'look-next': {
        error = cyclePlayerLook(s, arg as PlayerLookField, action === 'look-next' ? 1 : -1);
        if (!error) this.renderCustomizer();
        structural = false;
        break;
      }
      case 'rename-player': {
        const name = prompt(t('ui.namePlaceholder'), s.player.name);
        if (name !== null) error = setPlayerName(s, name);
        break;
      }
      case 'set-language': {
        error = setLanguage(s, arg);
        if (!error) {
          setCurrentLang(resolveLang(s.settings.language, navigator.language));
          // The skeleton holds translated chrome (tab labels, HUD titles) —
          // rebuild it, then let rebuildTab repaint the active tab.
          this.buildSkeleton();
          this.officeDirty = true;
          this.coachStep = ''; // force the coach card to re-render translated
          this.updateNarrative();
        }
        break;
      }
      default:
        structural = false;
    }

    if (error) {
      // Engine errors are either raw text or i18n key ids; lookup() falls
      // back to the string itself, so both render.
      this.toast(lookup(error));
    } else if (action !== 'tab' && action !== 'poke') {
      this.fx.click();
      saveGame(this.state);
    }
    if (structural) {
      this.officeDirty = true;
      this.rebuildTab();
    }
  }

  /** Change events from data-select controls (floor→project assignment). */
  private handleChange(e: Event): void {
    const el = e.target as HTMLSelectElement;
    const spec = el.dataset?.select;
    if (!spec) return;
    const [kind, arg] = spec.split(':');
    if (kind === 'floor-project') {
      const error = assignFloorProject(this.state, Number(arg), el.value === '' ? null : el.value);
      if (error) {
        this.toast(lookup(error));
      } else {
        saveGame(this.state);
      }
      this.officeDirty = true;
      this.rebuildTab();
    }
    if (kind === 'music-volume') {
      const volume = Math.max(0, Math.min(1, Number(el.value) / 100));
      this.state.settings.musicVolume = volume;
      this.fx.setMusicVolume(volume);
      saveGame(this.state);
    }
  }

  /** Force the office floor to rebuild (seating changed outside a click). */
  officeNeedsRebuild(): void {
    this.officeDirty = true;
  }

  /** Quick scale "pop" on the money display — called on payouts. */
  moneyPulse(): void {
    const el = document.getElementById('hud-money');
    if (el && !el.classList.contains('pop')) {
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 320);
    }
  }

  replaceState(next: GameState): void {
    this.state = next;
    this.knownCompleted = null;
    this.fx.soundEnabled = next.settings.sound;
    this.fx.enabled = next.settings.particles;
    this.fx.setMusicVolume(next.settings.musicVolume);
    this.fx.setMusic(next.settings.music);
    setCurrentLang(resolveLang(next.settings.language, navigator.language));
    this.officeDirty = true;
    this.coachStep = '';
    this.rebuildTab();
    this.updateNarrative();
  }

  private text(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
}
