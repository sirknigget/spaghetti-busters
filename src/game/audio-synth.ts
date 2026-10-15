import { SYNTH } from "./audio-config";
import type { AudioGraph } from "./audio-graph";

export interface PadOptions {
  note: number;
  time: number;
  duration: number;
  volume: number;
  bus: AudioNode;
}
export interface MelodicToneOptions {
  note: number;
  time: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  bus: AudioNode;
  pan: number;
}
export interface ToneOptions {
  frequency: number;
  time: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  destination: AudioNode;
  endFrequency?: number;
  cleanup?: () => void;
}
export interface NoiseOptions {
  time: number;
  duration: number;
  volume: number;
  cutoff: number;
  destination: AudioNode;
  highpass?: boolean;
}

export function frequency(midi: number): number {
  return (
    SYNTH.referenceHz *
    SYNTH.semitoneRatio **
      ((midi - SYNTH.referenceMidi) / SYNTH.semitonesPerOctave)
  );
}

export class Synth {
  readonly sources = new Set<AudioScheduledSourceNode>();

  constructor(readonly graph: AudioGraph) {}

  pad(options: PadOptions): void {
    const { note, time, duration, volume, bus } = options;

    const context = this.graph.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency(note);
    oscillator.detune.value =
      note % SYNTH.detuneParity ? -SYNTH.detuneCents : SYNTH.detuneCents;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      volume,
      time + duration * SYNTH.padAttack,
    );
    envelope.gain.linearRampToValueAtTime(
      volume * SYNTH.padSustainVolume,
      time + duration * SYNTH.padSustain,
    );
    envelope.gain.linearRampToValueAtTime(0, time + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    this.track(oscillator, () => envelope.disconnect());
    oscillator.start(time);
    this.stopAt(oscillator, time + duration);
  }

  melodicTone(options: MelodicToneOptions): void {
    const { note, time, duration, type, volume, bus, pan } = options;

    const panner = this.graph.context.createStereoPanner();

    panner.pan.value = pan;
    panner.connect(bus);
    this.tone({
      frequency: frequency(note),
      time,
      duration,
      type,
      volume,
      destination: panner,
      cleanup: () => panner.disconnect(),
    });
  }

  tone(options: ToneOptions): void {
    const {
      frequency,
      time,
      duration,
      type,
      destination,
      endFrequency,
      cleanup,
    } = options;

    const context = this.graph.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        time + duration,
      );
    }

    this.shapeTone(envelope, options);
    oscillator.connect(envelope);
    envelope.connect(destination);
    this.track(oscillator, () => {
      envelope.disconnect();
      cleanup?.();
    });
    oscillator.start(time);
    this.stopAt(oscillator, time + duration);
  }

  noise(options: NoiseOptions): void {
    const { time, duration, cutoff, destination, highpass = false } = options;

    if (!this.graph.noiseBuffer) {
      return;
    }

    const context = this.graph.context;
    const source = context.createBufferSource();

    source.buffer = this.graph.noiseBuffer;

    const filter = context.createBiquadFilter();

    filter.type = highpass ? "highpass" : "lowpass";
    filter.frequency.value = cutoff;

    const envelope = context.createGain();

    this.shapeNoise(envelope, options);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    this.track(source, () => {
      filter.disconnect();
      envelope.disconnect();
    });
    source.start(time, Math.random() * SYNTH.noiseOffset);
    source.stop(time + duration + SYNTH.sourceRelease);
  }

  private shapeNoise(envelope: GainNode, options: NoiseOptions): void {
    const { time, duration, volume } = options;

    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(
      SYNTH.attackFloor,
      time + duration,
    );
  }

  private shapeTone(envelope: GainNode, options: ToneOptions): void {
    const { time, duration, volume } = options;

    envelope.gain.setValueAtTime(SYNTH.attackFloor, time);
    envelope.gain.exponentialRampToValueAtTime(
      volume,
      time + SYNTH.attackSeconds,
    );
    envelope.gain.exponentialRampToValueAtTime(
      SYNTH.attackFloor,
      time + duration,
    );
  }

  private stopAt(source: AudioScheduledSourceNode, end: number): void {
    source.stop(end + SYNTH.sourceRelease);
  }

  track(source: AudioScheduledSourceNode, cleanup: () => void): void {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      cleanup();
    };
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* A source may end between frames. */
      }
    }

    this.sources.clear();
  }
}
