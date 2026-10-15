import { CODE_SLICES } from "#root/src/game/code/code-library.ts";
import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import {
  blockCells,
  type CellLayout,
} from "#root/src/game/simulation/blocks/simulation-block-cells.ts";
import { bossDriftSpeed } from "#root/src/game/simulation/progression/simulation-progression.ts";
import {
  bonusKeyword,
  HALF,
} from "#root/src/game/simulation/simulation-shared.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  GAME_WIDTH,
  type Block,
  type SpawnBlockOptions,
} from "#root/src/game/simulation/simulation-types.ts";

const BLOCK_TITLES = [
  "legacy-service.ts",
  "factory-factory.ts",
  "utils-final-v9.ts",
  "types-of-doom.ts",
];

interface BlockConstruction extends CellLayout {
  options: SpawnBlockOptions;
  code: string[];
}

function createBlock(sim: Simulation, construction: BlockConstruction): Block {
  const { id, width, height, toughness, options, code } = construction;

  return {
    id,
    title:
      BLOCK_TITLES[
        (sim.progress.wave + id - TUNING.block.titleOffset) %
          TUNING.block.titleCount
      ]!,
    ...blockMotion(sim, construction),
    width,
    height,
    cells: blockCells(construction, code),
    hits: 0,
    age: 0,
    generation: 0,
    toughness,
    angry: blockIsAngry(sim, options, id),
    exception: options.exception ?? false,
    throwTimer:
      TUNING.block.initialThrowDelay +
      sim.random() * TUNING.block.throwDelayRange,
    boss: options.boss ?? false,
    bossRoot: options.boss ? id : undefined,
  };
}

export function spawnBlock(
  sim: Simulation,
  options: SpawnBlockOptions = {},
): Block {
  const id = sim.runtime.nextId++;
  const code = blockCode(sim, id, options);
  const toughness = blockToughness(sim, options);
  const width =
    Math.max(...code.map((line) => line.length)) * CELL_WIDTH +
    TUNING.block.padding;
  const height = code.length * CELL_HEIGHT + TUNING.block.padding;
  const block = createBlock(sim, {
    id,
    code,
    options,
    toughness,
    width,
    height,
  });

  sim.world.blocks.push(block);

  return block;
}

const EXTRA_CODE = [
  "const retry = () => retry(retry as any);",
  "await Promise.resolve(JSON.stringify(this));",
  'if (true !== false) { eval("undefined"); }',
  "queueMicrotask(() => queueMicrotask(retry));",
  "// TODO: ticket closed as cannot reproduce",
];

export function blockCode(
  sim: Simulation,
  id: number,
  options: SpawnBlockOptions,
) {
  if (options.code) {
    return options.code;
  }

  const index =
    (sim.progress.wave * TUNING.wave.codeSequenceStride +
      id -
      TUNING.wave.codeSequenceOffset) %
    CODE_SLICES.length;
  const extra = Math.min(
    TUNING.wave.extraLineCap,
    Math.floor((sim.progress.wave - 1) * HALF),
  );
  const code = [...CODE_SLICES[index]!, ...EXTRA_CODE.slice(0, extra)];

  if (id > 1) {
    const keyword = bonusKeyword(sim.random());

    if (keyword) {
      code.push(`const ${keyword} = proxyFactory(await import("legacy"));`);
    }
  }

  return code;
}

export function blockToughness(sim: Simulation, options: SpawnBlockOptions) {
  return options.boss
    ? TUNING.block.bossBaseToughness +
        Math.max(
          0,
          Math.floor(sim.progress.wave / TUNING.wave.bossInterval) - 1,
        )
    : Math.min(
        TUNING.wave.toughnessCap,
        1 + Math.floor((sim.progress.wave - 1) / TUNING.wave.toughnessInterval),
      );
}

export interface BlockMotionOptions {
  options: SpawnBlockOptions;
  width: number;
}

function verticalSpeed(sim: Simulation) {
  return (
    (sim.random() - HALF) *
    Math.min(
      TUNING.block.verticalSpeedCap,
      TUNING.block.verticalBaseSpeed +
        sim.progress.wave * TUNING.block.verticalSpeedPerLevel,
    )
  );
}

function horizontalSpeed(sim: Simulation, options: SpawnBlockOptions) {
  return -(options.boss
    ? bossDriftSpeed(sim)
    : sim.driftSpeed + sim.random() * TUNING.block.speedRange);
}

export function blockMotion(sim: Simulation, construction: BlockMotionOptions) {
  const { options, width } = construction;

  return {
    x: options.x ?? GAME_WIDTH + width * HALF + TUNING.block.entryMargin,
    y:
      options.y ??
      TUNING.block.spawnMinY + sim.random() * TUNING.block.spawnYRange,
    vx: options.vx ?? horizontalSpeed(sim, options),
    vy: options.vy ?? verticalSpeed(sim),
    angle:
      options.angle ?? (sim.random() - HALF) * TUNING.block.initialAngleRange,
    angularVelocity: (sim.random() - HALF) * TUNING.block.initialSpinRange,
  };
}

export function blockIsAngry(
  sim: Simulation,
  options: SpawnBlockOptions,
  id: number,
): boolean {
  const canBeAngry = !options.exception && !options.boss;

  return (
    canBeAngry &&
    (options.angry ?? (id > 1 && sim.random() < TUNING.block.angryChance))
  );
}
