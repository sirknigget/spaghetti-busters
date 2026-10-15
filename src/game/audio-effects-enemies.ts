import SCORE from "./scores/audio-effects-enemies.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function robot(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.robot.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + SCORE.robot.delays[i]!,
      duration: SCORE.robot.tone.duration,
      type: "square",
      volume: SCORE.robot.tone.volume,
      destination: bus,
    });
  }
}

export function generate(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.generate.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * i * SCORE.generate.tone.spacing,
      duration: SCORE.generate.tone.duration,
      type: "triangle",
      volume: SCORE.generate.tone.volume,
      destination: bus,
    });
  }
  synth.noise({
    time: time + SCORE.generate.noise.delay,
    duration: SCORE.generate.noise.duration,
    volume: SCORE.generate.noise.volume,
    cutoff: SCORE.generate.noise.cutoff,
    destination: bus,
    highpass: true,
  });
}

export function exception(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency:
      SCORE.exception.tone.baseFrequency +
      Math.random() * SCORE.exception.tone.frequencyRange,
    time: time,
    duration: SCORE.exception.tone.duration,
    type: "square",
    volume: SCORE.exception.tone.volume,
    destination: bus,
    endFrequency: SCORE.exception.tone.endFrequency,
  });
  synth.tone({
    frequency: SCORE.exception.accent.frequency,
    time: time + SCORE.exception.accent.delay,
    duration: SCORE.exception.accent.duration,
    type: "triangle",
    volume: SCORE.exception.accent.volume,
    destination: bus,
    endFrequency: SCORE.exception.accent.endFrequency,
  });
}

export function absorb(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency:
      SCORE.absorb.tone.baseFrequency +
      Math.random() * SCORE.absorb.tone.frequencyRange,
    time: time,
    duration: SCORE.absorb.tone.duration,
    type: "sine",
    volume: SCORE.absorb.tone.volume,
    destination: bus,
    endFrequency: SCORE.absorb.tone.endFrequency,
  });
  synth.noise({
    time: time,
    duration: SCORE.absorb.noise.duration,
    volume: SCORE.absorb.noise.volume,
    cutoff: SCORE.absorb.noise.cutoff,
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
    duration: SCORE.robotDestroy.noise.duration,
    volume: SCORE.robotDestroy.noise.volume,
    cutoff: SCORE.robotDestroy.noise.cutoff,
    destination: bus,
  });
  for (const [i, hz] of SCORE.robotDestroy.frequencies.entries()) {
    synth.tone({
      frequency: hz,
      time: time + i * SCORE.robotDestroy.tone.spacing,
      duration: SCORE.robotDestroy.tone.duration,
      type: "triangle",
      volume: SCORE.robotDestroy.tone.volume,
      destination: bus,
      endFrequency: hz * SCORE.robotDestroy.tone.endFrequencyRatio,
    });
  }
}
