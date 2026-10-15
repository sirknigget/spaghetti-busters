import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function menuOpen(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [67, 74, 79, 83].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.13,
      duration: 0.65,
      type: "sine",
      volume: 0.065,
      destination: bus,
    });
  }
}

export function menuHover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: frequency(83),
    time: time,
    duration: 0.08,
    type: "sine",
    volume: 0.04,
    destination: bus,
  });
}

export function menuClick(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: frequency(76),
    time: time,
    duration: 0.12,
    type: "triangle",
    volume: 0.065,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(88),
    time: time + 0.055,
    duration: 0.18,
    type: "sine",
    volume: 0.05,
    destination: bus,
  });
}

/* oxlint-enable no-magic-numbers */
