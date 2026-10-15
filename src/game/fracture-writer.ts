import * as THREE from "three";
import {
  VECTOR_COMPONENTS,
  UV_COMPONENTS,
  HALF_DIVISOR,
  COORDINATE,
  QUAD,
  TRIANGLE_FAN,
  FRACTURE,
} from "./fracture-config";
import type { GeometryOptions } from "./fracture-types";

const vector = (point: number[]) =>
  new THREE.Vector3(point[0]!, point[1]!, point[COORDINATE.z]!);

export class GeometryWriter {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];

  constructor(readonly options: GeometryOptions) {}

  quad(points: number[][], normal?: THREE.Vector3) {
    const { offset, size: root } = this.options;
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

      this.positions.push(p[0]! - offset.x, p[1]! - offset.y, p[COORDINATE.z]!);
      this.normals.push(n.x, n.y, n.z);
      this.uvs.push(
        (p[0]! + root.width / HALF_DIVISOR) / root.width,
        (p[1]! + root.height / HALF_DIVISOR) /
          (root.height + FRACTURE.textureHeaderHeight),
      );
    }
  }

  build(frontCount: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.positions, VECTOR_COMPONENTS),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(this.normals, VECTOR_COMPONENTS),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(this.uvs, UV_COMPONENTS),
    );
    geometry.addGroup(0, frontCount, 0);
    geometry.addGroup(
      frontCount,
      this.positions.length / VECTOR_COMPONENTS - frontCount,
      1,
    );
    geometry.computeBoundingSphere();

    return geometry;
  }
}
