import RAPIER from "@dimforge/rapier3d-compat";
import {
  type RigidSpawn,
  type RigidDebris,
  type DebrisPosition,
} from "./debris-types";
import {
  HALF,
  FLOOR,
  FLOOR_CONTACT,
  STEP,
  MAX_BODIES,
  SETTLED,
} from "./debris-settings";
import { BODY } from "./debris-impact-settings";
import * as THREE from "three";
import { disposeObject } from "./graphics-resources";

export function createDebrisWorld() {
  const world = new RAPIER.World({ x: 0, y: -640, z: 0 });
  world.timestep = STEP.interval;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(
      FLOOR_CONTACT.halfWidth,
      FLOOR_CONTACT.halfHeight,
      FLOOR_CONTACT.halfDepth,
    )
      .setTranslation(
        FLOOR_CONTACT.centerX,
        FLOOR - FLOOR_CONTACT.halfHeight,
        FLOOR_CONTACT.centerZ,
      )
      .setFriction(FLOOR_CONTACT.friction)
      .setRestitution(FLOOR_CONTACT.restitution),
  );

  return world;
}

export function rigidBodyDescriptor(spawn: RigidSpawn) {
  const { mesh, halfSize, velocity, random, kind } = spawn;

  return RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(
      mesh.position.x,
      Math.max(FLOOR + halfSize.y + 1, mesh.position.y),
      kind === "code" || kind === "letter"
        ? mesh.position.z
        : Math.min(BODY.frontDepth, Math.max(BODY.backDepth, mesh.position.z)),
    )
    .setRotation(mesh.quaternion)
    .setLinvel(velocity.x, velocity.y, velocity.z)
    .setAngvel({
      x: (random() - HALF) * BODY.spinXY,
      y: (random() - HALF) * BODY.spinXY,
      z: (random() - HALF) * BODY.spinZ,
    })
    .setLinearDamping(BODY.linearDamping)
    .setAngularDamping(BODY.angularDamping)
    .setCanSleep(true)
    .setCcdEnabled(true);
}

type CrumbleHandler = (item: RigidDebris, position: DebrisPosition) => void;

export class RigidBodies {
  private readonly world = createDebrisWorld();
  private readonly rigid: RigidDebris[] = [];
  private accumulator = 0;

  constructor(private readonly scene: THREE.Scene) {}

  add(spawn: RigidSpawn) {
    const { mesh, halfSize, velocity, random, kind, life, hull } = spawn;
    while (this.rigid.length >= MAX_BODIES) {
      this.removeRigid(0);
    }
    const body = this.world.createRigidBody(rigidBodyDescriptor(spawn));
    const shape =
      (hull && RAPIER.ColliderDesc.convexHull(hull)) ||
      RAPIER.ColliderDesc.cuboid(halfSize.x, halfSize.y, halfSize.z);
    this.world.createCollider(
      shape
        .setDensity(BODY.density)
        .setFriction(BODY.friction + random() * BODY.frictionJitter)
        .setRestitution(BODY.restitution + random() * BODY.restitutionJitter),
      body,
    );
    this.scene.add(mesh);
    this.rigid.push({
      body,
      mesh,
      age: 0,
      life,
      kind,
      lastVelocity: velocity.clone(),
      crumbled: false,
      seed: Math.floor(random() * BODY.maxSeed),
    });
  }

  update(dt: number, onCrumble: CrumbleHandler) {
    if (dt <= 0) {
      return;
    }
    this.accumulator += Math.min(dt, STEP.maxDelta);
    while (this.accumulator >= STEP.interval) {
      this.world.step();

      this.accumulator -= STEP.interval;
    }
    this.updateBodies(dt, onCrumble);
  }

  private updateBodies(dt: number, onCrumble: CrumbleHandler) {
    for (let i = this.rigid.length - 1; i >= 0; i--) {
      const item = this.rigid[i]!;
      item.age += Math.min(dt, STEP.maxDelta);
      if (item.age > item.life || item.body.translation().y < STEP.cullHeight) {
        this.removeRigid(i);
        continue;
      }
      poseRigidBody(item, onCrumble);
    }
  }

  get bodySnapshots() {
    return this.rigid.map((item) => {
      const p = item.body.translation();
      const v = item.body.linvel();

      return {
        kind: item.kind,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: v.x,
        vy: v.y,
        vz: v.z,
        sleeping: item.body.isSleeping(),
      };
    });
  }

  get counts() {
    return {
      rigidBodies: this.rigid.length,
      settled: this.rigid.filter(
        (item) =>
          item.body.isSleeping() ||
          (Math.abs(item.body.linvel().y) < SETTLED.speed &&
            item.body.translation().y < SETTLED.height),
      ).length,
      letters: this.rigid.filter((item) => item.kind === "letter").length,
      robotParts: this.rigid.filter((item) => item.kind === "robot").length,
      codeParts: this.rigid.filter((item) => item.kind === "code").length,
      crumbled: this.rigid.filter(
        (item) => item.kind === "code" && item.crumbled,
      ).length,
      floorY: FLOOR,
    };
  }

  private removeRigid(index: number) {
    const item = this.rigid[index]!;
    this.world.removeRigidBody(item.body);
    disposeObject(item.mesh);
    this.rigid.splice(index, 1);
  }

  reset() {
    while (this.rigid.length) {
      this.removeRigid(this.rigid.length - 1);
    }
    this.accumulator = 0;
  }

  dispose() {
    this.reset();
    this.world.free();
  }
}

function poseRigidBody(item: RigidDebris, onCrumble: CrumbleHandler) {
  const p = item.body.translation();
  const q = item.body.rotation();
  const v = item.body.linvel();
  const freshCode =
    item.kind === "code" && !item.crumbled && item.age > STEP.crumbleAge;
  if (
    freshCode &&
    item.lastVelocity.y < STEP.crumbleSpeed &&
    v.y - item.lastVelocity.y > STEP.crumbleDeceleration
  ) {
    item.crumbled = true;
    onCrumble(item, p);
  }
  item.lastVelocity.set(v.x, v.y, v.z);
  item.mesh.position.set(p.x, p.y, p.z);
  item.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  const fade = Math.min(1, (item.life - item.age) * STEP.fadeRate);
  item.mesh.scale.setScalar(Math.max(0, fade));
}
