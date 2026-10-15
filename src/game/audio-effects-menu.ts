import SCORE from "./scores/audio-effects-menu.json";
import type { EffectCatalog } from "./audio-effect-score";

export const menuEffects: EffectCatalog = {
  "menu-open": [{ sequence: SCORE.menuOpen, waveform: "sine" }],
  "menu-hover": [{ tone: SCORE.menuHover.tone, waveform: "sine" }],
  "menu-click": [
    { tone: SCORE.menuClick.tone, waveform: "triangle" },
    { tone: SCORE.menuClick.accent, waveform: "sine" },
  ],
};
