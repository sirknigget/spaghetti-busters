import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import {
  advanceAnger,
  checkBlockBoundary,
  collideBlocks,
  moveBlock,
} from "#root/src/game/simulation/blocks/simulation-block-physics.ts";
import { updateBoss } from "#root/src/game/simulation/progression/simulation-boss.ts";
import { updateBullet } from "#root/src/game/simulation/weapons/simulation-bullets.ts";
import { updateHazards } from "#root/src/game/simulation/enemies/simulation-hazards.ts";
import {
  advanceFreeze,
  advancePlayer,
} from "#root/src/game/simulation/weapons/simulation-player.ts";
import {
  advanceCombo,
  advanceWave,
  spawnPendingBlocks,
} from "#root/src/game/simulation/progression/simulation-progression.ts";
import { updateRobots } from "#root/src/game/simulation/enemies/simulation-robots.ts";
import { clamp } from "#root/src/game/simulation/common/simulation-math.ts";
import { updateSpecials } from "#root/src/game/simulation/weapons/simulation-special-update.ts";
import {
  PlayerState,
  ProgressState,
  RuntimeState,
  WorldState,
} from "#root/src/game/simulation/simulation-state.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";

const BASE_ROBOT_DELAY_SECONDS = 24;
const INITIAL_BLOCK_DELAY_SECONDS = 3.2;
const INITIAL_BLOCK_X = 1050;
const INITIAL_BLOCK_Y = 330;
const INITIAL_BLOCK_VERTICAL_SPEED = 22;
const INITIAL_BLOCK_ANGLE = -0.035;

function advanceBlocks(sim: Simulation, dt: number) {
  if (dt <= 0) {
    return true;
  }

  // Snapshot: newly thrown exceptions wait until the next simulation step.
  const existing = sim.world.blocks.slice();

  for (const block of existing) {
    advanceAnger(sim, block, dt);
    moveBlock(sim, block, dt);
    if (!checkBlockBoundary(sim, block)) {
      return false;
    }
  }

  return true;
}

function step(sim: Simulation, dt: number) {
  advancePlayer(sim, dt);

  const enemyDt = advanceFreeze(sim, dt);

  spawnTimedRobot(sim, enemyDt);
  spawnTimedBonus(sim, dt);
  spawnTimedHazard(sim, enemyDt);
  advanceCombo(sim, dt);
  spawnPendingBlocks(sim, enemyDt);
  advanceWave(sim, dt);
  if (!advanceBlocks(sim, enemyDt)) {
    return;
  }

  if (enemyDt > 0) {
    collideBlocks(sim);
    updateRobots(sim, enemyDt);
    updateHazards(sim, enemyDt);
  }

  updateSpecials(sim, dt);
  advancePickups(sim, dt);
  advanceProjectiles(sim, dt, enemyDt);
  advanceParticles(sim, dt);
}

function spawnTimedRobot(sim: Simulation, enemyDt: number) {
  sim.runtime.robotTimer -= enemyDt;
  if (
    !sim.isBossWave &&
    enemyDt > 0 &&
    sim.runtime.robotTimer <= 0 &&
    sim.world.robots.length === 0
  ) {
    sim.spawnRobot();
    sim.runtime.robotTimer =
      Math.max(
        TUNING.timing.minRobotDelay,
        BASE_ROBOT_DELAY_SECONDS -
          sim.progress.wave * TUNING.timing.robotDelayPerWave,
      ) +
      sim.random() * TUNING.timing.robotDelayRange;
  }
}

function spawnTimedBonus(sim: Simulation, dt: number) {
  sim.runtime.bonusTimer -= dt;
  if (sim.runtime.bonusTimer <= 0) {
    sim.spawnBonus();
    sim.runtime.bonusTimer =
      TUNING.timing.baseBonusDelay +
      sim.random() * TUNING.timing.bonusDelayRange;
  }
}

function spawnTimedHazard(sim: Simulation, enemyDt: number) {
  sim.runtime.hazardTimer -= enemyDt;
  if (!sim.isBossWave && enemyDt > 0 && sim.runtime.hazardTimer <= 0) {
    sim.spawnHazard();
    sim.runtime.hazardTimer =
      Math.max(
        TUNING.timing.minHazardDelay,
        TUNING.timing.baseHazardDelay -
          sim.progress.wave * TUNING.timing.hazardDelayPerWave,
      ) +
      sim.random() * TUNING.timing.hazardDelayRange;
  }
}

function advancePickups(sim: Simulation, dt: number) {
  for (const pickup of sim.world.pickups) {
    pickup.age += dt;
    pickup.life -= dt;
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    if (pickup.y < TUNING.bonus.minimumY || pickup.y > TUNING.bonus.maximumY) {
      pickup.y = clamp(pickup.y, TUNING.bonus.minimumY, TUNING.bonus.maximumY);
      pickup.vy *= -1;
    }

    if (pickup.x > TUNING.motion.pickupMaxX) {
      pickup.x = TUNING.motion.pickupMaxX;
      pickup.vx = -Math.abs(pickup.vx);
    }

    if (pickup.x < TUNING.motion.pickupMinX) {
      pickup.x = TUNING.motion.pickupMinX;
      pickup.vx = Math.abs(pickup.vx);
    }
  }

  sim.world.pickups = sim.world.pickups.filter((pickup) => pickup.life > 0);
}

function advanceProjectiles(sim: Simulation, dt: number, enemyDt: number) {
  for (const bullet of sim.world.bullets) {
    updateBullet(sim, bullet, dt);
  }

  updateBoss(sim, enemyDt);
  sim.world.bullets = sim.world.bullets.filter(
    (bullet) =>
      bullet.life > 0 &&
      bullet.x < TUNING.bounds.bulletMaxX &&
      bullet.y > TUNING.bounds.bulletMinY &&
      bullet.y < TUNING.bounds.bulletMaxY,
  );
  sim.world.pickups = sim.world.pickups.filter((pickup) => pickup.life > 0);
  sim.world.hazards = sim.world.hazards.filter((hazard) => hazard.life > 0);
}

function advanceParticles(sim: Simulation, dt: number) {
  for (const particle of sim.world.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += TUNING.particles.gravity * dt;
    particle.vx *= Math.exp(-dt * TUNING.particles.horizontalDamping);
    particle.angle += dt * particle.vx * TUNING.particles.spinFactor;
  }

  sim.world.particles = sim.world.particles
    .filter((particle) => particle.life > 0)
    .slice(TUNING.particles.capacity);
}

export function reset(sim: Simulation) {
  sim.world = new WorldState();
  sim.player = new PlayerState();
  sim.progress = new ProgressState();
  sim.runtime = new RuntimeState();
  sim.runtime.pendingBlocks = sim.waveTotal - 1;
  sim.runtime.spawnTimer = INITIAL_BLOCK_DELAY_SECONDS;
  sim.spawnBlock({
    x: INITIAL_BLOCK_X,
    y: INITIAL_BLOCK_Y,
    vx: -sim.driftSpeed,
    vy: INITIAL_BLOCK_VERTICAL_SPEED,
    angle: INITIAL_BLOCK_ANGLE,
  });
}

export function update(sim: Simulation, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0 || sim.progress.status !== "playing") {
    return;
  }

  // Fixed-size substeps prevent tunneling and unstable impulses on slow devices.
  let remaining = Math.min(dt, TUNING.timing.maxFrameDelta);

  while (remaining > 0 && sim.progress.status === "playing") {
    const substep = Math.min(remaining, 1 / TUNING.timing.simulationHz);

    step(sim, substep);
    remaining -= substep;
  }
}
