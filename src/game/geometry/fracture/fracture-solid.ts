import * as THREE from "three";
import { VECTOR_COMPONENTS } from "#root/src/game/geometry/fracture/fracture-config.ts";
import { at } from "#root/src/game/geometry/fracture/sweep/fracture-intervals.ts";
import type {
  GeometryOptions,
  Polygon,
  Strip,
} from "#root/src/game/geometry/fracture/fracture-types.ts";
import { createSweep } from "#root/src/game/geometry/fracture/sweep/fracture-sweep.ts";
import { createStrips } from "#root/src/game/geometry/fracture/sweep/fracture-strips.ts";
import { GeometryWriter } from "#root/src/game/geometry/fracture/fracture-writer.ts";
import { horizontalWalls } from "#root/src/game/geometry/fracture/fracture-horizontal.ts";

interface Faces {
  frontTriangles: number[][][];
  walls: number[][][];
}

function collectFaces(strips: Strip[], depth: number): Faces {
  const frontTriangles: number[][][] = [];
  const walls: number[][][] = [];

  for (const s of strips) {
    const { y0, y1 } = s;
    const x00 = at(s.left, y0);
    const x01 = at(s.right, y0);
    const x10 = at(s.left, y1);
    const x11 = at(s.right, y1);

    frontTriangles.push([
      [x00, y0, depth],
      [x01, y0, depth],
      [x11, y1, depth],
      [x10, y1, depth],
    ]);
    addSideWalls(walls, { x00, x01, x10, x11, y0, y1, depth });
  }

  return { frontTriangles, walls };
}

interface StripCorners {
  x00: number;
  x01: number;
  x10: number;
  x11: number;
  y0: number;
  y1: number;
  depth: number;
}

function addSideWalls(walls: number[][][], corners: StripCorners) {
  const { x00, x01, x10, x11, y0, y1, depth } = corners;

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

/** Ordered scanlines preserve shared fracture edges and the original slab UVs. */
export function perforatedGeometry(
  regions: Polygon[],
  holes: Polygon[],
  options: GeometryOptions,
): THREE.BufferGeometry {
  const sweep = createSweep(regions, holes);
  const faces = collectFaces(createStrips(sweep), options.depth);
  const writer = new GeometryWriter(options);

  for (const q of faces.frontTriangles) {
    writer.quad(q, new THREE.Vector3(0, 0, 1));
  }

  const frontCount = writer.positions.length / VECTOR_COMPONENTS;

  for (const q of faces.frontTriangles) {
    writer.quad(
      [...q].reverse().map((p) => [p[0]!, p[1]!, -options.depth]),
      new THREE.Vector3(0, 0, -1),
    );
  }

  for (const q of faces.walls) {
    writer.quad(q);
  }

  horizontalWalls(writer, sweep);

  return writer.build(frontCount);
}
