import type { Simulation } from "./simulation";
import { snapshot, visual } from "./simulation-particles";
import { HALF } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import type { Block, Cell } from "./simulation-types";

const FRACTURE_REWARD = 50;
const FRAGMENT_THROW_DELAY_SECONDS = 3;

export function split(sim: Simulation, options: SplitOptions) {
  const { block, cells } = options;
  const horizontal =
    block.height > block.width * TUNING.split.horizontalAspectRatio;
  const sorted = [...cells].sort((a, b) =>
    horizontal ? a.y - b.y : a.x - b.x,
  );
  const middle = Math.floor(sorted.length * HALF);
  const halves = [sorted.slice(0, middle), sorted.slice(middle)];
  const cut = horizontal
    ? (sorted[middle - 1]!.y + sorted[middle]!.y) * HALF
    : (sorted[middle - 1]!.x + sorted[middle]!.x) * HALF;
  const parent = snapshot(block);
  const seed = ++sim.runtime.visualSeed;
  const plan: FracturePlan = { ...options, horizontal, cut, seed };
  sim.world.blocks = sim.world.blocks.filter((item) => item.id !== block.id);
  const children = halves.map((half, index) => {
    const child = createFragment(sim, plan, { cells: half, index });
    sim.world.blocks.push(child);

    return snapshot(child);
  });
  visual(sim, { type: "split", parent, children, seed });
  sim.progress.score += FRACTURE_REWARD;
  sim.world.events.push("split");
}

function fragmentBounds(cells: Cell[]): FragmentBounds {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));

  return {
    centerX: (minX + maxX) * HALF,
    centerY: (minY + maxY) * HALF,
    width: maxX - minX + TUNING.split.widthPadding,
    height: maxY - minY + TUNING.split.heightPadding,
  };
}

function fragmentIdentity(block: Block) {
  return {
    title: block.title,
    hits: 0,
    age: 0,
    generation: block.generation + 1,
    toughness: block.toughness,
    angry: false,
    exception: block.exception,
    throwTimer: FRAGMENT_THROW_DELAY_SECONDS,
    boss: block.boss,
    bossRoot: block.bossRoot,
    bossMinion: block.bossMinion,
  };
}

export function createFragment(
  sim: Simulation,
  plan: FracturePlan,
  part: FragmentPart,
): Block {
  const bounds = fragmentBounds(part.cells);
  const { centerX, centerY, width, height } = bounds;
  const sign = part.index === 0 ? -1 : 1;

  return {
    id: sim.runtime.nextId++,
    ...fragmentIdentity(plan.block),
    ...fragmentMotion(plan, bounds, sign),
    width,
    height,
    cells: part.cells.map((cell) => ({
      ...cell,
      x: cell.x - centerX,
      y: cell.y - centerY,
    })),
    fracture: {
      parentId: plan.block.id,
      offsetX: centerX,
      offsetY: centerY,
      axis: plan.horizontal ? "y" : "x",
      cut: plan.cut,
      side: sign,
      seed: plan.seed,
    },
  };
}

export function fragmentMotion(
  plan: FracturePlan,
  bounds: FragmentBounds,
  sign: -1 | 1,
) {
  const { block, hitX, hitY } = plan;
  const { centerX, centerY } = bounds;
  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);
  const kickX = block.boss
    ? TUNING.split.bossHorizontalKick
    : TUNING.split.horizontalKick;
  const kickY = block.boss
    ? TUNING.split.bossVerticalKick
    : TUNING.split.verticalKick;

  return {
    x: block.x + centerX * cos - centerY * sin,
    y: block.y + centerX * sin + centerY * cos,
    vx: block.vx + sign * kickX,
    vy:
      block.vy +
      sign * kickY +
      (centerY - hitY) * TUNING.split.impactVerticalFactor,
    angle: block.angle + sign * TUNING.split.angleKick,
    angularVelocity:
      block.angularVelocity +
      sign *
        (TUNING.split.spinKick +
          Math.abs(hitX) * TUNING.split.impactSpinFactor),
  };
}

export interface SplitOptions {
  block: Block;
  cells: Cell[];
  hitX: number;
  hitY: number;
}

export interface FracturePlan extends SplitOptions {
  horizontal: boolean;
  cut: number;
  seed: number;
}

export interface FragmentBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface FragmentPart {
  cells: Cell[];
  index: number;
}
