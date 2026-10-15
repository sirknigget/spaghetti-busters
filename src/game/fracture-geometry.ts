import * as THREE from "three";

const VECTOR_COMPONENTS = 3;
const UV_COMPONENTS = 2;
const PAIR_SIZE = 2;
const HALF_DIVISOR = 2;
const COORDINATE = { x: 0, y: 1, z: 2 };
const QUAD = { first: 0, second: 1, third: 2, fourth: 3 };
const TRIANGLE_FAN = [
  QUAD.first,
  QUAD.second,
  QUAD.third,
  QUAD.first,
  QUAD.third,
  QUAD.fourth,
];
const FRACTURE = {
  edgeEpsilon: 0.0001,
  gapEpsilon: 0.001,
  crossingEpsilon: 0.000001,
  hashMultiplier: 0x45d9f3b,
  hashShift: 16,
  maxHash: 4294967295,
  minSegments: 3,
  segmentLength: 15,
  noiseCenter: 0.5,
  noiseAmplitude: 12,
  textureHeaderHeight: 26,
};
const CHIP = {
  vertices: 10,
  revolution: Math.PI * PAIR_SIZE,
  minSpread: 0.76,
  spreadRange: 0.36,
  baseRadiusX: 5.7,
  radiusXSeed: 20,
  radiusXRange: 1.3,
  baseRadiusY: 9.8,
  radiusYSeed: 21,
  radiusYRange: 1.4,
};

export type Point = { x: number; y: number };
export type Polygon = Point[];
type Edge = { a: Point; b: Point; low: number; high: number };
type Interval = { left: Edge; right: Edge };
const at = (edge: Edge, y: number) =>
  edge.a.x + ((edge.b.x - edge.a.x) * (y - edge.a.y)) / (edge.b.y - edge.a.y);
const edges = (polygon: Polygon): Edge[] =>
  polygon
    .map((a, i) => {
      const b = polygon[(i + 1) % polygon.length]!;
      return { a, b, low: Math.min(a.y, b.y), high: Math.max(a.y, b.y) };
    })
    .filter((e) => e.high - e.low > FRACTURE.edgeEpsilon);

/** Stable entropy: geometry never flickers as the simulation advances. */
export function fractureNoise(seed: number, index: number) {
  let v = seed ^ Math.imul(index + 1, FRACTURE.hashMultiplier);
  v = Math.imul(v ^ (v >>> FRACTURE.hashShift), FRACTURE.hashMultiplier);
  v = Math.imul(v ^ (v >>> FRACTURE.hashShift), FRACTURE.hashMultiplier);
  return ((v ^ (v >>> FRACTURE.hashShift)) >>> 0) / FRACTURE.maxHash;
}

export function chippedHole(x: number, y: number, seed: number): Polygon {
  const points: Polygon = [];
  for (let i = 0; i < CHIP.vertices; i++) {
    const angle = (i * CHIP.revolution) / CHIP.vertices,
      spread = CHIP.minSpread + fractureNoise(seed, i) * CHIP.spreadRange;
    points.push({
      x:
        x +
        Math.cos(angle) *
          (CHIP.baseRadiusX +
            fractureNoise(seed, CHIP.radiusXSeed) * CHIP.radiusXRange) *
          spread,
      y:
        y +
        Math.sin(angle) *
          (CHIP.baseRadiusY +
            fractureNoise(seed, CHIP.radiusYSeed) * CHIP.radiusYRange) *
          spread,
    });
  }
  return points;
}

