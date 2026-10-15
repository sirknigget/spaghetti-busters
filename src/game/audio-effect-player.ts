import { frequency, type Synth } from "./audio-synth";
import type {
  EffectLayer,
  SequenceLayer,
  SequenceTone,
  ToneLayer,
  ToneScore,
} from "./audio-effect-score";

interface NoteStep {
  index: number;
  value: number;
  time: number;
}

export function playLayers(
  synth: Synth,
  layers: readonly EffectLayer[],
  time: number,
): void {
  for (const layer of layers) {
    playLayer(synth, layer, time);
  }
}

function playLayer(synth: Synth, layer: EffectLayer, time: number): void {
  if ("sequence" in layer) {
    playSequence(synth, layer, time);
  } else if ("tone" in layer) {
    playTone(synth, layer, time);
  } else if ("noise" in layer) {
    const { delay = 0, ...noise } = layer.noise;

    synth.noise({
      ...noise,
      time: time + delay,
      destination: synth.graph.effects,
      highpass: layer.highpass,
    });
  } else {
    playVoice(synth, time + layer.voiceDelay);
  }
}

function playTone(synth: Synth, layer: ToneLayer, time: number): void {
  const { tone, waveform } = layer;

  synth.tone({
    frequency: toneFrequency(tone),
    time: time + (tone.delay ?? 0),
    duration: tone.duration,
    type: waveform,
    volume: tone.volume,
    destination: synth.graph.effects,
    endFrequency: tone.endFrequency,
  });
}

function toneFrequency(tone: ToneScore): number {
  if (tone.note !== undefined) {
    return frequency(tone.note);
  }

  if (tone.frequency !== undefined) {
    return tone.frequency;
  }

  return tone.baseFrequency + Math.random() * tone.frequencyRange;
}

type NoteTiming =
  { delays: readonly number[] } | { spacing: number; quadratic: boolean };
interface NoteVoice {
  tone: SequenceTone;
  waveform: OscillatorType;
  harmonyInterval: number;
  midi: boolean;
  timing: NoteTiming;
}

function playSequence(synth: Synth, layer: SequenceLayer, time: number): void {
  const { sequence } = layer;
  const values = "notes" in sequence ? sequence.notes : sequence.frequencies;
  const voices = sequenceVoices(layer);

  for (const [index, value] of values.entries()) {
    const step = { index, value, time };

    for (const voice of voices) {
      playSequenceNote(synth, voice, step);
    }
  }
}

function sequenceVoices(layer: SequenceLayer): NoteVoice[] {
  const primary: NoteVoice = {
    tone: layer.sequence.tone,
    waveform: layer.waveform,
    harmonyInterval: 0,
    midi: "notes" in layer.sequence,
    timing: sequenceTiming(layer),
  };
  const voices = [primary];

  if (layer.harmony) {
    voices.push({
      ...primary,
      tone: layer.harmony,
      waveform: layer.harmony.waveform,
      harmonyInterval: layer.harmony.harmonyInterval ?? 0,
      timing: {
        spacing: layer.harmony.spacing,
        quadratic: layer.quadratic ?? false,
      },
    });
  }

  return voices;
}

function sequenceTiming(layer: SequenceLayer): NoteTiming {
  const { sequence } = layer;

  if (sequence.delays !== undefined) {
    return { delays: sequence.delays };
  }

  return {
    spacing: sequence.tone.spacing,
    quadratic: layer.quadratic ?? false,
  };
}

function playSequenceNote(
  synth: Synth,
  voice: NoteVoice,
  step: NoteStep,
): void {
  const hz = voice.midi
    ? frequency(step.value + voice.harmonyInterval)
    : step.value;
  const { tone } = voice;
  const duration =
    step.index === tone.finalNoteIndex ? tone.finalDuration : tone.duration;

  synth.tone({
    frequency: hz,
    time: step.time + noteDelay(voice.timing, step.index),
    duration,
    type: voice.waveform,
    volume: tone.volume,
    destination: synth.graph.effects,
    endFrequency:
      tone.endFrequencyRatio === undefined
        ? undefined
        : hz * tone.endFrequencyRatio,
  });
}

function noteDelay(timing: NoteTiming, index: number): number {
  if ("spacing" in timing) {
    const beat = timing.quadratic ? index * index : index;

    return beat * timing.spacing;
  }

  const delay = timing.delays[index];

  if (delay === undefined) {
    throw new RangeError("Missing authored delay for an audio sequence note.");
  }

  return delay;
}

function playVoice(synth: Synth, time: number): void {
  const { graph } = synth;

  if (!graph.bossVoice) {
    return;
  }

  const voice = graph.context.createBufferSource();

  voice.buffer = graph.bossVoice;
  voice.connect(graph.effects);
  synth.track(voice, () => undefined);
  voice.start(time);
}
