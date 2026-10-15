import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

/* oxlint-disable no-magic-numbers -- Literal pitches, envelopes, and timings are authored sound-effect scores. */
export function boss(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  // A short warning sting leaves room for the bundled spoken announcement.
  synth.tone({
    frequency: frequency(45),
    time: time,
    duration: 0.5,
    type: "sawtooth",
    volume: 0.065,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(52),
    time: time + 0.08,
    duration: 0.4,
    type: "triangle",
    volume: 0.075,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(46),
    time: time + 0.19,
    duration: 0.3,
    type: "square",
    volume: 0.035,
    destination: bus,
  });
  if (graph.bossVoice) {
    const voice = graph.context.createBufferSource();
    voice.buffer = graph.bossVoice;
    voice.connect(bus);
    synth.track(voice, () => undefined);
    voice.start(time + 0.07);
  }
}

export function bossSpawn(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: 105,
    time: time,
    duration: 0.17,
    type: "triangle",
    volume: 0.12,
    destination: bus,
    endFrequency: 53,
  });
  synth.noise({
    time: time,
    duration: 0.09,
    volume: 0.055,
    cutoff: 1800,
    destination: bus,
  });
}

export function bossDefeated(
  synth: Synth,
  graph: AudioGraph,
  time: number,
): void {
  const bus = graph.effects;
  for (const [i, note] of [57, 64, 69, 76, 81, 88].entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * 0.075,
      duration: 0.36,
      type: "triangle",
      volume: 0.11,
      destination: bus,
    });
  }
  synth.tone({
    frequency: frequency(93),
    time: time + 0.38,
    duration: 0.7,
    type: "sine",
    volume: 0.08,
    destination: bus,
  });
}

/* oxlint-enable no-magic-numbers */
