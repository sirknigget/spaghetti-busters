import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function missile(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.26,
    volume: 0.1,
    cutoff: 2100,
    destination: bus,
    highpass: true,
  });
  synth.tone({
    frequency: 160,
    time: time,
    duration: 0.26,
    type: "sawtooth",
    volume: 0.07,
    destination: bus,
    endFrequency: 1100,
  });
}

export function grenade(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 380,
    time: time,
    duration: 0.18,
    type: "triangle",
    volume: 0.2,
    destination: bus,
    endFrequency: 105,
  });
  synth.noise({
    time: time,
    duration: 0.055,
    volume: 0.08,
    cutoff: 900,
    destination: bus,
  });
}

export function shot(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 720,
    time: time,
    duration: 0.085,
    type: "square",
    volume: 0.1,
    destination: bus,
    endFrequency: 135,
  });
  synth.noise({
    time: time,
    duration: 0.035,
    volume: 0.045,
    cutoff: 1800,
    destination: bus,
  });
}

export function hit(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 210 + Math.random() * 130,
    time: time,
    duration: 0.06,
    type: "triangle",
    volume: 0.16,
    destination: bus,
    endFrequency: 70,
  });
  synth.noise({
    time: time,
    duration: 0.06,
    volume: 0.07,
    cutoff: 1100,
    destination: bus,
  });
}

export function split(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.19,
    volume: 0.2,
    cutoff: 1300,
    destination: bus,
  });
  synth.tone({
    frequency: 230,
    time: time,
    duration: 0.19,
    type: "sawtooth",
    volume: 0.08,
    destination: bus,
    endFrequency: 45,
  });
  synth.tone({
    frequency: 570,
    time: time + 0.025,
    duration: 0.1,
    type: "square",
    volume: 0.04,
    destination: bus,
    endFrequency: 165,
  });
}

export function destroy(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.28,
    volume: 0.2,
    cutoff: 850,
    destination: bus,
  });
  synth.tone({
    frequency: 110,
    time: time,
    duration: 0.25,
    type: "triangle",
    volume: 0.28,
    destination: bus,
    endFrequency: 32,
  });
  for (const [index, note] of [76, 81, 88].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + 0.045 * index,
      duration: 0.095,
      type: "square",
      volume: 0.035,
      destination: bus,
    });
  }
}

export function explosion(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: 0.52,
    volume: 0.3,
    cutoff: 1500,
    destination: bus,
  });
  synth.tone({
    frequency: 150,
    time: time,
    duration: 0.45,
    type: "triangle",
    volume: 0.25,
    destination: bus,
    endFrequency: 35,
  });
  synth.tone({
    frequency: 540,
    time: time + 0.035,
    duration: 0.22,
    type: "sawtooth",
    volume: 0.035,
    destination: bus,
    endFrequency: 95,
  });
}

/* oxlint-enable no-magic-numbers */
