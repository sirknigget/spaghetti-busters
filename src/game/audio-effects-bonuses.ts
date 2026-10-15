import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function bonus(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [79, 86, 83, 91].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.07,
      duration: 0.19,
      type: "sine",
      volume: 0.07,
      destination: bus,
    });
  }
}

export function pickup(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [index, note] of [69, 72, 76, 81, 84].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * 0.055,
      duration: 0.14,
      type: "square",
      volume: 0.085,
      destination: bus,
    });
  }
}

export function ammo(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [index, note] of [76, 81, 88].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * 0.045,
      duration: 0.1,
      type: "triangle",
      volume: 0.19,
      destination: bus,
    });
  }
}

export function wave(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [index, note] of [57, 64, 69, 72, 76, 81].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * 0.075,
      duration: 0.2,
      type: "square",
      volume: 0.07,
      destination: bus,
    });
  }
}

export function gameover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [index, note] of [69, 67, 64, 60, 57, 45].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * 0.14,
      duration: index === 5 ? 0.65 : 0.22,
      type: "triangle",
      volume: 0.2,
      destination: bus,
    });
  }
}

/* oxlint-enable no-magic-numbers */
