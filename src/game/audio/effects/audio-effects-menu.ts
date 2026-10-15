import SCORE from "#root/src/game/audio/scores/audio-effects-menu.json";
import type { EffectCatalog } from "#root/src/game/audio/effects/audio-effect-score.ts";

export const menuEffects: EffectCatalog = {
  "menu-open": [{ sequence: SCORE.menuOpen, waveform: "sine" }],
  "menu-hover": [{ tone: SCORE.menuHover.tone, waveform: "sine" }],
  "menu-click": [
    { tone: SCORE.menuClick.tone, waveform: "triangle" },
    { tone: SCORE.menuClick.accent, waveform: "sine" },
  ],
};
