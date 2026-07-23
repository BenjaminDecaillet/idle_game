import {
  COMPANY_SITES,
  FLOOR_CAPACITY,
  MAP_THEMES,
  MAX_FLOORS,
  PROJECTS,
  TRAIN_DURATION_SEC,
  UPGRADES,
  WALLPAPERS,
  WORKSTATIONS,
  mapThemeById,
  projectDefById,
  stationDefById,
  tierById,
  wallpaperById,
} from '../game/data';
import {
  activeBoost,
  activeCompany,
  buyCompany,
  buyFloor,
  buyMapTheme,
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
  setActiveCompany,
  setCompanyWallpaper,
  setDefaultWallpaper,
  setMapTheme,
  estimatedIncome,
  expToNextLevel,
  fireWorker,
  getProject,
  hireWorker,
  renameCompany,
  rerollCandidates,
  setActiveProject,
  stationCost,
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
import { exportSave, importSave, resetGame, saveGame } from '../game/save';
import type { CompanyState, GameState, WorkerState } from '../game/types';
import type { Fx } from './fx';
import { personaAtDesk, personaAvatar, personaStanding } from './persona';

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

type Tab = 'map' | 'projects' | 'team' | 'office' | 'upgrades' | 'stats';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'map', label: 'Map', emoji: '🗺️' },
  { id: 'projects', label: 'Projects', emoji: '📋' },
  { id: 'team', label: 'Team', emoji: '👥' },
  { id: 'office', label: 'Office', emoji: '🏢' },
  { id: 'upgrades', label: 'Upgrades', emoji: '🧪' },
  { id: 'stats', label: 'Stats', emoji: '📊' },
];

export class UI {
  private root: HTMLElement;
  private fx: Fx;
  private state: GameState;
  private tab: Tab = 'projects';
  private rebuildTimer = 0;
  private officeDirty = true;
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
            🏢 <span id="company-name"></span>
          </button>
          <div class="hud-badges">
            <span class="badge badge-boost" id="hud-boost" hidden title="Active boost"></span>
            <span class="badge badge-income" id="hud-income" title="Estimated net income"></span>
          </div>
        </div>
        <div class="money-row">
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
          <span id="hero-rate"></span>
          <span id="hero-eta"></span>
          <span id="hero-completions"></span>
        </div>
      </section>
      <main id="tab-content"></main>
      <nav class="tabbar">
        ${TABS.map(
          (t) => `
          <button class="tab-btn" data-action="tab:${t.id}" id="tab-btn-${t.id}">
            <span class="tab-emoji">${t.emoji}</span><span>${t.label}</span>
          </button>`,
        ).join('')}
      </nav>
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

    const boost = activeBoost(s);
    const boostEl = document.getElementById('hud-boost');
    if (boostEl) {
      boostEl.hidden = boost === null;
      if (boost) {
        boostEl.textContent = `🚀 ×${boost.mult} ${formatDuration(boost.remainingSec)}`;
      }
    }

    const company = activeCompany(s);
    const project = getProject(company, company.activeProjectId);
    const def = projectDefById(project.defId);
    const rate = totalWorkRate(s);
    this.text('hero-emoji', def.emoji);
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
    this.text('hero-rate', `⚡ ${formatRate(rate)}`);
    this.text(
      'hero-eta',
      rate > 0 ? `⏱️ ${formatDuration((project.currentWork - project.progress) / rate)}` : '⏱️ —',
    );
    this.text('hero-completions', `✅ ×${project.completions}`);

    // Rebuild the active tab a couple of times per second to refresh costs,
    // affordability and progress details without redoing it every frame.
    this.rebuildTimer += dt;
    if (this.rebuildTimer >= 0.5) {
      this.rebuildTimer = 0;
      this.rebuildTab();
    }
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
        break;
      case 'projects':
        content.innerHTML = this.renderProjects();
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