/** Complementary, seeded fracture masks; the two contours share exactly the same broken edge. */
export function fractureMask(
  axis: "x" | "y",
  cut: number,
  side: number,
  seed: number,
  bounds: { left: number; right: number; bottom: number; top: number },
): Polygon {
  const vertical = axis === "x",
    low = vertical ? bounds.bottom : bounds.left,
    high = vertical ? bounds.top : bounds.right;
  const along: Polygon = [];
  const count = Math.max(
    FRACTURE.minSegments,
    Math.ceil((high - low) / FRACTURE.segmentLength),
  );
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      parallel = low + (high - low) * t;
    const broken =
      cut +
      (i === 0 || i === count
        ? 0
        : (fractureNoise(seed, i) - FRACTURE.noiseCenter) *
          FRACTURE.noiseAmplitude);
    along.push(
      vertical ? { x: broken, y: parallel } : { x: parallel, y: broken },
    );
  }
  if (vertical)
    return side < 0
      ? [{ x: bounds.left, y: low }, ...along, { x: bounds.left, y: high }]
      : [
          { x: bounds.right, y: low },
          { x: bounds.right, y: high },
          ...along.reverse(),
        ];
  return side < 0
    ? [
        { x: low, y: bounds.bottom },
        { x: high, y: bounds.bottom },
        ...along.reverse(),
      ]
    : [{ x: low, y: bounds.top }, ...along, { x: high, y: bounds.top }];
}

/** Sweep the union of chipped holes through intersected fracture regions. Produces actual open
 * holes, interior walls and a solid broken perimeter, with UVs anchored to the original slab. */
