import { PALETTE } from "./palette";
import * as THREE from "three";
import { instantiateModel } from "./model-assets";
import { createCannon, createSpecialist } from "./models3d";
import { createReticle } from "./world-environment";
import type { Simulation } from "./simulation";
import { HALF, HEIGHT, LABEL, LIGHT, PLAYER, VIEW } from "./world-settings";

export class WorldPlayer {
  private readonly specialist = createSpecialist();
  private readonly cannon = createCannon();
  private readonly reticle = createReticle();
  private readonly stun = instantiateModel("stun-rings");
  private readonly stunLabel = createStunLabel();
  private readonly muzzleLight = new THREE.PointLight(
    PALETTE.environment.muzzle,
    0,
    LIGHT.muzzleRange,
    LIGHT.decay,
  );

  constructor(scene: THREE.Scene) {
    scene.add(
      this.specialist,
      this.cannon,
      this.muzzleLight,
      this.reticle,
      this.stun,
    );
    this.muzzleLight.position.set(
      LIGHT.initialMuzzleX,
      LIGHT.initialMuzzleY,
      LIGHT.initialMuzzleZ,
    );
    this.stun.add(this.stunLabel);
  }

  update(sim: Simulation, muzzle: number) {
    const t = sim.progress.elapsed;
    const angle = -Math.atan2(
      sim.player.aimY - sim.player.playerY,
      Math.max(PLAYER.minimumAimDistance, sim.player.aimX - PLAYER.aimOrigin),
    );
    this.specialist.position.set(PLAYER.x, HEIGHT - sim.player.playerY, 0);
    this.specialist.rotation.y =
      Math.sin(t * PLAYER.swayFrequency) * PLAYER.swayAmplitude;
    this.cannon.position.set(
      PLAYER.cannonX - (muzzle > 0 ? PLAYER.recoil : 0),
      HEIGHT - sim.player.playerY,
      PLAYER.cannonZ,
    );
    this.cannon.rotation.set(0, PLAYER.cannonTilt, angle);
    this.updateMuzzle(angle, muzzle, sim);
    this.updateStun(sim);
  }

  private updateMuzzle(angle: number, muzzle: number, sim: Simulation) {
    this.muzzleLight.position.set(
      PLAYER.cannonX + Math.cos(angle) * PLAYER.muzzleRadius,
      HEIGHT - sim.player.playerY + Math.sin(angle) * PLAYER.muzzleRadius,
      PLAYER.muzzleZ,
    );
    this.muzzleLight.intensity = muzzle > 0 ? PLAYER.muzzleLight : 0;
    const flash = this.cannon.getObjectByName("muzzle-flash");
    if (flash) {
      flash.visible = muzzle > 0;
    }
  }

  private updateStun(sim: Simulation) {
    const t = sim.progress.elapsed;
    this.reticle.position.set(sim.player.aimX, HEIGHT - sim.player.aimY, 0);
    this.stun.visible = sim.isStunned;
    this.stun.position.set(
      PLAYER.stunX,
      HEIGHT - sim.player.playerY,
      PLAYER.stunZ,
    );
    if (sim.isStunned) {
      for (let i = 0; i < PLAYER.stunRings; i++) {
        this.stun.children[i]!.rotation.z =
          t * (i % VIEW.diameter ? -PLAYER.stunSpeed : PLAYER.stunSpeed);
      }
      this.drawStunLabel(sim);
    }
  }

  private drawStunLabel(sim: Simulation) {
    // SAFETY: the constructor creates this sprite texture from a label canvas.
    const canvas = this.stunLabel.material.map!.image as HTMLCanvasElement;
    const c = canvas.getContext("2d")!;
    c.clearRect(0, 0, LABEL.width, LABEL.height);
    c.fillStyle = PALETTE.stun.background;
    c.fillRect(0, 0, LABEL.width, LABEL.height);
    c.fillStyle = PALETTE.stun.text;
    c.font = "bold 25px monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(
      `AWAIT ${sim.player.stunRemaining.toFixed(1)}s`,
      LABEL.width * HALF,
      LABEL.height * HALF,
    );
    this.stunLabel.material.map!.needsUpdate = true;
  }

  reset() {
    this.muzzleLight.intensity = 0;
  }
}

function createStunLabel() {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = LABEL.width;
  labelCanvas.height = LABEL.height;
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTexture, depthTest: false }),
  );
  label.scale.set(LABEL.worldWidth, LABEL.worldHeight, 1);
  label.position.set(0, LABEL.y, 0);

  return label;
}
