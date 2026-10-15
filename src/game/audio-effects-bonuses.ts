import SCORE from "./scores/audio-effects-bonuses.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function bonus(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [i, note] of SCORE.bonus.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.bonus.tone.spacing,
      duration: SCORE.bonus.tone.duration,
      type: "sine",
      volume: SCORE.bonus.tone.volume,
      destination: bus,
    });
  }
}

export function pickup(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [index, note] of SCORE.pickup.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * SCORE.pickup.tone.spacing,
      duration: SCORE.pickup.tone.duration,
      type: "square",
      volume: SCORE.pickup.tone.volume,
      destination: bus,
    });
  }
}

export function ammo(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [index, note] of SCORE.ammo.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * SCORE.ammo.tone.spacing,
      duration: SCORE.ammo.tone.duration,
      type: "triangle",
      volume: SCORE.ammo.tone.volume,
      destination: bus,
    });
  }
}

export function wave(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [index, note] of SCORE.wave.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * SCORE.wave.tone.spacing,
      duration: SCORE.wave.tone.duration,
      type: "square",
      volume: SCORE.wave.tone.volume,
      destination: bus,
    });
  }
}

export function gameover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [index, note] of SCORE.gameover.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + index * SCORE.gameover.tone.spacing,
      duration:
        index === SCORE.gameover.tone.finalNoteIndex
          ? SCORE.gameover.tone.finalDuration
          : SCORE.gameover.tone.duration,
      type: "triangle",
      volume: SCORE.gameover.tone.volume,
      destination: bus,
    });
  }
}
