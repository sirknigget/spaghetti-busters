export const EFFECT_INTERVALS = new Map(
  Object.entries({
    "menu-hover": 0.1,
    hit: 0.032,
    shot: 0.035,
  }),
);
export const HALF = 0.5;
export const MIX = {
  masterVolume: 0.7,
  gainRamp: 0.015,
  menuVolume: 0.23,
  gameVolume: 0.34,
  sceneFade: 0.18,
  schedulerMs: 25,
  sixteenthsPerBeat: 4,
  quarterTurn: Math.PI * HALF,
  deckFadeRamp: 0.035,
  staleNoteSeconds: 0.18,
  lookaheadSeconds: 0.14,
  effectInterval: 0.065,
  echoLeftDelay: 0.28,
  echoRightDelay: 0.43,
  echoPan: 0.72,
  bipolarRange: 2,
};
export const SYNTH = {
  attackFloor: 0.0001,
  attackSeconds: 0.004,
  sourceRelease: 0.01,
  noiseOffset: 0.5,
  referenceHz: 440,
  semitoneRatio: 2,
  referenceMidi: 69,
  semitonesPerOctave: 12,
  detuneParity: 2,
  detuneCents: 4,
  padAttack: 0.2,
  padSustainVolume: 0.72,
  padSustain: 0.65,
};
export interface MusicDeck {
  track: number;
  start: number;
  nextStep: number;
  bus: GainNode;
  retireAt?: number;
}
