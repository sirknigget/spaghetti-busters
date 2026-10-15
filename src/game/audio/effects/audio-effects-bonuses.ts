import SCORE from "#root/src/game/audio/scores/audio-effects-bonuses.json";
import type { EffectCatalog } from "#root/src/game/audio/effects/audio-effect-score.ts";

export const bonusesEffects: EffectCatalog = {
  bonus: [{ sequence: SCORE.bonus, waveform: "sine" }],
  pickup: [{ sequence: SCORE.pickup, waveform: "square" }],
  ammo: [{ sequence: SCORE.ammo, waveform: "triangle" }],
  wave: [{ sequence: SCORE.wave, waveform: "square" }],
  gameover: [{ sequence: SCORE.gameover, waveform: "triangle" }],
};
