import type { Simulation } from "./simulation";
import { extents } from "./simulation-collision";
import { clamp, SQUARED } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import {
  type Block,
  type SpecialProjectile,
  GAME_WIDTH,
} from "./simulation-types";

interface Target {
  x: number;
  y: number;
  id: number;
}

function urgentBlock(sim: Simulation) {
  let target: Block | undefined;
  let leftEdge = Infinity;
  for (const block of sim.world.blocks) {
    const extent = extents(block);
    const edge = block.x - extent.x;
    if (
      block.x + extent.x < 0 ||
      edge > GAME_WIDTH ||
      !block.cells.some((cell) => cell.alive)
    ) {
      continue;
    }
    if (edge < leftEdge) {
      leftEdge = edge;
      target = block;
    }
  }

  return target;
}

function nearestGlyph(block: Block, special: SpecialProjectile) {
  let target: Target | undefined;
  let nearest = Infinity;
  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);
  for (const cell of block.cells) {
    if (!cell.alive) {
      continue;
    }
    const x = block.x + cell.x * cos - cell.y * sin;
    const y = block.y + cell.x * sin + cell.y * cos;
    const distance = (x - special.x) ** SQUARED + (y - special.y) ** SQUARED;
    if (distance < nearest) {
      nearest = distance;
      target = { x, y, id: block.id };
    }
  }

  return target;
}

export function steerHoming(
  sim: Simulation,
  special: SpecialProjectile,
  dt: number,
) {
  // Reacquire the most urgent slab each substep, including chunks passing the player.
  const block = urgentBlock(sim);
  const target = block ? nearestGlyph(block, special) : undefined;
  special.targetId = target?.id;
  if (target) {
    const desired = Math.atan2(target.y - special.y, target.x - special.x);
    const delta = Math.atan2(
      Math.sin(desired - special.angle),
      Math.cos(desired - special.angle),
    );
    special.angle += clamp(
      delta,
      -dt * TUNING.weapon.homingTurnSpeed,
      dt * TUNING.weapon.homingTurnSpeed,
    );
  }
  special.vx = Math.cos(special.angle) * TUNING.weapon.homingSpeed;
  special.vy = Math.sin(special.angle) * TUNING.weapon.homingSpeed;
}
