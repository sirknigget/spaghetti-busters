export interface ToneScore {
  note?: number;
  frequency?: number;
  baseFrequency?: number;
  frequencyRange?: number;
  duration: number;
  volume: number;
  endFrequency?: number;
  delay?: number;
}
export interface NoiseScore {
  duration: number;
  volume: number;
  cutoff: number;
  delay?: number;
}
export interface SequenceTone {
  spacing?: number;
  duration: number;
  volume: number;
  finalNoteIndex?: number;
  finalDuration?: number;
  endFrequencyRatio?: number;
}
interface MidiSequence {
  notes: readonly number[];
}
interface HertzSequence {
  frequencies: readonly number[];
}
export type SequenceScore = (MidiSequence | HertzSequence) & {
  tone: SequenceTone;
  delays?: readonly number[];
};
export interface SequenceVoice extends SequenceTone {
  waveform: OscillatorType;
  harmonyInterval?: number;
}
export interface SequenceLayer {
  sequence: SequenceScore;
  waveform: OscillatorType;
  quadratic?: boolean;
  harmony?: SequenceVoice;
}
export interface ToneLayer {
  tone: ToneScore;
  waveform: OscillatorType;
}
interface NoiseLayer {
  noise: NoiseScore;
  highpass?: boolean;
}
export type EffectLayer =
  SequenceLayer | ToneLayer | NoiseLayer | { voiceDelay: number };
export type EffectCatalog = Record<string, readonly EffectLayer[]>;
