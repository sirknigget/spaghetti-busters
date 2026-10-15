import SCORE from "./scores/audio-effects-combat.json";
import type { EffectCatalog } from "./audio-effect-score";

export const combatEffects: EffectCatalog = {
  missile: [
    { noise: SCORE.missile.noise, highpass: true },
    { tone: SCORE.missile.tone, waveform: "sawtooth" },
  ],
  grenade: [
    { tone: SCORE.grenade.tone, waveform: "triangle" },
    { noise: SCORE.grenade.noise },
  ],
  shot: [
    { tone: SCORE.shot.tone, waveform: "square" },
    { noise: SCORE.shot.noise },
  ],
  hit: [
    { tone: SCORE.hit.tone, waveform: "triangle" },
    { noise: SCORE.hit.noise },
  ],
  split: [
    { noise: SCORE.split.noise },
    { tone: SCORE.split.tone, waveform: "sawtooth" },
    { tone: SCORE.split.accent, waveform: "square" },
  ],
  destroy: [
    { noise: SCORE.destroy.noise },
    { tone: SCORE.destroy.tone, waveform: "triangle" },
    {
      sequence: { notes: SCORE.destroy.notes, tone: SCORE.destroy.accent },
      waveform: "square",
    },
  ],
  explosion: [
    { noise: SCORE.explosion.noise },
    { tone: SCORE.explosion.tone, waveform: "triangle" },
    { tone: SCORE.explosion.accent, waveform: "sawtooth" },
  ],
};
