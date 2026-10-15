import SCORE from "./scores/audio-effects-status.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function review(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.review.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.review.tone.spacing,
      duration: SCORE.review.tone.duration,
      type: "sine",
      volume: SCORE.review.tone.volume,
      destination: bus,
    });
    synth.tone({
      frequency: frequency(note + SCORE.review.accent.harmonyInterval),
      time: time + i * SCORE.review.accent.spacing,
      duration: SCORE.review.accent.duration,
      type: "triangle",
      volume: SCORE.review.accent.volume,
      destination: bus,
    });
  }
}

export function lint(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: SCORE.lint.noise.duration,
    volume: SCORE.lint.noise.volume,
    cutoff: SCORE.lint.noise.cutoff,
    destination: bus,
    highpass: true,
  });
  for (const [i, note] of SCORE.lint.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.lint.tone.spacing,
      duration: SCORE.lint.tone.duration,
      type: "triangle",
      volume: SCORE.lint.tone.volume,
      destination: bus,
    });
  }
}

export function hazard(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.hazard.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.hazard.tone.spacing,
      duration: SCORE.hazard.tone.duration,
      type: "triangle",
      volume: SCORE.hazard.tone.volume,
      destination: bus,
    });
  }
}

export function stun(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.stun.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.stun.tone.spacing,
      duration: SCORE.stun.tone.duration,
      type: "square",
      volume: SCORE.stun.tone.volume,
      destination: bus,
    });
  }
  synth.noise({
    time: time,
    duration: SCORE.stun.noise.duration,
    volume: SCORE.stun.noise.volume,
    cutoff: SCORE.stun.noise.cutoff,
    destination: bus,
    highpass: true,
  });
}

export function recover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  for (const [i, note] of SCORE.recover.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.recover.tone.spacing,
      duration: SCORE.recover.tone.duration,
      type: "sine",
      volume: SCORE.recover.tone.volume,
      destination: bus,
    });
  }
}
