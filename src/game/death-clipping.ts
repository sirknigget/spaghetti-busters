import type * as THREE from "three";
import { sweepTriangleBands } from "./death-clipping-bands";
import { buildClippedGeometry } from "./death-clipping-build";
import { clippingContext } from "./death-clipping-context";
import { append } from "./death-clipping-polygons";
import {
  SEAM,
  TRIANGLE_VERTICES,
  VECTOR_COMPONENTS,
  type ClipContext,
  type DeathClipOptions,
  type Vertex,
} from "./death-clipping-types";

function triangleVertices(context: ClipContext, triangle: number): Vertex[] {
  const { positions, normals, uv } = context;
  const vertices: Vertex[] = [];

  for (let i = triangle; i < triangle + TRIANGLE_VERTICES; i++) {
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
  }

  return vertices;
}

function preserveDistantTriangle(context: ClipContext, vertices: Vertex[]) {
  const crossLow = Math.min(...vertices.map((v) => v[context.perpendicular]!));
  const crossHigh = Math.max(...vertices.map((v) => v[context.perpendicular]!));

  if (crossHigh < context.options.cut - SEAM.maxDisplacement) {
    append(context.outputs[0], vertices);

    return true;
  }

  if (crossLow > context.options.cut + SEAM.maxDisplacement) {
    append(context.outputs[1], vertices);

    return true;
  }

  return false;
}

function sweepTriangles(context: ClipContext) {
  for (
    let triangle = 0;
    triangle < context.positions.count;
    triangle += TRIANGLE_VERTICES
  ) {
    if (triangle === context.frontCount) {
      for (const out of context.outputs) {
        out.frontCount = out.p.length / VECTOR_COMPONENTS;
      }
    }

    const vertices = triangleVertices(context, triangle);

    // Preserve distant triangles verbatim, including historical hole walls.
    if (!preserveDistantTriangle(context, vertices)) {
      sweepTriangleBands(context, vertices, triangle < context.frontCount);
    }
  }
}

/** Clip a perforated solid; both halves share the same jagged seam and interior walls. */
export function clipDeathSolid(
  geometry: THREE.BufferGeometry,
  options: DeathClipOptions,
): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const context = clippingContext(geometry, options);

  sweepTriangles(context);

  return [
    buildClippedGeometry(context.outputs[0], context),
    buildClippedGeometry(context.outputs[1], context),
  ];
}
