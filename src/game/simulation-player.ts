import type { Simulation } from "./simulation";
import { WEAPON_SPREADS, clamp } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import { type SpecialWeapon, SPECIAL_AMMO_CAPS } from "./simulation-types";

const BULLET_LIFETIME_SECONDS = 1.5;
const SHOT_COOLDOWN_SECONDS = 0.135;

export function fire(sim: Simulation): boolean {
  if (
    sim.progress.status !== "playing" ||
    sim.isStunned ||
    sim.runtime.cooldown > 0
  ) {
    return false;
  }
  if (sim.player.weapon !== "single" && sim.player.ammo <= 0) {
    sim.player.weapon = "single";
  }
  const angle = Math.atan2(
    sim.player.aimY - sim.player.playerY,
    Math.max(
      TUNING.weapon.minimumAimDistance,
      sim.player.aimX - TUNING.weapon.aimOriginX,
    ),
  );
  const spreads = WEAPON_SPREADS[sim.player.weapon];
  for (const spread of spreads) {
    const direction = angle + spread;
    sim.world.bullets.push({
      id: sim.runtime.nextId++,
      x: TUNING.weapon.muzzleX,
      y: sim.player.playerY,
      vx: Math.cos(direction) * TUNING.weapon.bulletSpeed,
      vy: Math.sin(direction) * TUNING.weapon.bulletSpeed,
      life: BULLET_LIFETIME_SECONDS,
      weapon: sim.player.weapon,
    });
  }
  if (sim.player.weapon !== "single") {
    sim.player.ammo--;
  }
  sim.runtime.cooldown = SHOT_COOLDOWN_SECONDS;
  sim.progress.shotsFired++;
  sim.world.events.push("shot");

  return true;
}

export function selectSpecial(sim: Simulation, type: SpecialWeapon) {
  if (
    sim.progress.status === "playing" &&
    !sim.isStunned &&
    type in SPECIAL_AMMO_CAPS
  ) {
    sim.player.specialWeapon = type;
  }
}

export function isStunned(sim: Simulation) {
  return sim.player.stunRemaining > 0;
}

export function advancePlayer(sim: Simulation, dt: number) {
  sim.progress.elapsed += dt;
  sim.runtime.cooldown = Math.max(0, sim.runtime.cooldown - dt);
  sim.runtime.specialCooldown = Math.max(0, sim.runtime.specialCooldown - dt);
  if (sim.player.stunRemaining > 0) {
    sim.player.stunRemaining = Math.max(0, sim.player.stunRemaining - dt);
    if (sim.player.stunRemaining === 0) {
      sim.world.events.push("recover");
    }
  } else {
    sim.player.playerY +=
      (clamp(
        sim.player.aimY,
        TUNING.timing.playerMinY,
        TUNING.timing.playerMaxY,
      ) -
        sim.player.playerY) *
      (1 - Math.exp(-dt * TUNING.timing.playerAimResponse));
  }
}
export function advanceFreeze(sim: Simulation, dt: number) {
  const enemyDt = Math.min(dt, Math.max(0, dt - sim.player.freezeRemaining));
  sim.player.freezeRemaining = Math.max(0, sim.player.freezeRemaining - dt);
  sim.player.reviewPulse = Math.max(0, sim.player.reviewPulse - dt);
  sim.player.lintPulse = Math.max(0, sim.player.lintPulse - dt);

  return enemyDt;
}
