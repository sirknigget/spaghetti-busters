import * as THREE from "three";
import { append } from "./death-clipping-polygons";
import {
  VECTOR_COMPONENTS,
  UV_COMPONENTS,
  type ClipContext,
  type ClipOutput,
} from "./death-clipping-types";

export function buildClippedGeometry(output: ClipOutput, context: ClipContext) {
  if (context.frontCount === context.positions.count) {
    output.frontCount = output.p.length / VECTOR_COMPONENTS;
  }

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
}
