import type { Synth } from "./audio-synth";
import { playLayers } from "./audio-effect-player";
import { bonusesEffects } from "./audio-effects-bonuses";
import { bossEffects } from "./audio-effects-boss";
import { combatEffects } from "./audio-effects-combat";
import { enemiesEffects } from "./audio-effects-enemies";
import { menuEffects } from "./audio-effects-menu";
import { statusEffects } from "./audio-effects-status";

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
