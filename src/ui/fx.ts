import { formatMoney } from '../game/format';

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
      ctx.font = '700 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
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
    this.tone([880, 1318.5], 0.08, 0.12);
  }

  click(): void {
    if (!this.soundEnabled) return;
    this.tone([440], 0.03, 0.05);
  }

  private tone(freqs: number[], gainValue: number, duration: number): void {
    try {
      this.audio ??= new AudioContext();
      const t0 = this.audio.currentTime;
      for (let i = 0; i < freqs.length; i++) {
        const osc = this.audio.createOscillator();
        const gain = this.audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        gain.gain.setValueAtTime(gainValue, t0 + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + duration);
        osc.connect(gain).connect(this.audio.destination);
        osc.start(t0 + i * 0.06);
        osc.stop(t0 + i * 0.06 + duration + 0.02);
      }
    } catch {
      // Audio not available — ignore.
    }
  }
}
