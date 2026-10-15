import { type Polygon, type Point } from "./fracture-geometry";
import { type Block } from "./simulation";
import { HALF, HEADER_HEIGHT, SLAB } from "./code-settings";
import { createCodeCanvas } from "./code-surface";

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
  return regions.every((polygon) => {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!;
      const b = polygon[j]!;

      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      ) {
        inside = !inside;
      }
    }

    return inside;
  });
}
