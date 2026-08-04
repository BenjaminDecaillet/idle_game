import { formatMoney } from './format';

/**
 * Lightweight canvas FX: confetti bursts and floating "+$" labels on project
 * completion, plus a tiny WebAudio synth for feedback sounds. No assets.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
}

interface FloatText {
  x: number;
  y: number;
  life: number;
  text: string;
}

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee'];

// ---------------------------------------------------------------------------
// Chiptune theme ("Garage Dreams") — synthesized, no assets. Notes are MIDI
// numbers; null = rest. The loop is 4 bars of 8th notes (32 steps) over the
// classic C–G–Am–F progression: square lead, triangle bass, offbeat blips.
// ---------------------------------------------------------------------------

const MUSIC_BPM = 132;
/** Seconds per 8th-note step. */
const MUSIC_STEP_SEC = 60 / MUSIC_BPM / 2;
/** Master music level relative to musicVolume — keeps SFX on top. */
const MUSIC_BUS_LEVEL = 0.22;
/** Scheduler lookahead: schedule steps this far ahead of the playhead. */
const MUSIC_LOOKAHEAD_SEC = 0.3;

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

// prettier-ignore
const MUSIC_LEAD: (number | null)[] = [
  // C                              G
  72, null, 76, 79, null, 79, 76, null,   71, null, 74, 79, null, 79, 74, null,
  // Am                             F
  69, null, 72, 76, null, 76, 72, null,   65, null, 69, 72, null, 74, 71, null,
];
// prettier-ignore
const MUSIC_BASS: (number | null)[] = [
  36, 48, 36, 48, 36, 48, 36, 48,   43, 55, 43, 55, 43, 55, 43, 55,
  45, 57, 45, 57, 45, 57, 45, 57,   41, 53, 41, 53, 41, 53, 41, 53,
];
// prettier-ignore
const MUSIC_BLIP: (number | null)[] = [
  null, null, 88, null, null, null, 88, null,   null, null, 86, null, null, null, 86, null,
  null, null, 88, null, null, null, 88, null,   null, null, 89, null, null, null, 89, null,
];

export class Fx {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private lastBurst = 0;
  private audio: AudioContext | null = null;
  private lastDing = 0;
  enabled = true;
  soundEnabled = true;
  /** Music bus: master gain shared by every scheduled note, for volume + ducking. */
  private musicGain: GainNode | null = null;
  private musicOn = false;
  private musicVolume = 0.5;
  /** Absolute AudioContext time of the next unscheduled step. */
  private musicNextTime = 0;
  private musicStep = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Confetti + floating reward text at the given viewport position. */
  payoutBurst(x: number, y: number, reward: number): void {
    if (!this.burst(x, y)) return;
    this.texts.push({ x, y: y - 10, life: 0, text: `+${formatMoney(reward)}` });
    this.ding();
  }

  /** Confetti only (no text) — returns false when throttled/disabled. */
  burst(x: number, y: number): boolean {
    const now = performance.now();
    if (!this.enabled || now - this.lastBurst < 120) return false; // throttle heavy streams
    this.lastBurst = now;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.6,
        size: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    return true;
  }

