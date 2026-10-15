import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { beforeAll, expect, it } from "vitest";
import { disposeObject } from "./code-mesh";
import {
  instantiateModel,
  loadGeometry,
  loadMesh,
  preloadModels,
  type ModelName,
} from "./model-assets";
import { createCannon, createSpecialist } from "./models3d";

beforeAll(async () => {
  const bytes = await readFile(
    new URL("../../public/assets/models/arcade-models.glb", import.meta.url),
  );
  await preloadModels(Uint8Array.from(bytes).buffer);
});

function meshes(object: THREE.Object3D): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      result.push(child);
    }
  });

  return result;
}

it("loads all 39 authored groups and mesh templates from the real GLB", () => {
  expect(groups.length + shapes.length).toBe(39);
  for (const name of groups) {
    const model = instantiateModel(name);
    expect(model).toBeInstanceOf(THREE.Group);
    expect(meshes(model).length).toBeGreaterThan(0);
    disposeObject(model);
  }
  for (const name of shapes) {
    const model = loadMesh(name);
    expect(model).toBeInstanceOf(THREE.Mesh);
    expect(model.geometry.getAttribute("position").count).toBeGreaterThan(0);
    disposeObject(model);
  }
});

it("gives each character independent resources and keeps the original root pivot", () => {
  const first = createSpecialist();
  const second = createSpecialist();
  expect(first.name).toBe("sculpted-code-quality-specialist");
  expect(first.position.toArray()).toEqual([0, 0, 0]);
  const firstMeshes = meshes(first);
  const secondMeshes = meshes(second);
  expect(firstMeshes).toHaveLength(secondMeshes.length);
  for (const [index, mesh] of firstMeshes.entries()) {
    expect(mesh.geometry).not.toBe(secondMeshes[index]!.geometry);
    expect(mesh.material).not.toBe(secondMeshes[index]!.material);
  }
  disposeObject(first);
  const third = createSpecialist();
  expect(new THREE.Box3().setFromObject(third)).toEqual(
    new THREE.Box3().setFromObject(second),
  );
  disposeObject(second);
  disposeObject(third);
  const cannon = createCannon();
  expect(cannon.name).toBe("volumetric-refactor-cannon");
  expect(cannon.parent).toBeNull();
  disposeObject(cannon);
});

it("retains robot joints, brand and status anchors, materials and world effects", () => {
  const robot = instantiateModel("robot");
  for (const name of [
    "robot-leg--1",
    "robot-leg-1",
    "robot-arm--1",
    "robot-arm-1",
    "robot-head",
    "robot-antenna",
    "robot-armor-flash",
    "robot-thinking",
    "robot-brand-mark",
    "robot-status-anchor",
  ]) {
    expect(robot.getObjectByName(name)).toBeDefined();
  }
  expect(
    robot.getObjectByName("robot-status-anchor")!.position.toArray(),
  ).toEqual([0, 113, 0]);
  const shellMaterials = meshes(robot).flatMap((mesh) =>
    Array.isArray(mesh.material) ? mesh.material : [mesh.material],
  );
  expect(
    shellMaterials.some((material) => material.name === "robot-shell"),
  ).toBe(true);
  const effect = instantiateModel("review-effect");
  expect(effect.position.toArray()).toEqual([640, 360, 55]);
  expect(effect.children.map((child) => child.userData.ring)).toEqual([
    0, 1, 2,
  ]);
  disposeObject(robot);
  disposeObject(effect);
});

it("preserves face-material slots and GPU-instanced city windows", () => {
  const panel = loadGeometry("hazard-panel");
  expect(panel.groups).toHaveLength(6);
  expect(panel.groups.map((group) => group.materialIndex)).toEqual([
    0, 1, 2, 3, 4, 5,
  ]);
  const city = instantiateModel("environment");
  const windows = meshes(city).filter(
    (mesh) => mesh instanceof THREE.InstancedMesh,
  );
  expect(windows).toHaveLength(1);
  const windowMesh = windows[0];
  expect(windowMesh).toBeInstanceOf(THREE.InstancedMesh);
  if (windowMesh instanceof THREE.InstancedMesh) {
    expect(windowMesh.count).toBeGreaterThan(100);
  }
  panel.dispose();
  disposeObject(city);
});

const groups: ModelName[] = [
  "specialist",
  "cannon",
  "homing",
  "grenade",
  "review",
  "lint",
  "pickup-double",
  "pickup-triple",
  "pickup-quad",
  "pickup-quint",
  "pickup-homing",
  "pickup-grenade",
  "bullet",
  "environment",
  "robot",
  "reticle",
  "stun-rings",
  "review-effect",
  "lint-effect",
];
const shapes: ModelName[] = [
  "review-beam",
  "danger-marker",
  "hazard-panel",
  "hazard-trail",
  "particle-letter",
  "particle-chip",
  "explosion-ring",
  "armor-box",
  "armor-bolt",
  "armor-reactor-ring",
  "armor-reactor-core",
  "armor-reactor-fin",
  "ice-crystal",
  "angry-eye",
  "angry-brow",
  "shard-chip",
  "spark-fleck",
  "smoke-quad",
  "solid-impact-shard",
  "fallen-letter",
];
