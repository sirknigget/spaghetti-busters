import SCORE from "#root/src/game/audio/scores/audio-effects-boss.json";
import type { EffectCatalog } from "#root/src/game/audio/effects/audio-effect-score.ts";

export const bossEffects: EffectCatalog = {
  boss: [
    { tone: SCORE.boss.tone, waveform: "sawtooth" },
    { tone: SCORE.boss.accent, waveform: "triangle" },
    { tone: SCORE.boss.overtone, waveform: "square" },
    { voiceDelay: SCORE.boss.voiceDelay },
  ],
  "boss-spawn": [
    { tone: SCORE.bossSpawn.tone, waveform: "triangle" },
    { noise: SCORE.bossSpawn.noise },
  ],
  "boss-defeated": [
    { sequence: SCORE.bossDefeated, waveform: "triangle" },
    { tone: SCORE.bossDefeated.accent, waveform: "sine" },
  ],
};
