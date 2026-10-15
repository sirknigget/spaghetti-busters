import * as THREE from "three";
import { cloneOwnedMaterial, disposeObject } from "./graphics-resources";
import { debrisRandom } from "./debris-random";
import { ROBOT } from "./debris-impact-settings";
import { VIEWPORT } from "./debris-settings";
import type { DebrisEmitter } from "./debris-types";

const ROBOT_COLLAPSE_RADIUS = 80;

export interface RobotMotion {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}
interface RobotDeath {
  robot: RobotMotion;
  seed: number;
}
interface RobotKinetics {
  robot: RobotMotion;
  random: () => number;
}

export function collapseRobot(
  context: DebrisEmitter,
  mesh: THREE.Group,
  death: RobotDeath,
) {
  const { robot, seed } = death;
  const random = debrisRandom(seed);

  mesh.updateWorldMatrix(true, true);
  for (const child of robotAssemblies(mesh)) {
    const assembly = cloneAssembly(child);

    if (!assembly) {
      continue;
    }

    const { group, center, size } = assembly;
    const velocity = robotVelocity(center, { robot, random });

    context.rigid.add({
      mesh: group,
      halfSize: size
        .multiplyScalar(ROBOT.colliderScale)
        .max(new THREE.Vector3(1, 1, 1)),
      velocity,
      random,
      kind: "robot",
      life: ROBOT.life + random() * ROBOT.lifeJitter,
    });
  }

  showCollapseImpact(context, death);
}

function showCollapseImpact(context: DebrisEmitter, death: RobotDeath) {
  const { robot, seed } = death;

  context.impact({
    x: robot.x,
    y: robot.y,
    vx: robot.vx ?? 0,
    vy: robot.vy ?? 0,
    radius: ROBOT_COLLAPSE_RADIUS,
    seed: seed + ROBOT.impactSeedOffset,
    target: "robot",
  });
}

function robotAssemblies(mesh: THREE.Group) {
  const excluded = new Set([
    "robot-absorption-shield",
    "robot-armor-flash",
    "robot-status",
    "robot-thinking",
  ]);

  return mesh.children.filter(
    (child) =>
      !excluded.has(child.name) &&
      !(child instanceof THREE.Sprite) &&
      child.visible,
  );
}

function cloneAssembly(child: THREE.Object3D) {
  const clone = child.clone(true);

  cloneRobotResources(clone);
  child.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);

  const group = new THREE.Group();

  group.name = `fallen-${child.name || "robot-shell-part"}`;
  group.add(clone);
  group.updateMatrixWorld(true);

  return centerAssembly(group, clone);
}

function centerAssembly(group: THREE.Group, clone: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  if (!Number.isFinite(center.x) || size.length() < ROBOT.minSize) {
    disposeObject(group);

    return undefined;
  }

  group.position.copy(center);
  clone.position.sub(center);
  group.updateMatrixWorld(true);

  return { group, center, size };
}

function cloneRobotResources(clone: THREE.Object3D) {
  clone.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry = object.geometry.clone();
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => cloneOwnedMaterial(material))
        : cloneOwnedMaterial(object.material);
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function robotVelocity(center: THREE.Vector3, motion: RobotKinetics) {
  const { robot, random } = motion;
  const outward = center
    .clone()
    .sub(new THREE.Vector3(robot.x, VIEWPORT.height - robot.y, 0))
    .normalize();

  return new THREE.Vector3(
    outward.x * (ROBOT.lateralSpeed + random() * ROBOT.lateralJitter) +
      (robot.vx ?? 0) * ROBOT.inheritVelocity,
    ROBOT.lift + random() * ROBOT.liftJitter + outward.y * ROBOT.outwardLift,
    (random() - ROBOT.depthBias) * ROBOT.depthSpeed,
  );
}
