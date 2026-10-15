import * as THREE from "three";
import type { FractureVisual } from "./code-visual";
import type { DeathLeaf } from "./code-death-cuts";
import { cloneOwnedMaterial } from "./graphics-resources";
import { createBossArmor } from "./code-boss-armor";
import { clipBossArmor } from "./code-boss-clipping";
import { insideRegions } from "./code-visual";
import { HALF, DIAMETER, TRIANGLE_VERTICES } from "./code-settings";

interface FragmentSource {
  source: THREE.Group;
  solid: THREE.Mesh;
  visual: FractureVisual;
}
interface FaceSource {
  source: THREE.Group;
  visual: FractureVisual;
  regions: DeathLeaf["regions"];
  center: THREE.Vector3;
}

export function assembleDeathFragment(
  origin: FragmentSource,
  leaf: DeathLeaf,
  index: number,
) {
  const { source, solid, visual } = origin;
  const group = new THREE.Group();
  group.name = `code-death-fragment-${index}`;
  leaf.geometry.computeBoundingBox();
  const center = leaf.geometry.boundingBox!.getCenter(new THREE.Vector3());
  leaf.geometry.translate(-center.x, -center.y, -center.z);
  group.position.copy(center);
  const materials = (
    Array.isArray(solid.material) ? solid.material : [solid.material]
  ).map((material) => cloneOwnedMaterial(material));
  const mesh = new THREE.Mesh(leaf.geometry, materials);
  mesh.name = "perforated-extruded-code";
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  const fragmentVisual: FractureVisual = {
    ...visual,
    offset: { x: visual.offset.x + center.x, y: visual.offset.y + center.y },
    regions: leaf.regions,
    holes: new Map(visual.holes),
    fractured: true,
  };
  attachBossArmor(group, fragmentVisual, source);
  attachAngryFace(group, { visual, regions: leaf.regions, center, source });
  assignFragmentMetadata(group, fragmentVisual, leaf);

  return group;
}

function assignFragmentMetadata(
  group: THREE.Group,
  fragmentVisual: FractureVisual,
  leaf: DeathLeaf,
) {
  group.userData.fractureVisual = fragmentVisual;
  group.userData.sourceCanvas = fragmentVisual.canvas;
  group.userData.deathFragmentRootOffset = { ...fragmentVisual.offset };
  group.userData.solidDepth = fragmentVisual.depth * DIAMETER;
  group.userData.fragmentArea = frontArea(leaf.geometry);
}

function attachBossArmor(
  group: THREE.Group,
  visual: FractureVisual,
  source: THREE.Group,
) {
  const fragmentVisual = visual;
  if (source.userData.boss) {
    // Root housing is clipped by the same contours, retaining each original bolt/core once.
    createBossArmor(group, visual);
    clipBossArmor(group, fragmentVisual, visual.depth);
    const originalReactor = source.getObjectByName("factory-boss-reactor");
    const reactor = group.getObjectByName("factory-boss-reactor");
    if (originalReactor && reactor) {
      reactor.quaternion.copy(originalReactor.quaternion);
    }
  }
}

function attachAngryFace(group: THREE.Group, origin: FaceSource) {
  const { source, visual, regions, center } = origin;
  const face = source.getObjectByName("angry-code-face");
  if (
    face &&
    insideRegions(
      {
        x: face.position.x + visual.offset.x,
        y: face.position.y + visual.offset.y,
      },
      regions,
    )
  ) {
    const copy = face.clone(true);
    copy.position.sub(center);
    cloneFaceResources(copy);
    group.add(copy);
  }
}

function cloneFaceResources(copy: THREE.Object3D) {
  copy.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    const part = object;
    if (part.geometry) {
      part.geometry = part.geometry.clone();
    }
    if (part.material) {
      part.material = Array.isArray(part.material)
        ? part.material.map(cloneOwnedMaterial)
        : cloneOwnedMaterial(part.material);
    }
  });
}

function frontArea(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position");
  let area = 0;
  for (
    let i = 0;
    i < (geometry.groups[0]?.count ?? 0);
    i += TRIANGLE_VERTICES
  ) {
    area +=
      Math.abs(
        (p.getX(i + 1) - p.getX(i)) * (p.getY(i + DIAMETER) - p.getY(i)) -
          (p.getY(i + 1) - p.getY(i)) * (p.getX(i + DIAMETER) - p.getX(i)),
      ) * HALF;
  }

  return area;
}
