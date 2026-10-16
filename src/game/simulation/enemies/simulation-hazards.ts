import { PALETTE } from "#root/src/game/palette.ts";
import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import { segmentRectangle } from "#root/src/game/simulation/collision/simulation-collision.ts";
import { burst } from "#root/src/game/simulation/effects/simulation-particles.ts";
import {
  clamp,
  HALF,
} from "#root/src/game/simulation/common/simulation-math.ts";
import { HAZARD_DURATIONS_MS } from "#root/src/game/simulation/common/simulation-settings.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import type { TimeoutHazard } from "#root/src/game/simulation/simulation-types.ts";
import { TIMEOUT_METRICS } from "#root/src/game/simulation/simulation-types.ts";

const HAZARD_LIFETIME_SECONDS = 6;

export interface HazardOptions {
  x?: number;
  y?: number;
  durationMs?: number;
  vx?: number;
  vy?: number;
}

function hazardMotion(sim: Simulation, options: HazardOptions) {
  const x = options.x ?? TUNING.hazard.spawnX;
  const y =
    options.y ??
    clamp(
      sim.player.playerY + (sim.random() - HALF) * TUNING.hazard.spawnYRange,
      TUNING.hazard.spawnMinY,
      TUNING.hazard.spawnMaxY,
    );
  const vx =
    options.vx ??
    -Math.min(
      TUNING.hazard.speedCap,
      TUNING.hazard.baseSpeed + sim.progress.wave * TUNING.hazard.speedPerWave,
    );

  return { x, y, vx };
}

export function spawnHazard(
  sim: Simulation,
  options: HazardOptions = {},
): TimeoutHazard {
  const { x, y, vx } = hazardMotion(sim, options);
  const durationMs =
    options.durationMs ??
    HAZARD_DURATIONS_MS[
      Math.floor(sim.random() * TUNING.hazard.durationChoices)
    ]!;
  const hazard = {
    id: sim.runtime.nextId++,
    x,
    y,
    vx,
    vy:
      options.vy ??
      (sim.player.playerY - y) /
        Math.max(
          TUNING.hazard.minimumFlightTime,
          (x - TUNING.hazard.playerX) / -vx,
        ),
    durationMs,
    life: HAZARD_LIFETIME_SECONDS,
    health: 1,
    age: 0,
  };

  sim.world.hazards.push(hazard);
  sim.world.events.push("hazard");

  return hazard;
}

function stunPlayer(sim: Simulation, hazard: TimeoutHazard) {
  sim.player.stunRemaining = Math.max(
    sim.player.stunRemaining,
    hazard.durationMs / TUNING.hazard.millisecondsPerSecond,
  );
  hazard.life = 0;
  burst(sim, {
    x: TUNING.hazard.playerX,
    y: sim.player.playerY,
    color: PALETTE.particles.hazard,
    count: TUNING.particles.stunBurstCount,
  });
  sim.world.events.push("stun");
}

export function updateHazards(sim: Simulation, dt: number) {
  for (const hazard of sim.world.hazards) {
    if (hazard.life <= 0) {
      continue;
    }

    const oldX = hazard.x;
    const oldY = hazard.y;

    hazard.age += dt;
    hazard.life -= dt;
    hazard.x += hazard.vx * dt;
    hazard.y += hazard.vy * dt;
    if (
      segmentRectangle({
        ax: oldX - TUNING.hazard.playerX,
        ay: oldY - sim.player.playerY,
        bx: hazard.x - TUNING.hazard.playerX,
        by: hazard.y - sim.player.playerY,
        halfWidth: hazardHalfWidth(hazard) + TUNING.hazard.playerHitPaddingX,
        halfHeight: TUNING.hazard.playerHalfHeight,
      })
    ) {
      stunPlayer(sim, hazard);
    }

    if (hazard.x < TUNING.hazard.exitX) {
      hazard.life = 0;
    }
  }

  sim.world.hazards = sim.world.hazards.filter((hazard) => hazard.life > 0);
}

interface HitsHazardOptions {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hazard: TimeoutHazard;
}
export function hitsHazard({ ax, ay, bx, by, hazard }: HitsHazardOptions) {
  const angle = Math.atan2(hazard.vy, -hazard.vx) * TUNING.hazard.angleFactor;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local = (x: number, y: number) => ({
    x: (x - hazard.x) * cos + (y - hazard.y) * sin,
    y: -(x - hazard.x) * sin + (y - hazard.y) * cos,
  });
  const a = local(ax, ay);
  const b = local(bx, by);

  return segmentRectangle({
    ax: a.x,
    ay: a.y,
    bx: b.x,
    by: b.y,
    halfWidth: hazardHalfWidth(hazard) + TUNING.hazard.hitPadding,
    halfHeight: TIMEOUT_METRICS.height * HALF + TUNING.hazard.hitPadding,
  });
}

function hazardHalfWidth(hazard: TimeoutHazard) {
  return (
    (`await setTimeout(${hazard.durationMs});`.length *
      TIMEOUT_METRICS.charWidth +
      TIMEOUT_METRICS.widthPadding) *
    HALF
  );
}
