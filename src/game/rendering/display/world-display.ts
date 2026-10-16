import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import { disposeObject } from "#root/src/game/code/code-mesh.ts";
import {
  configureRenderer,
  populateEnvironment,
} from "#root/src/game/rendering/display/world-environment.ts";
import {
  CAMERA_SHAKE,
  DANGER,
  HEIGHT,
  VIEW,
  WIDTH,
} from "#root/src/game/rendering/world-settings.ts";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";

export class WorldDisplay {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(
    (VIEW.diameter *
      Math.atan(VIEW.halfHeight / VIEW.distance) *
      VIEW.degrees) /
      Math.PI,
    VIEW.aspectWidth / VIEW.aspectHeight,
    1,
    VIEW.far,
  );
  readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private readonly dangerMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.environment.safe,
  });
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly parent: HTMLElement) {
    configureRenderer(this.renderer);
    parent.appendChild(this.renderer.domElement);
    this.camera.position.set(VIEW.halfWidth, VIEW.halfHeight, VIEW.distance);
    this.camera.lookAt(VIEW.halfWidth, VIEW.halfHeight, 0);
    populateEnvironment(this.scene, this.dangerMaterial);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  resize() {
    const available = this.parent.getBoundingClientRect();
    const width = Math.max(
      1,
      Math.min(
        available.width || WIDTH,
        ((available.height || HEIGHT) * VIEW.aspectWidth) / VIEW.aspectHeight,
      ),
    );

    this.renderer.setSize(
      width,
      (width * VIEW.aspectHeight) / VIEW.aspectWidth,
    );
    this.renderer.domElement.style.margin = "auto";
  }

  render(sim: SimulationView, impact: number) {
    this.dangerMaterial.color.set(
      sim.world.blocks.some((b) => b.x < DANGER.threshold)
        ? PALETTE.environment.danger
        : PALETTE.environment.safe,
    );

    const shake = this.reducedMotion
      ? 0
      : Math.min(impact, CAMERA_SHAKE.maximum) * CAMERA_SHAKE.amplitude;

    this.camera.position.set(
      VIEW.halfWidth +
        Math.sin(sim.progress.elapsed * CAMERA_SHAKE.frequencyX) * shake,
      VIEW.halfHeight +
        Math.cos(sim.progress.elapsed * CAMERA_SHAKE.frequencyY) * shake,
      VIEW.distance,
    );
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
