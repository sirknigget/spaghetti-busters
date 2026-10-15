import { FRACTURE, PAIR_SIZE } from "./fracture-config";
import type { Point, Polygon, Edge, Interval } from "./fracture-types";

export const at = (edge: Edge, y: number) =>
  edge.a.x + ((edge.b.x - edge.a.x) * (y - edge.a.y)) / (edge.b.y - edge.a.y);
export const edges = (polygon: Polygon): Edge[] =>
  polygon
    .map((a, i) => {
      const b = polygon[(i + 1) % polygon.length]!;

      return { a, b, low: Math.min(a.y, b.y), high: Math.max(a.y, b.y) };
    })
    .filter((e) => e.high - e.low > FRACTURE.edgeEpsilon);

export const span = (polygonEdges: Edge[], y: number): Interval[] => {
  const crossings = polygonEdges
    .filter((e) => y > e.low && y < e.high)
    .sort((a, b) => at(a, y) - at(b, y));
  const intervals: Interval[] = [];
  for (let i = 0; i < crossings.length - 1; i += PAIR_SIZE) {
    intervals.push({ left: crossings[i]!, right: crossings[i + 1]! });
  }

  return intervals;
};
export const intersect = (
  a: Interval[],
  b: Interval[],
  y: number,
): Interval[] =>
  a.flatMap((aa) =>
    b.flatMap((bb) => {
      const left = at(aa.left, y) > at(bb.left, y) ? aa.left : bb.left;
      const right = at(aa.right, y) < at(bb.right, y) ? aa.right : bb.right;

      return at(right, y) - at(left, y) > FRACTURE.gapEpsilon
        ? [{ left, right }]
        : [];
    }),
  );
export const inside = (p: Point, polygon: Polygon) => {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      yes = !yes;
    }
  }

  return yes;
};
