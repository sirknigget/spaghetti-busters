import { PALETTE } from "./palette";
import type { Simulation } from "./simulation";
import { collectPickup } from "./simulation-bonuses";
import type { Segment } from "./simulation-collision";
import { segmentDistance } from "./simulation-collision";
import { damage } from "./simulation-damage";
import { hitsHazard } from "./simulation-hazards";
import { burst } from "./simulation-particles";
import { damageRobot, interceptRobot, robotContact } from "./simulation-robots";
import { HALF } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import type { Block, Bullet } from "./simulation-types";

const HAZARD_DESTRUCTION_REWARD = 60;

export function updateBullet(sim: Simulation, bullet: Bullet, dt: number) {
  bullet.life -= dt;

  const oldX = bullet.x;
  const oldY = bullet.y;

  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;

  const travel = { ax: oldX, ay: oldY, bx: bullet.x, by: bullet.y };
  const hit =
    bulletHitsRobot(sim, bullet, travel) ||
    bulletHitsHazard(sim, travel) ||
    bulletHitsPickup(sim, travel) ||
    bulletHitsBlock(sim, bullet, travel);

  if (hit) {
    bullet.life = 0;
  }
}

export function blockSegment(block: Block, travel: Segment): Segment {
  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);

  return {
    ax: (travel.ax - block.x) * cos + (travel.ay - block.y) * sin,
    ay: -(travel.ax - block.x) * sin + (travel.ay - block.y) * cos,
    bx: (travel.bx - block.x) * cos + (travel.by - block.y) * sin,
    by: -(travel.bx - block.x) * sin + (travel.by - block.y) * cos,
  };
}

function outsideBlock(block: Block, travel: Segment) {
  const { ax, ay, bx, by } = travel;

  return (
    Math.max(ax, bx) < -block.width * HALF - TUNING.weapon.bulletBroadphaseX ||
    Math.min(ax, bx) > block.width * HALF + TUNING.weapon.bulletBroadphaseX ||
    Math.max(ay, by) < -block.height * HALF - TUNING.weapon.bulletBroadphaseY ||
    Math.min(ay, by) > block.height * HALF + TUNING.weapon.bulletBroadphaseY
  );
}

function hitCell(block: Block, travel: Segment) {
  const local = blockSegment(block, travel);

  if (outsideBlock(block, local)) {
    return undefined;
  }

  return block.cells.find(
    (item) =>
      item.alive &&
      segmentDistance({
        ...local,
        px: item.x,
        py: item.y,
      }) < TUNING.weapon.bulletHitRadius,
  );
}

export function bulletHitsBlock(
  sim: Simulation,
  bullet: Bullet,
  travel: Segment,
) {
  // Ascending distance ensures the frontmost block absorbs each projectile.
  const candidates = [...sim.world.blocks].sort((a, b) => a.x - b.x);

  for (const block of candidates) {
    const cell = hitCell(block, travel);

    if (cell) {
      damage(sim, { block, x: cell.x, y: cell.y, bullet });

      return true;
    }
  }

  return false;
}

export function bulletHitsRobot(
  sim: Simulation,
  bullet: Bullet,
  travel: Segment,
) {
  const robot = interceptRobot(sim, travel);

  if (!robot) {
    return false;
  }

  const contact = robotContact({ robot, ...travel });

  damageRobot(sim, {
    robot,
    power: 1,
    x: contact.x,
    y: contact.y,
    vx: bullet.vx,
    vy: bullet.vy,
  });

  return true;
}

export function bulletHitsHazard(sim: Simulation, travel: Segment) {
  const hazard = sim.world.hazards.find(
    (candidate) =>
      candidate.life > 0 && hitsHazard({ ...travel, hazard: candidate }),
  );

  if (!hazard) {
    return false;
  }

  hazard.life = 0;
  sim.progress.score += HAZARD_DESTRUCTION_REWARD;
  burst(sim, {
    x: hazard.x,
    y: hazard.y,
    color: PALETTE.particles.bullet,
    count: TUNING.particles.hazardBurstCount,
  });
  sim.world.events.push("hit");

  return true;
}

export function bulletHitsPickup(sim: Simulation, travel: Segment) {
  const pickup = sim.world.pickups.find(
    (candidate) =>
      candidate.life > 0 &&
      candidate.age > TUNING.bonus.collectionDelay &&
      segmentDistance({ ...travel, px: candidate.x, py: candidate.y }) <
        TUNING.bonus.hitRadius,
  );

  if (!pickup) {
    return false;
  }

  collectPickup(sim, pickup);

  return true;
}
