import ARRANGEMENT from "./scores/arrangement.json";
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
export function musicStep(synth: Synth, options: StepOptions): void {
  const track = MUSIC_TRACKS[options.deck.track]!;
  const beat = options.step % ARRANGEMENT.sixteenthsPerBar;
  const bar =
    Math.floor(options.step / ARRANGEMENT.sixteenthsPerBar) % track.bars;
  const phrase: PhraseStep = {
    ...options,
    track,
    sixteenth: MIX.secondsPerMinute / track.bpm / MIX.sixteenthsPerBeat,
    beat,
    bar,
    chord: track.chords[bar % track.chords.length]!,
    quiet: bar >= ARRANGEMENT.quiet.startBar && bar < ARRANGEMENT.quiet.endBar,
  };
  playChord(synth, phrase);
  playLead(synth, phrase);
  playArpeggio(synth, phrase);
}

function playChord(synth: Synth, phrase: PhraseStep): void {
  const { beat, chord, time, title, sixteenth, quiet, deck } = phrase;
  const padVolume = quiet
    ? ARRANGEMENT.chord.quietVolume
    : ARRANGEMENT.chord.volume;
  if (beat === 0) {
    for (const [i, note] of chord.entries()) {
      synth.pad({
        note,
        time:
          time +
          i *
            (title
              ? ARRANGEMENT.chord.titleSpacing
              : ARRANGEMENT.chord.spacing),
        duration: sixteenth * ARRANGEMENT.chord.duration,
        volume: title ? ARRANGEMENT.chord.titleVolume : padVolume,
        bus: deck.bus,
      });
    }
  }
}

function playLead(synth: Synth, phrase: PhraseStep): void {
  const { track, bar, beat, title, quiet } = phrase;
  const note = track.phrases[bar % track.phrases.length]![beat]!;
  const titleNote =
    !title ||
    beat % ARRANGEMENT.lead.titleBeatModulo === 0 ||
    beat === ARRANGEMENT.lead.titleAccentBeat;
  const quietEnding =
    bar === ARRANGEMENT.quiet.endingBar && beat >= ARRANGEMENT.quiet.endingBeat;
  const quietDownbeat =
    beat === 0 || beat === ARRANGEMENT.quiet.alternateDownbeat;
  const quietNote = !quiet || quietDownbeat || quietEnding;
  if (note > 0 && titleNote && quietNote) {
    playLeadNote(
      synth,
      phrase,
      note +
        (bar >= ARRANGEMENT.lead.octaveStartBar &&
        beat >= ARRANGEMENT.lead.octaveStartBeat
          ? ARRANGEMENT.octave
          : 0),
    );
  }
}

function playLeadNote(synth: Synth, phrase: PhraseStep, note: number): void {
  const { time, title, sixteenth, quiet, deck, bar, track } = phrase;
  const leadDuration = quiet
    ? ARRANGEMENT.lead.quietDuration
    : ARRANGEMENT.lead.duration;
  const leadVolume = quiet
    ? ARRANGEMENT.lead.quietVolume
    : ARRANGEMENT.lead.volume;
  synth.melodicTone({
    note,
    time,
    duration:
      sixteenth * (title ? ARRANGEMENT.lead.titleDuration : leadDuration),
    type: title ? "sine" : track.lead,
    volume: title ? ARRANGEMENT.lead.titleVolume : leadVolume,
    bus: deck.bus,
    pan:
      bar % ARRANGEMENT.stereoPeriod
        ? ARRANGEMENT.lead.pan
        : -ARRANGEMENT.lead.pan,
  });
  // Bell-like overtones distinguish the nocturnal and glassy compositions.
  if (deck.track === 1 || deck.track === ARRANGEMENT.lead.glassTrack) {
    synth.melodicTone({
      note: note + ARRANGEMENT.octave,
      time,
      duration: sixteenth * ARRANGEMENT.lead.overtoneDuration,
      type: "sine",
      volume: ARRANGEMENT.lead.overtoneVolume,
      bus: deck.bus,
      pan: ARRANGEMENT.lead.overtonePan,
    });
  }
}

function playArpeggio(synth: Synth, phrase: PhraseStep): void {
  const { track, beat, bar, quiet, title, chord, time, sixteenth, deck } =
    phrase;
  const arpeggio =
    track.arpeggio[
      (beat +
        (bar % ARRANGEMENT.stereoPeriod
          ? ARRANGEMENT.arpeggio.alternateOffset
          : 0)) %
        ARRANGEMENT.sixteenthsPerBar
    ]!;
  if (
    !quiet &&
    arpeggio >= 0 &&
    (!title || beat % ARRANGEMENT.arpeggio.titleBeatModulo === 0)
  ) {
    synth.melodicTone({
      note: chord[arpeggio]! + ARRANGEMENT.octave,
      time,
      duration:
        sixteenth *
        (title
          ? ARRANGEMENT.arpeggio.titleDuration
          : ARRANGEMENT.arpeggio.duration),
      type: "triangle",
      volume: title
        ? ARRANGEMENT.arpeggio.titleVolume
        : ARRANGEMENT.arpeggio.volume,
      bus: deck.bus,
      pan: ARRANGEMENT.arpeggio.pan,
    });
  }
}
