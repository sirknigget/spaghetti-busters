import { DebrisPhysics } from "#root/src/game/debris/debris-physics.ts";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";
import { WorldDisplay } from "#root/src/game/rendering/display/world-display.ts";
import { WorldCode } from "#root/src/game/rendering/code/world-code.ts";
import { WorldEntities } from "#root/src/game/rendering/display/world-entities.ts";
import { WorldVisualEvents } from "#root/src/game/rendering/effects/world-visual-events.ts";
import { WorldPulses } from "#root/src/game/rendering/effects/world-pulses.ts";
import { WorldParticles } from "#root/src/game/rendering/effects/world-particles.ts";
import { WorldExplosions } from "#root/src/game/rendering/effects/world-explosions.ts";
import { WorldPlayer } from "#root/src/game/rendering/display/world-player.ts";
import { RENDER_TIMING } from "#root/src/game/rendering/world-settings.ts";

export class WorldRenderer {
  private readonly display: WorldDisplay;
  private readonly code: WorldCode;
  private readonly entities: WorldEntities;
  private readonly pulses: WorldPulses;
  private readonly particles: WorldParticles;
  private readonly explosions: WorldExplosions;
  private readonly player: WorldPlayer;
  private events!: WorldVisualEvents;
  private lastEffectsTime = 0;
  debris!: DebrisPhysics;

  constructor(parent: HTMLElement) {
    this.display = new WorldDisplay(parent);
    this.code = new WorldCode(this.scene, this.display.reducedMotion);
    this.entities = new WorldEntities(this.scene);
    this.pulses = new WorldPulses(this.scene);
    this.particles = new WorldParticles(this.scene);
    this.explosions = new WorldExplosions(this.scene);
    this.player = new WorldPlayer(this.scene);
  }

  get renderer() {
    return this.display.renderer;
  }

  get scene() {
    return this.display.scene;
  }

  get camera() {
    return this.display.camera;
  }

  get blocks() {
    return this.code.blocks;
  }

  get robotMeshes() {
    return this.entities.robots.meshes;
  }

  resize() {
    this.display.resize();
  }

  async initialize() {
    this.debris = await DebrisPhysics.create(this.scene);
    this.events = new WorldVisualEvents({
      code: this.code,
      robots: this.robotMeshes,
      debris: this.debris,
    });
  }

  render(sim: SimulationView, muzzle: number, impact: number) {
    const effectsDt = Math.max(
      0,
      Math.min(
        RENDER_TIMING.maxDelta,
        sim.progress.elapsed - this.lastEffectsTime,
      ),
    );

    this.lastEffectsTime = sim.progress.elapsed;
    this.events.process(sim);
    this.debris.update(effectsDt);
    this.code.update(sim, effectsDt);
    this.entities.update(sim);
    this.pulses.update(sim);
    this.particles.update(sim);
    this.explosions.update(sim, impact);
    this.player.update(sim, muzzle);
    this.display.render(sim, impact);
  }

  reset() {
    this.debris?.reset();
    this.lastEffectsTime = 0;
    this.code.reset();
    this.entities.reset();
    this.particles.reset();
    this.explosions.reset();
    this.player.reset();
    this.pulses.reset();
  }

  dispose() {
    this.reset();
    this.debris?.dispose();
    this.particles.dispose();
    this.display.dispose();
  }
}
