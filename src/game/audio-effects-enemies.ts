import SCORE from "./scores/audio-effects-enemies.json";
import type { EffectCatalog } from "./audio-effect-score";

export const enemiesEffects: EffectCatalog = {
  robot: [{ sequence: SCORE.robot, waveform: "square" }],
  generate: [
    { sequence: SCORE.generate, waveform: "triangle", quadratic: true },
    { noise: SCORE.generate.noise, highpass: true },
  ],
  exception: [
    { tone: SCORE.exception.tone, waveform: "square" },
    { tone: SCORE.exception.accent, waveform: "triangle" },
  ],
  absorb: [
    { tone: SCORE.absorb.tone, waveform: "sine" },
    { noise: SCORE.absorb.noise, highpass: true },
  ],
  "robot-destroy": [
    { noise: SCORE.robotDestroy.noise },
    { sequence: SCORE.robotDestroy, waveform: "triangle" },
  ],
};
