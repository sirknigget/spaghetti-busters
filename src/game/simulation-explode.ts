import type { Simulation } from "./simulation";
import { damage } from "./simulation-damage";
import { burst } from "./simulation-particles";
import { damageRobot } from "./simulation-robots";
import { clamp, EXPLOSION_IMPULSE_FACTOR } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";

export interface ExplodeOptions {
  x: number;
  y: number;
  radius: number;
  power: number;
}
export function explode(
  sim: Simulation,
  { x, y, radius, power }: ExplodeOptions,
) {
  sim.world.explosions.push({ x, y, radius, life: 0.42, maxLife: 0.42 });
  sim.world.events.push("explosion");
  burst(sim, {
    x: x,
    y: y,
    color: "#8cf5cd",
    count: TUNING.particles.explosionBurstCount,
  });
  for (const hazard of sim.world.hazards) {
    if (Math.hypot(hazard.x - x, hazard.y - y) < radius) {
      hazard.life = 0;
    }
  }
  blastRobots(sim, { x, y, radius, power });
  blastBlocks(sim, { x, y, radius, power });
}

function blastRobots(sim: Simulation, { x, y, radius, power }: ExplodeOptions) {
  for (const robot of sim.world.robots) {
    const nearX = clamp(
      x,
      robot.x - TUNING.robot.halfWidth,
      robot.x + TUNING.robot.halfWidth,
    );
    const nearY = clamp(
      y,
      robot.y - TUNING.robot.halfHeight,
      robot.y + TUNING.robot.halfHeight,
    );
    if (Math.hypot(nearX - x, nearY - y) <= radius) {
      damageRobot(sim, {
        robot: robot,
        power: power,
        x: nearX,
        y: nearY,
        vx: (robot.x - x) * EXPLOSION_IMPULSE_FACTOR,
        vy: (robot.y - y) * EXPLOSION_IMPULSE_FACTOR,
      });
    }
  }
}

function blastBlocks(sim: Simulation, { x, y, radius, power }: ExplodeOptions) {
  for (const block of sim.world.blocks) {
    const cos = Math.cos(block.angle);
    const sin = Math.sin(block.angle);
    const localX = (x - block.x) * cos + (y - block.y) * sin;
    const localY = -(x - block.x) * sin + (y - block.y) * cos;
    if (
      block.cells.some(
        (cell) =>
          cell.alive && Math.hypot(cell.x - localX, cell.y - localY) <= radius,
      )
    ) {
      damage(sim, {
        block: block,
        x: localX,
        y: localY,
        bullet: { vy: (block.y - y) * EXPLOSION_IMPULSE_FACTOR },
        blastRadius: radius,
        power: power,
      });
    }
  }
}
