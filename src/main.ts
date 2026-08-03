import './style.css';
import { activeCompany, grantBoost, tick, timeSkip } from './game/engine';
import { loadGame, saveGame } from './game/save';
import type { GameState } from './game/types';
import { resolveLang, setCurrentLang, t } from './i18n';
import { Fx } from './ui/fx';
import { UI } from './ui/ui';

const root = document.getElementById('app')!;
const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;

const { state: loaded, offlineSec, offlineEarnings, betaReset } = loadGame();
let state: GameState = loaded;
setCurrentLang(resolveLang(state.settings.language, navigator.language));

const fx = new Fx(fxCanvas);
fx.soundEnabled = state.settings.sound;
fx.enabled = state.settings.particles;

const ui = new UI(root, state, fx, (next) => {
  state = next;
  ui.replaceState(next);
  saveGame(state);
});

if (betaReset) {
  ui.notice(t('ui.betaResetTitle'), t('ui.betaResetText'));
} else if (offlineEarnings > 0) {
  ui.welcomeBack(offlineSec, offlineEarnings);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let last = performance.now();
let saveTimer = 0;

function loop(now: number): void {
  // Clamp dt: background tabs throttle rAF; big gaps are handled as "offline"
  // time by the same engine rules on the next visible frame.
  // The free speed toggle scales live play only — offline stays wall-clock.
  const dt = Math.min((now - last) / 1000, 2) * state.settings.timeScale;
  last = now;

  const events = tick(state, dt);
  const shownCompanyId = activeCompany(state).id;
  // Payout FX only for the company currently on screen; money still counts.
  const visible = events.completions.filter((c) => c.companyId === shownCompanyId);
  if (visible.length > 0) {
    const origin = ui.payoutOrigin();
    for (const c of visible.slice(0, 3)) {
      fx.payoutBurst(origin.x, origin.y, c.reward);
    }
    ui.moneyPulse();
  }
  for (const done of events.trainingsDone) {
    ui.officeNeedsRebuild();
    if (done.companyId === shownCompanyId) {
      ui.toast(`🎓 Training complete — now Lv ${done.newLevel}!`, 'info');
    }
  }
  for (const done of events.promotionsDone) {
    ui.officeNeedsRebuild();
    if (done.companyId === shownCompanyId) {
      ui.toast(`🎖️ ${t('ui.promoted')}`, 'info');
    }
  }
  if (events.deskUpgradesDone.length > 0) ui.officeNeedsRebuild();
  for (const done of events.floorBuildsDone) {
    ui.officeNeedsRebuild();
    if (done.companyId === shownCompanyId) {
      ui.toast(`🏗️ ${t('ui.floorBuilt')}`, 'info');
    }
  }
  for (const quit of events.quits) {
    ui.officeNeedsRebuild();
    ui.toast(`😞 ${t('ui.workerQuit', { name: quit.name })}`, 'error');
  }

  ui.frame(dt);
  fx.update(dt);

  saveTimer += dt;
  if (saveTimer >= 10) {
    saveTimer = 0;
    saveGame(state);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// When the tab is hidden or the app is closed, persist immediately so
// offline progress picks up from the right timestamp.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveGame(state);
  } else {
    // Returning to a backgrounded tab: fast-forward the missed time.
    const { state: reloaded, offlineEarnings: gained, offlineSec: sec } = loadGame();
    state = reloaded;
    ui.replaceState(state);
    last = performance.now();
    if (gained > 0 && sec > 60) ui.welcomeBack(sec, gained);
  }
});
window.addEventListener('pagehide', () => saveGame(state));

// ---------------------------------------------------------------------------
// Golden briefcase — a rare, optional tap bonus (classic idle-game "juice").
// Core progress never needs it; it just grants a short boost when caught.
// ---------------------------------------------------------------------------

function spawnBriefcase(): void {
  if (document.getElementById('briefcase') || document.visibilityState === 'hidden') {
    scheduleBriefcase();
    return;
  }
  const el = document.createElement('button');
  el.id = 'briefcase';
  el.className = 'briefcase';
  el.textContent = '💼';
  el.title = 'An investor left something…';
  el.style.left = `${8 + Math.random() * 76}vw`;
  el.style.top = `${18 + Math.random() * 45}vh`;
  el.addEventListener('click', () => {
    const r = el.getBoundingClientRect();
    el.remove();
    grantBoost(state, 2, 60, 'event');
    fx.burst(r.left + r.width / 2, r.top + r.height / 2);
    ui.toast('💼 Investor tip! 2× income for 60s', 'info');
    scheduleBriefcase();
  });
  document.body.appendChild(el);
  setTimeout(() => {
    if (el.isConnected) {
      el.remove();
      scheduleBriefcase();
    }
  }, 12_000);
}

let briefcaseTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleBriefcase(): void {
  clearTimeout(briefcaseTimer);
  briefcaseTimer = setTimeout(spawnBriefcase, (180 + Math.random() * 240) * 1000);
}
// First one shows up quickly so new players discover the mechanic.
briefcaseTimer = setTimeout(spawnBriefcase, (45 + Math.random() * 60) * 1000);

// Console API for demoing/integrating monetization rewards before any ad or
// payment SDK is wired up (see docs/monetization.md). Example in DevTools:
//   isv.boost(2, 240)   → 2x output for 4 minutes
//   isv.skip(3600)      → instantly simulate 1 hour
(window as { isv?: object }).isv = {
  boost: (mult = 2, seconds = 240) => grantBoost(state, mult, seconds, 'dev'),
  skip: (seconds = 3600) => {
    const earned = timeSkip(state, seconds);
    ui.replaceState(state);
    return earned;
  },
};
