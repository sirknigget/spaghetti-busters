interface MidiPitch {
  note: number;
  frequency?: never;
  baseFrequency?: never;
  frequencyRange?: never;
}
interface FixedPitch {
  note?: never;
  frequency: number;
  baseFrequency?: never;
  frequencyRange?: never;
}
interface RandomPitch {
  note?: never;
  frequency?: never;
  baseFrequency: number;
  frequencyRange: number;
}
interface ToneEnvelope {
  duration: number;
  volume: number;
  endFrequency?: number;
  delay?: number;
}
export type ToneScore = ToneEnvelope & (MidiPitch | FixedPitch | RandomPitch);

interface NoiseScore {
  duration: number;
  volume: number;
  cutoff: number;
  delay?: number;
}
interface FinalNoteDuration {
  finalNoteIndex: number;
  finalDuration: number;
}
interface ConstantDuration {
  finalNoteIndex?: never;
  finalDuration?: never;
}
interface SequenceEnvelope {
  duration: number;
  volume: number;
  endFrequencyRatio?: number;
}
export type SequenceTone = SequenceEnvelope &
  (FinalNoteDuration | ConstantDuration);
type SpacedTone = SequenceTone & { spacing: number };

interface MidiSequence {
  notes: readonly number[];
}
interface HertzSequence {
  frequencies: readonly number[];
}
interface SpacedSequence {
  tone: SpacedTone;
  delays?: never;
}
interface TimedSequence {
  tone: SequenceTone & { spacing?: never };
  delays: readonly number[];
}
type SequenceVoice = SpacedTone & {
  waveform: OscillatorType;
  harmonyInterval?: number;
};
interface SequencePresentation {
  waveform: OscillatorType;
}
interface SpacedLayer {
  sequence: (MidiSequence | HertzSequence) & SpacedSequence;
  quadratic?: boolean;
  harmony?: SequenceVoice;
}
interface TimedLayer {
  sequence: (MidiSequence | HertzSequence) & TimedSequence;
  quadratic?: never;
  harmony?: never;
}
export type SequenceLayer = SequencePresentation & (SpacedLayer | TimedLayer);
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
