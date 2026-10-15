import settings from "#root/src/game/audio/scores/audio-settings.json";

export const EFFECT_INTERVALS = new Map(
  Object.entries(settings.effectIntervals),
);
export const HALF = 0.5;
export const MIX = { ...settings.mix, quarterTurn: Math.PI * HALF };
export const SYNTH = settings.synth;
export const LIMITER = settings.limiter;

export interface MusicDeck {
  track: number;
  start: number;
  nextStep: number;
  bus: GainNode;
  retireAt?: number;
}
