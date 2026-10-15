import * as THREE from "three";
import { perforatedGeometry } from "./fracture-geometry";
import type { FractureVisual } from "./code-visual";
import { insideRegions } from "./code-visual";
import { HALF, DIAMETER } from "./code-settings";

interface ArmorDimensions {
  width: number;
  height: number;
  depth: number;
}

export function clipBossArmor(
  group: THREE.Group,
  visual: FractureVisual,
  z: number,
) {
  const armor = group.getObjectByName("factory-boss-reinforced-frame")!;
  const removed: THREE.Object3D[] = [];
  for (const child of armor.children) {
    // SAFETY: createBossArmor sets this private dimension record only on its box pieces.
    const dimensions = child.userData.armorDimensions as
      ArmorDimensions | undefined;
    if (dimensions && child instanceof THREE.Mesh) {
      clipArmorBox(child, dimensions, visual);
    } else if (insideRegions(child.position, visual.regions)) {
      child.position.x -= visual.offset.x;
      child.position.y -= visual.offset.y;
    } else {
      // Geometry/materials may be shared by other retained bolts; dispose centrally once.
      removed.push(child);
    }
  }
  for (const child of removed) {
    child.removeFromParent();
  }
  disposeRemovedArmor(armor, removed);
  armor.userData.originalDepth = z * DIAMETER;
}

function clipArmorBox(
  child: THREE.Mesh,
  dimensions: ArmorDimensions,
  visual: FractureVisual,
) {
  const mesh = child;
  const { width, height, depth } = dimensions;
  const { x, y } = mesh.position;
  const rectangle = [
    { x: x - width * HALF, y: y - height * HALF },
    { x: x + width * HALF, y: y - height * HALF },
    { x: x + width * HALF, y: y + height * HALF },
    { x: x - width * HALF, y: y + height * HALF },
  ];
  mesh.geometry.dispose();
  mesh.geometry = perforatedGeometry([...visual.regions, rectangle], [], {
    depth: depth * HALF,
    offset: visual.offset,
    size: { width: visual.width, height: visual.height },
  });
  mesh.position.x = mesh.position.y = 0;
}

function retainedResources(armor: THREE.Object3D) {
  const liveGeometries = new Set<THREE.BufferGeometry>();
  const liveMaterials = new Set<THREE.Material>();
  armor.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    const mesh = object;
    if (mesh.geometry) {
      liveGeometries.add(mesh.geometry);
    }
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (material) {
        liveMaterials.add(material);
      }
    }
  });

  return { liveGeometries, liveMaterials };
}

function disposeRemovedArmor(armor: THREE.Object3D, removed: THREE.Object3D[]) {
  const { liveGeometries, liveMaterials } = retainedResources(armor);
  const deadGeometries = new Set<THREE.BufferGeometry>();
  const deadMaterials = new Set<THREE.Material>();
  for (const object of removed) {
    object.traverse((child) => {
      if (!(
        child instanceof THREE.Mesh || child instanceof THREE.LineSegments
      )) {
        return;
      }
      const mesh = child;
      if (mesh.geometry && !liveGeometries.has(mesh.geometry)) {
        deadGeometries.add(mesh.geometry);
      }
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (material && !liveMaterials.has(material)) {
          deadMaterials.add(material);
        }
      }
    });
  }
  for (const geometry of deadGeometries) {
    geometry.dispose();
  }
  for (const material of deadMaterials) {
    material.dispose();
  }
}
