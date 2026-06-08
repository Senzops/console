/**
 * Custom Easing Functions
 * =======================
 * Production easing curves for Remotion interpolations.
 * Mirrors the EaseOutQuart used in src/components/Tween/index.tsx
 * and provides additional curves for cinematic motion graphics.
 */

/** EaseOutQuart — matches the main app's Tween component */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** EaseInQuart — for exit animations */
export function easeInQuart(t: number): number {
  return t * t * t * t;
}

/** EaseOutCubic — smoother deceleration for text reveals */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** EaseInOutCubic — for symmetric transitions */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** EaseOutExpo — dramatic deceleration for hero elements */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** EaseOutBack — slight overshoot, great for UI element entrances */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** EaseOutElastic — bouncy entrance for emphasis elements */
export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
