import * as THREE from "three";
import { fractureNoise } from "./fracture-geometry";

// Interleaved vertex contract used only by the runtime clipping algorithm.
const COMPONENT = { x: 0, y: 1, z: 2, nx: 3, ny: 4, nz: 5, u: 6, v: 7 };
const VECTOR_COMPONENTS = 3;
const UV_COMPONENTS = 2;
const TRIANGLE_VERTICES = 3;
const SEGMENT_VERTICES = 2;
const SEAM = {
  epsilon: 1e-7,
  areaEpsilon: 1e-12,
  crossingEpsilon: 1e-14,
  minSegments: 3,
  segmentLength: 15,
  noiseCenter: 0.5,
  noiseAmplitude: 12,
  maxDisplacement: 6,
};

type Vertex = number[];
type Output = {
  p: number[];
  n: number[];
  uv: number[];
  walls: Vertex[][];
  frontCount: number;
};
const clip = (polygon: Vertex[], distance: (v: Vertex) => number): Vertex[] => {
  const out: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!,
      da = distance(a),
      db = distance(b),
      inside = da >= -SEAM.epsilon;
    if (inside) out.push(a);
    if (
      (da > SEAM.epsilon && db < -SEAM.epsilon) ||
      (da < -SEAM.epsilon && db > SEAM.epsilon)
    ) {
      const t = da / (da - db);
      out.push(a.map((v, k) => v + (b[k]! - v) * t));
    }
  }
  return out;
};
function append(output: Output, polygon: Vertex[]) {
  for (let i = 1; i < polygon.length - 1; i++) {
    const a = polygon[0]!,
      b = polygon[i]!,
      c = polygon[i + 1]!;
    const abx = b[COMPONENT.x]! - a[COMPONENT.x]!,
      aby = b[COMPONENT.y]! - a[COMPONENT.y]!,
      abz = b[COMPONENT.z]! - a[COMPONENT.z]!,
      acx = c[COMPONENT.x]! - a[COMPONENT.x]!,
      acy = c[COMPONENT.y]! - a[COMPONENT.y]!,
      acz = c[COMPONENT.z]! - a[COMPONENT.z]!;
    const cx = aby * acz - abz * acy,
      cy = abz * acx - abx * acz,
      cz = abx * acy - aby * acx;
    if (cx * cx + cy * cy + cz * cz < SEAM.areaEpsilon) continue;
    for (const v of [a, b, c]) {
      output.p.push(v[COMPONENT.x]!, v[COMPONENT.y]!, v[COMPONENT.z]!);
      output.n.push(v[COMPONENT.nx]!, v[COMPONENT.ny]!, v[COMPONENT.nz]!);
      output.uv.push(v[COMPONENT.u]!, v[COMPONENT.v]!);
    }
  }
}

/** Clip an already perforated solid. Historical hole contours never need to be swept again.
 * Both halves share the exact jagged seam; front intersections supply real interior walls. */
