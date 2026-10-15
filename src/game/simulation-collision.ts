import { clamp, HALF } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import { type Block } from "./simulation-types";

interface SegmentDistanceOptions {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  px: number;
  py: number;
}
export function segmentDistance({
  ax,
  ay,
  bx,
  by,
  px,
  py,
}: SegmentDistanceOptions) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t =
    length === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1);

  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

interface SegmentRectangleOptions {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  halfWidth: number;
  halfHeight: number;
}
export function segmentRectangle({
  ax,
  ay,
  bx,
  by,
  halfWidth,
  halfHeight,
}: SegmentRectangleOptions) {
  let min = 0;
  let max = 1;
  for (const [start, delta, half] of [
    [ax, bx - ax, halfWidth],
    [ay, by - ay, halfHeight],
  ]) {
    if (Math.abs(delta!) < TUNING.collision.parallelEpsilon) {
      if (Math.abs(start!) > half!) {
        return false;
      }
    } else {
      const t1 = (-half! - start!) / delta!;
      const t2 = (half! - start!) / delta!;
      min = Math.max(min, Math.min(t1, t2));
      max = Math.min(max, Math.max(t1, t2));
      if (min > max) {
        return false;
      }
    }
  }

  return true;
}

export function extents(block: Block) {
  const cos = Math.abs(Math.cos(block.angle));
  const sin = Math.abs(Math.sin(block.angle));

  return {
    x: cos * block.width * HALF + sin * block.height * HALF,
    y: sin * block.width * HALF + cos * block.height * HALF,
  };
}

export interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
