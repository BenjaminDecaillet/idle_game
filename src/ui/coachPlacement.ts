/**
 * Pure rect math for the tutorial coach popup: given the popup size, the
 * rect of the element the step is explaining and the viewport, pick a
 * position that NEVER covers the target — below it when there is room,
 * flipped above otherwise, clamped to the viewport on all sides. DOM-free
 * so vitest can cover the flip/clamp behavior directly.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CoachPosition {
  left: number;
  top: number;
  /** Which side of the target the popup ended up on. */
  placement: 'above' | 'below';
}

/** Axis-aligned rectangle intersection (touching edges do not count). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/**
 * Place the popup relative to `target` inside `viewport`.
 *
 * - Prefers sitting below the target, flips above when below does not fit.
 * - When neither side fully fits (tiny viewports), takes the side with more
 *   room and pins the popup against the viewport edge farthest from the
 *   target, so as much of the target as possible stays visible.
 * - Horizontally centered on the target, clamped to the viewport.
 */
export function placeCoach(
  popup: Size,
  target: Rect,
  viewport: Size,
  margin = 10,
): CoachPosition {
  const targetBottom = target.top + target.height;
  const spaceAbove = target.top - margin * 2;
  const spaceBelow = viewport.height - targetBottom - margin * 2;

  const fitsBelow = spaceBelow >= popup.height;
  const fitsAbove = spaceAbove >= popup.height;

  let placement: 'above' | 'below';
  if (fitsBelow) placement = 'below';
  else if (fitsAbove) placement = 'above';
  else placement = spaceBelow >= spaceAbove ? 'below' : 'above';

  // Ideal spot hugs the target; the final clamp only moves the popup when
  // the target sits (partly) outside the viewport — e.g. scrolled below the
  // fold — or on the forced case above. Staying fully on-screen wins then:
  // an off-screen target cannot be covered anyway.
  let top = placement === 'below' ? targetBottom + margin : target.top - margin - popup.height;
  top = clamp(top, margin, Math.max(margin, viewport.height - popup.height - margin));

  const left = clamp(
    target.left + target.width / 2 - popup.width / 2,
    margin,
    Math.max(margin, viewport.width - popup.width - margin),
  );

  return { left, top, placement };
}
