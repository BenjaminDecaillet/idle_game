import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { BETA_FORCE_REFRESH } from './game/data';
import { activeCompany, grantBoost, tick, timeSkip } from './game/engine';
import { claimableDailyContracts, ensureDaily } from './game/daily';
import { claimableMissions } from './game/missions';
import { rollEventOffer } from './game/events';
import { EVENT_INTERVAL_MAX_SEC, EVENT_INTERVAL_MIN_SEC } from './game/data';
import { loadGame, saveGame } from './game/save';
import type { GameState } from './game/types';
import { lookup, resolveLang, setCurrentLang, t } from './i18n';
import { Fx } from './ui/fx';
import { UI } from './ui/ui';

const root = document.getElementById('app')!;
const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;

const { state: loaded, offlineSec, offlineEarnings, offlineReport, betaReset } = loadGame();
let state: GameState = loaded;
setCurrentLang(resolveLang(state.settings.language, navigator.language));

const fx = new Fx(fxCanvas);
fx.soundEnabled = state.settings.sound;
fx.enabled = state.settings.particles;
// Music arms here but only audibly starts once a user gesture resumes the
// AudioContext (autoplay policy) — the first click does it.
fx.setMusicVolume(state.settings.musicVolume);
fx.setMusic(state.settings.music);
fx.floatsEnabled = state.settings.floatingNumbers;
// Ambient scene animation obeys the Animations toggle (CSS pauses it).
document.body.classList.toggle('anim-off', !state.settings.animations);

const ui = new UI(root, state, fx, (next) => {
  state = next;
  ui.replaceState(next);
  saveGame(state);
});

if (betaReset) {
  ui.notice(t('ui.betaResetTitle'), t('ui.betaResetText'));
} else if (offlineReport && offlineEarnings > 0) {
  ui.welcomeBack(offlineSec, offlineReport);
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

  // Roll the daily-contracts board when the UTC day flips (cheap no-op
  // otherwise) — the day number is computed here, never inside src/game.
  ensureDaily(state, Math.floor(Date.now() / 86_400_000));

  const events = tick(state, dt);
  const shownCompanyId = activeCompany(state).id;
  // Payout FX only for the company currently on screen; money still counts.
  const visible = events.completions.filter((c) => c.companyId === shownCompanyId);
  if (visible.length > 0) {
    // Coalesce a frame's payouts into ONE burst + float showing the sum —
    // payout storms stay readable instead of stacking labels.
    const origin = ui.payoutOrigin();
    const total = visible.reduce((sum, c) => sum + c.reward, 0);
    fx.payoutBurst(origin.x, origin.y, total);
    ui.moneyPulse();
  }
  for (const done of events.trainingsDone) {
    ui.officeNeedsRebuild();
    if (done.companyId === shownCompanyId) {
      ui.toast(`🎓 ${t('ui.trainingComplete', { level: done.newLevel })}`, 'info');
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
  for (const done of events.expeditionsDone) {
    ui.toast(
      `🧭 ${t('ui.marketReportBack', { name: lookup(`country.${done.countryId}.name`) })}`,
      'info',
    );
  }
  for (const done of events.companyBuildsDone) {
    const doneCountry = state.countries.find((c) => c.id === done.countryId);
    const company = doneCountry?.companies.find((c) => c.id === done.companyId);
    if (company) ui.toast(`🏢 ${t('ui.companyBuilt', { name: company.name })}`, 'info');
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

// App badge (Badging API): when the player leaves, the installed-app icon
// shows how many claims are waiting (missions + daily contracts) — no
// permission prompt, no backend. Cleared on return; browsers without the
// API just no-op.
const badgeNav = navigator as Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};
function updateAppBadge(): void {
  if (!badgeNav.setAppBadge) return;
  const count = claimableMissions(state).length + claimableDailyContracts(state).length;
  if (count > 0) badgeNav.setAppBadge(count).catch(() => {});
  else badgeNav.clearAppBadge?.().catch(() => {});
}

// When the tab is hidden or the app is closed, persist immediately so
// offline progress picks up from the right timestamp.
document.addEventListener('visibilitychange', () => {
  // Pause ambient scene animation while the document is hidden (battery).
  document.body.classList.toggle('scene-paused', document.visibilityState === 'hidden');
  if (document.visibilityState === 'hidden') {
    saveGame(state);
    updateAppBadge();
  } else {
    badgeNav.clearAppBadge?.().catch(() => {});
    // Returning to a backgrounded tab: fast-forward the missed time.
    const { state: reloaded, offlineReport: report, offlineSec: sec } = loadGame();
    state = reloaded;
    ui.replaceState(state);
    last = performance.now();
    if (report && report.earnings > 0 && sec > 60) ui.welcomeBack(sec, report);
  }
});
window.addEventListener('pagehide', () => {
  saveGame(state);
  updateAppBadge();
});

// ---------------------------------------------------------------------------
// Service worker updates. The PWA precaches the whole shell, so without an
// explicit update flow a phone that only ever resumes the installed app can
// keep serving a stale build indefinitely. While BETA_FORCE_REFRESH is on,
// re-check for a new service worker aggressively (on focus + every minute)
// and save + reload the instant an updated worker takes control.
// ---------------------------------------------------------------------------

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!BETA_FORCE_REFRESH || !registration) return;
    const check = (): void => {
      registration.update().catch(() => {});
    };
    setInterval(check, 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

if (BETA_FORCE_REFRESH && 'serviceWorker' in navigator) {
  // Never reload on the very first install (controller flips from null);
  // only when an update replaces the worker that loaded this page.
  const hadController = navigator.serviceWorker.controller !== null;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    saveGame(state);
    window.location.reload();
  });
}

// ---------------------------------------------------------------------------
// Random events — live opportunity dialogs with a trade-off (docs/balance.md
// Phase E). Wall-clock scheduled like the briefcase: never while hidden,
// never offline, and only once the engine says events are unlocked. The
// engine computes and resolves the offer; this is just the doorbell.
// ---------------------------------------------------------------------------

let eventTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleEvent(): void {
  clearTimeout(eventTimer);
  const delay =
    EVENT_INTERVAL_MIN_SEC + Math.random() * (EVENT_INTERVAL_MAX_SEC - EVENT_INTERVAL_MIN_SEC);
  eventTimer = setTimeout(fireEvent, delay * 1000);
}
function fireEvent(): void {
  if (document.visibilityState === 'hidden') {
    scheduleEvent();
    return;
  }
  const offer = rollEventOffer(state);
  if (!offer || !ui.offerEvent(offer)) {
    scheduleEvent();
    return;
  }
  scheduleEvent();
}
scheduleEvent();

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
  el.title = t('ui.investorLeft');
  el.style.left = `${8 + Math.random() * 76}vw`;
  el.style.top = `${18 + Math.random() * 45}vh`;
  el.addEventListener('click', () => {
    const r = el.getBoundingClientRect();
    el.remove();
    grantBoost(state, 2, 60, 'event');
    fx.burst(r.left + r.width / 2, r.top + r.height / 2);
    ui.toast(`💼 ${t('ui.investorTip')}`, 'info');
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
