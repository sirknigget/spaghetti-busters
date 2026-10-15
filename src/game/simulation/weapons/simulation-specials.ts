import { weaponAim } from "#root/src/game/simulation/weapons/weapon-aim.ts";
import type { Simulation } from "#root/src/game/simulation/simulation.ts";
import { extents } from "#root/src/game/simulation/collision/simulation-collision.ts";
import { damage } from "#root/src/game/simulation/blocks/simulation-damage.ts";
import { split } from "#root/src/game/simulation/blocks/simulation-fragments.ts";
import { clamp } from "#root/src/game/simulation/simulation-shared.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import {
  GAME_WIDTH,
  LINT_SMALL_BLOCK_CELLS,
} from "#root/src/game/simulation/simulation-types.ts";

const INSTANT_SPECIAL_DURATION_SECONDS = 0.8;
const REVIEW_FREEZE_SECONDS = 2;
const REVIEW_PULSE_SECONDS = 0.65;
const SPECIAL_LAUNCH_SPEED = 600;
const GRENADE_FUSE_SECONDS = 1.05;

function instantSpecial(sim: Simulation, type: "review" | "lint") {
  sim.player.specialAmmo[type]--;
  sim.runtime.specialCooldown = INSTANT_SPECIAL_DURATION_SECONDS;
  if (type === "review") {
    sim.player.freezeRemaining = REVIEW_FREEZE_SECONDS;
    sim.player.reviewPulse = REVIEW_PULSE_SECONDS;
    sim.world.events.push("review");
  } else {
    sim.player.lintPulse = INSTANT_SPECIAL_DURATION_SECONDS;
    lintBlocks(sim);
    sim.world.events.push("lint");
  }
}

function specialUnavailable(sim: Simulation): boolean {
  const type = sim.player.specialWeapon;

  return (
    sim.progress.status !== "playing" ||
    sim.isStunned ||
    sim.runtime.specialCooldown > 0 ||
    sim.player.specialAmmo[type] <= 0
  );
}

export function fireSpecial(sim: Simulation): boolean {
  const type = sim.player.specialWeapon;

  if (specialUnavailable(sim)) {
    return false;
  }

  if (type === "review" || type === "lint") {
    instantSpecial(sim, type);
  } else {
    launchSpecial(sim, type);
  }

  return true;
}

type MovingSpecial = "homing" | "grenade";

const LAUNCH = { speed: SPECIAL_LAUNCH_SPEED, fuse: GRENADE_FUSE_SECONDS };

function grenadeVelocity(sim: Simulation) {
  const x = clamp(
    sim.player.aimX,
    TUNING.weapon.grenadeMinX,
    TUNING.weapon.grenadeMaxX,
  );
  const y = clamp(
    sim.player.aimY,
    TUNING.weapon.grenadeMinY,
    TUNING.weapon.grenadeMaxY,
  );

  return {
    vx: (x - TUNING.weapon.muzzleX) / LAUNCH.fuse,
    vy:
      (y -
        sim.player.playerY -
        TUNING.weapon.ballisticHalf *
          TUNING.weapon.gravity *
          LAUNCH.fuse *
          LAUNCH.fuse) /
      LAUNCH.fuse,
  };
}

function launchVelocity(sim: Simulation, type: MovingSpecial, angle: number) {
  return type === "grenade"
    ? grenadeVelocity(sim)
    : {
        vx: Math.cos(angle) * LAUNCH.speed,
        vy: Math.sin(angle) * LAUNCH.speed,
      };
}

function launchSpecial(sim: Simulation, type: MovingSpecial) {
  const angle = weaponAim(sim.player);

  sim.world.specials.push({
    id: sim.runtime.nextId++,
    type,
    x: TUNING.weapon.muzzleX,
    y: sim.player.playerY,
    ...launchVelocity(sim, type, angle),
    angle,
    life:
      type === "homing" ? TUNING.weapon.homingLife : TUNING.weapon.grenadeLife,
    fuse: type === "grenade" ? LAUNCH.fuse : undefined,
  });
  sim.player.specialAmmo[type]--;
  sim.runtime.specialCooldown =
    type === "homing"
      ? TUNING.weapon.homingCooldown
      : TUNING.weapon.grenadeCooldown;
  sim.world.events.push(type === "homing" ? "missile" : "grenade");
}

function lintBlocks(sim: Simulation) {
  // Each original block is handled once; new halves wait for the next bomb.
  for (const block of sim.world.blocks) {
    const extent = extents(block);

    if (block.x + extent.x < 0 || block.x - extent.x > GAME_WIDTH) {
      continue;
    }

    const cells = block.cells.filter((cell) => cell.alive);

    if (cells.length > LINT_SMALL_BLOCK_CELLS) {
      split(sim, {
        block: block,
        cells: cells,
        hitX: 0,
        hitY: 0,
      });
    } else {
      // Remaining letters define size, so chipped slabs and armored fragments clear too.
      damage(sim, {
        block: block,
        x: 0,
        y: 0,
        bullet: { vy: 0 },
        blastRadius: Math.hypot(block.width, block.height),
        power: Math.max(1, ...cells.map((cell) => cell.health)),
      });
    }
  }
}
