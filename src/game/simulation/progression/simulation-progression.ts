import type { SimulationContext } from "#root/src/game/simulation/common/simulation-context.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";

const BOSS_INITIAL_SPAWN_DELAY_SECONDS = 4;

export function waveTotal(sim: SimulationContext) {
  return sim.isBossWave
    ? 1
    : Math.min(
        TUNING.wave.blockCountCap,
        TUNING.wave.initialBlockCount +
          Math.floor((sim.progress.wave - 1) * TUNING.wave.blocksPerLevel),
      );
}

export function isBossWave(sim: SimulationContext) {
  return sim.progress.wave % TUNING.wave.bossInterval === 0;
}

export function bossHealth(
  sim: SimulationContext,
): { current: number; max: number } | undefined {
  if (sim.runtime.activeBossRoot === undefined || sim.runtime.bossRewarded) {
    return undefined;
  }

  const fragments = sim.world.blocks.filter(
    (block) => block.boss && block.bossRoot === sim.runtime.activeBossRoot,
  );

  if (fragments.length === 0) {
    return undefined;
  }

  const current = fragments.reduce(
    (health, block) =>
      health +
      block.cells.reduce(
        (sum, cell) => sum + (cell.alive ? Math.max(0, cell.health) : 0),
        0,
      ),
    0,
  );

  return { current, max: sim.runtime.bossMaxHealth };
}

export function bossDriftSpeed(sim: SimulationContext) {
  return Math.min(
    TUNING.wave.bossSpeedCap,
    TUNING.wave.bossBaseSpeed +
      Math.floor(sim.progress.wave / TUNING.wave.bossInterval) *
        TUNING.wave.bossSpeedPerTier,
  );
}

export function driftSpeed(sim: SimulationContext) {
  return Math.min(
    TUNING.wave.speedCap,
    TUNING.wave.baseSpeed +
      sim.progress.wave * TUNING.wave.speedPerLevel +
      sim.progress.wave * sim.progress.wave * TUNING.wave.speedAcceleration,
  );
}

export function waveRemaining(sim: SimulationContext) {
  return sim.world.blocks.length + sim.runtime.pendingBlocks;
}

export function waveLabel(sim: SimulationContext) {
  return `WAVE ${String(sim.progress.wave).padStart(TUNING.wave.labelDigits, "0")}`;
}

export function advanceCombo(sim: SimulationContext, dt: number) {
  sim.runtime.comboTimer -= dt;
  if (sim.runtime.comboTimer <= 0) {
    sim.progress.combo = 0;
  }
}

export function spawnPendingBlocks(sim: SimulationContext, enemyDt: number) {
  sim.runtime.spawnTimer -= enemyDt;
  if (
    enemyDt > 0 &&
    sim.runtime.pendingBlocks > 0 &&
    sim.runtime.spawnTimer <= 0 &&
    sim.world.blocks.length < TUNING.bounds.blockCap
  ) {
    if (sim.isBossWave) {
      sim.spawnBoss();
    } else {
      sim.spawnBlock();
      sim.runtime.pendingBlocks--;
    }

    sim.runtime.spawnTimer = Math.max(
      TUNING.timing.minBlockDelay,
      TUNING.timing.baseBlockDelay -
        sim.progress.wave * TUNING.timing.blockDelayPerWave,
    );
  }
}

export function advanceWave(sim: SimulationContext, dt: number) {
  if (sim.world.blocks.length === 0 && sim.runtime.pendingBlocks === 0) {
    sim.runtime.waveTimer += dt;
    if (sim.runtime.waveTimer > 1.0) {
      sim.progress.wave++;
      sim.runtime.activeBossRoot = undefined;
      sim.runtime.bossMaxHealth = 0;
      sim.runtime.bossRewarded = false;
      sim.runtime.bossSpawnTimer = BOSS_INITIAL_SPAWN_DELAY_SECONDS;
      if (sim.isBossWave) {
        sim.world.robots = [];
        sim.world.hazards = [];
      }

      sim.progress.score += TUNING.timing.waveReward * (sim.progress.wave - 1);
      sim.runtime.pendingBlocks = sim.waveTotal;
      sim.runtime.spawnTimer = 0;
      sim.runtime.waveTimer = 0;
      sim.world.events.push("wave");
    }
  } else {
    sim.runtime.waveTimer = 0;
  }
}
