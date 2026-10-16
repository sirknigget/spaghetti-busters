import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import type { Block } from "#root/src/game/simulation/simulation.ts";
import { perforatedGeometry } from "#root/src/game/geometry/fracture/fracture-solid.ts";
import {
  createVisual,
  type FractureVisual,
} from "#root/src/game/code/common/code-visual.ts";
import {
  addRemovedCells,
  addDamageScars,
  codePalette,
} from "#root/src/game/code/code-surface.ts";
import {
  addAngryFace,
  addIceOutline,
} from "#root/src/game/code/code-attachments.ts";
import { createBossArmor } from "#root/src/game/code/boss/code-boss-armor.ts";
import { clipBossArmor } from "#root/src/game/code/boss/code-boss-clipping.ts";
import { DIAMETER } from "#root/src/game/code/common/code-settings.ts";

const TEXTURE_ANISOTROPY = 4;

const SIDE_EMISSIVE_INTENSITY = 0.3;

/** A perforated solid retains its original surface and exposes its broken interior. */
export function createCodeMesh(
  block: Block,
  previous?: THREE.Group,
  inherited?: FractureVisual,
): THREE.Group {
  const group = new THREE.Group();

  group.name = `code-solid-${block.id}`;

  // SAFETY: previous is produced by this factory, which owns the private visual key.
  const prior =
    inherited ??
    (previous?.userData.fractureVisual as FractureVisual | undefined);
  const visual = prior
    ? { ...prior, holes: new Map(prior.holes) }
    : createVisual(block);

  addRemovedCells(visual, block);
  addDamageScars(visual, block);

  const z = visual.depth;

  group.add(createSolid(block, visual));
  if (block.boss) {
    createBossArmor(group, visual);
    if (visual.fractured) {
      clipBossArmor(group, visual, z);
    }
  }

  addAngryFace(group, block, visual);
  addIceOutline(group, visual);
  assignMetadata(group, block, visual);

  return group;
}

function createCodeMaterials(block: Block, canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = TEXTURE_ANISOTROPY;

  const front = new THREE.MeshToonMaterial({
    map: texture,
    color: PALETTE.common.white,
  });
  const side = new THREE.MeshToonMaterial({
    color: codePalette(block).side,
    emissive: codePalette(block).emissive,
    emissiveIntensity: SIDE_EMISSIVE_INTENSITY,
  });

  return [front, side] as const;
}

function assignMetadata(
  group: THREE.Group,
  block: Block,
  visual: FractureVisual,
) {
  group.userData.fractureVisual = visual;
  group.userData.fractured = visual.fractured;
  group.userData.hits = block.hits;
  group.userData.cellCount = block.cells.length;
  group.userData.solidDepth = visual.depth * DIAMETER;
  group.userData.removedCells = block.cells.filter(
    (cell) => !cell.alive,
  ).length;
  group.userData.angry = block.angry;
  group.userData.exception = block.exception;
  group.userData.boss = block.boss;
  group.userData.bossTitle = block.boss ? "FactoryFactoryFactory" : undefined;
}

function createSolid(block: Block, visual: FractureVisual) {
  const [front, side] = createCodeMaterials(block, visual.canvas);
  const z = visual.depth;
  const geometry = perforatedGeometry(
    visual.regions,
    [...visual.holes.values()],
    {
      depth: z,
      offset: visual.offset,
      size: { width: visual.width, height: visual.height },
    },
  );
  const mesh = new THREE.Mesh(geometry, [front, side]);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "perforated-extruded-code";

  return mesh;
}
