import * as THREE from "three";
import { type Polygon, fractureMask, fractureNoise } from "./fracture-geometry";
import { type FractureVisual } from "./code-visual";
import { clipDeathSolid } from "./death-clipping";
import { DEATH_FRACTURE } from "./code-settings";

export interface DeathLeaf {
  regions: Polygon[];
  geometry: THREE.BufferGeometry;
}
export interface DeathBounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export interface DeathContext {
  visual: FractureVisual;
  rootBounds: DeathBounds;
  seed: number;
  cutIndex: number;
}

export function selectLargestLeaf(leaves: DeathLeaf[]) {
  let selected = -1;
  let largest = 0;

  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i]!;

    leaf.geometry.computeBoundingBox();

    const size = leaf.geometry.boundingBox!.getSize(new THREE.Vector3());
    const area = size.x * size.y;

    if (
      area > largest &&
      Math.max(size.x, size.y) > DEATH_FRACTURE.minimumSpan
    ) {
      selected = i;
      largest = area;
    }
  }

  return selected;
}

export function splitDeathLeaf(
  leaf: DeathLeaf,
  context: DeathContext,
): DeathLeaf[] {
  const { visual, rootBounds } = context;
  const box = leaf.geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  const { axis, cut, cutSeed } = chooseCut(box, size, context);
  const geometries = clipDeathSolid(leaf.geometry, {
    axis,
    cut: cut - (axis === "x" ? visual.offset.x : visual.offset.y),
    seed: cutSeed,
    parallelLow:
      axis === "x"
        ? rootBounds.bottom - visual.offset.y
        : rootBounds.left - visual.offset.x,
    parallelHigh:
      axis === "x"
        ? rootBounds.top - visual.offset.y
        : rootBounds.right - visual.offset.x,
  });

  return [-1, 1].map((side, index) => ({
    regions: [
      ...leaf.regions,
      fractureMask(axis, cut, { side, seed: cutSeed, bounds: rootBounds }),
    ],
    geometry: geometries[index]!,
  }));
}

function chooseCut(
  box: THREE.Box3,
  size: THREE.Vector3,
  context: DeathContext,
) {
  const { visual, seed, cutIndex } = context;
  const axis =
    size.x >
    size.y *
      (DEATH_FRACTURE.axisBias +
        fractureNoise(seed, cutIndex + DEATH_FRACTURE.axisSeed) *
          DEATH_FRACTURE.axisJitter)
      ? "x"
      : "y";
  const fraction =
    DEATH_FRACTURE.minimumFraction +
    fractureNoise(seed, cutIndex + DEATH_FRACTURE.fractionSeed) *
      DEATH_FRACTURE.fractionJitter;
  const cut =
    axis === "x"
      ? box.min.x + size.x * fraction + visual.offset.x
      : box.min.y + size.y * fraction + visual.offset.y;
  const cutSeed = seed + cutIndex * DEATH_FRACTURE.seedStride;

  return { axis, cut, cutSeed } as const;
}
