import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function review(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [86, 81, 74, 67].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.085,
      duration: 0.6,
      type: "sine",
      volume: 0.085,
      destination: bus,
    });
    synth.tone({
      frequency: frequency(note + 7),
      time: time + i * 0.085,
      duration: 0.43,
      type: "triangle",
      volume: 0.025,
      destination: bus,
    });
  }
}

export function lint(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.34,
    volume: 0.13,
    cutoff: 3600,
    destination: bus,
    highpass: true,
  });
  for (const [i, note] of [57, 69, 76, 81, 88].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.045,
      duration: 0.25,
      type: "triangle",
      volume: 0.09,
      destination: bus,
    });
  }
}

export function hazard(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [83, 77].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.09,
      duration: 0.085,
      type: "triangle",
      volume: 0.1,
      destination: bus,
    });
  }
}

export function stun(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [94, 87, 82, 75, 70].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.045,
      duration: 0.11,
      type: "square",
      volume: 0.075,
      destination: bus,
    });
  }
  synth.noise({
    time: time,
    duration: 0.28,
    volume: 0.08,
    cutoff: 4000,
    destination: bus,
    highpass: true,
  });
}

export function recover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of [67, 74, 79, 86].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.05,
      duration: 0.13,
      type: "sine",
      volume: 0.15,
      destination: bus,
    });
  }
}

/* oxlint-enable no-magic-numbers */