// Preserve triangle/band iteration order and short-circuit degenerate polygons in this hot
// clipping pass. Keeping the sweep together avoids repeated allocations and rounding seams.
// oxlint-disable sonarjs/nested-control-flow, sonarjs/too-many-break-or-continue-in-loop
export function clipDeathSolid(
  geometry: THREE.BufferGeometry,
  axis: "x" | "y",
  cut: number,
  seed: number,
  parallelLow: number,
  parallelHigh: number,
): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const perpendicular = axis === "x" ? 0 : 1,
    parallel = axis === "x" ? 1 : 0;
  const count = Math.max(
      SEAM.minSegments,
      Math.ceil((parallelHigh - parallelLow) / SEAM.segmentLength),
    ),
    step = (parallelHigh - parallelLow) / count;
  const seam = Array.from(
    { length: count + 1 },
    (_, i) =>
      cut +
      (i === 0 || i === count
        ? 0
        : (fractureNoise(seed, i) - SEAM.noiseCenter) * SEAM.noiseAmplitude),
  );
  const outputs: [Output, Output] = [
    { p: [], n: [], uv: [], walls: [], frontCount: 0 },
    { p: [], n: [], uv: [], walls: [], frontCount: 0 },
  ];
  const positions = geometry.getAttribute("position"),
    normals = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");
  const frontCount = geometry.groups[0]!.count;
  for (
    let triangle = 0;
    triangle < positions.count;
    triangle += TRIANGLE_VERTICES
  ) {
    if (triangle === frontCount)
      for (const out of outputs) {
        out.frontCount = out.p.length / VECTOR_COMPONENTS;
      }
    const vertices: Vertex[] = [];
    for (let i = triangle; i < triangle + TRIANGLE_VERTICES; i++)
      vertices.push([
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
        normals.getX(i),
        normals.getY(i),
        normals.getZ(i),
        uv.getX(i),
        uv.getY(i),
      ]);
    // Most triangles lie nowhere near this seam. Preserve them verbatim, avoiding both
    // allocations and artificial band subdivisions of every historical hole wall.
    const crossLow = Math.min(...vertices.map((v) => v[perpendicular]!)),
      crossHigh = Math.max(...vertices.map((v) => v[perpendicular]!));
    if (crossHigh < cut - SEAM.maxDisplacement) {
      append(outputs[0]!, vertices);
      continue;
    }
    if (crossLow > cut + SEAM.maxDisplacement) {
      append(outputs[1]!, vertices);
      continue;
    }
    const lo = Math.min(...vertices.map((v) => v[parallel]!)),
      hi = Math.max(...vertices.map((v) => v[parallel]!));
    const start = Math.max(
        0,
        Math.min(count - 1, Math.floor((lo - parallelLow) / step)),
      ),
      end = Math.max(
        start,
        Math.min(count - 1, Math.floor((hi - parallelLow) / step)),
      );
    for (let band = start; band <= end; band++) {
      const low = parallelLow + band * step,
        high = low + step;
      let polygon = vertices;
      if (lo < low - SEAM.epsilon)
        polygon = clip(polygon, (v) => v[parallel]! - low);
      if (hi > high + SEAM.epsilon)
        polygon = clip(polygon, (v) => high - v[parallel]!);
      if (polygon.length < TRIANGLE_VERTICES) continue;
      const slope = (seam[band + 1]! - seam[band]!) / step,
        intercept = seam[band]! - slope * low;
      const distance = (v: Vertex) =>
        v[perpendicular]! - slope * v[parallel]! - intercept;
      const ds = polygon.map((vertex) => distance(vertex)),
        min = Math.min(...ds),
        max = Math.max(...ds);
      if (max <= SEAM.epsilon) {
        append(outputs[0]!, polygon);
        continue;
      }
      if (min >= -SEAM.epsilon) {
        append(outputs[1]!, polygon);
        continue;
      }
      append(
        outputs[0]!,
        clip(polygon, (v) => -distance(v)),
      );
      append(outputs[1]!, clip(polygon, distance));
      if (triangle >= frontCount) continue;
      const intersections: Vertex[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i]!,
          b = polygon[(i + 1) % polygon.length]!,
          da = distance(a),
          db = distance(b);
        if (Math.abs(da) < SEAM.epsilon) intersections.push(a);
        if (da * db < -SEAM.crossingEpsilon) {
          const t = da / (da - db);
          intersections.push(a.map((v, k) => v + (b[k]! - v) * t));
        }
      }
      if (intersections.length < SEGMENT_VERTICES) continue;
      intersections.sort((a, b) => a[parallel]! - b[parallel]!);
      const a = intersections[0]!,
        b = intersections.at(-1)!;
      if (Math.abs(a[parallel]! - b[parallel]!) < SEAM.epsilon) continue;
      const normal = new THREE.Vector3(
        axis === "x" ? 1 : -slope,
        axis === "x" ? -slope : 1,
        0,
      ).normalize();
      for (let side = 0; side < SEGMENT_VERTICES; side++) {
        const outward = normal.clone().multiplyScalar(side === 0 ? 1 : -1);
        const vertex = (v: Vertex, z: number) => [
          v[COMPONENT.x]!,
          v[COMPONENT.y]!,
          z,
          outward.x,
          outward.y,
          0,
          v[COMPONENT.u]!,
          v[COMPONENT.v]!,
        ];
        const wall = [
          vertex(a, a[COMPONENT.z]!),
          vertex(a, -a[COMPONENT.z]!),
          vertex(b, -b[COMPONENT.z]!),
          vertex(b, b[COMPONENT.z]!),
        ];
        const crossX = b[COMPONENT.y]! - a[COMPONENT.y]!,
          crossY = -(b[COMPONENT.x]! - a[COMPONENT.x]!);
        if (crossX * outward.x + crossY * outward.y < 0) wall.reverse();
        outputs[side]!.walls.push(wall);
      }
    }
  }
  const build = (output: Output) => {
    if (frontCount === positions.count)
      output.frontCount = output.p.length / VECTOR_COMPONENTS;
    for (const wall of output.walls) {
      append(output, wall);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(output.p, VECTOR_COMPONENTS),
    );
    result.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(output.n, VECTOR_COMPONENTS),
    );
    result.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(output.uv, UV_COMPONENTS),
    );
    result.addGroup(0, output.frontCount, 0);
    result.addGroup(
      output.frontCount,
      output.p.length / VECTOR_COMPONENTS - output.frontCount,
      1,
    );
    result.computeBoundingSphere();
    return result;
  };
  return [build(outputs[0]), build(outputs[1])];
}

// oxlint-enable sonarjs/nested-control-flow, sonarjs/too-many-break-or-continue-in-loop
