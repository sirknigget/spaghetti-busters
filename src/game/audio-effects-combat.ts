import SCORE from "./scores/audio-effects-combat.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function missile(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: SCORE.missile.noise.duration,
    volume: SCORE.missile.noise.volume,
    cutoff: SCORE.missile.noise.cutoff,
    destination: bus,
    highpass: true,
  });
  synth.tone({
    frequency: SCORE.missile.tone.frequency,
    time: time,
    duration: SCORE.missile.tone.duration,
    type: "sawtooth",
    volume: SCORE.missile.tone.volume,
    destination: bus,
    endFrequency: SCORE.missile.tone.endFrequency,
  });
}

export function grenade(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: SCORE.grenade.tone.frequency,
    time: time,
    duration: SCORE.grenade.tone.duration,
    type: "triangle",
    volume: SCORE.grenade.tone.volume,
    destination: bus,
    endFrequency: SCORE.grenade.tone.endFrequency,
  });
  synth.noise({
    time: time,
    duration: SCORE.grenade.noise.duration,
    volume: SCORE.grenade.noise.volume,
    cutoff: SCORE.grenade.noise.cutoff,
    destination: bus,
  });
}

export function shot(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency: SCORE.shot.tone.frequency,
    time: time,
    duration: SCORE.shot.tone.duration,
    type: "square",
    volume: SCORE.shot.tone.volume,
    destination: bus,
    endFrequency: SCORE.shot.tone.endFrequency,
  });
  synth.noise({
    time: time,
    duration: SCORE.shot.noise.duration,
    volume: SCORE.shot.noise.volume,
    cutoff: SCORE.shot.noise.cutoff,
    destination: bus,
  });
}

export function hit(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.tone({
    frequency:
      SCORE.hit.tone.baseFrequency +
      Math.random() * SCORE.hit.tone.frequencyRange,
    time: time,
    duration: SCORE.hit.tone.duration,
    type: "triangle",
    volume: SCORE.hit.tone.volume,
    destination: bus,
    endFrequency: SCORE.hit.tone.endFrequency,
  });
  synth.noise({
    time: time,
    duration: SCORE.hit.noise.duration,
    volume: SCORE.hit.noise.volume,
    cutoff: SCORE.hit.noise.cutoff,
    destination: bus,
  });
}

export function split(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: SCORE.split.noise.duration,
    volume: SCORE.split.noise.volume,
    cutoff: SCORE.split.noise.cutoff,
    destination: bus,
  });
  synth.tone({
    frequency: SCORE.split.tone.frequency,
    time: time,
    duration: SCORE.split.tone.duration,
    type: "sawtooth",
    volume: SCORE.split.tone.volume,
    destination: bus,
    endFrequency: SCORE.split.tone.endFrequency,
  });
  synth.tone({
    frequency: SCORE.split.accent.frequency,
    time: time + SCORE.split.accent.delay,
    duration: SCORE.split.accent.duration,
    type: "square",
    volume: SCORE.split.accent.volume,
    destination: bus,
    endFrequency: SCORE.split.accent.endFrequency,
  });
}

export function destroy(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: SCORE.destroy.noise.duration,
    volume: SCORE.destroy.noise.volume,
    cutoff: SCORE.destroy.noise.cutoff,
    destination: bus,
  });
  synth.tone({
    frequency: SCORE.destroy.tone.frequency,
    time: time,
    duration: SCORE.destroy.tone.duration,
    type: "triangle",
    volume: SCORE.destroy.tone.volume,
    destination: bus,
    endFrequency: SCORE.destroy.tone.endFrequency,
  });
  for (const [index, note] of SCORE.destroy.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + SCORE.destroy.accent.spacing * index,
      duration: SCORE.destroy.accent.duration,
      type: "square",
      volume: SCORE.destroy.accent.volume,
      destination: bus,
    });
  }
}

export function explosion(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;
  synth.noise({
    time: time,
    duration: SCORE.explosion.noise.duration,
    volume: SCORE.explosion.noise.volume,
    cutoff: SCORE.explosion.noise.cutoff,
    destination: bus,
  });
  synth.tone({
    frequency: SCORE.explosion.tone.frequency,
    time: time,
    duration: SCORE.explosion.tone.duration,
    type: "triangle",
    volume: SCORE.explosion.tone.volume,
    destination: bus,
    endFrequency: SCORE.explosion.tone.endFrequency,
  });
  synth.tone({
    frequency: SCORE.explosion.accent.frequency,
    time: time + SCORE.explosion.accent.delay,
    duration: SCORE.explosion.accent.duration,
    type: "sawtooth",
    volume: SCORE.explosion.accent.volume,
    destination: bus,
    endFrequency: SCORE.explosion.accent.endFrequency,
  });
}
