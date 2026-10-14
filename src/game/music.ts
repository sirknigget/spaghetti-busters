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
export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'Prism Circuit', bpm: 120, bars: 16, lead: 'triangle',
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 69]],
    phrases: [
      [76, -1, -1, 79, -1, 83, -1, -1, 81, -1, 79, -1, -1, 76, -1, -1],
      [72, -1, 76, -1, -1, -1, 79, 81, -1, 76, -1, -1, 72, -1, -1, -1],
      [77, -1, -1, 81, -1, 84, -1, 81, -1, -1, 79, -1, 76, -1, -1, -1],
      [74, -1, 79, -1, -1, 81, -1, -1, 83, -1, 81, -1, 79, -1, 74, -1],
    ],
    arpeggio: [0, -1, -1, 2, -1, -1, 1, -1, -1, 3, -1, -1, 2, -1, -1, -1],
  },
  {
    name: 'Midnight Refactor', bpm: 138, bars: 16, lead: 'sine',
    chords: [[57, 60, 64, 71], [53, 57, 60, 67], [60, 64, 67, 74], [55, 59, 62, 69]],
    phrases: [
      [81, -1, 84, -1, -1, 88, 86, -1, -1, 84, -1, 83, -1, -1, 81, -1],
      [79, -1, -1, 81, -1, 84, -1, -1, 88, -1, 84, -1, -1, 81, -1, 79],
      [79, 83, -1, -1, 86, -1, 88, -1, 91, -1, -1, 88, -1, 86, 83, -1],
      [83, -1, -1, 86, -1, 81, -1, 79, -1, -1, 78, -1, 79, -1, -1, -1],
    ],
    arpeggio: [-1, 0, -1, 2, -1, -1, 3, -1, 1, -1, -1, 2, -1, 0, -1, -1],
  },
  {
    name: 'Glass Gardens', bpm: 112, bars: 16, lead: 'sine',
    chords: [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 71]],
    phrases: [
      [78, -1, -1, -1, -1, 81, -1, -1, 85, -1, -1, 81, -1, -1, 78, -1],
      [-1, -1, 78, -1, 81, -1, -1, -1, 83, -1, -1, 81, -1, 78, -1, -1],
      [79, -1, -1, 83, -1, -1, 86, -1, -1, -1, 85, -1, 83, -1, -1, -1],
      [81, -1, -1, -1, 85, -1, -1, 88, -1, -1, 85, -1, 83, -1, 81, -1],
    ],
    arpeggio: [0, -1, -1, -1, -1, 1, -1, -1, -1, -1, 3, -1, -1, 2, -1, -1],
  },
  {
    name: 'Zero Gravity', bpm: 144, bars: 16, lead: 'triangle',
    chords: [[64, 67, 71, 74], [60, 64, 67, 71], [55, 59, 62, 66], [62, 66, 69, 73]],
    phrases: [
      [83, -1, 86, -1, -1, 90, -1, 88, -1, -1, 86, -1, 83, -1, 79, -1],
      [79, -1, -1, 83, -1, 86, 88, -1, -1, 86, -1, 83, -1, -1, 79, -1],
      [-1, 78, -1, 79, -1, -1, 83, -1, 86, -1, 83, -1, -1, 79, -1, -1],
      [81, -1, 85, -1, -1, 88, -1, -1, 90, -1, 88, -1, 85, -1, 81, -1],
    ],
    arpeggio: [0, -1, 2, -1, -1, 1, -1, -1, 3, -1, -1, 2, -1, -1, 1, -1],
  },
];

export function trackDuration(track: MusicTrack): number { return track.bars * 4 * 60 / track.bpm; }
