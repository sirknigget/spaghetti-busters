import { spawnBlock as spawnBlockSystem } from "#root/src/game/simulation/blocks/simulation-block-creation.ts";
import { spawnBonus as spawnBonusSystem } from "#root/src/game/simulation/progression/simulation-bonuses.ts";
import { spawnBoss as spawnBossSystem } from "#root/src/game/simulation/progression/simulation-boss.ts";
import { spawnHazard as spawnHazardSystem } from "#root/src/game/simulation/enemies/simulation-hazards.ts";
import {
  fire as fireSystem,
  isStunned as isStunnedSystem,
  selectSpecial as selectSpecialSystem,
} from "#root/src/game/simulation/weapons/simulation-player.ts";
import {
  bossHealth as bossHealthSystem,
  driftSpeed as driftSpeedSystem,
  isBossWave as isBossWaveSystem,
  waveLabel as waveLabelSystem,
  waveRemaining as waveRemainingSystem,
  waveTotal as waveTotalSystem,
} from "#root/src/game/simulation/progression/simulation-progression.ts";
import { spawnRobot as spawnRobotSystem } from "#root/src/game/simulation/enemies/simulation-robots.ts";
import { fireSpecial as fireSpecialSystem } from "#root/src/game/simulation/weapons/simulation-specials.ts";
import {
  PlayerState,
  ProgressState,
  RuntimeState,
  WorldState,
} from "#root/src/game/simulation/simulation-state.ts";
import {
  reset as resetSystem,
  update as updateSystem,
} from "#root/src/game/simulation/runtime/simulation-step.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import type {
  Block,
  Pickup,
  Robot,
  RobotBrand,
  SpawnBlockOptions,
  SpecialWeapon,
  TimeoutHazard,
} from "#root/src/game/simulation/simulation-types.ts";

const BONUS_START_X = 1000;

export * from "#root/src/game/simulation/simulation-types.ts";

/** Deterministic gameplay facade; systems own updates and state groups own data. */
export class Simulation {
  world = new WorldState();
  player = new PlayerState();
  progress = new ProgressState();
  runtime = new RuntimeState();

  constructor(readonly random: () => number = Math.random) {
    this.reset();
  }

  get waveRemaining() {
    return waveRemainingSystem(this);
  }

  get isBossWave() {
    return isBossWaveSystem(this);
  }

  get bossHealth(): { current: number; max: number } | undefined {
    return bossHealthSystem(this);
  }

  get waveTotal() {
    return waveTotalSystem(this);
  }

  get isStunned() {
    return isStunnedSystem(this);
  }

  get driftSpeed() {
    return driftSpeedSystem(this);
  }

  get waveLabel() {
    return waveLabelSystem(this);
  }

  reset() {
    return resetSystem(this);
  }

  spawnBlock(options: SpawnBlockOptions = {}): Block {
    return spawnBlockSystem(this, options);
  }

  spawnBoss(): Block {
    return spawnBossSystem(this);
  }

  fire(): boolean {
    return fireSystem(this);
  }

  selectSpecial(type: SpecialWeapon) {
    return selectSpecialSystem(this, type);
  }

  fireSpecial(): boolean {
    return fireSpecialSystem(this);
  }

  spawnRobot(
    options: { x?: number; y?: number; brand?: RobotBrand } = {},
  ): Robot {
    return spawnRobotSystem(this, options);
  }

  spawnBonus(
    type?: Pickup["type"],
    x = BONUS_START_X,
    y: number = TUNING.bonus.spawnMinY +
      this.random() * TUNING.bonus.spawnYRange,
  ): Pickup {
    return spawnBonusSystem(this, { type, x, y });
  }

  spawnHazard(
    options: {
      x?: number;
      y?: number;
      durationMs?: number;
      vx?: number;
      vy?: number;
    } = {},
  ): TimeoutHazard {
    return spawnHazardSystem(this, options);
  }

  update(dt: number) {
    return updateSystem(this, dt);
  }
}
