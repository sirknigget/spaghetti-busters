import { MUSIC_TRACKS } from "./music";
import { MIX, type MusicDeck } from "./audio-config";
import type { Synth } from "./audio-synth";

interface StepOptions {
  deck: MusicDeck;
  step: number;
  time: number;
  title: boolean;
}
interface PhraseStep extends StepOptions {
  track: (typeof MUSIC_TRACKS)[number];
  sixteenth: number;
  beat: number;
  bar: number;
  chord: readonly number[];
  quiet: boolean;
}
/* oxlint-disable no-magic-numbers -- Beat positions, MIDI offsets, and velocities form the authored musical arrangement. */
export function musicStep(synth: Synth, options: StepOptions): void {
  const track = MUSIC_TRACKS[options.deck.track]!;
  const beat = options.step % 16;
  const bar = Math.floor(options.step / 16) % track.bars;
  const phrase: PhraseStep = {
    ...options,
    track,
    sixteenth: 60 / track.bpm / MIX.sixteenthsPerBeat,
    beat,
    bar,
    chord: track.chords[bar % track.chords.length]!,
    quiet: bar >= 8 && bar < 12,
  };
  playChord(synth, phrase);
  playLead(synth, phrase);
  playArpeggio(synth, phrase);
}

function playChord(synth: Synth, phrase: PhraseStep): void {
  const { beat, chord, time, title, sixteenth, quiet, deck } = phrase;
  const padVolume = quiet ? 0.034 : 0.028;
  if (beat === 0) {
    for (const [i, note] of chord.entries()) {
      synth.pad({
        note,
        time: time + i * (title ? 0.09 : 0.03),
        duration: sixteenth * 18,
        volume: title ? 0.024 : padVolume,
        bus: deck.bus,
      });
    }
  }
}

function playLead(synth: Synth, phrase: PhraseStep): void {
  const { track, bar, beat, title, quiet } = phrase;
  const note = track.phrases[bar % track.phrases.length]![beat]!;
  const titleNote = !title || beat % 4 === 0 || beat === 7;
  const quietEnding = bar === 11 && beat >= 12;
  const quietDownbeat = beat === 0 || beat === 8;
  const quietNote = !quiet || quietDownbeat || quietEnding;
  if (note > 0 && titleNote && quietNote) {
    playLeadNote(synth, phrase, note + (bar >= 12 && beat >= 8 ? 12 : 0));
  }
}

function playLeadNote(synth: Synth, phrase: PhraseStep, note: number): void {
  const { time, title, sixteenth, quiet, deck, bar, track } = phrase;
  const leadDuration = quiet ? 3.4 : 2.1;
  const leadVolume = quiet ? 0.07 : 0.1;
  synth.melodicTone({
    note,
    time,
    duration: sixteenth * (title ? 4.2 : leadDuration),
    type: title ? "sine" : track.lead,
    volume: title ? 0.085 : leadVolume,
    bus: deck.bus,
    pan: bar % 2 ? 0.24 : -0.24,
  });
  // Bell-like overtones distinguish the nocturnal and glassy compositions.
  if (deck.track === 1 || deck.track === 2) {
    synth.melodicTone({
      note: note + 12,
      time,
      duration: sixteenth * 1.4,
      type: "sine",
      volume: 0.02,
      bus: deck.bus,
      pan: 0.35,
    });
  }
}

function playArpeggio(synth: Synth, phrase: PhraseStep): void {
  const { track, beat, bar, quiet, title, chord, time, sixteenth, deck } =
    phrase;
  const arpeggio = track.arpeggio[(beat + (bar % 2 ? 3 : 0)) % 16]!;
  if (!quiet && arpeggio >= 0 && (!title || beat % 3 === 0)) {
    synth.melodicTone({
      note: chord[arpeggio]! + 12,
      time,
      duration: sixteenth * (title ? 3 : 1.7),
      type: "triangle",
      volume: title ? 0.035 : 0.055,
      bus: deck.bus,
      pan: -0.4,
    });
  }
}

/* oxlint-enable no-magic-numbers */
