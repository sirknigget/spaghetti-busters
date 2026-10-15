import type { Simulation } from "./simulation";
import {
  advanceAnger,
  checkBlockBoundary,
  collideBlocks,
  moveBlock,
} from "./simulation-block-physics";
import { updateBoss } from "./simulation-boss";
import { updateBullet } from "./simulation-bullets";
import { updateHazards } from "./simulation-hazards";
import { advanceFreeze, advancePlayer } from "./simulation-player";
import {
  advanceCombo,
  advanceWave,
  spawnPendingBlocks,
} from "./simulation-progression";
import { updateRobots } from "./simulation-robots";
import { clamp } from "./simulation-shared";
import { updateSpecials } from "./simulation-special-update";
import {
  PlayerState,
  ProgressState,
  RuntimeState,
  WorldState,
} from "./simulation-state";
import { TUNING } from "./simulation-tuning";

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

export function step(sim: Simulation, dt: number) {
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

export function spawnTimedRobot(sim: Simulation, enemyDt: number) {
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
        24 - sim.progress.wave * TUNING.timing.robotDelayPerWave,
      ) +
      sim.random() * TUNING.timing.robotDelayRange;
  }
}
export function spawnTimedBonus(sim: Simulation, dt: number) {
  sim.runtime.bonusTimer -= dt;
  if (sim.runtime.bonusTimer <= 0) {
    sim.spawnBonus();
    sim.runtime.bonusTimer =
      TUNING.timing.baseBonusDelay +
      sim.random() * TUNING.timing.bonusDelayRange;
  }
}
export function spawnTimedHazard(sim: Simulation, enemyDt: number) {
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

export function advancePickups(sim: Simulation, dt: number) {
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
      pickup.x = 1235;
      pickup.vx = -Math.abs(pickup.vx);
    }
    if (pickup.x < TUNING.motion.pickupMinX) {
      pickup.x = 260;
      pickup.vx = Math.abs(pickup.vx);
    }
  }
  sim.world.pickups = sim.world.pickups.filter((pickup) => pickup.life > 0);
}
export function advanceProjectiles(
  sim: Simulation,
  dt: number,
  enemyDt: number,
) {
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
export function advanceParticles(sim: Simulation, dt: number) {
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
  sim.runtime.spawnTimer = 3.2;
  sim.spawnBlock({
    x: 1050,
    y: 330,
    vx: -sim.driftSpeed,
    vy: 22,
    angle: -0.035,
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
