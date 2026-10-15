import { PALETTE } from "#root/src/game/palette.ts";
import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import { triggerMagic } from "#root/src/game/simulation/progression/simulation-bonuses.ts";
import { split } from "#root/src/game/simulation/blocks/simulation-fragments.ts";
import {
  burst,
  snapshot,
  visual,
} from "#root/src/game/simulation/effects/simulation-particles.ts";
import {
  clamp,
  HALF,
  isSpentFragment,
} from "#root/src/game/simulation/simulation-shared.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import type {
  Block,
  Bullet,
} from "#root/src/game/simulation/simulation-types.ts";

const COMBO_LIFETIME_SECONDS = 2.4;

function damageContext(options: DamageOptions): DamageContext {
  const { block, blastRadius } = options;
  const liveCells = block.cells.filter((cell) => cell.alive).length;

  return {
    ...options,
    power: options.power ?? 1,
    surfaceBeforeHit: snapshot(block),
    cos: Math.cos(block.angle),
    sin: Math.sin(block.angle),
    radius:
      blastRadius ??
      (liveCells < TUNING.damage.smallBlockCells
        ? TUNING.damage.smallBlockRadius
        : TUNING.damage.radius),
    removedGlyphs: [],
  };
}

function scoreDamage(sim: Simulation, removed: number) {
  sim.progress.combo = Math.min(TUNING.damage.comboCap, sim.progress.combo + 1);
  sim.runtime.comboTimer = COMBO_LIFETIME_SECONDS;
  sim.progress.score +=
    removed *
    (TUNING.damage.pointsPerGlyph +
      Math.min(
        TUNING.damage.comboMultiplierCap,
        Math.floor(sim.progress.combo / TUNING.damage.glyphsPerComboTier),
      ));
  sim.world.events.push("hit");
}

function shouldDestroyBlock(block: Block, remaining: number): boolean {
  const deathCells = block.boss
    ? TUNING.damage.bossDeathCells
    : TUNING.damage.deathCells;

  return remaining < deathCells || isSpentFragment(block, remaining);
}

function shouldSplitBlock(sim: Simulation, block: Block, remaining: number) {
  const splitHits = block.boss
    ? TUNING.damage.bossBaseSplitHits +
      block.toughness * TUNING.damage.bossSplitHitsPerArmor
    : TUNING.damage.baseSplitHits + block.toughness;

  return (
    block.hits >= splitHits &&
    remaining > TUNING.damage.splitMinCells &&
    sim.world.blocks.length < TUNING.bounds.blockCap
  );
}

function finishDamage(sim: Simulation, hit: DamageContext) {
  const { block, x, y } = hit;
  const remaining = block.cells.filter((cell) => cell.alive);

  if (shouldDestroyBlock(block, remaining.length)) {
    destroyBlock(sim, hit);
  } else if (shouldSplitBlock(sim, block, remaining.length)) {
    split(sim, { block, cells: remaining, hitX: x, hitY: y });
  }
}

export function damage(sim: Simulation, options: DamageOptions) {
  const hit = damageContext(options);

  removeGlyphs(sim, hit);
  applyDamageImpulse(hit);
  scoreDamage(sim, hit.removedGlyphs.length);
  showImpact(sim, hit);
  finishDamage(sim, hit);
}

function impactMotion(hit: DamageContext) {
  const { block, x, y, cos, sin, bullet, radius } = hit;

  return {
    x: block.x + x * cos - y * sin,
    y: block.y + x * sin + y * cos,
    vx: bullet.vx ?? block.vx,
    vy: bullet.vy,
    radius,
  };
}

function showImpact(sim: Simulation, hit: DamageContext) {
  visual(sim, {
    type: "impact",
    target: "code",
    blockId: hit.block.id,
    ...impactMotion(hit),
    seed: ++sim.runtime.visualSeed,
    removed: hit.removedGlyphs,
  });
}

function destroyBlock(sim: Simulation, hit: DamageContext) {
  const { block, surfaceBeforeHit } = hit;

  visual(sim, {
    type: "code-death",
    block: surfaceBeforeHit,
    ...impactMotion(hit),
    seed: ++sim.runtime.visualSeed,
  });
  sim.world.blocks = sim.world.blocks.filter((item) => item.id !== block.id);
  sim.progress.score +=
    TUNING.damage.destructionReward +
    block.generation * TUNING.damage.fragmentReward;
  sim.progress.blocksDestroyed++;
  burst(sim, {
    x: block.x,
    y: block.y,
    color: PALETTE.particles.codeDeath,
    count: TUNING.particles.destroyBurstCount,
  });
  sim.world.events.push("destroy");
}

function applyDamageImpulse(hit: DamageContext) {
  const { block, blastRadius, bullet, y } = hit;

  block.hits++;
  block.vx = Math.min(
    block.boss ? TUNING.damage.bossSpeedCap : TUNING.damage.speedCap,
    block.vx +
      ((blastRadius ? TUNING.damage.blastImpulse : TUNING.damage.shotImpulse) /
        Math.sqrt(block.toughness)) *
        (block.boss ? TUNING.damage.bossImpulseFactor : 1),
  );
  block.vy +=
    bullet.vy * TUNING.damage.verticalImpulseFactor +
    (y / Math.max(block.height, 1)) * TUNING.damage.impactTorque;
  block.angularVelocity += clamp(
    y * TUNING.damage.spinImpulseFactor,
    TUNING.damage.minSpinImpulse,
    TUNING.damage.maxSpinImpulse,
  );
}

export interface DamageOptions {
  block: Block;
  x: number;
  y: number;
  bullet: Pick<Bullet, "vy"> & Partial<Pick<Bullet, "vx">>;
  blastRadius?: number;
  power?: number;
}

interface RemovedGlyph {
  x: number;
  y: number;
  char: string;
  color: string;
}

export interface DamageContext extends DamageOptions {
  surfaceBeforeHit: Block;
  cos: number;
  sin: number;
  radius: number;
  power: number;
  removedGlyphs: RemovedGlyph[];
}

function glyphParticle(sim: Simulation, glyph: RemovedGlyph) {
  const life =
    TUNING.particles.glyphBaseLife +
    sim.random() * TUNING.particles.glyphLifeRange;

  sim.world.particles.push({
    ...glyph,
    vx:
      TUNING.particles.glyphBaseSpeed +
      sim.random() * TUNING.particles.glyphSpeedRange,
    vy:
      (sim.random() - HALF) * TUNING.particles.glyphVerticalSpeed -
      TUNING.particles.glyphVerticalLift,
    life,
    maxLife: life,
    angle: (sim.random() - HALF) * TUNING.particles.glyphAngleRange,
  });
}

function removeGlyphs(sim: Simulation, hit: DamageContext) {
  const { block, x, y, radius, cos, sin, power } = hit;

  for (const cell of block.cells) {
    if (!cell.alive || Math.hypot(cell.x - x, cell.y - y) > radius) {
      continue;
    }

    cell.health -= power;
    if (cell.health <= 0) {
      cell.alive = false;

      const worldX = block.x + cell.x * cos - cell.y * sin;
      const worldY = block.y + cell.x * sin + cell.y * cos;
      const glyph = {
        x: worldX,
        y: worldY,
        char: cell.char,
        color: cell.color,
      };

      hit.removedGlyphs.push(glyph);
      glyphParticle(sim, glyph);
      triggerMagic(sim, { cell, worldX, worldY });
    }
  }
}