  /** The map: every site is either your company (manage/switch) or for sale. */
  private renderMap(): string {
    const s = this.state;
    const cards = COMPANY_SITES.map((site) => {
      const company = companyAtSite(s, site.id);
      if (company) {
        const active = company.id === s.activeCompanyId;
        const income = companyIncome(s, company);
        return `
        <button class="card site-card owned ${active ? 'active-site' : ''}"
                data-action="switch-company:${company.id}">
          <div class="card-row">
            <span class="card-emoji">${site.emoji}</span>
            <div class="card-main">
              <h3>${company.name}</h3>
              <span class="muted">${site.name} · ×${site.outputBonus} output</span>
              <span class="muted">👥 ${company.workers.length} ·
                🧾 ${formatMoney(companySalaries(company))}/s ·
                ⚡ ${formatRate(companyWorkRate(s, company))}</span>
            </div>
            <div class="card-right">
              <strong class="${income < 0 ? 'negative' : ''}">${income >= 0 ? '▲' : '▼'} ${formatMoney(income)}/s</strong>
              ${active ? '<span class="active-tag">MANAGING</span>' : '<span class="muted">tap to manage</span>'}
            </div>
          </div>
        </button>`;
      }
      const affordable = s.money >= site.cost;
      return `
      <div class="card site-card locked">
        <div class="card-row">
          <span class="card-emoji">${site.emoji}</span>
          <div class="card-main">
            <h3>${site.name}</h3>
            <span class="muted">${site.blurb}</span>
            <span class="muted">×${site.outputBonus} output for every worker here</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="found-company:${site.id}">
            Found ${formatMoney(site.cost)}
          </button>
        </div>
      </div>`;
    }).join('');
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
      <div class="stack map-screen" style="background:${mapThemeById(s.mapThemeId).css}">
        <div class="section-head"><h2>Silicon Valley</h2>
          <span class="muted">${s.companies.length}/${COMPANY_SITES.length} sites owned</span>
        </div>
        ${cards}
        <div class="section-head"><h2>Map style</h2></div>
        <div class="settings-row">${themes}</div>
        <p class="hint">💡 Every company works and earns at the same time — even while
        you're away. New companies start empty: hire a team and buy desks to get them shipping.</p>
      </div>`;
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
            <span class="card-emoji">${def.emoji}</span>
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
        const affordable = s.money >= def.unlockCost;
        return `
        <div class="card project-card locked">
          <div class="card-row">
            <span class="card-emoji">🔒</span>
            <div class="card-main">
              <h3>${def.name}</h3>
              <span class="spec-badge">${def.specialization}</span>
            </div>
            <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                    data-action="unlock-project:${def.id}">
              Unlock ${formatMoney(def.unlockCost)}
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
      .map((c, i) => {
        const tier = tierById(c.tierId);
        const affordable = s.money >= tier.hireCost;
        return `
        <div class="card candidate-card">
          <span class="card-emoji persona-slot">${personaAvatar(`c:${c.name}:${c.tierId}`, c.specialization, c.tierId)}</span>
          <div class="card-main">
            <h3>${c.name}</h3>
            <span class="muted">${tier.title} · ${formatRate(tier.baseRate)} · salary ${formatMoney(tier.salary)}/s</span>
            <span class="spec-badge spec-${c.specialization.replace(' ', '')}">${c.specialization}</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="hire:${i}">
            Hire ${formatMoney(tier.hireCost)}
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
            🎲 New batch ${formatMoney(c.candidateRerollCost)}
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
           📚 Train ${formatMoney(cost)}
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
                title="${worker.name} — ${tier.title}">
          ${personaAtDesk(`w:${worker.id}:${worker.name}`, worker.specialization, worker.tierId)}
          <span class="desk-name">${worker.name.split(' ')[0]}</span>
          <span class="desk-info">${def.emoji} ×${def.multiplier}</span>
        </button>`;
    }
    return `
        <div class="desk-tile empty" title="${def.name} — empty">
          <svg class="persona-desk" viewBox="0 0 64 56" aria-hidden="true">
            <rect x="8" y="30" width="12" height="4" rx="2" fill="#1f2937"/>
            <rect x="12" y="33" width="4" height="12" fill="#1f2937"/>
            <rect x="30" y="33" width="30" height="3" rx="1.5" fill="#475569"/>
            <rect x="42" y="36" width="4" height="10" fill="#334155"/>
            <rect x="34" y="24" width="16" height="10" rx="1.2" fill="#0f172a"
                  stroke="#334155" stroke-width="0.8"/>
          </svg>
          <span class="desk-name muted">empty</span>
          <span class="desk-info">${def.emoji} ×${def.multiplier}</span>
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
    const floorBlocks: string[] = [];
    for (let f = c.floors; f >= 1; f--) {
      const slots = stations.slice((f - 1) * FLOOR_CAPACITY, f * FLOOR_CAPACITY);
      while (slots.length < FLOOR_CAPACITY) slots.push(null);
      const tiles = slots.map((st) => this.renderDeskTile(c, st)).join('');
      floorBlocks.push(`
        <div class="floor-block">
          <div class="floor-label">${f === 1 ? 'Ground floor' : `Floor ${f}`}</div>
          <div class="office-grid">${tiles}</div>
        </div>`);
    }
    const atMax = c.floors >= MAX_FLOORS;
    const nextCost = floorCost(c);
    const floorBtn = atMax
      ? `<span class="muted">🏁 Max height reached</span>`
      : `<button class="btn ${s.money >= nextCost ? 'btn-primary' : ''}"
                 ${s.money >= nextCost ? '' : 'disabled'} data-action="buy-floor">
           ⬆️ Add floor ${formatMoney(nextCost)}
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
      <div class="building card"
           style="background:${wallpaperById(effectiveWallpaper(s, c)).css}">${floorBlocks.join('')}</div>
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
          <span class="card-emoji">${def.emoji}</span>
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
      const affordable = s.money >= def.cost;
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
            Buy ${formatMoney(def.cost)}
          </button>`;
      return `
      <div class="card decor-card ${isApplied ? 'applied' : ''}">
        <div class="card-row">
          <span class="decor-swatch" style="background:${def.css}">${def.emoji}</span>
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
    const cards = UPGRADES.map((def) => {
      const level = c.upgrades[def.id] ?? 0;
      const maxed = level >= def.maxLevel;
      const cost = upgradeCost(c, def.id);
      const affordable = !maxed && s.money >= cost;
      return `
      <div class="card">
        <div class="card-row">
          <span class="card-emoji">${def.emoji}</span>
          <div class="card-main">
            <h3>${def.name} <span class="lvl">Lv ${level}${maxed ? ' MAX' : ''}</span></h3>
            <span class="muted">${def.description}</span>
          </div>
          <button class="btn ${affordable ? 'btn-primary' : ''}" ${affordable ? '' : 'disabled'}
                  data-action="buy-upgrade:${def.id}">
            ${maxed ? 'MAX' : `Buy ${formatMoney(cost)}`}
          </button>
        </div>
      </div>`;
    }).join('');
    return `<div class="stack">${cards}</div>`;
  }

  private renderStats(): string {
    const s = this.state;
    const c = activeCompany(s);
    const employees = s.companies.reduce((sum, co) => sum + co.workers.length, 0);
    const desks = s.companies.reduce((sum, co) => sum + co.workstations.length, 0);
    const rows: [string, string][] = [
      ['💰 Total earned', formatMoney(s.totalEarned)],
      ['✅ Projects completed', formatNumber(s.projectsCompleted)],
      ['🏢 Companies', String(s.companies.length)],
      ['👥 Employees', String(employees)],
      ['🪑 Workstations', String(desks)],
      ['⚡ Team output (here)', formatRate(totalWorkRate(s))],
      ['🧾 Salaries (all)', `${formatMoney(totalSalaries(s))}/s`],
      ['⏱️ Time played', formatDuration(s.playTimeSec)],
      ['🚀 Founded', new Date(s.startedAt).toLocaleDateString()],
    ];
    return `
      <div class="stack">
        <div class="card">
          <h2 class="card-title">📊 ${c.name}</h2>
          <table class="stats-table">
            ${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
          </table>
        </div>
        <div class="card">
          <h2 class="card-title">⚙️ Settings</h2>
          <div class="settings-row">
            <button class="btn" data-action="toggle-sound">
              ${s.settings.sound ? '🔊 Sound on' : '🔇 Sound off'}
            </button>
            <button class="btn" data-action="toggle-particles">
              ${s.settings.particles ? '✨ Effects on' : '💤 Effects off'}
            </button>
          </div>
          <div class="settings-row">
            <button class="btn" data-action="export-save">📤 Export save</button>
            <button class="btn" data-action="import-save">📥 Import save</button>
            <button class="btn btn-danger" data-action="reset-game">🗑️ Reset game</button>
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
      case 'rename-company': {
        const name = prompt('Company name:', activeCompany(s).name);
        if (name !== null) error = renameCompany(s, name);
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
    this.officeDirty = true;
    this.rebuildTab();
  }

  private text(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
}
