import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import type { Block } from "#root/src/game/simulation/simulation.ts";
import { HEIGHT, TUMBLE } from "#root/src/game/rendering/world-settings.ts";

export function codeTumble(block: Block) {
  if (block.boss) {
    return block.generation > 0 ? TUMBLE.bossFragment : TUMBLE.boss;
  }

  return block.generation > 0 ? TUMBLE.fragment : TUMBLE.root;
}

export function placeCode(mesh: THREE.Group, block: Block) {
  const tumble = codeTumble(block);
  const phase =
    block.id * TUMBLE.idPhase +
    block.age *
      (block.generation > 0 ? TUMBLE.fragmentSpeed : TUMBLE.rootSpeed);

  mesh.position.set(block.x, HEIGHT - block.y, 0);
  mesh.rotation.set(
    Math.sin(phase) * tumble,
    Math.cos(phase * TUMBLE.yFrequency) * tumble,
    -block.angle,
    "ZYX",
  );
}

export function needsCodeRefresh(mesh: THREE.Group, block: Block) {
  const damaged =
    mesh.userData.hits !== block.hits ||
    mesh.userData.cellCount !== block.cells.length;
  const dispositionChanged =
    mesh.userData.angry !== block.angry ||
    mesh.userData.exception !== block.exception;

  return damaged || dispositionChanged || mesh.userData.boss !== block.boss;
}

function codeEmissive(block: Block, index: number, frozen: boolean): string {
  if (frozen) {
    return PALETTE.freeze.codeEmissive;
  }

  if (index !== 1) {
    return PALETTE.common.black;
  }

  if (block.boss) {
    return PALETTE.boss.emissive;
  }

  return block.angry ? PALETTE.angry.emissive : PALETTE.common.black;
}

export function lightCode(mesh: THREE.Group, block: Block, frozen: boolean) {
  const solid = mesh.getObjectByName("perforated-extruded-code");

  if (!(solid instanceof THREE.Mesh) || !Array.isArray(solid.material)) {
    return;
  }

  for (const [index, material] of solid.material.entries()) {
    if (!(material instanceof THREE.MeshToonMaterial)) {
      continue;
    }

    material.emissive.set(codeEmissive(block, index, frozen));
    material.emissiveIntensity = frozen ? TUMBLE.frozenGlow : TUMBLE.normalGlow;
  }
}
