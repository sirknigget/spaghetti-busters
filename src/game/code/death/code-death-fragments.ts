import * as THREE from "three";
import type { FractureVisual } from "#root/src/game/code/common/code-visual.ts";
import type {
  DeathLeaf,
  DeathContext,
} from "#root/src/game/code/death/code-death-cuts.ts";
import { fractureNoise } from "#root/src/game/geometry/fracture/fracture-geometry.ts";
import {
  selectLargestLeaf,
  splitDeathLeaf,
} from "#root/src/game/code/death/code-death-cuts.ts";
import { assembleDeathFragment } from "#root/src/game/code/death/code-death-parts.ts";
import {
  HALF,
  HEADER_HEIGHT,
  DEATH_FRACTURE,
} from "#root/src/game/code/common/code-settings.ts";

/** The original perforated geometry is divided into independently owned visual fragments. */
export function createDeathFragments(
  source: THREE.Group,
  seed: number,
): THREE.Group[] {
  // SAFETY: createCodeMesh owns this private surface record.
  const visual = source.userData.fractureVisual as FractureVisual | undefined;
  const solid = source.getObjectByName("perforated-extruded-code");

  if (
    !visual ||
    !(solid instanceof THREE.Mesh) ||
    solid.geometry.getAttribute("position").count === 0
  ) {
    return [];
  }

  const leaves = fractureLeaves(solid.geometry, visual, seed);

  return leaves.map((leaf, index) =>
    assembleDeathFragment({ source, solid, visual }, leaf, index),
  );
}

function deathBounds(visual: FractureVisual) {
  return {
    left: -visual.width * HALF - DEATH_FRACTURE.boundsPadding,
    right: visual.width * HALF + DEATH_FRACTURE.boundsPadding,
    bottom: -visual.height * HALF - DEATH_FRACTURE.boundsPadding,
    top: visual.height * HALF + HEADER_HEIGHT + DEATH_FRACTURE.boundsPadding,
  };
}

function cutLargestLeaf(leaves: DeathLeaf[], context: DeathContext) {
  const selected = selectLargestLeaf(leaves);

  if (selected < 0) {
    return false;
  }

  const leaf = leaves[selected]!;
  const halves = splitDeathLeaf(leaf, context);

  if (
    halves.some((half) => half.geometry.getAttribute("position").count === 0)
  ) {
    for (const half of halves) {
      half.geometry.dispose();
    }

    return false;
  }

  leaf.geometry.dispose();
  leaves.splice(selected, 1, ...halves);

  return true;
}

function fractureLeaves(
  geometry: THREE.BufferGeometry,
  visual: FractureVisual,
  seed: number,
) {
  const leaves = [{ regions: visual.regions, geometry: geometry.clone() }];
  const desired = desiredFragments(seed);
  const context = {
    visual,
    rootBounds: deathBounds(visual),
    seed,
    cutIndex: 0,
  };

  while (
    leaves.length < desired &&
    context.cutIndex < DEATH_FRACTURE.maximumCuts
  ) {
    if (!cutLargestLeaf(leaves, context)) {
      break;
    }

    context.cutIndex++;
  }

  return leaves;
}

function desiredFragments(seed: number) {
  return (
    DEATH_FRACTURE.minimumPieces +
    Math.floor(
      fractureNoise(seed, DEATH_FRACTURE.countSeed) *
        DEATH_FRACTURE.countJitter,
    )
  );
}