// The ordered scanline sweep keeps shared boundaries identical; nested interval traversal and
// early exits avoid allocating intermediate meshes or changing floating-point operation order.
// oxlint-disable sonarjs/nested-control-flow, sonarjs/too-many-break-or-continue-in-loop
export function perforatedGeometry(
  regions: Polygon[],
  holes: Polygon[],
  depth: number,
  offset: Point,
  root: { width: number; height: number },
): THREE.BufferGeometry {
  // Later fragments ignore distant inherited holes; their original source sheet may be huge.
  const limits = regions.reduce(
    (box, polygon) => ({
      left: Math.max(box.left, Math.min(...polygon.map((p) => p.x))),
      right: Math.min(box.right, Math.max(...polygon.map((p) => p.x))),
      bottom: Math.max(box.bottom, Math.min(...polygon.map((p) => p.y))),
      top: Math.min(box.top, Math.max(...polygon.map((p) => p.y))),
    }),
    { left: -Infinity, right: Infinity, bottom: -Infinity, top: Infinity },
  );
  holes = holes.filter(
    (polygon) =>
      Math.max(...polygon.map((p) => p.x)) >= limits.left &&
      Math.min(...polygon.map((p) => p.x)) <= limits.right &&
      Math.max(...polygon.map((p) => p.y)) >= limits.bottom &&
      Math.min(...polygon.map((p) => p.y)) <= limits.top,
  );
  const regionEdges = regions.map((region) => edges(region)),
    holeEdges = holes.map((hole) => edges(hole)),
    allEdges = [...regionEdges.flat(), ...holeEdges.flat()];
  const holeBands = holeEdges.map((polygonEdges) => ({
    edges: polygonEdges,
    low: Math.min(...polygonEdges.flatMap((e) => [e.a.y, e.b.y])),
    high: Math.max(...polygonEdges.flatMap((e) => [e.a.y, e.b.y])),
  }));
  const ys = [...new Set(allEdges.flatMap((e) => [e.a.y, e.b.y]))].sort(
    (a, b) => a - b,
  );
  const crossingCuts: number[] = [];
  const starts = [...allEdges].sort((a, b) => a.low - b.low);
  let startIndex = 0,
    activeEdges: Edge[] = [];
  // Split at edge intersections too, so overlapping chips form clean, watertight unions.
  for (let row = 0; row < ys.length - 1; row++) {
    const low = ys[row]!,
      high = ys[row + 1]!,
      mid = (low + high) / HALF_DIVISOR;
    while (startIndex < starts.length && starts[startIndex]!.low < mid)
      activeEdges.push(starts[startIndex++]!);
    activeEdges = activeEdges.filter((e) => e.high > mid);
    const active = activeEdges
      .map((e) => ({ e, l: at(e, low), h: at(e, high) }))
      .sort((a, b) => Math.min(a.l, a.h) - Math.min(b.l, b.h));
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!,
          b = active[j]!;
        if (Math.min(b.l, b.h) > Math.max(a.l, a.h) + FRACTURE.gapEpsilon)
          break;
        const d0 = a.l - b.l,
          d1 = a.h - b.h;
        if (d0 * d1 < -FRACTURE.crossingEpsilon)
          crossingCuts.push(low + ((high - low) * d0) / (d0 - d1));
      }
  }
  const cuts = [...new Set([...ys, ...crossingCuts])].sort((a, b) => a - b);
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [];
  const frontTriangles: number[][][] = [],
    walls: number[][][] = [];
  const span = (polygonEdges: Edge[], y: number): Interval[] => {
    const crossings = polygonEdges
      .filter((e) => y > e.low && y < e.high)
      .sort((a, b) => at(a, y) - at(b, y));
    const intervals: Interval[] = [];
    for (let i = 0; i < crossings.length - 1; i += PAIR_SIZE)
      intervals.push({ left: crossings[i]!, right: crossings[i + 1]! });
    return intervals;
  };
  const intersect = (a: Interval[], b: Interval[], y: number): Interval[] =>
    a.flatMap((aa) =>
      b.flatMap((bb) => {
        const left = at(aa.left, y) > at(bb.left, y) ? aa.left : bb.left,
          right = at(aa.right, y) < at(bb.right, y) ? aa.right : bb.right;
        return at(right, y) - at(left, y) > FRACTURE.gapEpsilon
          ? [{ left, right }]
          : [];
      }),
    );
  type Strip = Interval & { y0: number; y1: number };
  const strips: Strip[] = [];
  let previous = new Map<Edge, Map<Edge, Strip>>();
  for (let row = 0; row < cuts.length - 1; row++) {
    const y0 = cuts[row]!,
      y1 = cuts[row + 1]!;
    if (y1 - y0 < FRACTURE.edgeEpsilon) continue;
    const mid = (y0 + y1) / HALF_DIVISOR;
    let solids = span(regionEdges[0]!, mid);
    for (const region of regionEdges.slice(1))
      solids = intersect(solids, span(region, mid), mid);
    const holesAt = holeBands
      .filter((band) => mid > band.low && mid < band.high)
      .flatMap((band) => span(band.edges, mid))
      .sort((a, b) => at(a.left, mid) - at(b.left, mid));
    // Union first, then subtract with one ordered pass rather than rescanning every growing gap.
    const union: Interval[] = [];
    for (const hole of holesAt) {
      const last = union.at(-1);
      if (last && at(hole.left, mid) <= at(last.right, mid)) {
        if (at(hole.right, mid) > at(last.right, mid)) last.right = hole.right;
      } else union.push({ ...hole });
    }
    const visible: Interval[] = [];
    let holeIndex = 0;
    for (const solid of solids) {
      let left = solid.left;
      while (
        holeIndex < union.length &&
        at(union[holeIndex]!.right, mid) <= at(left, mid)
      )
        holeIndex++;
      let index = holeIndex;
      while (
        index < union.length &&
        at(union[index]!.left, mid) < at(solid.right, mid)
      ) {
        const hole = union[index]!;
        if (at(hole.left, mid) > at(left, mid))
          visible.push({ left, right: hole.left });
        if (at(hole.right, mid) >= at(solid.right, mid)) {
          left = solid.right;
          break;
        }
        left = hole.right;
        index++;
      }
      holeIndex = index;
      if (at(left, mid) < at(solid.right, mid))
        visible.push({ left, right: solid.right });
    }
    // Unrelated holes introduce global Y cuts. Straight, unchanged boundaries can span those
    // cuts in one exact trapezoid, avoiding millions of redundant triangles on worn slabs.
    const current = new Map<Edge, Map<Edge, Strip>>();
    for (const interval of visible) {
      const prior = previous.get(interval.left)?.get(interval.right);
      const strip = prior?.y1 === y0 ? prior : { ...interval, y0, y1 };
      if (strip === prior) strip.y1 = y1;
      else strips.push(strip);
      let rightEdges = current.get(interval.left);
      if (!rightEdges) {
        rightEdges = new Map();
        current.set(interval.left, rightEdges);
      }
      rightEdges.set(interval.right, strip);
    }
    previous = current;
  }
  for (const s of strips) {
    const { y0, y1 } = s,
      x00 = at(s.left, y0),
      x01 = at(s.right, y0),
      x10 = at(s.left, y1),
      x11 = at(s.right, y1);
    frontTriangles.push([
      [x00, y0, depth],
      [x01, y0, depth],
      [x11, y1, depth],
      [x10, y1, depth],
    ]);
    walls.push(
      [
        [x00, y0, -depth],
        [x00, y0, depth],
        [x10, y1, depth],
        [x10, y1, -depth],
      ],
      [
        [x01, y0, depth],
        [x01, y0, -depth],
        [x11, y1, -depth],
        [x11, y1, depth],
      ],
    );
  }
  const vector = (point: number[]) =>
    new THREE.Vector3(point[0]!, point[1]!, point[COORDINATE.z]!);
  const quad = (points: number[][], normal?: THREE.Vector3) => {
    const n =
      normal ??
      new THREE.Vector3()
        .subVectors(vector(points[1]!), vector(points[0]!))
        .cross(
          new THREE.Vector3().subVectors(
            vector(points[QUAD.third]!),
            vector(points[0]!),
          ),
        )
        .normalize();
    for (const i of TRIANGLE_FAN) {
      const p = points[i]!;
      positions.push(p[0]! - offset.x, p[1]! - offset.y, p[COORDINATE.z]!);
      normals.push(n.x, n.y, n.z);
      uvs.push(
        (p[0]! + root.width / HALF_DIVISOR) / root.width,
        (p[1]! + root.height / HALF_DIVISOR) /
          (root.height + FRACTURE.textureHeaderHeight),
      );
    }
  };
  for (const q of frontTriangles) {
    quad(q, new THREE.Vector3(0, 0, 1));
  }
  const frontCount = positions.length / VECTOR_COMPONENTS;
  for (const q of frontTriangles) {
    quad(
      [...q].reverse().map((p) => [p[0]!, p[1]!, -depth]),
      new THREE.Vector3(0, 0, -1),
    );
  }
  for (const q of walls) {
    quad(q);
  }
  // Horizontal boundaries only occur at horizontal polygon segments; break them at every
  // crossing and retain those adjacent to solid on exactly one side.
  const horizontal = [...regions, ...holes]
    .flatMap((p) => p.map((a, i) => ({ a, b: p[(i + 1) % p.length]! })))
    .filter((e) => Math.abs(e.a.y - e.b.y) < FRACTURE.edgeEpsilon);
  const inside = (p: Point, polygon: Polygon) => {
    let yes = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!,
        b = polygon[j]!;
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        yes = !yes;
    }
    return yes;
  };
  const solid = (p: Point) =>
    regions.every((poly) => inside(p, poly)) &&
    !holes.some((poly) => inside(p, poly));
  for (const e of horizontal) {
    const y = e.a.y,
      xs = [
        e.a.x,
        e.b.x,
        ...allEdges
          .filter(
            (a) => y >= Math.min(a.a.y, a.b.y) && y <= Math.max(a.a.y, a.b.y),
          )
          .map((a) => at(a, y)),
      ]
        .filter(
          (x) =>
            x >= Math.min(e.a.x, e.b.x) - FRACTURE.gapEpsilon &&
            x <= Math.max(e.a.x, e.b.x) + FRACTURE.gapEpsilon,
        )
        .sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i]!,
        b = xs[i + 1]!;
      if (b - a < FRACTURE.gapEpsilon) continue;
      const above = solid({
          x: (a + b) / HALF_DIVISOR,
          y: y + FRACTURE.gapEpsilon,
        }),
        below = solid({
          x: (a + b) / HALF_DIVISOR,
          y: y - FRACTURE.gapEpsilon,
        });
      if (above === below) continue;
      quad(
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
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, VECTOR_COMPONENTS),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, VECTOR_COMPONENTS),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, UV_COMPONENTS),
  );
  geometry.addGroup(0, frontCount, 0);
  geometry.addGroup(
    frontCount,
    positions.length / VECTOR_COMPONENTS - frontCount,
    1,
  );
  geometry.computeBoundingSphere();
  return geometry;
}

// oxlint-enable sonarjs/nested-control-flow, sonarjs/too-many-break-or-continue-in-loop
