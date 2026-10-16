import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";
import { loadGeometry } from "#root/src/game/graphics/model-assets.ts";
import {
  EXPLOSION,
  HEIGHT,
  LIGHT,
} from "#root/src/game/rendering/world-settings.ts";

export class WorldExplosions {
  private readonly explosionMeshes: THREE.Mesh[] = [];
  private readonly explosionLight = new THREE.PointLight(
    PALETTE.environment.explosionLight,
    0,
    LIGHT.explosionRange,
    LIGHT.decay,
  );

  constructor(private readonly scene: THREE.Scene) {
    scene.add(this.explosionLight);
  }

  update(sim: SimulationView, impact: number) {
    while (this.explosionMeshes.length < sim.world.explosions.length) {
      const mesh = new THREE.Mesh(
        loadGeometry("explosion-ring"),
        new THREE.MeshBasicMaterial({
          color: PALETTE.environment.explosionRing,
          transparent: true,
          depthWrite: false,
        }),
      );

      this.explosionMeshes.push(mesh);
      this.scene.add(mesh);
    }

    this.animate(sim);

    const blast = sim.world.explosions[0];
    const impactIntensity =
      impact > EXPLOSION.impactThreshold ? EXPLOSION.impactLight : 0;

    this.explosionLight.intensity = blast
      ? (EXPLOSION.light * blast.life) / blast.maxLife
      : impactIntensity;
    if (blast) {
      this.explosionLight.position.set(
        blast.x,
        HEIGHT - blast.y,
        EXPLOSION.lightZ,
      );
    }
  }

  private animate(sim: SimulationView) {
    for (const [i, mesh] of this.explosionMeshes.entries()) {
      const explosion = sim.world.explosions[i];

      mesh.visible = !!explosion;
      if (!explosion) {
        continue;
      }

      const progress = 1 - explosion.life / explosion.maxLife;
      const radius =
        explosion.radius *
        (EXPLOSION.radiusBase + progress * EXPLOSION.radiusGrowth);

      mesh.position.set(explosion.x, HEIGHT - explosion.y, EXPLOSION.z);
      mesh.rotation.set(
        progress * EXPLOSION.rotationX,
        progress * EXPLOSION.rotationY,
        0,
      );
      mesh.scale.setScalar(radius);
      if (!Array.isArray(mesh.material)) {
        mesh.material.opacity = 1 - progress;
      }
    }
  }

  reset() {
    for (const mesh of this.explosionMeshes) {
      mesh.visible = false;
    }

    this.explosionLight.intensity = 0;
  }
}
