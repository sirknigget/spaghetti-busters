import * as THREE from "three";
import {
  COMPONENT,
  SEAM,
  SEGMENT_VERTICES,
  type ClipBand,
  type ClipContext,
  type Distance,
  type Vertex,
} from "./death-clipping-types";

function intersections(polygon: Vertex[], distance: Distance): Vertex[] {
  const points: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const da = distance(a);
    const db = distance(b);
    if (Math.abs(da) < SEAM.epsilon) {
      points.push(a);
    }
    if (da * db < -SEAM.crossingEpsilon) {
      const t = da / (da - db);
      points.push(a.map((v, k) => v + (b[k]! - v) * t));
    }
  }

  return points;
}

function wallVertex(v: Vertex, z: number, outward: THREE.Vector3) {
  return [
    v[COMPONENT.x]!,
    v[COMPONENT.y]!,
    z,
    outward.x,
    outward.y,
    0,
    v[COMPONENT.u]!,
    v[COMPONENT.v]!,
  ];
}

function wallPolygon(a: Vertex, b: Vertex, outward: THREE.Vector3) {
  const wall = [
    wallVertex(a, a[COMPONENT.z]!, outward),
    wallVertex(a, -a[COMPONENT.z]!, outward),
    wallVertex(b, -b[COMPONENT.z]!, outward),
    wallVertex(b, b[COMPONENT.z]!, outward),
  ];
  const crossX = b[COMPONENT.y]! - a[COMPONENT.y]!;
  const crossY = -(b[COMPONENT.x]! - a[COMPONENT.x]!);
  if (crossX * outward.x + crossY * outward.y < 0) {
    wall.reverse();
  }

  return wall;
}

export function appendSeamWalls(
  context: ClipContext,
  band: ClipBand,
  distance: Distance,
) {
  const points = intersections(band.polygon, distance);
  if (points.length < SEGMENT_VERTICES) {
    return;
  }
  points.sort((a, b) => a[context.parallel]! - b[context.parallel]!);
  const a = points[0]!;
  const b = points.at(-1)!;
  if (Math.abs(a[context.parallel]! - b[context.parallel]!) < SEAM.epsilon) {
    return;
  }
  const normal = new THREE.Vector3(
    context.options.axis === "x" ? 1 : -band.slope,
    context.options.axis === "x" ? -band.slope : 1,
    0,
  ).normalize();
  for (let side = 0; side < SEGMENT_VERTICES; side++) {
    const outward = normal.clone().multiplyScalar(side === 0 ? 1 : -1);
    context.outputs[side]!.walls.push(wallPolygon(a, b, outward));
  }
}
