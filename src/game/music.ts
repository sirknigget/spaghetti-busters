import tracks from "./scores/music-tracks.json";

/** Original melodic score: MIDI notes, sixteenth-note phrasing; -1 means a breath.
 * No percussion or pulsing bass voices are used in any arrangement. */
export interface MusicTrack {
  name: string;
  bpm: number;
  bars: number;
  lead: OscillatorType;
  chords: readonly (readonly number[])[];
  phrases: readonly (readonly number[])[];
  arpeggio: readonly number[];
}

export const MUSIC_CROSSFADE_SECONDS = 3;
// SAFETY: The authored JSON score uses only the sine and triangle OscillatorType values.
export const MUSIC_TRACKS = tracks as readonly MusicTrack[];

const BEATS_PER_BAR = 4;
const SECONDS_PER_MINUTE = 60;

export function trackDuration(track: MusicTrack): number {
  return (track.bars * BEATS_PER_BAR * SECONDS_PER_MINUTE) / track.bpm;
}
