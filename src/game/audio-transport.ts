import { MUSIC_CROSSFADE_SECONDS, MUSIC_TRACKS, trackDuration } from "./music";
import { MIX, type MusicDeck } from "./audio-config";
import type { AudioGraph } from "./audio-graph";
import type { Synth } from "./audio-synth";
import { musicStep } from "./audio-arrangement";

export class MusicTransport {
  private timer: ReturnType<typeof setInterval> | null = null;
  private transport = 0;
  private anchor = 0;
  private decks: MusicDeck[] = [];
  trackIndex = 0;
  scene: "menu" | "game" = "game";

  constructor(
    private readonly graph: AudioGraph,
    private readonly synth: Synth,
  ) {}

  startMusic(): void {
    if (!this.graph.context || this.timer !== null) {
      return;
    }
    this.anchor = this.graph.context.currentTime;
    this.graph.master.gain.setTargetAtTime(
      MIX.masterVolume,
      this.anchor,
      MIX.gainRamp,
    );
    this.graph.music.gain.setValueAtTime(
      this.scene === "menu" ? MIX.menuVolume : MIX.gameVolume,
      this.anchor,
    );
    if (this.decks.length === 0) {
      this.addDeck(this.trackIndex, this.transport);
    }
    this.schedule();
    this.timer = setInterval(() => this.schedule(), MIX.schedulerMs);
  }

  fadeMusic(): void {
    if (!this.graph.context || !this.graph.music) {
      return;
    }
    const now = this.graph.context.currentTime;
    this.graph.music.gain.cancelScheduledValues(now);
    this.graph.music.gain.setTargetAtTime(
      this.scene === "menu" ? MIX.menuVolume : MIX.gameVolume,
      now,
      MIX.sceneFade,
    );
  }

  private advanceTransport(): void {
    if (this.timer === null || !this.graph.context) {
      return;
    }
    const now = this.graph.context.currentTime;
    this.transport += Math.max(0, now - this.anchor);
    this.anchor = now;
  }

  clearDecks(): void {
    for (const deck of this.decks) {
      deck.bus.disconnect();
    }
    this.decks = [];
  }

  private addDeck(track: number, start: number): void {
    const bus = this.graph.context!.createGain();
    bus.gain.value = this.decks.length ? 0 : 1;
    bus.connect(this.graph.music);
    this.decks.push({ track, start, nextStep: 0, bus });
    this.trackIndex = track;
  }

  private schedule(): void {
    if (!this.graph.context || !this.graph.music) {
      return;
    }
    this.advanceTransport();
    const now = this.graph.context.currentTime;
    const current = this.decks.at(-1);
    if (
      current &&
      this.transport >=
        current.start + trackDuration(MUSIC_TRACKS[current.track]!)
    ) {
      // Two independent arrangements overlap during a smooth, equal-power crossfade.
      current.retireAt = this.transport + MUSIC_CROSSFADE_SECONDS;
      this.addDeck((current.track + 1) % MUSIC_TRACKS.length, this.transport);
    }
    this.decks = this.decks.filter((deck) => this.scheduleDeck(deck, now));
  }

  private scheduleDeck(deck: MusicDeck, now: number): boolean {
    if (deck.retireAt !== undefined && this.transport >= deck.retireAt) {
      deck.bus.disconnect();

      return false;
    }
    const track = MUSIC_TRACKS[deck.track]!;
    const sixteenth = MIX.secondsPerMinute / track.bpm / MIX.sixteenthsPerBeat;
    const age = this.transport - deck.start;
    deck.bus.gain.setTargetAtTime(
      this.deckFade(deck, age),
      now,
      MIX.deckFadeRamp,
    );
    // Skip stale notes after hidden-tab throttling; never emit a catch-up burst.
    if (deck.nextStep * sixteenth < age - MIX.staleNoteSeconds) {
      deck.nextStep = Math.ceil(age / sixteenth);
    }
    while (deck.nextStep * sixteenth < age + MIX.lookaheadSeconds) {
      musicStep(this.synth, {
        deck,
        step: deck.nextStep,
        time: now + Math.max(0, deck.nextStep * sixteenth - age),
        title: this.scene === "menu",
      });
      deck.nextStep++;
    }

    return true;
  }

  private deckFade(deck: MusicDeck, age: number): number {
    return deck.retireAt === undefined
      ? Math.sin(Math.min(1, age / MUSIC_CROSSFADE_SECONDS) * MIX.quarterTurn)
      : Math.cos(
          Math.min(
            1,
            (this.transport - (deck.retireAt - MUSIC_CROSSFADE_SECONDS)) /
              MUSIC_CROSSFADE_SECONDS,
          ) * MIX.quarterTurn,
        );
  }

  stop(): void {
    this.advanceTransport();
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
    this.timer = null;
    this.graph.music.gain.setValueAtTime(0, this.graph.context.currentTime);
  }

  reset(): void {
    this.stop();
    this.clearDecks();
    this.transport = 0;
    this.trackIndex = 0;
  }
}
