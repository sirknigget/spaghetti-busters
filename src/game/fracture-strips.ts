import { FRACTURE, HALF_DIVISOR } from "./fracture-config";
import type { Edge, Interval, Sweep, Strip } from "./fracture-types";
import { at, span, intersect } from "./fracture-intervals";

function unionHoles(holesAt: Interval[], mid: number): Interval[] {
  const union: Interval[] = [];
  for (const hole of holesAt) {
    const last = union.at(-1);
    if (last && at(hole.left, mid) <= at(last.right, mid)) {
      if (at(hole.right, mid) > at(last.right, mid)) {
        last.right = hole.right;
      }
    } else {
      union.push({ ...hole });
    }
  }

  return union;
}

function subtractHoles(
  solids: Interval[],
  union: Interval[],
  mid: number,
): Interval[] {
  const visible: Interval[] = [];
  let holeIndex = 0;
  for (const solid of solids) {
    let left = solid.left;
    while (
      holeIndex < union.length &&
      at(union[holeIndex]!.right, mid) <= at(left, mid)
    ) {
      holeIndex++;
    }
    let index = holeIndex;
    while (
      index < union.length &&
      at(union[index]!.left, mid) < at(solid.right, mid)
    ) {
      const hole = union[index]!;
      if (at(hole.left, mid) > at(left, mid)) {
        visible.push({ left, right: hole.left });
      }
      if (at(hole.right, mid) >= at(solid.right, mid)) {
        left = solid.right;
        break;
      }
      left = hole.right;
      index++;
    }
    holeIndex = index;
    if (at(left, mid) < at(solid.right, mid)) {
      visible.push({ left, right: solid.right });
    }
  }

  return visible;
}

type StripMap = Map<Edge, Map<Edge, Strip>>;
interface StripRow {
  visible: Interval[];
  y0: number;
  y1: number;
  strips: Strip[];
}

function extendStrips(previous: StripMap, row: StripRow): StripMap {
  const { visible, y0, y1, strips } = row;
  const current = new Map<Edge, Map<Edge, Strip>>();
  for (const interval of visible) {
    const prior = previous.get(interval.left)?.get(interval.right);
    const strip = prior?.y1 === y0 ? prior : { ...interval, y0, y1 };
    if (strip === prior) {
      strip.y1 = y1;
    } else {
      strips.push(strip);
    }
    let rightEdges = current.get(interval.left);
    if (!rightEdges) {
      rightEdges = new Map();
      current.set(interval.left, rightEdges);
    }
    rightEdges.set(interval.right, strip);
  }

  return current;
}

function visibleAt(sweep: Sweep, mid: number): Interval[] {
  const { regionEdges, holeBands } = sweep;
  let solids = span(regionEdges[0]!, mid);
  for (const region of regionEdges.slice(1)) {
    solids = intersect(solids, span(region, mid), mid);
  }
  const holesAt = holeBands
    .filter((band) => mid > band.low && mid < band.high)
    .flatMap((band) => span(band.edges, mid))
    .sort((a, b) => at(a.left, mid) - at(b.left, mid));

  return subtractHoles(solids, unionHoles(holesAt, mid), mid);
}

export function createStrips(sweep: Sweep): Strip[] {
  const strips: Strip[] = [];
  let previous: StripMap = new Map();
  const { cuts } = sweep;
  for (let row = 0; row < cuts.length - 1; row++) {
    const y0 = cuts[row]!;
    const y1 = cuts[row + 1]!;
    if (y1 - y0 < FRACTURE.edgeEpsilon) {
      continue;
    }
    previous = extendStrips(previous, {
      visible: visibleAt(sweep, (y0 + y1) / HALF_DIVISOR),
      y0,
      y1,
      strips,
    });
  }

  return strips;
}
