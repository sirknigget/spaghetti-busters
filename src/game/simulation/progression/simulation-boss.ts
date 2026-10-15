import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import { bossDriftSpeed } from "#root/src/game/simulation/progression/simulation-progression.ts";
import { clamp, HALF } from "#root/src/game/simulation/simulation-shared.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import { type Block } from "#root/src/game/simulation/simulation-types.ts";

const BOSS_START_X = 1300;
const BOSS_START_Y = 370;
const BOSS_INITIAL_VERTICAL_SPEED = 8;
const BOSS_INITIAL_ANGLE = -0.015;
const BOSS_INITIAL_SPIN = 0.008;
const BOSS_INITIAL_SPAWN_DELAY_SECONDS = 4;

export function spawnBoss(sim: Simulation): Block {
  const existing = sim.world.blocks.find(
    (block) => block.boss && block.bossRoot === sim.runtime.activeBossRoot,
  );

  if (existing) {
    return existing;
  }

  const boss = sim.spawnBlock({
    boss: true,
    x: BOSS_START_X,
    y: BOSS_START_Y,
    vx: -bossDriftSpeed(sim),
    vy: BOSS_INITIAL_VERTICAL_SPEED,
    angle: BOSS_INITIAL_ANGLE,
    code: [...BOSS_CODE],
  });

  boss.title = "FactoryFactoryFactory";
  boss.angularVelocity = BOSS_INITIAL_SPIN;
  sim.runtime.pendingBlocks = 0;
  sim.runtime.activeBossRoot = boss.id;
  sim.runtime.bossMaxHealth = boss.cells.reduce(
    (health, cell) => health + cell.maxHealth,
    0,
  );
  sim.runtime.bossSpawnTimer = BOSS_INITIAL_SPAWN_DELAY_SECONDS;
  sim.runtime.bossRewarded = false;
  sim.world.robots = [];
  sim.world.hazards = [];
  sim.world.events.push("boss");

  return boss;
}

function bossProductionBlocked(sim: Simulation, dt: number): boolean {
  sim.runtime.bossSpawnTimer -= dt;

  return dt <= 0 || sim.runtime.bossSpawnTimer > 0;
}

export function updateBoss(sim: Simulation, dt: number) {
  if (sim.runtime.activeBossRoot === undefined || sim.runtime.bossRewarded) {
    return;
  }

  const fragments = sim.world.blocks.filter(
    (block) => block.boss && block.bossRoot === sim.runtime.activeBossRoot,
  );

  if (fragments.length === 0) {
    rewardBoss(sim);

    return;
  }

  if (bossProductionBlocked(sim, dt)) {
    return;
  }

  const minions = sim.world.blocks.filter(
    (block) =>
      block.bossMinion && block.bossRoot === sim.runtime.activeBossRoot,
  );

  // One timer for the original factory: fragmentation cannot multiply production.
  if (minions.length >= TUNING.boss.minionCap) {
    sim.runtime.bossSpawnTimer = 1;

    return;
  }

  spawnBossMinion(sim, fragments);
  sim.runtime.bossSpawnTimer = Math.max(
    TUNING.boss.minSpawnDelay,
    TUNING.boss.baseSpawnDelay -
      Math.floor(sim.progress.wave / TUNING.wave.bossInterval) *
        TUNING.boss.spawnAcceleration,
  );
  sim.world.events.push("boss-spawn");
}

export function rewardBoss(sim: Simulation) {
  sim.runtime.bossRewarded = true;
  sim.progress.score +=
    TUNING.boss.baseReward +
    Math.floor(sim.progress.wave / TUNING.wave.bossInterval) *
      TUNING.boss.rewardPerTier;
  sim.spawnBonus(
    "quint",
    TUNING.boss.primaryRewardX,
    TUNING.boss.primaryRewardY,
  );
  sim.spawnBonus(
    "lint",
    TUNING.boss.specialRewardX,
    TUNING.boss.specialRewardY,
  );
  sim.world.events.push("boss-defeated");
}

export function spawnBossMinion(sim: Simulation, fragments: Block[]) {
  const source = fragments.reduce(
    (largest, block) =>
      block.cells.length > largest.cells.length ? block : largest,
    fragments[0]!,
  );
  const code =
    MINION_CODE[Math.floor(sim.random() * TUNING.boss.minionPatterns)]!;
  const minion = sim.spawnBlock({
    x: clamp(
      source.x - source.width * HALF - TUNING.boss.minionGap,
      TUNING.boss.minionMinX,
      TUNING.boss.minionMaxX,
    ),
    y: clamp(
      source.y + (sim.random() - HALF) * TUNING.boss.minionYRange,
      TUNING.boss.minionMinY,
      TUNING.boss.minionMaxY,
    ),
    vx: -Math.min(TUNING.boss.minionSpeedCap, sim.driftSpeed),
    vy: (sim.random() - HALF) * TUNING.boss.minionVerticalSpeed,
    angle: (sim.random() - HALF) * TUNING.boss.minionAngleRange,
    angry: false,
    code,
  });

  minion.title = "factory-generated.ts";
  minion.bossMinion = true;
  minion.bossRoot = sim.runtime.activeBossRoot;
}

export const BOSS_CODE = [
  "export class FactoryFactoryFactory<T extends Record<string, any>> {",
  "  private factories = new WeakMap<object, Promise<FactoryFactory<T>>>();",
  "  async createFactoryFactoryFactory(input: T): Promise<any> {",
  "    const recursive = new Proxy(JSON.parse(JSON.stringify(input)), {",
  "      get: (target, key) => Reflect.get(target, key) ?? recursive",
  "    }); // architecture approved by the architecture factory",
  "    const factory = await Promise.resolve().then(async () => {",
  "      return new Promise(async (resolveFactory, rejectFactory) => {",
  "        for (const key of Object.keys(recursive).sort().reverse()) {",
  "          const clone = JSON.parse(JSON.stringify(recursive[key]));",
  "          await Promise.resolve().then(() => Promise.resolve(clone));",
  "          resolveFactory(() => () => () => eval(JSON.stringify(clone)));",
  '        } rejectFactory(new Error("FactoryFactoryFactoryFactory"));',
  "      }); // TODO: inject a factory factory to test this factory",
  "    }); return factory instanceof Promise ? await factory : factory;",
  "  } } // generated 4,096 more services; complexity is a feature",
];

export const MINION_CODE = [
  [
    "const service = factory(factory(input));",
    'return service.map((x: any) => eval("x"));',
    "// TODO: extract another microservice",
  ],
  [
    "async function minionFactory(x: any) {",
    "  return await Promise.resolve(() => x);",
    "} // generated without any tests",
  ],
  [
    "const dependency = new Proxy({}, {});",
    "export default () => () => dependency;",
    "// infinite scalability, finite uptime",
  ],
];
