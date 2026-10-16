import SCORE from "#root/src/game/audio/scores/audio-effects-enemies.json";
import type { EffectCatalog } from "#root/src/game/audio/effects/audio-effect-score.ts";

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
