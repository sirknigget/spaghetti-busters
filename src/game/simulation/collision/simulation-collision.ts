import {
  clamp,
  HALF,
} from "#root/src/game/simulation/common/simulation-math.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import { type Block } from "#root/src/game/simulation/simulation-types.ts";

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

interface ClipInterval {
  min: number;
  max: number;
}

function clipAxis(
  interval: ClipInterval,
  axis: { start: number; delta: number; half: number },
) {
  const { start, delta, half } = axis;

  if (Math.abs(delta) < TUNING.collision.parallelEpsilon) {
    if (Math.abs(start) > half) {
      return false;
    }

    return true;
  }

  const t1 = (-half - start) / delta;
  const t2 = (half - start) / delta;

  interval.min = Math.max(interval.min, Math.min(t1, t2));
  interval.max = Math.min(interval.max, Math.max(t1, t2));

  if (interval.min > interval.max) {
    return false;
  }

  return true;
}

export function segmentRectangle({
  ax,
  ay,
  bx,
  by,
  halfWidth,
  halfHeight,
}: SegmentRectangleOptions) {
  const interval = { min: 0, max: 1 };

  return [
    { start: ax, delta: bx - ax, half: halfWidth },
    { start: ay, delta: by - ay, half: halfHeight },
  ].every((axis) => clipAxis(interval, axis));
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
