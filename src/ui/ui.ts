import {
  COMPANY_SITES,
  FLOOR_CAPACITY,
  MAP_THEMES,
  MARKETING_DURATION_SEC,
  MARKETING_MULT,
  MAX_FLOORS,
  PROJECTS,
  TIME_SCALES,
  TRAIN_DURATION_SEC,
  TUTORIAL_ANGEL_GIFT,
  UPGRADES,
  VSCOIN_BOOST_COST,
  VSCOIN_BOOST_DURATION_SEC,
  VSCOIN_BOOST_MULT,
  WALLPAPERS,
  WORKSTATIONS,
  projectDefById,
  siteById,
  stationDefById,
  tierById,
} from '../game/data';
import {
  activeBoost,
  activeCompany,
  buyCompany,
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
  totalWorkRate,
  trainCost,
  trainLevels,
  trainWorker,
  unlockProject,
  upgradeCost,
  workerRate,
} from '../game/engine';
import { formatDuration, formatMoney, formatNumber, formatRate } from '../game/format';
import {
  claimMission,
  missionCompleted,
  missionProgress,
  visibleMissions,
} from '../game/missions';
import { exportSave, importSave, resetGame, saveGame } from '../game/save';
import {
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
import type { Fx } from './fx';
import { gabriel, type GabrielPose } from './gabriel';
import { cityMapSvg, type SiteView } from './cityMap';
import { icon } from './icons';
import { lobbyDecor, officeWallVars, roofDecor, wallDecor } from './officeScene';
import { projectArt, stationArt, upgradeArt, upgradeProp } from './itemArt';
import { emptyDeskSvg, personaAtDesk, personaAvatar, personaStanding } from './persona';

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

type Tab = 'map' | 'projects' | 'team' | 'office' | 'upgrades' | 'missions' | 'stats';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'projects', label: 'Projects' },
  { id: 'team', label: 'Team' },
  { id: 'office', label: 'Office' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'missions', label: 'Missions' },
  { id: 'stats', label: 'Stats' },
];

