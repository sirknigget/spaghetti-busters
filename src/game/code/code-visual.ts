import {
  type Polygon,
  type Point,
} from "#root/src/game/geometry/fracture/fracture-geometry.ts";
import { type Block } from "#root/src/game/simulation/simulation.ts";
import {
  HALF,
  HEADER_HEIGHT,
  SLAB,
} from "#root/src/game/code/code-settings.ts";
import { createCodeCanvas } from "#root/src/game/code/code-surface.ts";
import { inside } from "#root/src/game/geometry/fracture/sweep/fracture-intervals.ts";

export interface FractureVisual {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  depth: number;
  offset: { x: number; y: number };
  regions: Polygon[];
  holes: Map<string, Polygon>;
  scars: Set<string>;
  fractured: boolean;
}

export function createVisual(block: Block): FractureVisual {
  const { width: w, height: h } = block;
  const canvas = createCodeCanvas(block);
  const top = h * HALF + HEADER_HEIGHT;
  const bottom = -h * HALF;

  return {
    canvas,
    width: w,
    height: h,
    depth: block.boss
      ? SLAB.bossDepth
      : SLAB.baseDepth +
        Math.min(
          SLAB.maximumExtraDepth,
          block.generation * SLAB.generationDepth,
        ),
    offset: { x: 0, y: 0 },
    regions: [
      [
        { x: -w * HALF, y: bottom },
        { x: w * HALF, y: bottom },
        { x: w * HALF, y: top },
        { x: -w * HALF, y: top },
      ],
    ],
    holes: new Map(),
    scars: new Set(),
    fractured: false,
  };
}

export function insideRegions(point: Point, regions: Polygon[]) {
  return regions.every((polygon) => inside(point, polygon));
}
