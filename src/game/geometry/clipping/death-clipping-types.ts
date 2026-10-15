import settings from "#root/src/game/geometry/clipping/death-clipping-types.json";
import type * as THREE from "three";

// Interleaved vertex contract used only by the runtime clipping algorithm.
export const COMPONENT = settings.COMPONENT;
export const VECTOR_COMPONENTS = 3;
export const UV_COMPONENTS = 2;
export const TRIANGLE_VERTICES = 3;
export const SEGMENT_VERTICES = 2;
export const SEAM = settings.SEAM;

export type Vertex = number[];
export interface ClipOutput {
  p: number[];
  n: number[];
  uv: number[];
  walls: Vertex[][];
  frontCount: number;
}

export interface DeathClipOptions {
  axis: "x" | "y";
  cut: number;
  seed: number;
  parallelLow: number;
  parallelHigh: number;
}

type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
export interface ClipContext {
  options: DeathClipOptions;
  perpendicular: number;
  parallel: number;
  count: number;
  step: number;
  seam: number[];
  outputs: [ClipOutput, ClipOutput];
  positions: Attribute;
  normals: Attribute;
  uv: Attribute;
  frontCount: number;
}

export interface ClipBand {
  polygon: Vertex[];
  slope: number;
  intercept: number;
  isFront: boolean;
}

export type Distance = (vertex: Vertex) => number;
