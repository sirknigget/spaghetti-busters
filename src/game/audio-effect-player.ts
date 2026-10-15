import { frequency, type Synth } from "./audio-synth";
import type {
  EffectLayer,
  SequenceLayer,
  SequenceVoice,
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

  return (
    tone.frequency ?? tone.baseFrequency! + Math.random() * tone.frequencyRange!
  );
}

function playSequence(synth: Synth, layer: SequenceLayer, time: number): void {
  const { sequence, waveform, harmony } = layer;
  const values = "notes" in sequence ? sequence.notes : sequence.frequencies;
  const voices: SequenceVoice[] = [{ ...sequence.tone, waveform }];

  if (harmony) {
    voices.push(harmony);
  }

  for (const [index, value] of values.entries()) {
    const step = { index, value, time };

    for (const voice of voices) {
      playSequenceNote(synth, { ...layer, ...voice }, step);
    }
  }
}

interface NoteLayer extends SequenceLayer, SequenceVoice {}

function playSequenceNote(
  synth: Synth,
  layer: NoteLayer,
  step: NoteStep,
): void {
  const hz =
    "notes" in layer.sequence
      ? frequency(step.value + (layer.harmonyInterval ?? 0))
      : step.value;
  const duration =
    step.index === layer.finalNoteIndex ? layer.finalDuration! : layer.duration;

  synth.tone({
    frequency: hz,
    time: step.time + noteDelay(layer, step.index),
    duration,
    type: layer.waveform,
    volume: layer.volume,
    destination: synth.graph.effects,
    endFrequency:
      layer.endFrequencyRatio === undefined
        ? undefined
        : hz * layer.endFrequencyRatio,
  });
}

function noteDelay(layer: NoteLayer, index: number): number {
  const scheduled = layer.sequence.delays?.[index];

  if (scheduled !== undefined) {
    return scheduled;
  }

  const beat = layer.quadratic ? index * index : index;

  return beat * layer.spacing!;
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
