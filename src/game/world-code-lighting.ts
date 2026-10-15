import * as THREE from "three";
import type { Block } from "./simulation";
import { HEIGHT, TUMBLE } from "./world-settings";

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

export function lightCode(mesh: THREE.Group, block: Block, frozen: boolean) {
  const solid = mesh.getObjectByName("perforated-extruded-code");
  if (!(solid instanceof THREE.Mesh) || !Array.isArray(solid.material)) {
    return;
  }
  for (const [index, material] of solid.material.entries()) {
    if (!(material instanceof THREE.MeshToonMaterial)) {
      continue;
    }
    let color = "#000000";
    if (block.angry && index === 1) {
      color = "#6a0f22";
    }
    if (block.boss && index === 1) {
      color = "#7c2314";
    }
    if (frozen) {
      color = "#286b97";
    }
    material.emissive.set(color);
    material.emissiveIntensity = frozen ? TUMBLE.frozenGlow : TUMBLE.normalGlow;
  }
}
