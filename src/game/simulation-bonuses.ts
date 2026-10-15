import type { Simulation } from "./simulation";
import { burst } from "./simulation-particles";
import {
  AMMO_CAPACITY_MULTIPLIER,
  bonusType,
  HALF,
  HOMING_AMMO_PER_PICKUP,
} from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import {
  type Cell,
  type Pickup,
  type SpecialWeapon,
  type Weapon,
  PRIMARY_AMMO,
  SPECIAL_AMMO_CAPS,
} from "./simulation-types";

interface SpawnBonusOptions {
  type?: Pickup["type"];
  x?: number;
  y?: number;
}
export function spawnBonus(
  sim: Simulation,
  {
    type,
    x = 1000,
    y = TUNING.bonus.spawnMinY + sim.random() * TUNING.bonus.spawnYRange,
  }: SpawnBonusOptions,
): Pickup {
  // Specials dominate bonus drops; four/five-shot primaries remain the rarest prizes.
  const roll = sim.random();
  const chosen = type ?? bonusType(roll);
  const pickup: Pickup = {
    id: sim.runtime.nextId++,
    x,
    y,
    vx: TUNING.bonus.driftSpeed - sim.random() * TUNING.bonus.speedRange,
    vy: (sim.random() > HALF ? 1 : -1) * TUNING.bonus.verticalSpeed,
    type: chosen,
    life: 15,
    age: 0,
  };
  sim.world.pickups.push(pickup);
  sim.world.events.push("bonus");

  return pickup;
}

export function collectPickup(sim: Simulation, pickup: Pickup) {
  if (pickup.type in SPECIAL_AMMO_CAPS) {
    // SAFETY: Every key in SPECIAL_AMMO_CAPS is a SpecialWeapon.
    const type = pickup.type as SpecialWeapon;
    sim.player.specialAmmo[type] = Math.min(
      SPECIAL_AMMO_CAPS[type],
      sim.player.specialAmmo[type] +
        (type === "homing" ? HOMING_AMMO_PER_PICKUP : 1),
    );
  } else {
    // SAFETY: Pickup types outside SPECIAL_AMMO_CAPS are the four upgraded primary weapons.
    const type = pickup.type as Exclude<Weapon, "single">;
    sim.player.ammo = Math.min(
      PRIMARY_AMMO[type] * AMMO_CAPACITY_MULTIPLIER,
      (sim.player.weapon === type ? sim.player.ammo : 0) + PRIMARY_AMMO[type],
    );
    sim.player.weapon = type;
  }
  pickup.life = 0;
  sim.progress.score += 100;
  burst(sim, {
    x: pickup.x,
    y: pickup.y,
    color: "#ffe270",
    count: TUNING.particles.pickupBurstCount,
  });
  sim.world.events.push("pickup");
}

interface TriggerMagicOptions {
  cell: Cell;
  worldX: number;
  worldY: number;
}
export function triggerMagic(
  sim: Simulation,
  { cell, worldX, worldY }: TriggerMagicOptions,
) {
  if (
    cell.magic &&
    cell.magicId &&
    !sim.runtime.triggeredMagics.has(cell.magicId)
  ) {
    sim.runtime.triggeredMagics.add(cell.magicId);
    if (cell.magic === "ammo") {
      grantAmmo(sim);
      sim.world.events.push("ammo");
      burst(sim, {
        x: worldX,
        y: worldY,
        color: "#83f4bd",
        count: TUNING.particles.ammoBurstCount,
      });
    } else {
      sim.spawnBonus(cell.magic, worldX, worldY);
    }
  }
}

function grantAmmo(sim: Simulation) {
  sim.player.ammo = Math.min(
    sim.player.weapon === "single"
      ? 60
      : PRIMARY_AMMO[sim.player.weapon] * AMMO_CAPACITY_MULTIPLIER,
    sim.player.ammo + TUNING.damage.ammoPerCache,
  );
  sim.runtime.ammoCaches++;
  grantCacheSpecial(sim);
}

function grantCacheSpecial(sim: Simulation) {
  if (sim.runtime.ammoCaches % TUNING.damage.cachesPerSpecial === 0) {
    const type: SpecialWeapon = (
      ["homing", "grenade", "review", "lint"] as const
    )[
      (sim.runtime.ammoCaches / TUNING.damage.cachesPerSpecial - 1) %
        TUNING.damage.specialTypes
    ]!;
    sim.player.specialAmmo[type] = Math.min(
      SPECIAL_AMMO_CAPS[type],
      sim.player.specialAmmo[type] + 1,
    );
  }
}
