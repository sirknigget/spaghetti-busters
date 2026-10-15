import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import type { Segment } from "#root/src/game/simulation/blocks/simulation-collision.ts";
import { segmentDistance } from "#root/src/game/simulation/blocks/simulation-collision.ts";
import { explode } from "#root/src/game/simulation/blocks/simulation-explode.ts";
import {
  interceptRobot,
  robotContact,
} from "#root/src/game/simulation/enemies/simulation-robots.ts";
import {
  clamp,
  withinProjectileBounds,
} from "#root/src/game/simulation/simulation-shared.ts";
import { steerHoming } from "#root/src/game/simulation/weapons/simulation-steer-homing.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import {
  SPECIAL_BLASTS,
  type Block,
  type SpecialProjectile,
} from "#root/src/game/simulation/simulation-types.ts";

const GRENADE_BOUNCE_RESTITUTION = -0.65;

function specialHitsRobot(
  sim: Simulation,
  special: SpecialProjectile,
  travel: Segment,
) {
  const robot = interceptRobot(sim, travel);

  if (!robot) {
    return false;
  }

  const contact = robotContact({ robot, ...travel });
  const blast = SPECIAL_BLASTS[special.type];

  explode(sim, { x: contact.x, y: contact.y, ...blast });
  special.life = 0;

  return true;
}

function grenadeFuseExpired(special: SpecialProjectile): boolean {
  return special.type === "grenade" && (special.fuse ?? 0) <= 0;
}

export function updateSpecial(
  sim: Simulation,
  special: SpecialProjectile,
  dt: number,
) {
  special.life -= dt;
  if (special.life <= 0) {
    return;
  }

  const oldX = special.x;
  const oldY = special.y;

  moveSpecial(sim, special, dt);

  const travel = { ax: oldX, ay: oldY, bx: special.x, by: special.y };

  if (specialHitsRobot(sim, special, travel)) {
    return;
  }

  const collision = sim.world.blocks.some((block) =>
    specialHitsBlock({ block, special, oldX, oldY }),
  );

  if (collision || grenadeFuseExpired(special)) {
    explode(sim, {
      x: special.x,
      y: special.y,
      ...SPECIAL_BLASTS[special.type],
    });
    special.life = 0;
  }
}

export function updateSpecials(sim: Simulation, dt: number) {
  for (const explosion of sim.world.explosions) {
    explosion.life -= dt;
  }

  sim.world.explosions = sim.world.explosions.filter(
    (explosion) => explosion.life > 0,
  );
  for (const special of sim.world.specials) {
    updateSpecial(sim, special, dt);
  }

  sim.world.specials = sim.world.specials.filter(
    (special) => special.life > 0 && withinProjectileBounds(special),
  );
}

export function moveSpecial(
  sim: Simulation,
  special: SpecialProjectile,
  dt: number,
) {
  if (special.type === "homing") {
    steerHoming(sim, special, dt);
  } else {
    special.vy += TUNING.weapon.gravity * dt;
    special.angle += dt * TUNING.weapon.grenadeSpinSpeed;
    special.fuse = (special.fuse ?? 0) - dt;
  }

  special.x += special.vx * dt;
  special.y += special.vy * dt;
  if (
    special.type === "grenade" &&
    (special.y < TUNING.weapon.grenadeFloorMin ||
      special.y > TUNING.weapon.grenadeFloorMax)
  ) {
    special.y = clamp(
      special.y,
      TUNING.weapon.grenadeFloorMin,
      TUNING.weapon.grenadeFloorMax,
    );
    special.vy *= GRENADE_BOUNCE_RESTITUTION;
  }
}

interface SpecialHitsBlockOptions {
  block: Block;
  special: SpecialProjectile;
  oldX: number;
  oldY: number;
}
export function specialHitsBlock({
  block,
  special,
  oldX,
  oldY,
}: SpecialHitsBlockOptions): boolean {
  if (
    Math.abs(block.x - special.x) >
      block.width + TUNING.weapon.specialBroadphaseX ||
    Math.abs(block.y - special.y) >
      block.height + TUNING.weapon.specialBroadphaseY
  ) {
    return false;
  }

  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);
  const ax = (oldX - block.x) * cos + (oldY - block.y) * sin;
  const ay = -(oldX - block.x) * sin + (oldY - block.y) * cos;
  const bx = (special.x - block.x) * cos + (special.y - block.y) * sin;
  const by = -(special.x - block.x) * sin + (special.y - block.y) * cos;

  return block.cells.some(
    (cell) =>
      cell.alive &&
      segmentDistance({
        ax,
        ay,
        bx,
        by,
        px: cell.x,
        py: cell.y,
      }) < TUNING.weapon.specialHitRadius,
  );
}
