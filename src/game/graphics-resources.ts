import * as THREE from "three";

function hasMaterials(
  object: THREE.Object3D,
): object is THREE.Mesh | THREE.LineSegments | THREE.Sprite {
  return (
    object instanceof THREE.Mesh ||
    object instanceof THREE.LineSegments ||
    object instanceof THREE.Sprite
  );
}

export function cloneOwnedMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  for (const [key, value] of Object.entries(source)) {
    if (!(value instanceof THREE.Texture)) {
      continue;
    }
    const texture = value.clone();
    texture.needsUpdate = true;
    Object.assign(material, { [key]: texture });
  }

  return material;
}

export function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      geometries.add(child.geometry);
    }
    if (!hasMaterials(child)) {
      return;
    }
    const mesh = child;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      collectMaterialResources(material, materials, textures);
    }
  });
  for (const g of geometries) {
    g.dispose();
  }
  for (const m of materials) {
    m.dispose();
  }
  for (const t of textures) {
    t.dispose();
  }
  object.removeFromParent();
}

function collectMaterialResources(
  material: THREE.Material,
  materials: Set<THREE.Material>,
  textures: Set<THREE.Texture>,
) {
  materials.add(material);
  for (const texture of materialTextures(material)) {
    textures.add(texture);
  }
}

function materialTextures(material: THREE.Material): THREE.Texture[] {
  return Object.values(material).filter(
    (value): value is THREE.Texture => value instanceof THREE.Texture,
  );
}