  update(dt: number): void {
    this.scheduleMusic();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!this.enabled) {
      this.particles = [];
      this.texts = [];
      return;
    }
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vy += 500 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    });
    this.texts = this.texts.filter((t) => {
      t.life += dt;
      if (t.life >= 1.2) return false;
      const alpha = 1 - t.life / 1.2;
      ctx.globalAlpha = alpha;
      ctx.font = `800 16px 'Baloo 2', system-ui, sans-serif`;
      ctx.fillStyle = '#1f9d55';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(t.text, t.x, t.y - t.life * 50);
      ctx.fillText(t.text, t.x, t.y - t.life * 50);
      return true;
    });
    ctx.globalAlpha = 1;
  }

  /** Short synth "cha-ching" — throttled so payout storms don't get noisy. */
  private ding(): void {
    if (!this.soundEnabled) return;
    const now = performance.now();
    if (now - this.lastDing < 250) return;
    this.lastDing = now;
    this.duckMusic();
    this.tone([880, 1318.5], 0.08, 0.12);
  }

  click(): void {
    if (!this.soundEnabled) return;
    this.tone([440], 0.03, 0.05);
  }

  /** Angelic rising arpeggio for Gabriel's story beats. */
  storyChime(): void {
    if (!this.soundEnabled) return;
    this.duckMusic(0.9);
    this.tone([523.25, 659.25, 783.99, 1046.5], 0.06, 0.5, 'sine', 0.09);
  }

  /** Bright fanfare for a claimed mission. */
  claimChime(): void {
    if (!this.soundEnabled) return;
    this.duckMusic();
    this.tone([392, 523.25, 659.25], 0.07, 0.25, 'triangle', 0.05);
  }

  /** Two sparkly blips whenever VsCoin lands in the wallet. */
  coinChime(): void {
    if (!this.soundEnabled) return;
    this.duckMusic();
    this.tone([987.77, 1318.5], 0.06, 0.15, 'sine', 0.05);
  }

  private tone(
    freqs: number[],
    gainValue: number,
    duration: number,
    type: OscillatorType = 'sine',
    stagger = 0.06,
  ): void {
    try {
      this.ensureAudio();
      const t0 = this.audio!.currentTime;
      for (let i = 0; i < freqs.length; i++) {
        const osc = this.audio!.createOscillator();
        const gain = this.audio!.createGain();
        osc.type = type;
        osc.frequency.value = freqs[i];
        gain.gain.setValueAtTime(gainValue, t0 + i * stagger);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * stagger + duration);
        osc.connect(gain).connect(this.audio!.destination);
        osc.start(t0 + i * stagger);
        osc.stop(t0 + i * stagger + duration + 0.02);
      }
    } catch {
      // Audio not available — ignore.
    }
  }

  // -------------------------------------------------------------------------
  // Chiptune loop
  // -------------------------------------------------------------------------

  /** Lazily create (and on gesture, resume) the shared AudioContext. */
  private ensureAudio(): void {
    this.audio ??= new AudioContext();
    if (this.audio.state === 'suspended') void this.audio.resume();
  }

  /**
   * Turn the theme loop on/off. Call from a user-gesture handler so the
   * AudioContext is allowed to start.
   */
  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!on) {
      this.stopMusicBus();
      return;
    }
    try {
      this.ensureAudio();
      if (!this.musicGain) {
        this.musicGain = this.audio!.createGain();
        this.musicGain.gain.value = this.musicVolume * MUSIC_BUS_LEVEL;
        this.musicGain.connect(this.audio!.destination);
      }
      this.musicNextTime = this.audio!.currentTime + 0.05;
      this.musicStep = 0;
    } catch {
      // Audio not available — ignore.
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && this.audio) {
      this.musicGain.gain.setTargetAtTime(
        this.musicVolume * MUSIC_BUS_LEVEL,
        this.audio.currentTime,
        0.05,
      );
    }
  }

  private stopMusicBus(): void {
    if (this.musicGain && this.audio) {
      // Fade out, then drop the bus — scheduled notes die with it.
      this.musicGain.gain.setTargetAtTime(0.0001, this.audio.currentTime, 0.1);
      const old = this.musicGain;
      setTimeout(() => old.disconnect(), 600);
    }
    this.musicGain = null;
  }

  /** Dip the music under a foreground chime, then recover. */
  private duckMusic(holdSec = 0.35): void {
    if (!this.musicGain || !this.audio || !this.musicOn) return;
    const g = this.musicGain.gain;
    const now = this.audio.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(this.musicVolume * MUSIC_BUS_LEVEL * 0.3, now, 0.03);
    g.setTargetAtTime(this.musicVolume * MUSIC_BUS_LEVEL, now + holdSec, 0.12);
  }

  /**
   * Lookahead scheduler, driven by update() at 60 fps: keeps ~0.3 s of the
   * loop queued with sample-accurate WebAudio timestamps.
   */
  private scheduleMusic(): void {
    if (!this.musicOn || !this.musicGain || !this.audio || this.audio.state !== 'running') {
      return;
    }
    const now = this.audio.currentTime;
    // After a background tab pause, jump the playhead instead of cramming
    // every missed step into one burst.
    if (this.musicNextTime < now - 0.1) this.musicNextTime = now;
    while (this.musicNextTime < now + MUSIC_LOOKAHEAD_SEC) {
      const step = this.musicStep % MUSIC_LEAD.length;
      const t = this.musicNextTime;
      const lead = MUSIC_LEAD[step];
      if (lead !== null) this.musicNote(midi(lead), t, MUSIC_STEP_SEC * 0.85, 'square', 0.16);
      const bass = MUSIC_BASS[step];
      if (bass !== null) this.musicNote(midi(bass), t, MUSIC_STEP_SEC * 0.95, 'triangle', 0.5);
      const blip = MUSIC_BLIP[step];
      if (blip !== null) this.musicNote(midi(blip), t, MUSIC_STEP_SEC * 0.3, 'square', 0.05);
      this.musicStep = (this.musicStep + 1) % MUSIC_LEAD.length;
      this.musicNextTime += MUSIC_STEP_SEC;
    }
  }

  /** One scheduled chip note into the music bus (attack + exponential decay). */
  private musicNote(
    freq: number,
    at: number,
    duration: number,
    type: OscillatorType,
    level: number,
  ): void {
    if (!this.audio || !this.musicGain) return;
    const osc = this.audio.createOscillator();
    const gain = this.audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(this.musicGain);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
}
