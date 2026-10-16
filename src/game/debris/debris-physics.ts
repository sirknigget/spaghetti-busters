import RAPIER from "@dimforge/rapier3d-compat";
import type * as THREE from "three";
import { RigidBodies } from "#root/src/game/debris/impact/debris-rigid.ts";
import { FleckParticles } from "#root/src/game/debris/impact/debris-flecks.ts";
import { emitImpact } from "#root/src/game/debris/impact/debris-impact.ts";
import {
  collapseCode,
  type CodeCollapse,
} from "#root/src/game/debris/collapse/debris-code-collapse.ts";
import {
  collapseRobot,
  type RobotMotion,
} from "#root/src/game/debris/collapse/debris-robot-collapse.ts";
import { crumbleCode } from "#root/src/game/debris/collapse/debris-crumble.ts";
import type {
  DebrisImpact,
  DebrisEmitter,
} from "#root/src/game/debris/debris-types.ts";

export type { DebrisImpact } from "#root/src/game/debris/debris-types.ts";

/** Render-only collision world: debris never changes gameplay entities or random state. */
export class DebrisPhysics {
  private readonly context: DebrisEmitter;
  private totalImpacts = 0;
  private totalRobotDeaths = 0;
  private totalCodeDeaths = 0;
  private disposed = false;

  static async create(scene: THREE.Scene) {
    await RAPIER.init();

    return new DebrisPhysics(scene);
  }

  private constructor(scene: THREE.Scene) {
    this.context = {
      rigid: new RigidBodies(scene),
      particles: new FleckParticles(scene),
      impact: (hit) => this.impact(hit),
    };
  }

  impact(hit: DebrisImpact) {
    if (this.disposed) {
      return;
    }

    this.totalImpacts++;
    emitImpact(this.context, hit);
  }

  dismantleCode(mesh: THREE.Group, death: CodeCollapse) {
    if (this.disposed) {
      return;
    }

    this.totalCodeDeaths++;
    collapseCode(this.context, mesh, death);
  }

  dismantleRobot(mesh: THREE.Group, robot: RobotMotion, seed: number) {
    if (this.disposed) {
      return;
    }

    this.totalRobotDeaths++;
    collapseRobot(this.context, mesh, { robot, seed });
  }

  update(dt: number) {
    if (this.disposed || dt <= 0) {
      return;
    }

    this.context.particles.update(dt);
    this.context.rigid.update(dt, (item, position) =>
      crumbleCode(this.context.particles, item, position),
    );
    this.context.particles.render();
  }

  get bodySnapshots() {
    return this.context.rigid.bodySnapshots;
  }

  get diagnostics() {
    return {
      ...this.context.rigid.counts,
      particles: this.context.particles.count,
      codeDeaths: this.totalCodeDeaths,
      impacts: this.totalImpacts,
      robotDeaths: this.totalRobotDeaths,
    };
  }

  reset() {
    this.context.rigid.reset();
    this.context.particles.reset();
    this.totalImpacts = this.totalRobotDeaths = this.totalCodeDeaths = 0;
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.reset();
    this.disposed = true;
    this.context.particles.dispose();
    this.context.rigid.dispose();
  }
}
