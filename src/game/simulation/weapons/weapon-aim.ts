import type { PlayerState } from "#root/src/game/simulation/simulation-state.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";

export function weaponAim(player: PlayerState): number {
  return Math.atan2(
    player.aimY - player.playerY,
    Math.max(
      TUNING.weapon.minimumAimDistance,
      player.aimX - TUNING.weapon.aimOriginX,
    ),
  );
}
