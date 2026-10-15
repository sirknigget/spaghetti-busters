import * as THREE from "three";
import type { Simulation, Particle } from "./simulation";
import { loadGeometry } from "./model-assets";
import { HALF, HEIGHT, PARTICLE } from "./world-settings";

const LETTER_TEXTURE_HEIGHT = 40;
const LETTER_TEXTURE_WIDTH = 32;

export class WorldParticles {
  private readonly particleMeshes = new Map<Particle, THREE.Mesh>();
  private readonly letterTextures = new Map<string, THREE.CanvasTexture>();

  constructor(private readonly scene: THREE.Scene) {}

  update(sim: Simulation) {
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
        texture = letterTexture(particle);
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

function letterTexture(particle: Particle) {
  const canvas = document.createElement("canvas");
  canvas.width = LETTER_TEXTURE_WIDTH;
  canvas.height = LETTER_TEXTURE_HEIGHT;
  const c = canvas.getContext("2d")!;
  c.font = "bold 27px monospace";
  c.fillStyle = particle.color;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(particle.char!, canvas.width * HALF, canvas.height * HALF);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
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
