import {
  type GameEvent,
  type SpecialWeapon,
} from "#root/src/game/simulation/simulation-types.ts";
import { Simulation } from "#root/src/game/simulation/simulation.ts";
import type { WorldRenderer } from "#root/src/game/rendering/world3d.ts";
import type { GameController, Callbacks } from "#root/src/game/scene/scene.ts";
import { INPUT, MUZZLE_EVENTS } from "#root/src/game/scene/scene-config.ts";
import { bindPointer, bindKeyboard } from "#root/src/game/scene/scene-input.ts";
import { bindLifecycle } from "#root/src/game/scene/scene-lifecycle.ts";

const MUZZLE_FLASH_SECONDS = 0.065;
const MEDIUM_IMPACT = 3;
const ROBOT_HIT_IMPACT = 2;
const ROBOT_DESTRUCTION_IMPACT = 6;
const FRACTURE_IMPACT = 5;
const EXPLOSION_IMPACT = 8;
const STUN_IMPACT = 7;
const EVENT_IMPACTS: Partial<Record<GameEvent, number>> = {
  hit: MEDIUM_IMPACT,
  "robot-hit": ROBOT_HIT_IMPACT,
  "robot-destroy": ROBOT_DESTRUCTION_IMPACT,
  split: FRACTURE_IMPACT,
  destroy: FRACTURE_IMPACT,
  explosion: EXPLOSION_IMPACT,
  lint: EXPLOSION_IMPACT,
  generate: MEDIUM_IMPACT,
  stun: STUN_IMPACT,
};

function eventImpact(event: GameEvent, previous: number): number {
  if (event === "boss" || event === "boss-spawn") {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : INPUT.bossImpact;
  }

  return EVENT_IMPACTS[event] ?? previous;
}

export class PlayScene implements GameController {
  sim = new Simulation();

  paused = true;
  holding = false;
  holdingSpecial = false;
  muzzle = 0;
  impact = 0;
  lastHud = 0;
  lastFrame = performance.now();
  keys = new Set<string>();

  constructor(
    readonly world: WorldRenderer,
    readonly callbacks: Callbacks,
    readonly host: HTMLElement,
  ) {
    this.world.renderer.domElement.setAttribute(
      "aria-label",
      "3D arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Press 1 for homing backspace missiles, 2 for recycle grenades, 3 for the code review freeze gun, or 4 for the lint bomb.",
    );
    bindPointer(this);
    bindKeyboard(this);
    bindLifecycle(this);
    this.draw();
    requestAnimationFrame(this.frame);
  }

  release() {
    this.holding = this.holdingSpecial = false;
    this.keys.clear();
  }

  reset() {
    this.sim.reset();
    this.world.reset();
    this.release();
    this.muzzle = this.impact = 0;
    this.callbacks.onState(this.sim);
    this.draw();
  }

  setPaused(value: boolean) {
    this.paused = value;
    this.release();
    this.lastFrame = performance.now();
    if (!value) {
      this.world.resize();
      this.draw();
    }
  }

  selectSpecial(type: SpecialWeapon) {
    if (!this.paused) {
      this.sim.selectSpecial(type);
      this.callbacks.onState(this.sim);
    }
  }

  fireSpecial() {
    if (!this.paused) {
      this.sim.fireSpecial();
    }
  }

  draw() {
    this.world.render(this.sim, this.muzzle, this.impact);
  }

  frame = (now: number) => {
    const dt = Math.min(
      Math.max(0, (now - this.lastFrame) / INPUT.millisecondsPerSecond),
      INPUT.maxFrameSeconds,
    );

    this.lastFrame = now;
    if (!this.paused) {
      this.update(dt);
    }

    requestAnimationFrame(this.frame);
  };

  update(dt: number) {
    this.updateInput(dt);
    this.sim.update(dt);
    this.consumeEvents();
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.impact = Math.max(0, this.impact - dt * INPUT.impactDecay);
    this.lastHud += dt;
    if (this.lastHud > INPUT.hudInterval) {
      this.callbacks.onState(this.sim);
      this.lastHud = 0;
    }

    if (this.sim.progress.status === "gameover") {
      this.callbacks.onState(this.sim);
      this.callbacks.onGameOver(
        this.sim.progress.score,
        this.sim.progress.wave,
      );
    }

    this.draw();
  }

  private updateInput(dt: number) {
    this.updateAim(dt);
    if (this.holding || this.keys.has("Space")) {
      this.sim.fire();
    }

    if (this.holdingSpecial) {
      this.sim.fireSpecial();
    }
  }

  private updateAim(dt: number) {
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) {
      this.sim.player.aimY = Math.max(
        INPUT.keyboardMinY,
        this.sim.player.aimY - dt * INPUT.keyboardSpeed,
      );
    }

    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) {
      this.sim.player.aimY = Math.min(
        INPUT.keyboardMaxY,
        this.sim.player.aimY + dt * INPUT.keyboardSpeed,
      );
    }
  }

  private consumeEvents() {
    for (const event of this.sim.world.events.splice(0)) {
      if (MUZZLE_EVENTS.has(event)) {
        this.muzzle = MUZZLE_FLASH_SECONDS;
      }

      this.impact = eventImpact(event, this.impact);
      this.callbacks.onEvent(event);
    }
  }
}
