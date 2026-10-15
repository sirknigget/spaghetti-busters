import { expect, it } from "vitest";
import {
  MUSIC_CROSSFADE_SECONDS,
  MUSIC_TRACKS,
  trackDuration,
} from "#root/src/game/audio/music.ts";

it("has four distinct compositions with timed transitions and composed breathing room", () => {
  expect(MUSIC_TRACKS).toHaveLength(4);
  expect(new Set(MUSIC_TRACKS.map((t) => t.name)).size).toBe(4);
  expect(new Set(MUSIC_TRACKS.map((t) => t.bpm)).size).toBe(4);
  expect(new Set(MUSIC_TRACKS.map((t) => JSON.stringify(t.phrases))).size).toBe(
    4,
  );
  for (const track of MUSIC_TRACKS) {
    expect(trackDuration(track)).toBeGreaterThanOrEqual(24);
    expect(trackDuration(track)).toBeLessThanOrEqual(40);
    expect(trackDuration(track)).toBeGreaterThan(MUSIC_CROSSFADE_SECONDS * 4);
    expect(track.chords.length).toBeGreaterThanOrEqual(4);
    for (const chord of track.chords) {
      expect(chord.length).toBeGreaterThanOrEqual(3);
      // Midrange harmony instead of a repetitive, low bass pulse.
      expect(Math.min(...chord)).toBeGreaterThanOrEqual(53);
    }

    for (const phrase of track.phrases) {
      expect(phrase).toHaveLength(16);
      expect(
        phrase.filter((note) => note === -1).length,
      ).toBeGreaterThanOrEqual(6);
      expect(
        new Set(phrase.filter((note) => note > 0)).size,
      ).toBeGreaterThanOrEqual(3);
    }

    expect(track.arpeggio).toHaveLength(16);
    expect(track.arpeggio.every((n) => n === -1 || (n >= 0 && n < 4))).toBe(
      true,
    );
  }
});
