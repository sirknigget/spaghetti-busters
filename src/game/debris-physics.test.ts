import { PALETTE } from "./palette";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { beforeAll, expect, it } from "vitest";
import { DebrisPhysics, debrisRandom } from "./debris-physics";
import { preloadModels } from "./model-assets";

beforeAll(async () => {
  const bytes = await readFile(
    new URL("../../public/assets/models/arcade-models.glb", import.meta.url),
  );
  await preloadModels(Uint8Array.from(bytes).buffer);
});

const hit = {
  x: 600,
  y: 300,
  vx: 80,
  vy: 0,
  radius: 28,
  seed: 12345,
  target: "robot" as const,
};

it("reproduces local entropy while different seeds create different trajectories", () => {
  const a = debrisRandom(14);
  const b = debrisRandom(14);
  const c = debrisRandom(15);
  const samples = Array.from({ length: 12 }, () => a());
  expect(samples).toEqual(Array.from({ length: 12 }, () => b()));
  expect(samples).not.toEqual(Array.from({ length: 12 }, () => c()));
  expect(samples.every((n) => n >= 0 && n < 1)).toBe(true);
});

it("integrates real gravity, bounces above the floor, then comes to rest", async () => {
  const debris = await DebrisPhysics.create(new THREE.Scene());
  debris.impact(hit);
  const start = debris.bodySnapshots[0]!;
  const velocities: number[] = [];
  let bounced = false;
  for (let i = 0; i < 360; i++) {
    debris.update(1 / 120);
    const body = debris.bodySnapshots[0]!;
    velocities.push(body.vy);
    if (i > 15 && velocities[i - 1]! < -100 && body.vy > 0) {
      bounced = true;
    }
    expect(body.y).toBeGreaterThan(40);
  }
  expect(bounced).toBe(true);
  expect(debris.bodySnapshots[0]!.y).toBeLessThan(start.y - 200);
  for (let i = 0; i < 300; i++) {
    debris.update(1 / 120);
  }
  expect(debris.diagnostics.settled).toBeGreaterThan(0);
  debris.dispose();
});

it("does not advance at pause, bounds effects, and fully resets ownership", async () => {
  const scene = new THREE.Scene();
  const debris = await DebrisPhysics.create(scene);
  for (let i = 0; i < 80; i++) {
    debris.impact({ ...hit, seed: i });
  }
  expect(debris.diagnostics.rigidBodies).toBeLessThanOrEqual(92);
  expect(debris.diagnostics.particles).toBeLessThanOrEqual(640);
  const before = debris.bodySnapshots;
  debris.update(0);
  expect(debris.bodySnapshots).toEqual(before);
  debris.reset();
  expect(debris.diagnostics.rigidBodies).toBe(0);
  expect(debris.diagnostics.particles).toBe(0);
  debris.dispose();
  expect(scene.children).toHaveLength(0);
});

it("dismantles actual posed robot parts without reusing original resources", async () => {
  const scene = new THREE.Scene();
  const debris = await DebrisPhysics.create(scene);
  const robot = new THREE.Group();
  robot.position.set(600, 300, 0);
  robot.rotation.z = 0.2;
  const arm = new THREE.Group();
  arm.name = "robot-arm-1";
  arm.position.set(30, 5, 0);
  robot.add(arm);
  const original = new THREE.Mesh(
    new THREE.BoxGeometry(10, 28, 12),
    new THREE.MeshStandardMaterial({ color: PALETTE.common.metalWhite }),
  );
  arm.add(original);
  scene.add(robot);
  robot.updateMatrixWorld(true);
  const originalPosition = original.getWorldPosition(new THREE.Vector3());
  debris.dismantleRobot(robot, { x: 600, y: 420 }, 50);
  const detached = scene.getObjectByName("fallen-robot-arm-1") as THREE.Group;
  const copy = detached.children[0]!.children[0] as THREE.Mesh;
  expect(copy.geometry).not.toBe(original.geometry);
  expect(copy.material).not.toBe(original.material);
  expect(
    copy.getWorldPosition(new THREE.Vector3()).distanceTo(originalPosition),
  ).toBeLessThan(0.001);
  expect(debris.diagnostics.robotParts).toBe(1);
  expect(robot.children).toHaveLength(1);
  debris.dispose();
  original.geometry.dispose();
  (original.material as THREE.Material).dispose();
});