export class UI {
  private root: HTMLElement;
  private fx: Fx;
  private state: GameState;
  private tab: Tab = 'projects';
  private rebuildTimer = 0;
  private officeDirty = true;
  private sheetSiteId: string | null = null;
  /** Tutorial step currently rendered in the coach card ('' = force redraw). */
  private coachStep: string | null | '' = '';
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
    this.buildSkeleton();
    this.rebuildTab();
    this.root.addEventListener('click', (e) => this.handleClick(e));
  }

  // -------------------------------------------------------------------------
  // Skeleton
  // -------------------------------------------------------------------------

  private buildSkeleton(): void {
    this.root.innerHTML = `
      <header class="hud">
        <div class="hud-row">
          <button class="company" data-action="rename-company" title="Rename company">
            ${icon('office', 16)} <span id="company-name"></span>
          </button>
          <div class="hud-badges">
            <span class="badge badge-boost" id="hud-boost" hidden title="Active boost">
              ${icon('boost', 13)}<span id="hud-boost-text"></span>
            </span>
            <span class="badge badge-income" id="hud-income" title="Estimated net income"></span>
            <button class="badge badge-vscoin" id="hud-vscoin" data-action="tab:missions" title="VsCoin">
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
      <main id="tab-content"></main>
      <nav class="tabbar">
        ${TABS.map(
          (t) => `
          <button class="tab-btn" data-action="tab:${t.id}" id="tab-btn-${t.id}">
            <span class="tab-icon">${icon(t.id, 24)}</span><span>${t.label}</span>
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
    this.text('hud-money', formatMoney(s.money));
    const income = estimatedIncome(s);
    const incomeEl = document.getElementById('hud-income');
    if (incomeEl) {
      incomeEl.textContent = `${income >= 0 ? '▲' : '▼'} ${formatMoney(income)}/s`;
      incomeEl.classList.toggle('negative', income < 0);
    }
    this.text('hud-salary', `salaries ${formatMoney(totalSalaries(s))}/s`);
    this.text('company-name', activeCompany(s).name);
    this.text('hud-vscoin-text', formatNumber(s.vsCoin));

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
    const input = step.input
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
        <div class="coach-gabriel">${gabriel(pose, 62)}</div>
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
  }

  private showStoryModal(beatId: string): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    const pose: GabrielPose =
      beatId === 'agi-shipped' || beatId === 'dream-achieved' ? 'cheer' : 'think';
    zone.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card story-modal">
          <div class="story-gabriel">${gabriel(pose, 84)}</div>
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

  welcomeBack(offlineSec: number, earnings: number): void {
    const zone = document.getElementById('modal-zone');
    if (!zone) return;
    zone.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal card">
          <h2>👋 Welcome back!</h2>
          <p>While you were away for <strong>${formatDuration(offlineSec)}</strong>,
          your team kept shipping:</p>
          <div class="modal-earnings">+${formatMoney(earnings)}</div>
          <button class="btn btn-primary" data-action="close-modal">Back to work</button>
        </div>
      </div>`;
  }

  // -------------------------------------------------------------------------
  // Tab rendering
  // -------------------------------------------------------------------------

  private rebuildTab(): void {
    const content = document.getElementById('tab-content');
    if (!content) return;
    for (const t of TABS) {
      document.getElementById(`tab-btn-${t.id}`)?.classList.toggle('active', t.id === this.tab);
    }
    switch (this.tab) {
      case 'map':
        content.innerHTML = this.renderMap();
        this.refreshSheet();
        break;
      case 'projects':
        content.innerHTML = this.renderProjects();
        break;
      case 'missions':
        content.innerHTML = this.renderMissions();
        break;
      case 'team':
        content.innerHTML = this.renderTeam();
        break;
      case 'office': {
        // The office floor holds looping CSS animations (typing personas) —
        // rebuilding it at 2 Hz would visibly reset them. Only rebuild the
        // floor on structural changes; refresh just the shop otherwise.
        const floor = document.getElementById('office-floor');
        if (!floor || this.officeDirty) {
          content.innerHTML = this.renderOffice();
          this.officeDirty = false;
        } else {
          const shop = document.getElementById('office-shop');
          if (shop) shop.innerHTML = this.renderOfficeShop();
        }
        break;
      }
      case 'upgrades':
        content.innerHTML = this.renderUpgrades();
        break;
      case 'stats':
        content.innerHTML = this.renderStats();
        break;
    }
  }

  /** The map: an illustrated city where every site is a tappable building. */
  private renderMap(): string {
    const s = this.state;
    const sites: SiteView[] = COMPANY_SITES.map((site) => {
      const company = companyAtSite(s, site.id);
      if (!company) return { id: site.id, status: 'free' as const, label: site.name };
      return {
        id: site.id,
        status: company.id === s.activeCompanyId ? ('active' as const) : ('owned' as const),
        label: company.name,
      };
    });
    const themes = MAP_THEMES.map((def) => {
      const owned = s.ownedMapThemes.includes(def.id);
      const active = s.mapThemeId === def.id;
      const affordable = s.money >= def.cost;
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
        <div class="section-head"><h2>Silicon Valley</h2>
          <span class="muted">${s.companies.length}/${COMPANY_SITES.length} sites owned</span>
        </div>
        ${cityMapSvg(s.mapThemeId, sites)}
        <div class="section-head"><h2>Map style</h2></div>
        <div class="settings-row">${themes}</div>
        <p class="hint">💡 Tap a building to found or manage a company there. Every company
        works and earns at the same time — even while you're away.</p>
      </div>`;
  }

  /** Bottom-sheet body for the currently selected map site. */
  private renderSiteSheet(): string {
    const s = this.state;
    const site = siteById(this.sheetSiteId!);
    const company = companyAtSite(s, site.id);
    if (company) {
      const active = company.id === s.activeCompanyId;
      const income = companyIncome(s, company);
      const seats = company.workstations.length;
      return `
        <div class="sheet-head">
          <h2>${company.name}</h2>
          ${active ? '<span class="active-tag">MANAGING</span>' : ''}
        </div>
        <p class="sheet-blurb">${site.name} — ${site.blurb}</p>
        <div class="sheet-stats">
          <div class="sheet-stat"><span>Income</span>
            <strong class="${income < 0 ? 'negative' : ''}">${income >= 0 ? '▲' : '▼'} ${formatMoney(income)}/s</strong></div>
          <div class="sheet-stat"><span>Site bonus</span><strong>×${site.outputBonus} output</strong></div>
          <div class="sheet-stat"><span>Team</span><strong>${company.workers.length} people · ${seats} desks</strong></div>
          <div class="sheet-stat"><span>Salaries</span><strong>${formatMoney(companySalaries(company))}/s</strong></div>
          <div class="sheet-stat"><span>Output</span><strong>${formatRate(companyWorkRate(s, company))}</strong></div>
          <div class="sheet-stat"><span>Floors</span><strong>${company.floors}/${MAX_FLOORS}</strong></div>
        </div>
        <div class="sheet-actions">
          ${
            active
              ? `<button class="btn" data-action="rename-company">${icon('pencil', 15)} Rename</button>
                 <button class="btn btn-primary" disabled>✓ Managing</button>`
              : `<button class="btn btn-primary" data-action="switch-company:${company.id}">
                   Manage this company</button>`
          }
        </div>`;
    }
    const price = companyCost(s, site.id);
    const affordable = s.money >= price;
    return `
      <div class="sheet-head"><h2>${site.name}</h2></div>
      <p class="sheet-blurb">${site.blurb}</p>
      <div class="sheet-stats">
        <div class="sheet-stat"><span>Price</span><strong>${formatMoney(price)}</strong></div>
        <div class="sheet-stat"><span>Site bonus</span><strong>×${site.outputBonus} output</strong></div>
        <div class="sheet-stat"><span>Contract scale</span><strong>×${formatNumber(site.projectScale)} rewards</strong></div>
      </div>
      <div class="sheet-actions">
        <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                data-action="found-company:${site.id}">
          🏗️ Found a company — ${formatMoney(price)}
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
    const zone = document.getElementById('sheet-zone');
    if (zone) zone.innerHTML = '';
  }

  private renderProjects(): string {
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
              <span class="spec-badge spec-${def.specialization.replace(' ', '')}">${def.specialization}</span>
            </div>
            <div class="card-right">
              <strong>${formatMoney(p.currentReward)}</strong>
              <span class="muted">×${p.completions}</span>
            </div>
          </div>
          <div class="progress mini"><div class="progress-fill" style="width:${pct}%"></div></div>
          ${active ? '<span class="active-tag">ACTIVE</span>' : ''}
        </button>`;
      }
      if (i <= lastUnlockedIdx + 2) {
        const unlockPrice = projectUnlockCost(c, def.id);
        const affordable = s.money >= unlockPrice;
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
              Unlock ${formatMoney(unlockPrice)}
            </button>
          </div>
        </div>`;
      }
      return '';
    }).join('');
    return `<div class="stack">${cards}</div>`;
  }

  private renderTeam(): string {
    const s = this.state;
    const c = activeCompany(s);
    const candidates = c.candidates
      .map((cand, i) => {
        const tier = tierById(cand.tierId);
        const price = hireCost(c, cand.tierId);
        const affordable = s.money >= price;
        return `
        <div class="card candidate-card">
          <span class="card-emoji persona-slot">${personaAvatar(`c:${cand.name}:${cand.tierId}`, cand.specialization, cand.tierId)}</span>
          <div class="card-main">
            <h3>${cand.name}</h3>
            <span class="muted">${tier.title} · ${formatRate(tier.baseRate)} · salary ${formatMoney(tier.salary)}/s</span>
            <span class="spec-badge spec-${cand.specialization.replace(' ', '')}">${cand.specialization}</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="hire:${i}">
            Hire ${formatMoney(price)}
          </button>
        </div>`;
      })
      .join('');

    const seats = c.workstations.length;
    const roster = c.workers.length
      ? c.workers.map((w) => this.renderWorkerCard(w)).join('')
      : `<div class="empty-hint">No employees yet. Hire your first dev above! 👆</div>`;

    return `
      <div class="stack">
        <div class="section-head">
          <h2>Candidates</h2>
          <button class="btn btn-ghost" data-action="reroll"
                  ${s.money >= c.candidateRerollCost ? '' : 'disabled'}>
            ${icon('dice', 16)} New batch ${formatMoney(c.candidateRerollCost)}
          </button>
        </div>
        ${candidates}
        <div class="section-head">
          <h2>Your team (${c.workers.length})</h2>
          <span class="muted">${Math.min(c.workers.length, seats)}/${seats} desks used</span>
        </div>
        ${roster}
      </div>`;
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
      : '⚠️ No desk — idle!';
    const expPct = Math.min(100, (w.experience / expToNextLevel(w.skillLevel)) * 100);
    const cost = trainCost(w);
    const training = w.training;
    const trainPct = training
      ? Math.min(100, (1 - training.remainingSec / training.totalSec) * 100)
      : 0;
    const statusLabel = training
      ? `🎓 In training · +${training.levels} levels in ${formatDuration(training.remainingSec)}`
      : `${tier.title} · ${deskLabel}`;
    const progressBar = training
      ? `<div class="progress mini training" title="Training progress">
           <div class="progress-fill" style="width:${trainPct}%"></div>
         </div>`
      : `<div class="progress mini exp" title="Experience to next level">
           <div class="progress-fill" style="width:${expPct}%"></div>
         </div>`;
    const trainBtn = training
      ? ''
      : `<button class="btn btn-small" ${s.money >= cost ? '' : 'disabled'}
                 data-action="train:${w.id}"
                 title="+${trainLevels(w)} levels, ${formatDuration(TRAIN_DURATION_SEC)} off the floor">
           ${icon('train', 15)} Train ${formatMoney(cost)}
         </button>`;
    return `
      <div class="card worker-card ${station || training ? '' : 'benched'} ${training ? 'training' : ''}">
        <div class="card-row">
          <span class="card-emoji persona-slot">${personaAvatar(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}</span>
          <div class="card-main">
            <h3>${w.name} <span class="lvl">Lv ${w.skillLevel}</span></h3>
            <span class="muted">${statusLabel}</span>
            <span class="spec-badge spec-${w.specialization.replace(' ', '')}">
              ${w.specialization}${specMatch ? ' ★1.5x' : ''}
            </span>
          </div>
          <div class="card-right">
            <strong>${formatRate(rate)}</strong>
            <span class="muted">-${formatMoney(tier.salary)}/s</span>
          </div>
        </div>
        ${progressBar}
        <div class="card-actions">
          ${trainBtn}
          <button class="btn btn-small btn-danger" data-action="fire:${w.id}">Fire</button>
        </div>
      </div>`;
  }

  private renderOffice(): string {
    return `
      <div class="stack">
        <div id="office-floor">${this.renderOfficeFloor()}</div>
        <div id="office-shop">${this.renderOfficeShop()}</div>
      </div>`;
  }

  /** One desk tile: occupied (persona typing), empty desk, or free slot. */
  private renderDeskTile(
    c: CompanyState,
    st: { id: number; defId: string } | null,
  ): string {
    if (st === null) {
      return `
        <div class="desk-tile free" title="Free slot — buy a workstation">
          <span class="free-slot">＋</span>
          <span class="desk-name muted">free slot</span>
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
        <div class="desk-tile empty" title="${def.name} — empty">
          ${emptyDeskSvg(def.id)}
          <span class="desk-name muted">empty</span>
          <span class="desk-info">×${def.multiplier}</span>
        </div>`;
  }

  /** The building: floors top-down, each holding FLOOR_CAPACITY desk slots. */
  private renderOfficeFloor(): string {
    const s = this.state;
    const c = activeCompany(s);
    // Same ordering as autoSeat: best desks first, so the layout mirrors
    // seating. Desks fill the building from the ground floor up.
    const stations: ({ id: number; defId: string } | null)[] = [...c.workstations].sort(
      (a, b) => stationDefById(b.defId).multiplier - stationDefById(a.defId).multiplier,
    );
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
            <span class="floor-label">${f === 1 ? 'Ground floor' : `Floor ${f}`}</span>
            ${wall}
          </div>
          <div class="office-grid">${tiles}</div>
        </div>`);
    }
    const atMax = c.floors >= MAX_FLOORS;
    const nextCost = floorCost(c);
    const floorBtn = atMax
      ? `<span class="muted">🏁 Max height reached</span>`
      : `<button class="btn ${s.money >= nextCost ? 'btn-primary' : ''}"
                 ${s.money >= nextCost ? '' : 'disabled'} data-action="buy-floor">
           ${icon('floor-up', 16)} Add floor ${formatMoney(nextCost)}
         </button>`;

    const standing = c.workers
      .filter((w) => w.stationId === null && !w.training)
      .map(
        (w) => `
        <button class="stand-slot" data-action="poke:${w.id}" title="${w.name} — needs a desk!">
          ${personaStanding(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}
          <span class="desk-name">${w.name.split(' ')[0]}</span>
        </button>`,
      )
      .join('');

    const inTraining = c.workers
      .filter((w) => w.training)
      .map(
        (w) => `
        <button class="stand-slot training" data-action="poke:${w.id}"
                title="${w.name} — back in ${formatDuration(w.training!.remainingSec)}">
          ${personaStanding(`w:${w.id}:${w.name}`, w.specialization, w.tierId)}
          <span class="desk-name">🎓 ${w.name.split(' ')[0]}</span>
        </button>`,
      )
      .join('');

    return `
      <div class="section-head"><h2>Your building</h2>
        <span class="muted">${c.workstations.length}/${deskCapacity(c)} desks ·
          ${c.floors}/${MAX_FLOORS} floors</span>
      </div>
      <div class="floor-actions">${floorBtn}</div>
      <div class="building card" style="${officeWallVars(wpId)}">
        <div class="roof-band">${roofDecor(wpId)}</div>
        ${floorBlocks.join('')}
        <div class="lobby-band">${lobbyDecor(wpId)}</div>
      </div>
      ${
        standing
          ? `<div class="warning-banner">⚠️ Waiting for a desk (producing nothing):</div>
             <div class="stand-row card">${standing}</div>`
          : ''
      }
      ${
        inTraining
          ? `<div class="section-head"><h2>🎓 Away at training</h2></div>
             <div class="stand-row card">${inTraining}</div>`
          : ''
      }
      <p class="hint">💡 Tap your people to hear from them. Seating is automatic:
      strongest workers get the best desks. Each floor adds ${FLOOR_CAPACITY} desk slots.</p>`;
  }

  private renderOfficeShop(): string {
    const s = this.state;
    const c = activeCompany(s);
    const full = c.workstations.length >= deskCapacity(c);
    const shop = WORKSTATIONS.map((def) => {
      const owned = c.workstations.filter((w) => w.defId === def.id).length;
      const cost = stationCost(c, def.id);
      const affordable = !full && s.money >= cost;
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
            Buy ${formatMoney(cost)}
          </button>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="stack">
        <div class="section-head"><h2>Buy workstations</h2>
          ${full ? '<span class="muted">🈵 Office full — add a floor</span>' : ''}
        </div>
        ${shop}
        ${this.renderDecorShop()}
      </div>`;
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
        def.vsCoinCost !== undefined ? s.vsCoin >= def.vsCoinCost : s.money >= def.cost;
      const priceLabel =
        def.vsCoinCost !== undefined
          ? `${icon('vscoin', 14)} ${def.vsCoinCost}`
          : formatMoney(def.cost);
      const actions = owned
        ? `
          <button class="btn btn-small" ${isApplied ? 'disabled' : ''}
                  data-action="apply-wallpaper:${def.id}">
            ${isApplied ? '✓ Applied' : 'Apply here'}
          </button>
          <button class="btn btn-small btn-ghost" ${isDefault ? 'disabled' : ''}
                  data-action="default-wallpaper:${def.id}">
            ${isDefault ? '✓ Default' : 'Set default'}
          </button>`
        : `
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="buy-wallpaper:${def.id}">
            Buy ${priceLabel}
          </button>`;
      return `
      <div class="card decor-card ${isApplied ? 'applied' : ''}">
        <div class="card-row">
          <span class="decor-swatch" style="${officeWallVars(def.id)}">${def.emoji}</span>
          <div class="card-main">
            <h3>${def.name}</h3>
            <span class="muted">${owned ? 'Owned — free to apply anywhere' : 'Unlocks for every company'}</span>
          </div>
          <div class="card-actions">${actions}</div>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="section-head"><h2>Wallpapers & decor</h2>
        <span class="muted">this building follows ${c.wallpaperId === null ? 'your default' : 'its own pick'}</span>
      </div>
      ${cards}
      ${
        c.wallpaperId !== null
          ? `<button class="btn btn-ghost" data-action="apply-wallpaper:default">
               ↩️ Follow player default instead</button>`
          : ''
      }`;
  }

  private renderUpgrades(): string {
    const s = this.state;
    const c = activeCompany(s);
    const mkCost = marketingCost(s);
    const mkAffordable = s.money >= mkCost;
    const marketing = `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${upgradeArt('marketing', 38)}</span>
          <div class="card-main">
            <h3>Marketing Campaign</h3>
            <span class="muted">×${MARKETING_MULT} output for
              ${formatDuration(MARKETING_DURATION_SEC)}, all companies.
              Buying again extends it.</span>
          </div>
          <button class="btn ${mkAffordable ? 'btn-primary' : ''}" ${mkAffordable ? '' : 'disabled'}
                  data-action="buy-marketing">
            Launch ${formatMoney(mkCost)}
          </button>
        </div>
      </div>`;
    const owned = s.companies.length;
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
          <span class="lock-hint">${icon('lock', 16)} ${required} companies</span>
        </div>
      </div>`;
      }
      const level = c.upgrades[def.id] ?? 0;
      const maxed = level >= def.maxLevel;
      const premiumCost = upgradeVsCoinCost(c, def.id);
      const cost = premiumCost ?? upgradeCost(c, def.id);
      const affordable =
        !maxed && (premiumCost !== null ? s.vsCoin >= premiumCost : s.money >= cost);
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
            ${maxed ? 'MAX' : `Buy ${priceLabel}`}
          </button>
        </div>
      </div>`;
    }).join('');
    return `<div class="stack">${marketing}${cards}</div>`;
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

  private renderStats(): string {
    const s = this.state;
    const c = activeCompany(s);
    const employees = s.companies.reduce((sum, co) => sum + co.workers.length, 0);
    const desks = s.companies.reduce((sum, co) => sum + co.workstations.length, 0);
    const rows: [string, string, string][] = [
      [icon('coin', 16), 'Total earned', formatMoney(s.totalEarned)],
      [icon('check', 16), 'Projects completed', formatNumber(s.projectsCompleted)],
      [icon('office', 16), 'Companies', String(s.companies.length)],
      [icon('team', 16), 'Employees', String(employees)],
      [icon('star', 16), 'Workstations', String(desks)],
      [icon('energy', 16), 'Team output (here)', formatRate(totalWorkRate(s))],
      [icon('salary', 16), 'Salaries (all)', `${formatMoney(totalSalaries(s))}/s`],
      [icon('clock', 16), 'Time played', formatDuration(s.playTimeSec)],
      [icon('boost', 16), 'Founded', new Date(s.startedAt).toLocaleDateString()],
    ];
    return `
      <div class="stack">
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
        <div class="card">
          <h2 class="card-title">Settings</h2>
          <div class="settings-row">
            <button class="btn" data-action="toggle-sound">
              ${s.settings.sound ? `${icon('sound-on', 16)} Sound on` : `${icon('sound-off', 16)} Sound off`}
            </button>
            <button class="btn" data-action="toggle-particles">
              ${icon('sparkles', 16)} Effects ${s.settings.particles ? 'on' : 'off'}
            </button>
            <button class="btn" data-action="cycle-speed" title="Live simulation speed">
              ${icon('speed', 16)} Speed ×${s.settings.timeScale}
            </button>
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
            <button class="btn" data-action="export-save">${icon('save-export', 16)} Export save</button>
            <button class="btn" data-action="import-save">${icon('save-import', 16)} Import save</button>
            <button class="btn btn-danger" data-action="reset-game">${icon('trash', 16)} Reset game</button>
          </div>
          <p class="hint">Progress is saved automatically every 10 seconds and when you close the
          app. Your team keeps working while you're away (up to 24h).</p>
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
      case 'found-company': {
        const name = prompt('Name your new company:', '');
        error = buyCompany(s, arg, name ?? undefined);
        if (!error) this.toast('🏗️ New company founded!', 'info');
        break;
      }
      case 'unlock-project':
        error = unlockProject(s, arg);
        if (!error) this.toast('🎉 Project unlocked!', 'info');
        break;
      case 'hire':
        error = hireWorker(s, Number(arg));
        if (!error) this.toast('🤝 Welcome aboard!', 'info');
        break;
      case 'reroll':
        error = rerollCandidates(s);
        break;
      case 'train':
        error = trainWorker(s, Number(arg));
        if (!error) this.toast('🎓 Off to the workshop!', 'info');
        break;
      case 'fire': {
        const worker = activeCompany(s).workers.find((w) => w.id === Number(arg));
        if (worker && confirm(`Fire ${worker.name}? There is no severance package.`)) {
          error = fireWorker(s, Number(arg));
        }
        break;
      }
      case 'buy-station':
        error = buyWorkstation(s, arg);
        break;
      case 'buy-floor':
        error = buyFloor(s);
        if (!error) this.toast('⬆️ New floor unlocked!', 'info');
        break;
      case 'buy-wallpaper':
        error = buyWallpaper(s, arg);
        if (!error) this.toast('🎨 Wallpaper unlocked!', 'info');
        break;
      case 'apply-wallpaper':
        error = setCompanyWallpaper(s, arg === 'default' ? null : arg);
        break;
      case 'default-wallpaper':
        error = setDefaultWallpaper(s, arg);
        break;
      case 'buy-map-theme':
        error = buyMapTheme(s, arg);
        if (!error) this.toast('🗺️ New map style!', 'info');
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
        if (!error) this.toast(`💎 ${t('ui.claimed')}`, 'info');
        break;
      case 'buy-vscoin-boost':
        error = buyVsCoinBoost(s);
        if (!error) this.toast(`🚀 ${t('ui.vsCoinBoostBought')}`, 'info');
        break;
      case 'rename-company': {
        const name = prompt('Company name:', activeCompany(s).name);
        if (name !== null) error = renameCompany(s, name);
        break;
      }
      case 'buy-marketing':
        error = buyMarketingCampaign(s);
        if (!error) this.toast('📣 Campaign live — sales are calling!', 'info');
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
      case 'toggle-particles':
        s.settings.particles = !s.settings.particles;
        this.fx.enabled = s.settings.particles;
        break;
      case 'export-save': {
        const code = exportSave(s);
        navigator.clipboard?.writeText(code).catch(() => {});
        prompt('Your save code (copied to clipboard):', code);
        structural = false;
        break;
      }
      case 'import-save': {
        const code = prompt('Paste your save code:');
        if (code) {
          try {
            const next = importSave(code);
            this.state = next;
            this.onStateReplaced(next);
            this.toast('✅ Save imported', 'info');
          } catch {
            error = 'Invalid save code';
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
      case 'story-continue': {
        error = dismissStoryBeat(s);
        const zone = document.getElementById('modal-zone');
        if (zone) zone.innerHTML = '';
        break;
      }
      case 'set-language': {
        error = setLanguage(s, arg);
        if (!error) {
          setCurrentLang(resolveLang(s.settings.language, navigator.language));
          this.coachStep = ''; // force the coach card to re-render translated
          this.updateNarrative();
        }
        break;
      }
      default:
        structural = false;
    }

    if (error) {
      this.toast(error);
    } else if (action !== 'tab' && action !== 'poke') {
      this.fx.click();
      saveGame(this.state);
    }
    if (structural) {
      this.officeDirty = true;
      this.rebuildTab();
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
    this.fx.soundEnabled = next.settings.sound;
    this.fx.enabled = next.settings.particles;
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
