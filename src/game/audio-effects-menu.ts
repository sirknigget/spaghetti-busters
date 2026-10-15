import SCORE from "./scores/audio-effects-menu.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function menuOpen(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  for (const [i, note] of SCORE.menuOpen.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.menuOpen.tone.spacing,
      duration: SCORE.menuOpen.tone.duration,
      type: "sine",
      volume: SCORE.menuOpen.tone.volume,
      destination: bus,
    });
  }
}

export function menuHover(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  synth.tone({
    frequency: frequency(SCORE.menuHover.tone.note),
    time: time,
    duration: SCORE.menuHover.tone.duration,
    type: "sine",
    volume: SCORE.menuHover.tone.volume,
    destination: bus,
  });
}

export function menuClick(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  synth.tone({
    frequency: frequency(SCORE.menuClick.tone.note),
    time: time,
    duration: SCORE.menuClick.tone.duration,
    type: "triangle",
    volume: SCORE.menuClick.tone.volume,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(SCORE.menuClick.accent.note),
    time: time + SCORE.menuClick.accent.delay,
    duration: SCORE.menuClick.accent.duration,
    type: "sine",
    volume: SCORE.menuClick.accent.volume,
    destination: bus,
  });
}
