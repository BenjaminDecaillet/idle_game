import { describe, expect, it } from 'vitest';
import { placeCoach, rectsOverlap, type Rect, type Size } from '../src/ui/coachPlacement';
import { TUTORIAL_STEPS } from '../src/game/tutorial';

const popup: Size = { width: 340, height: 140 };
const phone: Size = { width: 390, height: 780 }; // mobile portrait
const desktop: Size = { width: 1280, height: 800 };

function placedRect(pos: { left: number; top: number }, size: Size): Rect {
  return { left: pos.left, top: pos.top, width: size.width, height: size.height };
}

describe('placeCoach', () => {
  it('places the popup below a target near the top, without overlap', () => {
    const target: Rect = { left: 20, top: 60, width: 200, height: 48 };
    const pos = placeCoach(popup, target, phone);
    expect(pos.placement).toBe('below');
    expect(pos.top).toBeGreaterThanOrEqual(target.top + target.height);
    expect(rectsOverlap(placedRect(pos, popup), target)).toBe(false);
  });

  it('flips above a target near the bottom (the train-button case)', () => {
    const target: Rect = { left: 20, top: 640, width: 200, height: 48 };
    const pos = placeCoach(popup, target, phone);
    expect(pos.placement).toBe('above');
    expect(pos.top + popup.height).toBeLessThanOrEqual(target.top);
    expect(rectsOverlap(placedRect(pos, popup), target)).toBe(false);
  });

  it('never overlaps the target anywhere it can sit on a phone screen', () => {
    for (let top = 0; top <= phone.height - 48; top += 25) {
      const target: Rect = { left: 10, top, width: 370, height: 48 };
      const pos = placeCoach(popup, target, phone);
      expect(rectsOverlap(placedRect(pos, popup), target)).toBe(false);
    }
  });

  it('stays inside the viewport in both axes', () => {
    const targets: Rect[] = [
      { left: -30, top: 10, width: 60, height: 40 }, // clipped left edge
      { left: 1250, top: 700, width: 60, height: 40 }, // bottom-right corner
      { left: 600, top: 380, width: 80, height: 40 }, // dead center
    ];
    for (const target of targets) {
      const pos = placeCoach(popup, target, desktop);
      expect(pos.left).toBeGreaterThanOrEqual(0);
      expect(pos.left + popup.width).toBeLessThanOrEqual(desktop.width);
      expect(pos.top).toBeGreaterThanOrEqual(0);
      expect(pos.top + popup.height).toBeLessThanOrEqual(desktop.height);
    }
  });

  it('centers horizontally on the target when there is room', () => {
    const target: Rect = { left: 500, top: 100, width: 100, height: 40 };
    const pos = placeCoach(popup, target, desktop);
    expect(pos.left + popup.width / 2).toBeCloseTo(550, 0);
  });

  it('stays fully on-screen when the target is scrolled below the fold', () => {
    const target: Rect = { left: 10, top: 1088, width: 370, height: 48 }; // off-screen
    const pos = placeCoach(popup, target, phone);
    expect(pos.top + popup.height).toBeLessThanOrEqual(phone.height);
    expect(pos.top).toBeGreaterThanOrEqual(0);
  });

  it('degrades gracefully when neither side fits: picks the roomier side and stays on-screen', () => {
    const tiny: Size = { width: 320, height: 200 };
    const target: Rect = { left: 0, top: 20, width: 320, height: 40 };
    const pos = placeCoach(popup, target, tiny);
    expect(pos.placement).toBe('below'); // 140px below vs 20px above
    expect(pos.top).toBeGreaterThanOrEqual(10);
    expect(pos.left).toBeGreaterThanOrEqual(0);
  });
});

describe('tutorial step targets', () => {
  it('every step that sends the player to a tab targets a concrete element', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.tab) {
        expect(step.target, `step "${step.id}" needs a target selector`).toBeTruthy();
      }
    }
  });

  it('target selectors point at action buttons', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.target) expect(step.target).toMatch(/^\[data-action/);
    }
  });
});
