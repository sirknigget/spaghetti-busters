import SCORE from "./scores/audio-effects-bonuses.json";
import type { EffectCatalog } from "./audio-effect-score";

export const bonusesEffects: EffectCatalog = {
  bonus: [{ sequence: SCORE.bonus, waveform: "sine" }],
  pickup: [{ sequence: SCORE.pickup, waveform: "square" }],
  ammo: [{ sequence: SCORE.ammo, waveform: "triangle" }],
  wave: [{ sequence: SCORE.wave, waveform: "square" }],
  gameover: [{ sequence: SCORE.gameover, waveform: "triangle" }],
};
