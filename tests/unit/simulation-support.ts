import {
  Simulation,
  type Block,
  type Cell,
} from "#root/src/game/simulation/simulation.ts";

export function game() {
  return new Simulation(() => 0.5);
}

export function hitCell(sim: Simulation, block: Block, cell: Cell) {
  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);
  const x = block.x + cell.x * cos - cell.y * sin;
  const y = block.y + cell.x * sin + cell.y * cos;

  sim.world.bullets.push({
    id: 10000,
    x: x - 4,
    y,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
}
