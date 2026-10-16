import type {
  PlayerState,
  ProgressState,
  RuntimeState,
  WorldState,
} from "#root/src/game/simulation/simulation-state.ts";
import type {
  Block,
  Pickup,
  Robot,
  RobotBrand,
  SpawnBlockOptions,
  TimeoutHazard,
} from "#root/src/game/simulation/simulation-types.ts";

/** Presentation reads domain state without depending on the gameplay facade. */
export interface SimulationView {
  readonly world: WorldState;
  readonly player: PlayerState;
  readonly progress: ProgressState;
  readonly runtime: RuntimeState;
  readonly waveRemaining: number;
  readonly isBossWave: boolean;
  readonly bossHealth: { current: number; max: number } | undefined;
  readonly waveTotal: number;
  readonly isStunned: boolean;
  readonly driftSpeed: number;
  readonly waveLabel: string;
}

export interface RobotSpawnOptions {
  x?: number;
  y?: number;
  brand?: RobotBrand;
}
export interface HazardOptions {
  x?: number;
  y?: number;
  durationMs?: number;
  vx?: number;
  vy?: number;
}

/** State and domain commands available to focused gameplay systems. */
export interface SimulationContext extends SimulationView {
  world: WorldState;
  player: PlayerState;
  progress: ProgressState;
  runtime: RuntimeState;
  random(): number;
  spawnBlock(options?: SpawnBlockOptions): Block;
  spawnBoss(): Block;
  spawnRobot(options?: RobotSpawnOptions): Robot;
  spawnBonus(type?: Pickup["type"], x?: number, y?: number): Pickup;
  spawnHazard(options?: HazardOptions): TimeoutHazard;
}
