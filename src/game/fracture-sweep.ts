import { FRACTURE, HALF_DIVISOR } from "./fracture-config";
import type { Polygon, Edge, Sweep } from "./fracture-types";
import { edges, at } from "./fracture-intervals";

export function createSweep(regions: Polygon[], holes: Polygon[]): Sweep {
  const limits = regions.reduce(
    (box, polygon) => ({
      left: Math.max(box.left, Math.min(...polygon.map((p) => p.x))),
      right: Math.min(box.right, Math.max(...polygon.map((p) => p.x))),
      bottom: Math.max(box.bottom, Math.min(...polygon.map((p) => p.y))),
      top: Math.min(box.top, Math.max(...polygon.map((p) => p.y))),
    }),
    { left: -Infinity, right: Infinity, bottom: -Infinity, top: Infinity },
  );
  // Descendants ignore inherited holes outside their remaining slab.
  holes = holes.filter(
    (polygon) =>
      Math.max(...polygon.map((p) => p.x)) >= limits.left &&
      Math.min(...polygon.map((p) => p.x)) <= limits.right &&
      Math.max(...polygon.map((p) => p.y)) >= limits.bottom &&
      Math.min(...polygon.map((p) => p.y)) <= limits.top,
  );
  const regionEdges = regions.map((region) => edges(region));
  const holeEdges = holes.map((hole) => edges(hole));
  const allEdges = [...regionEdges.flat(), ...holeEdges.flat()];
  const holeBands = holeEdges.map((polygonEdges) => ({
    edges: polygonEdges,
    low: Math.min(...polygonEdges.flatMap((e) => [e.a.y, e.b.y])),
    high: Math.max(...polygonEdges.flatMap((e) => [e.a.y, e.b.y])),
  }));
  const ys = [...new Set(allEdges.flatMap((e) => [e.a.y, e.b.y]))].sort(
    (a, b) => a - b,
  );

  return {
    regions,
    holes,
    regionEdges,
    holeBands,
    allEdges,
    cuts: findCuts(allEdges, ys),
  };
}

function findCuts(allEdges: Edge[], ys: number[]): number[] {
  const crossingCuts: number[] = [];
  const starts = [...allEdges].sort((a, b) => a.low - b.low);
  let startIndex = 0;
  let activeEdges: Edge[] = [];
  // Split at intersections so overlapping chips form watertight unions.
  for (let row = 0; row < ys.length - 1; row++) {
    const low = ys[row]!;
    const high = ys[row + 1]!;
    const mid = (low + high) / HALF_DIVISOR;
    while (startIndex < starts.length && starts[startIndex]!.low < mid) {
      activeEdges.push(starts[startIndex++]!);
    }
    activeEdges = activeEdges.filter((e) => e.high > mid);
    const active = activeEdges
      .map((e) => ({ e, l: at(e, low), h: at(e, high) }))
      .sort((a, b) => Math.min(a.l, a.h) - Math.min(b.l, b.h));
    appendCrossings(active, { low, high }, crossingCuts);
  }

  return [...new Set([...ys, ...crossingCuts])].sort((a, b) => a - b);
}

interface ActiveEdge {
  e: Edge;
  l: number;
  h: number;
}
interface BandRange {
  low: number;
  high: number;
}

function appendCrossings(
  active: ActiveEdge[],
  band: BandRange,
  crossingCuts: number[],
) {
  const { low, high } = band;
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      if (Math.min(b.l, b.h) > Math.max(a.l, a.h) + FRACTURE.gapEpsilon) {
        break;
      }
      const d0 = a.l - b.l;
      const d1 = a.h - b.h;
      if (d0 * d1 < -FRACTURE.crossingEpsilon) {
        crossingCuts.push(low + ((high - low) * d0) / (d0 - d1));
      }
    }
  }
}
