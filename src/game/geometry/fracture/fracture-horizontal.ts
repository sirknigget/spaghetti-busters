import {
  FRACTURE,
  HALF_DIVISOR,
} from "#root/src/game/geometry/fracture/fracture-config.ts";
import {
  inside,
  at,
} from "#root/src/game/geometry/fracture/sweep/fracture-intervals.ts";
import type {
  Point,
  Edge,
  Sweep,
} from "#root/src/game/geometry/fracture/fracture-types.ts";
import type { GeometryWriter } from "#root/src/game/geometry/fracture/fracture-writer.ts";

type HorizontalEdge = { a: Point; b: Point };
interface WallSegment {
  a: number;
  b: number;
  y: number;
  solid: (p: Point) => boolean;
}

function addSegment(writer: GeometryWriter, segment: WallSegment) {
  const { a, b, y, solid } = segment;
  const { depth } = writer.options;

  if (b - a < FRACTURE.gapEpsilon) {
    return;
  }

  const above = solid({
    x: (a + b) / HALF_DIVISOR,
    y: y + FRACTURE.gapEpsilon,
  });
  const below = solid({
    x: (a + b) / HALF_DIVISOR,
    y: y - FRACTURE.gapEpsilon,
  });

  if (above === below) {
    return;
  }

  writer.quad(
    above
      ? [
          [a, y, -depth],
          [b, y, -depth],
          [b, y, depth],
          [a, y, depth],
        ]
      : [
          [a, y, depth],
          [b, y, depth],
          [b, y, -depth],
          [a, y, -depth],
        ],
  );
}

function segmentCuts(e: HorizontalEdge, allEdges: Edge[]): number[] {
  const y = e.a.y;

  return [
    e.a.x,
    e.b.x,
    ...allEdges
      .filter((a) => y >= Math.min(a.a.y, a.b.y) && y <= Math.max(a.a.y, a.b.y))
      .map((a) => at(a, y)),
  ]
    .filter(
      (x) =>
        x >= Math.min(e.a.x, e.b.x) - FRACTURE.gapEpsilon &&
        x <= Math.max(e.a.x, e.b.x) + FRACTURE.gapEpsilon,
    )
    .sort((a, b) => a - b);
}

export function horizontalWalls(writer: GeometryWriter, sweep: Sweep) {
  const { regions, holes, allEdges } = sweep;
  const horizontal = [...regions, ...holes]
    .flatMap((p) => p.map((a, i) => ({ a, b: p[(i + 1) % p.length]! })))
    .filter((e) => Math.abs(e.a.y - e.b.y) < FRACTURE.edgeEpsilon);

  const solid = (p: Point) =>
    regions.every((poly) => inside(p, poly)) &&
    !holes.some((poly) => inside(p, poly));

  for (const e of horizontal) {
    const xs = segmentCuts(e, allEdges);

    for (let i = 0; i < xs.length - 1; i++) {
      addSegment(writer, { a: xs[i]!, b: xs[i + 1]!, y: e.a.y, solid });
    }
  }
}
