import * as THREE from "three";
import type { Fleck } from "#root/src/game/debris/debris-types.ts";
import { FleckRenderer } from "#root/src/game/debris/impact/debris-fleck-renderer.ts";
import {
  MAX_FLECKS,
  STEP,
  FLECK,
  FLOOR,
  HALF,
} from "#root/src/game/debris/debris-settings.ts";

export class FleckParticles {
  private readonly flecks: Fleck[] = [];
  private readonly renderer: FleckRenderer;
  private accumulator = 0;

  constructor(scene: THREE.Scene) {
    this.renderer = new FleckRenderer(scene);
  }

  get count() {
    return this.flecks.length;
  }

  add(fleck: Fleck) {
    if (this.flecks.length >= MAX_FLECKS) {
      this.flecks.shift();
    }

    this.flecks.push(fleck);
  }

  update(dt: number) {
    this.accumulator += Math.min(dt, STEP.maxDelta);
    while (this.accumulator >= STEP.interval) {
      this.step(STEP.interval);
      this.accumulator -= STEP.interval;
    }
  }

  private step(dt: number) {
    for (let i = this.flecks.length - 1; i >= 0; i--) {
      const p = this.flecks[i]!;

      p.age += dt;
      if (p.age >= p.life) {
        this.flecks.splice(i, 1);
        continue;
      }

      stepFleck(p, dt);
      p.position.addScaledVector(p.velocity, dt);
      p.rotation.multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(p.spin.x * dt, p.spin.y * dt, p.spin.z * dt),
        ),
      );
    }
  }

  render() {
    this.renderer.render(this.flecks);
  }

  reset() {
    this.flecks.length = 0;
    this.accumulator = 0;
    this.render();
  }

  dispose() {
    this.reset();
    this.renderer.dispose();
  }
}

function stepFleck(p: Fleck, dt: number) {
  if (p.kind === "smoke") {
    stepSmoke(p, dt);
  } else {
    stepSolidFleck(p, dt);
  }
}

function stepSmoke(p: Fleck, dt: number) {
  // Buoyancy, drag and changing curl-like eddies, integrated from velocity.
  p.velocity.x +=
    (Math.sin(p.age * FLECK.curlX + p.phase) * FLECK.curlForceX -
      p.velocity.x * FLECK.dragX) *
    dt;
  p.velocity.y += (FLECK.buoyancy - p.velocity.y * FLECK.dragY) * dt;
  p.velocity.z +=
    (Math.cos(p.age * FLECK.curlZ + p.phase) * FLECK.curlForceZ -
      p.velocity.z * FLECK.dragZ) *
    dt;
}

function stepSolidFleck(p: Fleck, dt: number) {
  p.velocity.y -= FLECK.gravity * dt;
  p.velocity.multiplyScalar(
    Math.exp(-(p.kind === "spark" ? FLECK.sparkDrag : FLECK.shardDrag) * dt),
  );
  if (p.position.y < FLOOR + p.scale.y * HALF && p.velocity.y < 0) {
    p.position.y = FLOOR + p.scale.y * HALF;
    p.velocity.y *= -FLECK.restitution;
    p.velocity.x *= FLECK.frictionX;
    p.velocity.z *= HALF;
    p.spin.multiplyScalar(FLECK.spinDamping);
    p.bounces++;
    settleFleck(p);
  }
}

function settleFleck(p: Fleck) {
  if (
    p.bounces > FLECK.settleBounces &&
    Math.abs(p.velocity.y) < FLECK.settleSpeed
  ) {
    p.velocity.y = 0;
    p.velocity.x *= FLECK.settleDamping;
  }
}
