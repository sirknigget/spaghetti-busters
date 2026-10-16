import weaponPatterns from "#root/src/game/simulation/common/weapon-patterns.json";
import type { Weapon } from "#root/src/game/simulation/simulation-types.ts";

export const AMMO_CAPACITY_MULTIPLIER = 2;
export const HOMING_AMMO_PER_PICKUP = 2;
export const EXPLOSION_IMPULSE_FACTOR = 2;
// These literal millisecond choices are the hazard's displayed code payloads.
export const HAZARD_DURATIONS_MS = weaponPatterns.HAZARD_DURATIONS_MS;

// Literal angular patterns form the weapon spread palette.
export const WEAPON_SPREADS: Record<Weapon, number[]> =
  weaponPatterns.WEAPON_SPREADS;
