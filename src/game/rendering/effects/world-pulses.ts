import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import {
  instantiateModel,
  loadGeometry,
} from "#root/src/game/graphics/model-assets.ts";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";
import {
  HALF,
  HEIGHT,
  PULSE,
} from "#root/src/game/rendering/world-settings.ts";

const PULSE_OPACITY = 0.6;

export class WorldPulses {
  private readonly reviewEffect = instantiateModel("review-effect");
  private readonly lintEffect = instantiateModel("lint-effect");
  private readonly reviewBeam = new THREE.Mesh(
    loadGeometry("review-beam"),
    new THREE.MeshBasicMaterial({
      color: PALETTE.freeze.beam,
      transparent: true,
      opacity: PULSE_OPACITY,
      depthWrite: false,
    }),
  );

  constructor(scene: THREE.Scene) {
    for (const effect of [this.reviewEffect, this.lintEffect]) {
      effect.visible = false;
      scene.add(effect);
    }

    this.reviewEffect.name = "code-review-freeze-wave";
    this.lintEffect.name = "lint-bomb-screen-wave";
    this.reviewBeam.name = "code-review-freeze-beam";
    this.reviewBeam.visible = false;
    scene.add(this.reviewBeam);
  }

  update(sim: SimulationView) {
    for (const [effect, remaining, duration] of [
      [this.reviewEffect, sim.player.reviewPulse, PULSE.reviewDuration],
      [this.lintEffect, sim.player.lintPulse, PULSE.lintDuration],
    ] as const) {
      effect.visible = remaining > 0;
      if (remaining <= 0) {
        continue;
      }

      animatePulse(effect, 1 - remaining / duration);
    }

    this.updateBeam(sim);
  }

  private updateBeam(sim: SimulationView) {
    this.reviewBeam.visible = sim.player.reviewPulse > PULSE.beamCutoff;
    if (this.reviewBeam.visible) {
      const a = new THREE.Vector3(
        PULSE.beamX,
        HEIGHT - sim.player.playerY,
        PULSE.beamZ,
      );
      const b = new THREE.Vector3(
        sim.player.aimX,
        HEIGHT - sim.player.aimY,
        PULSE.beamTargetZ,
      );
      const direction = b.clone().sub(a);

      this.reviewBeam.position.copy(a.add(b).multiplyScalar(HALF));
      this.reviewBeam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      );
      this.reviewBeam.scale.y = direction.length();
      this.reviewBeam.material.opacity = Math.min(
        PULSE.beamAlpha,
        (sim.player.reviewPulse - PULSE.beamCutoff) * PULSE.beamFade,
      );
    }
  }

  reset() {
    this.reviewEffect.visible = false;
    this.lintEffect.visible = false;
    this.reviewBeam.visible = false;
  }
}

function animatePulse(effect: THREE.Group, progress: number) {
  for (const [index, child] of effect.children.entries()) {
    if (
      !(child instanceof THREE.Mesh) ||
      !(child.material instanceof THREE.MeshBasicMaterial)
    ) {
      continue;
    }

    const ring = child;

    ring.scale.setScalar(
      PULSE.minimumRadius +
        progress * PULSE.radiusGrowth -
        index * PULSE.ringSpacing,
    );
    ring.material.opacity = (1 - progress) * PULSE.opacity;
  }
}
