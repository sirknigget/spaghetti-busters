import type * as THREE from "three";
import { fractureNoise } from "./fracture-geometry";
import {
  SEAM,
  type ClipContext,
  type DeathClipOptions,
} from "./death-clipping-types";

export function clippingContext(
  geometry: THREE.BufferGeometry,
  options: DeathClipOptions,
): ClipContext {
  const { axis, cut, seed, parallelLow, parallelHigh } = options;
  const count = Math.max(
    SEAM.minSegments,
    Math.ceil((parallelHigh - parallelLow) / SEAM.segmentLength),
  );
  const step = (parallelHigh - parallelLow) / count;
  const seam = Array.from(
    { length: count + 1 },
    (_, i) =>
      cut +
      (i === 0 || i === count
        ? 0
        : (fractureNoise(seed, i) - SEAM.noiseCenter) * SEAM.noiseAmplitude),
  );

  return {
    options,
    perpendicular: axis === "x" ? 0 : 1,
    parallel: axis === "x" ? 1 : 0,
    count,
    step,
    seam,
    outputs: [
      { p: [], n: [], uv: [], walls: [], frontCount: 0 },
      { p: [], n: [], uv: [], walls: [], frontCount: 0 },
    ],
    positions: geometry.getAttribute("position"),
    normals: geometry.getAttribute("normal"),
    uv: geometry.getAttribute("uv"),
    frontCount: geometry.groups[0]!.count,
  };
}
