export const HALF = 0.5;
export const FULL_TURN_RADIANS = Math.PI / HALF;
export const SQUARED = 2;
export const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));
