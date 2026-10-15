import SCORE from "./scores/audio-effects-status.json";
import type { EffectCatalog } from "./audio-effect-score";

export const statusEffects: EffectCatalog = {
  review: [
    {
      sequence: SCORE.review,
      waveform: "sine",
      harmony: { ...SCORE.review.accent, waveform: "triangle" },
    },
  ],
  lint: [
    { noise: SCORE.lint.noise, highpass: true },
    { sequence: SCORE.lint, waveform: "triangle" },
  ],
  hazard: [{ sequence: SCORE.hazard, waveform: "triangle" }],
  stun: [
    { sequence: SCORE.stun, waveform: "square" },
    { noise: SCORE.stun.noise, highpass: true },
  ],
  recover: [{ sequence: SCORE.recover, waveform: "sine" }],
};
