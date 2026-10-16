import type { Synth } from "#root/src/game/audio/audio-synth.ts";
import { playLayers } from "#root/src/game/audio/effects/audio-effect-player.ts";
import { bonusesEffects } from "#root/src/game/audio/effects/audio-effects-bonuses.ts";
import { bossEffects } from "#root/src/game/audio/effects/audio-effects-boss.ts";
import { combatEffects } from "#root/src/game/audio/effects/audio-effects-combat.ts";
import { enemiesEffects } from "#root/src/game/audio/effects/audio-effects-enemies.ts";
import { menuEffects } from "#root/src/game/audio/effects/audio-effects-menu.ts";
import { statusEffects } from "#root/src/game/audio/effects/audio-effects-status.ts";

const effects = new Map(
  Object.entries({
    ...bonusesEffects,
    ...bossEffects,
    ...combatEffects,
    ...enemiesEffects,
    ...menuEffects,
    ...statusEffects,
    "robot-hit": enemiesEffects.absorb!,
  }),
);

export function playEffect(event: string, synth: Synth): void {
  const layers = effects.get(event);

  if (layers) {
    playLayers(synth, layers, synth.graph.context.currentTime);
  }
}
