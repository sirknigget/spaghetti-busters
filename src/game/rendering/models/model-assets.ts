import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type ModelName =
  | "specialist"
  | "cannon"
  | "homing"
  | "grenade"
  | "review"
  | "lint"
  | "pickup-double"
  | "pickup-triple"
  | "pickup-quad"
  | "pickup-quint"
  | "pickup-homing"
  | "pickup-grenade"
  | "bullet"
  | "environment"
  | "robot"
  | "review-beam"
  | "danger-marker"
  | "reticle"
  | "stun-rings"
  | "review-effect"
  | "lint-effect"
  | "hazard-panel"
  | "hazard-trail"
  | "particle-letter"
  | "particle-chip"
  | "explosion-ring"
  | "armor-box"
  | "armor-bolt"
  | "armor-reactor-ring"
  | "armor-reactor-core"
  | "armor-reactor-fin"
  | "ice-crystal"
  | "angry-eye"
  | "angry-brow"
  | "shard-chip"
  | "spark-fleck"
  | "smoke-quad"
  | "solid-impact-shard"
  | "fallen-letter";

const templates = new Map<string, THREE.Object3D>();
let loading: Promise<void> | undefined;

/** Load the editable glTF model library before constructing a playfield. */
export function preloadModels(bytes?: ArrayBuffer): Promise<void> {
  loading ??= loadTemplates(bytes).catch((error: Error) => {
    loading = undefined;
    throw error;
  });

  return loading;
}

async function loadTemplates(bytes?: ArrayBuffer): Promise<void> {
  const loader = new GLTFLoader();
  const gltf = bytes
    ? await loader.parseAsync(bytes, "")
    : await loader.loadAsync(
        `${import.meta.env.BASE_URL}assets/models/arcade-models.glb`,
      );

  gltf.scene.traverse((object) => {
    const assetId = object.userData.assetId;

    if (typeof assetId === "string") {
      templates.set(assetId, object);
    }
  });
}

function template(name: ModelName): THREE.Object3D {
  const object = templates.get(name);

  if (!object) {
    throw new Error(`Model is unavailable: ${name}`);
  }

  return object;
}

function restoreGeometryGroups(
  geometry: THREE.BufferGeometry,
  object: THREE.Mesh,
): void {
  const groups = object.userData.geometryGroups;

  if (!Array.isArray(groups) || groups.length === 0) {
    return;
  }

  geometry.clearGroups();
  for (const group of groups) {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  }
}

/** Geometry copies belong to the caller, including the original face-material slots. */
export function loadGeometry(name: ModelName): THREE.BufferGeometry {
  const object = template(name);

  if (!(object instanceof THREE.Mesh)) {
    throw new Error(`Expected a mesh model: ${name}`);
  }

  const geometry = object.geometry.clone();

  restoreGeometryGroups(geometry, object);

  return geometry;
}

function ownedMaterial(
  material: THREE.Material,
  materials: Map<THREE.Material, THREE.Material>,
): THREE.Material {
  let copy = materials.get(material);

  if (!copy) {
    copy = material.clone();
    materials.set(material, copy);
  }

  return copy;
}

function restoreRenderSettings(object: THREE.Mesh): void {
  const settings = object.userData.renderSettings;

  if (settings) {
    object.castShadow = settings.castShadow;
    object.receiveShadow = settings.receiveShadow;
    object.renderOrder = settings.renderOrder;
  }

  const instanceMaterials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  for (const [index, material] of instanceMaterials.entries()) {
    const flags = object.userData.materialSettings?.[index];

    if (!flags) {
      continue;
    }

    material.depthTest = flags.depthTest;
    material.depthWrite = flags.depthWrite;
    material.transparent = flags.transparent;
  }
}

/** Instances own their resources; disposing one never invalidates another or the library. */
function instantiate(name: ModelName): THREE.Object3D {
  const instance = template(name).clone(true);
  const materials = new Map<THREE.Material, THREE.Material>();
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

  instance.traverse((object) => {
    const originalName = object.userData.assetNodeName;

    if (typeof originalName === "string") {
      object.name = originalName;
    }

    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const originalGeometry: THREE.BufferGeometry = object.geometry;
    let geometry = geometries.get(originalGeometry);

    if (!geometry) {
      geometry = originalGeometry.clone();
      restoreGeometryGroups(geometry, object);
      geometries.set(originalGeometry, geometry);
    }

    object.geometry = geometry;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) =>
        ownedMaterial(material, materials),
      );
    } else {
      object.material = ownedMaterial(object.material, materials);
    }

    restoreRenderSettings(object);
  });

  return instance;
}

export function instantiateModel(name: ModelName): THREE.Group {
  const object = instantiate(name);

  if (object instanceof THREE.Mesh) {
    throw new TypeError(`Expected a grouped model: ${name}`);
  }

  const group = new THREE.Group();

  group.copy(object, false);
  group.add(...object.children);

  return group;
}

export function loadMesh(name: ModelName): THREE.Mesh {
  const object = instantiate(name);

  if (!(object instanceof THREE.Mesh)) {
    throw new Error(`Expected a mesh model: ${name}`);
  }

  return object;
}
