import * as THREE from "three";
import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import {
  createBullet,
  createSpecial,
  createPickup,
} from "#root/src/game/rendering/models/models3d.ts";
import {
  createRobot,
  animateRobot,
} from "#root/src/game/rendering/robots/robot3d.ts";
import { EntityCache } from "#root/src/game/rendering/world-entity-cache.ts";
import { createTimeoutMesh } from "#root/src/game/rendering/display/world-timeout.ts";
import {
  PICKUP,
  SPECIAL,
  HAZARD,
} from "#root/src/game/rendering/world-settings.ts";

export class WorldEntities {
  readonly robots: EntityCache<Simulation["world"]["robots"][number]>;
  private readonly bullets: EntityCache<Simulation["world"]["bullets"][number]>;
  private readonly pickups: EntityCache<Simulation["world"]["pickups"][number]>;
  private readonly specials: EntityCache<
    Simulation["world"]["specials"][number]
  >;
  private readonly hazards: EntityCache<Simulation["world"]["hazards"][number]>;

  constructor(scene: THREE.Scene) {
    this.robots = new EntityCache(scene);
    this.bullets = new EntityCache(scene);
    this.pickups = new EntityCache(scene);
    this.specials = new EntityCache(scene);
    this.hazards = new EntityCache(scene);
  }

  update(sim: Simulation) {
    this.robotsUpdate(sim);
    this.bulletsUpdate(sim);
    this.pickupsUpdate(sim);
    this.specialsUpdate(sim);
    this.hazardsUpdate(sim);
  }

  private robotsUpdate(sim: Simulation) {
    this.robots.sync(sim.world.robots, {
      create: (r) => createRobot(r.brand),
      update: (mesh, r) =>
        animateRobot(mesh, r, sim.player.freezeRemaining > 0),
    });
  }

  private bulletsUpdate(sim: Simulation) {
    this.bullets.sync(sim.world.bullets, {
      create: () => createBullet(),
      update: (mesh, b) => {
        mesh.rotation.z = -Math.atan2(b.vy, b.vx);
      },
    });
  }

  private pickupsUpdate(sim: Simulation) {
    this.pickups.sync(sim.world.pickups, {
      create: (p) => createPickup(p.type),
      update: (mesh, p) => {
        mesh.rotation.set(
          Math.sin(p.age * PICKUP.xFrequency) * PICKUP.xAmplitude,
          Math.sin(p.age * PICKUP.yFrequency) * PICKUP.yAmplitude,
          Math.sin(p.age * PICKUP.zFrequency) * PICKUP.zAmplitude,
        );
      },
    });
  }

  private specialsUpdate(sim: Simulation) {
    this.specials.sync(sim.world.specials, {
      create: (p) => createSpecial(p.type),
      update: (mesh, p) => {
        mesh.rotation.set(
          p.type === "grenade"
            ? sim.progress.elapsed * SPECIAL.grenadeX
            : SPECIAL.tiltX,
          p.type === "grenade"
            ? sim.progress.elapsed * SPECIAL.grenadeY
            : SPECIAL.tiltY,
          -p.angle,
        );
      },
    });
  }

  private hazardsUpdate(sim: Simulation) {
    this.hazards.sync(sim.world.hazards, {
      create: (h) => createTimeoutMesh(h),
      update: (mesh, h) => {
        mesh.rotation.set(
          Math.sin(h.age * HAZARD.xFrequency) * HAZARD.xAmplitude,
          Math.sin(h.age * HAZARD.yFrequency) * HAZARD.yAmplitude,
          Math.atan2(h.vy, -h.vx) * HAZARD.bank,
        );
      },
    });
  }

  reset() {
    this.robots.reset();
    this.bullets.reset();
    this.pickups.reset();
    this.specials.reset();
    this.hazards.reset();
  }
}
