import {
  PROJECTS,
  UPGRADES,
  WORKSTATIONS,
  projectDefById,
  stationDefById,
  tierById,
} from '../game/data';
import {
  activeBoost,
  buyUpgrade,
  buyWorkstation,
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
  trainWorker,
  unlockProject,
  upgradeCost,
  workerRate,
} from '../game/engine';
import { formatDuration, formatMoney, formatNumber, formatRate } from '../game/format';
import { exportSave, importSave, resetGame, saveGame } from '../game/save';
import type { GameState, WorkerState } from '../game/types';
import type { Fx } from './fx';

type Tab = 'projects' | 'team' | 'office' | 'upgrades' | 'stats';

const TABS: { id: Tab; label: string; emoji: string }[] = [
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
    this.text('company-name', s.companyName);

    const boost = activeBoost(s);
    const boostEl = document.getElementById('hud-boost');
    if (boostEl) {
      boostEl.hidden = boost === null;
      if (boost) {
        boostEl.textContent = `🚀 ×${boost.mult} ${formatDuration(boost.remainingSec)}`;
      }
    }

    const project = getProject(s, s.activeProjectId);
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
      case 'projects':
        content.innerHTML = this.renderProjects();
        break;
      case 'team':
        content.innerHTML = this.renderTeam();
        break;
      case 'office':
        content.innerHTML = this.renderOffice();
        break;
      case 'upgrades':
        content.innerHTML = this.renderUpgrades();
        break;
      case 'stats':
        content.innerHTML = this.renderStats();
        break;
    }
  }

  private renderProjects(): string {
    const s = this.state;
    const lastUnlockedIdx = PROJECTS.reduce(
      (acc, def, i) => (getProject(s, def.id).unlocked ? i : acc),
      0,
    );
    const cards = PROJECTS.map((def, i) => {
      const p = getProject(s, def.id);
      if (p.unlocked) {
        const active = s.activeProjectId === def.id;
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
    const candidates = s.candidates
      .map((c, i) => {
        const tier = tierById(c.tierId);
        const affordable = s.money >= tier.hireCost;
        return `
        <div class="card candidate-card">
          <span class="card-emoji">${tier.emoji}</span>
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

    const seats = s.workstations.length;
    const roster = s.workers.length
      ? s.workers.map((w) => this.renderWorkerCard(w)).join('')
      : `<div class="empty-hint">No employees yet. Hire your first dev above! 👆</div>`;

    return `
      <div class="stack">
        <div class="section-head">
          <h2>Candidates</h2>
          <button class="btn btn-ghost" data-action="reroll"
                  ${s.money >= s.candidateRerollCost ? '' : 'disabled'}>
            🎲 New batch ${formatMoney(s.candidateRerollCost)}
          </button>
        </div>
        ${candidates}
        <div class="section-head">
          <h2>Your team (${s.workers.length})</h2>
          <span class="muted">${Math.min(s.workers.length, seats)}/${seats} desks used</span>
        </div>
        ${roster}
      </div>`;
  }

  private renderWorkerCard(w: WorkerState): string {
    const s = this.state;
    const tier = tierById(w.tierId);
    const rate = workerRate(s, w, s.activeProjectId);
    const specMatch =
      projectDefById(s.activeProjectId).specialization === w.specialization;
    const station = s.workstations.find((st) => st.id === w.stationId);
    const deskLabel = station
      ? `${stationDefById(station.defId).emoji} ${stationDefById(station.defId).name}`
      : '⚠️ No desk — idle!';
    const expPct = Math.min(100, (w.experience / expToNextLevel(w.skillLevel)) * 100);
    const cost = trainCost(w);
    return `
      <div class="card worker-card ${station ? '' : 'benched'}">
        <div class="card-row">
          <span class="card-emoji">${tier.emoji}</span>
          <div class="card-main">
            <h3>${w.name} <span class="lvl">Lv ${w.skillLevel}</span></h3>
            <span class="muted">${tier.title} · ${deskLabel}</span>
            <span class="spec-badge spec-${w.specialization.replace(' ', '')}">
              ${w.specialization}${specMatch ? ' ★1.5x' : ''}
            </span>
          </div>
          <div class="card-right">
            <strong>${formatRate(rate)}</strong>
            <span class="muted">-${formatMoney(tier.salary)}/s</span>
          </div>
        </div>
        <div class="progress mini exp" title="Experience to next level">
          <div class="progress-fill" style="width:${expPct}%"></div>
        </div>
        <div class="card-actions">
          <button class="btn btn-small ${s.money >= cost ? '' : ''}"
                  ${s.money >= cost ? '' : 'disabled'} data-action="train:${w.id}">
            📚 Train ${formatMoney(cost)}
          </button>
          <button class="btn btn-small btn-danger" data-action="fire:${w.id}">Fire</button>
        </div>
      </div>`;
  }

  private renderOffice(): string {
    const s = this.state;
    const shop = WORKSTATIONS.map((def) => {
      const owned = s.workstations.filter((w) => w.defId === def.id).length;
      const cost = stationCost(s, def.id);
      const affordable = s.money >= cost;
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
    const benched = s.workers.filter((w) => w.stationId === null).length;
    return `
      <div class="stack">
        <div class="section-head"><h2>Workstations</h2>
          <span class="muted">${s.workstations.length} desks · ${s.workers.length} workers</span>
        </div>
        ${benched > 0 ? `<div class="warning-banner">⚠️ ${benched} worker${benched > 1 ? 's' : ''} without a desk — they produce nothing!</div>` : ''}
        ${shop}
        <p class="hint">💡 Workers are automatically seated: your strongest people get the best desks.</p>
      </div>`;
  }

  private renderUpgrades(): string {
    const s = this.state;
    const cards = UPGRADES.map((def) => {
      const level = s.upgrades[def.id] ?? 0;
      const maxed = level >= def.maxLevel;
      const cost = upgradeCost(s, def.id);
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
    const rows: [string, string][] = [
      ['💰 Total earned', formatMoney(s.totalEarned)],
      ['✅ Projects completed', formatNumber(s.projectsCompleted)],
      ['👥 Employees', String(s.workers.length)],
      ['🪑 Workstations', String(s.workstations.length)],
      ['⚡ Team output', formatRate(totalWorkRate(s))],
      ['🧾 Salaries', `${formatMoney(totalSalaries(s))}/s`],
      ['⏱️ Time played', formatDuration(s.playTimeSec)],
      ['🚀 Founded', new Date(s.startedAt).toLocaleDateString()],
    ];
    return `
      <div class="stack">
        <div class="card">
          <h2 class="card-title">📊 ${s.companyName}</h2>
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
        break;
      case 'fire': {
        const worker = s.workers.find((w) => w.id === Number(arg));
        if (worker && confirm(`Fire ${worker.name}? There is no severance package.`)) {
          error = fireWorker(s, Number(arg));
        }
        break;
      }
      case 'buy-station':
        error = buyWorkstation(s, arg);
        break;
      case 'buy-upgrade':
        error = buyUpgrade(s, arg);
        break;
      case 'rename-company': {
        const name = prompt('Company name:', s.companyName);
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
    } else if (action !== 'tab') {
      this.fx.click();
      saveGame(this.state);
    }
    if (structural) this.rebuildTab();
  }

  replaceState(next: GameState): void {
    this.state = next;
    this.fx.soundEnabled = next.settings.sound;
    this.fx.enabled = next.settings.particles;
    this.rebuildTab();
  }

  private text(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
}
