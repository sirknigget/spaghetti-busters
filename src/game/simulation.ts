import { spawnBlock as spawnBlockSystem } from "./simulation-block-creation";
import { spawnBonus as spawnBonusSystem } from "./simulation-bonuses";
import { spawnBoss as spawnBossSystem } from "./simulation-boss";
import { spawnHazard as spawnHazardSystem } from "./simulation-hazards";
import {
  fire as fireSystem,
  isStunned as isStunnedSystem,
  selectSpecial as selectSpecialSystem,
} from "./simulation-player";
import {
  bossHealth as bossHealthSystem,
  driftSpeed as driftSpeedSystem,
  isBossWave as isBossWaveSystem,
  waveLabel as waveLabelSystem,
  waveRemaining as waveRemainingSystem,
  waveTotal as waveTotalSystem,
} from "./simulation-progression";
import { spawnRobot as spawnRobotSystem } from "./simulation-robots";
import { fireSpecial as fireSpecialSystem } from "./simulation-specials";
import {
  PlayerState,
  ProgressState,
  RuntimeState,
  WorldState,
} from "./simulation-state";
import {
  reset as resetSystem,
  update as updateSystem,
} from "./simulation-step";
import { TUNING } from "./simulation-tuning";
import type {
  Block,
  Pickup,
  Robot,
  RobotBrand,
  SpawnBlockOptions,
  SpecialWeapon,
  TimeoutHazard,
} from "./simulation-types";

export { CODE_SLICES } from "./code-library";
export * from "./simulation-types";

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
    x = 1000,
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
