import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function robot(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [52, 64, 59, 76].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + [0, 0.07, 0.21, 0.34][i]!,
      duration: 0.13,
      type: "square",
      volume: 0.055,
      destination: bus,
    });
  }
}

export function generate(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [48, 55, 62, 70, 79, 86].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * i * 0.014,
      duration: 0.16,
      type: "triangle",
      volume: 0.075,
      destination: bus,
    });
  }
  synth.noise({
    time: time + 0.3,
    duration: 0.17,
    volume: 0.09,
    cutoff: 2300,
    destination: bus,
    highpass: true,
  });
}

export function exception(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 970 + Math.random() * 220,
    time: time,
    duration: 0.13,
    type: "square",
    volume: 0.045,
    destination: bus,
    endFrequency: 340,
  });
  synth.tone({
    frequency: 470,
    time: time + 0.055,
    duration: 0.09,
    type: "triangle",
    volume: 0.09,
    destination: bus,
    endFrequency: 690,
  });
}

export function absorb(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 170 + Math.random() * 55,
    time: time,
    duration: 0.09,
    type: "sine",
    volume: 0.09,
    destination: bus,
    endFrequency: 80,
  });
  synth.noise({
    time: time,
    duration: 0.045,
    volume: 0.045,
    cutoff: 2800,
    destination: bus,
    highpass: true,
  });
}

export function robotDestroy(
  synth: Synth,
  graph: AudioGraph,
  time: number,
): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.48,
    volume: 0.2,
    cutoff: 1100,
    destination: bus,
  });
  for (const [i, hz] of [210, 150, 92, 55].entries()) {
    synth.tone({
      frequency: hz,
      time: time + i * 0.065,
      duration: 0.25,
      type: "triangle",
      volume: 0.12,
      destination: bus,
      endFrequency: hz * 0.45,
    });
  }
}

/* oxlint-enable no-magic-numbers */
