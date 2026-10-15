import SCORE from "./scores/audio-effects-boss.json";
import type { AudioGraph } from "./audio-graph";
import { Synth, frequency } from "./audio-synth";

export function boss(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  // A short warning sting leaves room for the bundled spoken announcement.
  synth.tone({
    frequency: frequency(SCORE.boss.tone.note),
    time: time,
    duration: SCORE.boss.tone.duration,
    type: "sawtooth",
    volume: SCORE.boss.tone.volume,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(SCORE.boss.accent.note),
    time: time + SCORE.boss.accent.delay,
    duration: SCORE.boss.accent.duration,
    type: "triangle",
    volume: SCORE.boss.accent.volume,
    destination: bus,
  });
  synth.tone({
    frequency: frequency(SCORE.boss.overtone.note),
    time: time + SCORE.boss.overtone.delay,
    duration: SCORE.boss.overtone.duration,
    type: "square",
    volume: SCORE.boss.overtone.volume,
    destination: bus,
  });
  if (graph.bossVoice) {
    const voice = graph.context.createBufferSource();

    voice.buffer = graph.bossVoice;
    voice.connect(bus);
    synth.track(voice, () => undefined);
    voice.start(time + SCORE.boss.voiceDelay);
  }
}

export function bossSpawn(synth: Synth, graph: AudioGraph, time: number): void {
  const bus = graph.effects;

  synth.tone({
    frequency: SCORE.bossSpawn.tone.frequency,
    time: time,
    duration: SCORE.bossSpawn.tone.duration,
    type: "triangle",
    volume: SCORE.bossSpawn.tone.volume,
    destination: bus,
    endFrequency: SCORE.bossSpawn.tone.endFrequency,
  });
  synth.noise({
    time: time,
    duration: SCORE.bossSpawn.noise.duration,
    volume: SCORE.bossSpawn.noise.volume,
    cutoff: SCORE.bossSpawn.noise.cutoff,
    destination: bus,
  });
}

export function bossDefeated(
  synth: Synth,
  graph: AudioGraph,
  time: number,
): void {
  const bus = graph.effects;

  for (const [i, note] of SCORE.bossDefeated.notes.entries()) {
    synth.tone({
      frequency: frequency(note),
      time: time + i * SCORE.bossDefeated.tone.spacing,
      duration: SCORE.bossDefeated.tone.duration,
      type: "triangle",
      volume: SCORE.bossDefeated.tone.volume,
      destination: bus,
    });
  }

  synth.tone({
    frequency: frequency(SCORE.bossDefeated.accent.note),
    time: time + SCORE.bossDefeated.accent.delay,
    duration: SCORE.bossDefeated.accent.duration,
    type: "sine",
    volume: SCORE.bossDefeated.accent.volume,
    destination: bus,
  });
}
