import type { Simulation } from "./simulation";
import { extents } from "./simulation-collision";
import { bossDriftSpeed } from "./simulation-progression";
import { clamp, HALF } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import type { Block } from "./simulation-types";
import { GAME_WIDTH } from "./simulation-types";

export function advanceAnger(sim: Simulation, block: Block, dt: number) {
  block.age += dt;
  if (block.angry) {
    block.throwTimer -= dt;
    if (block.throwTimer <= 0) {
      throwException(sim, block);
      block.throwTimer =
        Math.max(
          TUNING.timing.minExceptionDelay,
          TUNING.timing.baseExceptionDelay -
            sim.progress.wave * TUNING.timing.exceptionDelayPerWave,
        ) + sim.random();
    }
  }
}
export function limitBossVelocity(sim: Simulation, block: Block) {
  if (block.boss) {
    block.vx = clamp(
      block.vx,
      -bossDriftSpeed(sim) * TUNING.motion.bossSpeedLimitFactor,
      TUNING.motion.bossForwardSpeedCap,
    );
    block.vy = clamp(
      block.vy,
      TUNING.motion.bossMinVerticalSpeed,
      TUNING.motion.bossMaxVerticalSpeed,
    );
  }
}
export function moveBlock(sim: Simulation, block: Block, dt: number) {
  block.vx +=
    (-(block.boss ? bossDriftSpeed(sim) : sim.driftSpeed) - block.vx) *
    dt *
    TUNING.motion.horizontalResponse;
  limitBossVelocity(sim, block);
  block.vy *= Math.exp(-dt * TUNING.motion.verticalDamping);
  block.angularVelocity *= Math.exp(-dt * TUNING.motion.spinDamping);
  block.x += block.vx * dt;
  block.y += block.vy * dt;
  block.angle += block.angularVelocity * dt;
  if (Math.abs(block.angle) > TUNING.motion.maxAngle) {
    block.angle = clamp(
      block.angle,
      TUNING.motion.minAngle,
      TUNING.motion.maxAngle,
    );
    block.angularVelocity *= -0.7;
  }
}

export function checkBlockBoundary(sim: Simulation, block: Block) {
  const extent = extents(block);
  if (block.y - extent.y < TUNING.motion.topBoundary) {
    block.y = TUNING.motion.topBoundary + extent.y;
    block.vy =
      Math.abs(block.vy) * TUNING.motion.bounceRestitution +
      TUNING.motion.bounceKick;
    block.angularVelocity *= -0.7;
  }
  if (block.y + extent.y > TUNING.motion.bottomBoundary) {
    block.y = TUNING.motion.bottomBoundary - extent.y;
    block.vy =
      -Math.abs(block.vy) * TUNING.motion.bounceRestitution -
      TUNING.motion.bounceKick;
    block.angularVelocity *= -0.7;
  }
  // Spawned blocks enter naturally; only objects already moving right bounce here.
  if (
    block.vx > 0 &&
    block.x + extent.x > GAME_WIDTH - TUNING.motion.rightBoundaryPadding
  ) {
    block.x = GAME_WIDTH - TUNING.motion.rightBoundaryPadding - extent.x;
    block.vx = -block.vx * TUNING.motion.horizontalRestitution;
  }
  if (block.x + extent.x < 0) {
    sim.progress.status = "gameover";
    sim.world.events.push("gameover");

    return false;
  }

  return true;
}

export function throwException(sim: Simulation, block: Block) {
  const labels = [
    ['throw new Error("oops");'],
    ["TypeError: any is not a function"],
    ["UnhandledPromiseRejection"],
    ["RangeError: stack overflow"],
    ['throw new Error("works locally");'],
    ["NullPointerException: undefined"],
  ];
  sim.spawnBlock({
    x: block.x - block.width * HALF - TUNING.exception.spawnOffsetX,
    y: clamp(
      block.y + (sim.random() - HALF) * TUNING.exception.spawnYRange,
      TUNING.exception.spawnMinY,
      TUNING.exception.spawnMaxY,
    ),
    vx: -Math.min(
      TUNING.exception.speedCap,
      sim.driftSpeed + TUNING.exception.speedBonus,
    ),
    vy: (sim.random() - HALF) * TUNING.exception.verticalSpeedRange,
    angle: (sim.random() - HALF) * TUNING.exception.angleRange,
    exception: true,
    code: labels[Math.floor(sim.random() * labels.length)]!,
  });
  sim.world.events.push("exception");
}

interface Contact {
  nx: number;
  ny: number;
  overlap: number;
  inverseA: number;
  inverseB: number;
}

function contact(a: Block, b: Block): Contact | undefined {
  const ae = extents(a);
  if (
    b.age < TUNING.collision.minimumAge ||
    a.x > GAME_WIDTH + ae.x ||
    b.x > GAME_WIDTH + b.width * HALF
  ) {
    return undefined;
  }
  const be = extents(b);
  const overlapX = ae.x + be.x - Math.abs(b.x - a.x);
  const overlapY = ae.y + be.y - Math.abs(b.y - a.y);
  if (overlapX <= 0 || overlapY <= 0) {
    return undefined;
  }
  const horizontalDirection = b.x >= a.x ? 1 : -1;
  const verticalDirection = b.y >= a.y ? 1 : -1;
  const nx = overlapX < overlapY ? horizontalDirection : 0;
  const ny = nx === 0 ? verticalDirection : 0;

  return {
    nx,
    ny,
    overlap: Math.min(overlapX, overlapY),
    inverseA: 1 / Math.max(TUNING.collision.minimumMass, a.cells.length),
    inverseB: 1 / Math.max(TUNING.collision.minimumMass, b.cells.length),
  };
}

function impulse(a: Block, b: Block, hit: Contact) {
  const { nx, ny, inverseA, inverseB } = hit;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative >= 0) {
    return;
  }
  const magnitude =
    (TUNING.collision.impulseFactor * relative) / (inverseA + inverseB);
  a.vx -= magnitude * nx * inverseA;
  a.vy -= magnitude * ny * inverseA;
  b.vx += magnitude * nx * inverseB;
  b.vy += magnitude * ny * inverseB;
  a.angularVelocity -= relative * TUNING.collision.spinTransfer;
  b.angularVelocity += relative * TUNING.collision.spinTransfer;
}

function separate(a: Block, b: Block, hit: Contact) {
  const { nx, ny, overlap, inverseA, inverseB } = hit;
  const separation =
    (Math.max(0, overlap - TUNING.collision.penetrationSlop) *
      TUNING.collision.positionCorrection) /
    (inverseA + inverseB);
  a.x -= nx * separation * inverseA;
  a.y -= ny * separation * inverseA;
  b.x += nx * separation * inverseB;
  b.y += ny * separation * inverseB;
  impulse(a, b, hit);
}

export function collideBlocks(sim: Simulation) {
  for (let i = 0; i < sim.world.blocks.length; i++) {
    const a = sim.world.blocks[i]!;
    if (a.age < TUNING.collision.minimumAge) {
      continue;
    }
    for (let j = i + 1; j < sim.world.blocks.length; j++) {
      const b = sim.world.blocks[j]!;
      const hit = contact(a, b);
      if (hit) {
        separate(a, b, hit);
      }
    }
  }
}
