import { createGlyphTexture } from "#root/src/game/graphics/glyph-texture.ts";
import * as THREE from "three";
import type { Particle } from "#root/src/game/simulation/simulation-types.ts";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";
import { loadGeometry } from "#root/src/game/graphics/model-assets.ts";
import { HEIGHT, PARTICLE } from "#root/src/game/rendering/world-settings.ts";

const LETTER_TEXTURE_HEIGHT = 40;
const LETTER_TEXTURE_WIDTH = 32;

export class WorldParticles {
  private readonly particleMeshes = new Map<Particle, THREE.Mesh>();
  private readonly letterTextures = new Map<string, THREE.CanvasTexture>();

  constructor(private readonly scene: THREE.Scene) {}

  update(sim: SimulationView) {
    // Detached letters now belong to the independent 3D debris world.
    const particles = sim.world.particles
      .filter((p) => !p.char)
      .slice(-PARTICLE.maximum);
    const livingParticles = new Set(particles);

    for (const [particle, mesh] of this.particleMeshes) {
      if (!livingParticles.has(particle)) {
        disposeParticle(mesh);
        this.particleMeshes.delete(particle);
      }
    }

    for (const particle of particles) {
      let mesh = this.particleMeshes.get(particle);

      if (!mesh) {
        mesh = this.createParticle(particle);
        this.particleMeshes.set(particle, mesh);
        this.scene.add(mesh);
      }

      animateParticle(mesh, particle);
    }
  }

  private createParticle(particle: Particle) {
    if (particle.char) {
      const key = `${particle.char}:${particle.color}`;
      let texture = this.letterTextures.get(key);

      if (!texture) {
        texture = createGlyphTexture(particle, {
          width: LETTER_TEXTURE_WIDTH,
          height: LETTER_TEXTURE_HEIGHT,
          font: "bold 27px monospace",
        });
        this.letterTextures.set(key, texture);
      }

      return new THREE.Mesh(
        loadGeometry("particle-letter"),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
    }

    const mesh = new THREE.Mesh(
      loadGeometry("particle-chip"),
      new THREE.MeshToonMaterial({ color: particle.color, transparent: true }),
    );

    mesh.castShadow = true;

    return mesh;
  }

  reset() {
    for (const mesh of this.particleMeshes.values()) {
      disposeParticle(mesh);
    }

    this.particleMeshes.clear();
  }

  dispose() {
    this.reset();
    for (const texture of this.letterTextures.values()) {
      texture.dispose();
    }

    this.letterTextures.clear();
  }
}

function disposeParticle(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  if (!Array.isArray(mesh.material)) {
    mesh.material.dispose();
  }

  mesh.removeFromParent();
}

function animateParticle(mesh: THREE.Mesh, particle: Particle) {
  const age = particle.maxLife - particle.life;

  mesh.position.set(
    particle.x,
    HEIGHT - particle.y,
    Math.sin(age * PARTICLE.zFrequency) * PARTICLE.zAmplitude + PARTICLE.zBase,
  );
  mesh.rotation.set(age * PARTICLE.spinX, age * PARTICLE.spinY, particle.angle);
  if (!Array.isArray(mesh.material)) {
    mesh.material.opacity = Math.min(
      1,
      (particle.life / particle.maxLife) * PARTICLE.fade,
    );
  }
}
