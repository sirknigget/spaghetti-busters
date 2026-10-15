import { MUSIC_TRACKS } from "./music";
import { EFFECT_INTERVALS, MIX } from "./audio-config";
import { openAudioGraph, type AudioGraph } from "./audio-graph";
import { Synth } from "./audio-synth";
import { MusicTransport } from "./audio-transport";
import { playEffect } from "./audio-effects";

/** Original melodic soundtrack and arcade effects, unlocked by a user gesture. */
export class AudioEngine {
  enabled = true;
  private graph: AudioGraph | null = null;
  private synth: Synth | null = null;
  private score: MusicTransport | null = null;
  private readonly lastEffects = new Map<string, number>();
  private started = false;
  private paused = false;
  private wave = 1;
  private scene: "menu" | "game" = "game";

  get trackName(): string {
    return MUSIC_TRACKS[this.score?.trackIndex ?? 0]!.name;
  }

  enterMenu(): void {
    const opening = !this.started;
    this.scene = "menu";
    this.start();
    this.fadeMusic();
    if (opening) {
      this.play("menu-open");
    }
  }

  enterGame(): void {
    this.scene = "game";
    this.start();
    this.fadeMusic();
  }

  setWave(wave: number): void {
    const next = Math.max(1, Math.floor(wave));
    if (next === this.wave) {
      return;
    }
    const newRun = next === 1 && this.wave > 1;
    this.wave = next;
    if (newRun) {
      this.stopSounds();
      this.score?.reset();
      if (this.started && !this.paused && this.enabled) {
        this.score?.startMusic();
      }
    }
  }

  start(): void {
    if (this.started) {
      if (this.paused) {
        this.resume();
      }

      return;
    }
    if (!this.initialize()) {
      return;
    }
    this.started = true;
    this.paused = false;
    this.unlock();
    this.startMusic();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.graph) {
      const { context, master } = this.graph;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(
        enabled && !this.paused ? MIX.masterVolume : 0,
        context.currentTime,
        MIX.gainRamp,
      );
    }
    if (!enabled) {
      this.stopSounds();
    } else if (this.started && !this.paused) {
      this.unlock();
      this.startMusic();
    }
  }

  pause(): void {
    this.paused = true;
    this.stopSounds();
    if (this.graph) {
      this.graph.master.gain.setValueAtTime(0, this.graph.context.currentTime);
    }
  }

  finish(): void {
    this.stopSounds();
    this.play("gameover");
    this.paused = true;
    this.score?.reset();
  }

  resume(): void {
    if (!this.started) {
      this.start();

      return;
    }
    if (this.paused) {
      this.paused = false;
      this.unlock();
      this.startMusic();
    }
  }

  play(event: string): void {
    if (!this.synth || !this.enabled || this.paused || !this.started) {
      return;
    }
    const time = this.synth.graph.context.currentTime;
    const previous = this.lastEffects.get(event) ?? -Infinity;
    if (time - previous < (EFFECT_INTERVALS.get(event) ?? MIX.effectInterval)) {
      return;
    }
    this.lastEffects.set(event, time);
    playEffect(event, this.synth);
  }

  private initialize(): boolean {
    if (this.graph) {
      return true;
    }
    this.graph = openAudioGraph(this.enabled);
    if (!this.graph) {
      return false;
    }
    this.synth = new Synth(this.graph);
    this.score = new MusicTransport(this.graph, this.synth);
    this.score.scene = this.scene;

    return true;
  }

  private unlock(): void {
    if (this.graph?.context.state === "suspended") {
      void this.graph.context.resume().catch(() => undefined);
    }
  }

  private startMusic(): void {
    if (this.enabled && !this.paused && this.score) {
      this.score.scene = this.scene;
      this.score.startMusic();
    }
  }

  private fadeMusic(): void {
    if (this.enabled && !this.paused && this.score) {
      this.score.scene = this.scene;
      this.score.fadeMusic();
    }
  }

  private stopSounds(): void {
    this.score?.stop();
    this.synth?.stop();
    this.lastEffects.clear();
  }
}
