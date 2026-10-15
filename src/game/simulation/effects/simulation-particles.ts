import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import { FULL_TURN_RADIANS } from "#root/src/game/simulation/simulation-shared.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import {
  type Block,
  type VisualEvent,
} from "#root/src/game/simulation/simulation-types.ts";

const BURST_BASE_SPEED = 60;

interface BurstOptions {
  x: number;
  y: number;
  color: string;
  count: number;
}
export function burst(sim: Simulation, { x, y, color, count }: BurstOptions) {
  for (let i = 0; i < count; i++) {
    const angle = sim.random() * FULL_TURN_RADIANS;
    const speed =
      BURST_BASE_SPEED + sim.random() * TUNING.particles.burstSpeedRange;
    const life =
      TUNING.particles.burstBaseLife +
      sim.random() * TUNING.particles.burstLifeRange;

    sim.world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      angle,
    });
  }
}

export function visual(sim: Simulation, event: VisualEvent) {
  sim.world.visualEvents.push(event);
  if (sim.world.visualEvents.length > TUNING.bounds.visualEventCap) {
    sim.world.visualEvents.splice(
      0,
      sim.world.visualEvents.length - TUNING.bounds.visualEventCap,
    );
  }
}

export function snapshot(block: Block): Block {
  return {
    ...block,
    cells: block.cells.map((cell) => ({ ...cell })),
    fracture: block.fracture && { ...block.fracture },
  };
}
