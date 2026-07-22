import './style.css';
import { tick } from './game/engine';
import { loadGame, saveGame } from './game/save';
import type { GameState } from './game/types';
import { Fx } from './ui/fx';
import { UI } from './ui/ui';

const root = document.getElementById('app')!;
const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;

const { state: loaded, offlineSec, offlineEarnings } = loadGame();
let state: GameState = loaded;

const fx = new Fx(fxCanvas);
fx.soundEnabled = state.settings.sound;
fx.enabled = state.settings.particles;

const ui = new UI(root, state, fx, (next) => {
  state = next;
  ui.replaceState(next);
  saveGame(state);
});

if (offlineEarnings > 0) {
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
  const dt = Math.min((now - last) / 1000, 2);
  last = now;

  const events = tick(state, dt);
  if (events.completions.length > 0) {
    const origin = ui.payoutOrigin();
    for (const c of events.completions.slice(0, 3)) {
      fx.payoutBurst(origin.x, origin.y, c.reward);
    }
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
