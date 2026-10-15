import { MUSIC_CROSSFADE_SECONDS, MUSIC_TRACKS, trackDuration } from "./music";

interface MusicDeck {
  track: number;
  start: number;
  nextStep: number;
  bus: GainNode;
  retireAt?: number;
}

/** Original melodic soundtrack and arcade effects. Starts on a user gesture. */
export class AudioEngine {
  enabled = true;

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bossVoice: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private lastEffects = new Map<string, number>();
  private started = false;
  private paused = false;
  private transport = 0;
  private anchor = 0;
  private decks: MusicDeck[] = [];
  private wave = 1;
  private trackIndex = 0;
  private scene: "menu" | "game" = "game";

  get trackName(): string {
    return MUSIC_TRACKS[this.trackIndex]!.name;
  }

  /** Unlock the title score from a browser gesture, or return to it after a run. */
  enterMenu(): void {
    const opening = !this.started;
    this.scene = "menu";
    this.start();
    this.fadeMusic();
    if (opening) this.play("menu-open");
  }

  /** Keep the same musical transport while the title arrangement blooms into gameplay. */
  enterGame(): void {
    this.scene = "game";
    this.start();
    this.fadeMusic();
  }

  /** Repeated HUD calls are harmless; a new run resets the score to its opening cue. */
  setWave(wave: number): void {
    const next = Math.max(1, Math.floor(wave));
    if (next === this.wave) return;
    const newRun = next === 1 && this.wave > 1;
    this.wave = next;
    if (newRun) {
      this.stopSounds();
      this.clearDecks();
      this.transport = 0;
      this.trackIndex = 0;
      if (this.started && !this.paused && this.enabled) this.startMusic();
    }
  }

  /** Call from Start, pointerdown, or another trusted browser gesture. */
  start(): void {
    if (this.started) {
      if (this.paused) this.resume();
      return;
    }
    if (!this.initialize()) return;
    this.started = true;
    this.paused = false;
    this.unlock();
    this.startMusic();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const context = this.context;
    if (context && this.master) {
      this.master.gain.cancelScheduledValues(context.currentTime);
      this.master.gain.setTargetAtTime(
        enabled && !this.paused ? 0.7 : 0,
        context.currentTime,
        0.015,
      );
    }
    if (!enabled) this.stopSounds();
    else if (this.started && !this.paused) {
      this.unlock();
      this.startMusic();
    }
  }

  pause(): void {
    this.paused = true;
    this.stopSounds();
    if (this.context && this.master)
      this.master.gain.setValueAtTime(0, this.context.currentTime);
  }

  /** Stop the groove but let the final descending sting finish naturally. */
  finish(): void {
    this.stopSounds();
    this.play("gameover");
    this.paused = true;
    this.clearDecks();
    this.transport = 0;
    this.trackIndex = 0;
  }

  resume(): void {
    if (!this.started) {
      this.start();
      return;
    }
    if (!this.paused) return;
    this.paused = false;
    this.unlock();
    this.startMusic();
  }

  play(event: string): void {
    const context = this.context;
    if (
      !context ||
      !this.effects ||
      !this.enabled ||
      this.paused ||
      !this.started
    )
      return;
    const time = context.currentTime;
    const previous = this.lastEffects.get(event) ?? -Infinity;
    if (
      time - previous <
      (event === "menu-hover"
        ? 0.1
        : event === "hit"
          ? 0.032
          : event === "shot"
            ? 0.035
            : 0.065)
    )
      return;
    this.lastEffects.set(event, time);
    const bus = this.effects;
    switch (event) {
      case "menu-open":
        [67, 74, 79, 83].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * 0.13,
            0.65,
            "sine",
            0.065,
            bus,
          );
        });
        break;
      case "menu-hover":
        this.tone(this.frequency(83), time, 0.08, "sine", 0.04, bus);
        break;
      case "menu-click":
        this.tone(this.frequency(76), time, 0.12, "triangle", 0.065, bus);
        this.tone(this.frequency(88), time + 0.055, 0.18, "sine", 0.05, bus);
        break;
      case "boss": {
        // A short warning sting leaves room for the bundled spoken announcement.
        this.tone(this.frequency(45), time, 0.5, "sawtooth", 0.065, bus);
        this.tone(this.frequency(52), time + 0.08, 0.4, "triangle", 0.075, bus);
        this.tone(this.frequency(46), time + 0.19, 0.3, "square", 0.035, bus);
        if (this.bossVoice) {
          const voice = context.createBufferSource();
          voice.buffer = this.bossVoice;
          voice.connect(bus);
          this.track(voice, () => undefined);
          voice.start(time + 0.07);
        }
        break;
      }
      case "boss-spawn":
        this.tone(105, time, 0.17, "triangle", 0.12, bus, 53);
        this.noise(time, 0.09, 0.055, 1800, bus);
        break;
      case "boss-defeated":
        [57, 64, 69, 76, 81, 88].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * 0.075,
            0.36,
            "triangle",
            0.11,
            bus,
          );
        });
        this.tone(this.frequency(93), time + 0.38, 0.7, "sine", 0.08, bus);
        break;
      case "missile":
        this.noise(time, 0.26, 0.1, 2100, bus, true);
        this.tone(160, time, 0.26, "sawtooth", 0.07, bus, 1100);
        break;
      case "grenade":
        this.tone(380, time, 0.18, "triangle", 0.2, bus, 105);
        this.noise(time, 0.055, 0.08, 900, bus);
        break;
      case "robot":
        // An irregular boot sequence gives the visiting agent a mechanical voice.
        [52, 64, 59, 76].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + [0, 0.07, 0.21, 0.34][i]!,
            0.13,
            "square",
            0.055,
            bus,
          );
        });
        break;
      case "generate":
        [48, 55, 62, 70, 79, 86].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * i * 0.014,
            0.16,
            "triangle",
            0.075,
            bus,
          );
        });
        this.noise(time + 0.3, 0.17, 0.09, 2300, bus, true);
        break;
      case "exception":
        this.tone(
          970 + Math.random() * 220,
          time,
          0.13,
          "square",
          0.045,
          bus,
          340,
        );
        this.tone(470, time + 0.055, 0.09, "triangle", 0.09, bus, 690);
        break;
      case "robot-hit":
      case "absorb":
        this.tone(170 + Math.random() * 55, time, 0.09, "sine", 0.09, bus, 80);
        this.noise(time, 0.045, 0.045, 2800, bus, true);
        break;
      case "review":
        [86, 81, 74, 67].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * 0.085,
            0.6,
            "sine",
            0.085,
            bus,
          );
          this.tone(
            this.frequency(note + 7),
            time + i * 0.085,
            0.43,
            "triangle",
            0.025,
            bus,
          );
        });
        break;
      case "lint":
        this.noise(time, 0.34, 0.13, 3600, bus, true);
        [57, 69, 76, 81, 88].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * 0.045,
            0.25,
            "triangle",
            0.09,
            bus,
          );
        });
        break;
      case "bonus":
        [79, 86, 83, 91].forEach((note, i) => {
          this.tone(
            this.frequency(note),
            time + i * 0.07,
            0.19,
            "sine",
            0.07,
            bus,
          );
        });
        break;
      case "explosion":
        this.noise(time, 0.52, 0.3, 1500, bus);
        this.tone(150, time, 0.45, "triangle", 0.25, bus, 35);
        this.tone(540, time + 0.035, 0.22, "sawtooth", 0.035, bus, 95);
        break;
      case "hazard":
        [83, 77].forEach((note, i) =>
          this.tone(
            this.frequency(note),
            time + i * 0.09,
            0.085,
            "triangle",
            0.1,
            bus,
          ),
        );
        break;
      case "stun":
        [94, 87, 82, 75, 70].forEach((note, i) =>
          this.tone(
            this.frequency(note),
            time + i * 0.045,
            0.11,
            "square",
            0.075,
            bus,
          ),
        );
        this.noise(time, 0.28, 0.08, 4000, bus, true);
        break;
      case "recover":
        [67, 74, 79, 86].forEach((note, i) =>
          this.tone(
            this.frequency(note),
            time + i * 0.05,
            0.13,
            "sine",
            0.15,
            bus,
          ),
        );
        break;
      case "shot":
        this.tone(720, time, 0.085, "square", 0.1, bus, 135);
        this.noise(time, 0.035, 0.045, 1800, bus);
        break;
      case "hit":
        this.tone(
          210 + Math.random() * 130,
          time,
          0.06,
          "triangle",
          0.16,
          bus,
          70,
        );
        this.noise(time, 0.06, 0.07, 1100, bus);
        break;
      case "split":
        this.noise(time, 0.19, 0.2, 1300, bus);
        this.tone(230, time, 0.19, "sawtooth", 0.08, bus, 45);
        this.tone(570, time + 0.025, 0.1, "square", 0.04, bus, 165);
        break;
      case "robot-destroy":
        this.noise(time, 0.48, 0.2, 1100, bus);
        [210, 150, 92, 55].forEach((hz, i) =>
          this.tone(
            hz,
            time + i * 0.065,
            0.25,
            "triangle",
            0.12,
            bus,
            hz * 0.45,
          ),
        );
        break;
      case "destroy":
        this.noise(time, 0.28, 0.2, 850, bus);
        this.tone(110, time, 0.25, "triangle", 0.28, bus, 32);
        [76, 81, 88].forEach((note, index) => {
          this.tone(
            this.frequency(note),
            time + 0.045 * index,
            0.095,
            "square",
            0.035,
            bus,
          );
        });
        break;
      case "pickup":
        [69, 72, 76, 81, 84].forEach((note, index) => {
          this.tone(
            this.frequency(note),
            time + index * 0.055,
            0.14,
            "square",
            0.085,
            bus,
          );
        });
        break;
      case "ammo":
        [76, 81, 88].forEach((note, index) => {
          this.tone(
            this.frequency(note),
            time + index * 0.045,
            0.1,
            "triangle",
            0.19,
            bus,
          );
        });
        break;
      case "wave":
        [57, 64, 69, 72, 76, 81].forEach((note, index) => {
          this.tone(
            this.frequency(note),
            time + index * 0.075,
            0.2,
            "square",
            0.07,
            bus,
          );
        });
        break;
      case "gameover":
        [69, 67, 64, 60, 57, 45].forEach((note, index) => {
          this.tone(
            this.frequency(note),
            time + index * 0.14,
            index === 5 ? 0.65 : 0.22,
            "triangle",
            0.2,
            bus,
          );
        });
        break;
    }
  }

  private initialize(): boolean {
    if (this.context) return true;
    try {
      const BrowserAudioContext =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!BrowserAudioContext) return false;
      const context = new BrowserAudioContext();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = this.enabled ? 0.7 : 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -15;
      limiter.knee.value = 14;
      limiter.ratio.value = 5;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.12;
      this.master.connect(limiter);
      limiter.connect(context.destination);
      this.music = context.createGain();
      this.music.gain.value = this.scene === "menu" ? 0.23 : 0.34;
      // A quiet stereo dotted-eighth echo gives the chip palette space, without drums.
      for (const [delayTime, pan] of [
        [0.28, -0.72],
        [0.43, 0.72],
      ]) {
        const delay = context.createDelay(1);
        delay.delayTime.value = delayTime!;
        const echo = context.createGain();
        echo.gain.value = 0.17;
        const panner = context.createStereoPanner();
        panner.pan.value = pan!;
        this.music.connect(delay);
        delay.connect(echo);
        echo.connect(panner);
        panner.connect(this.master);
      }
      this.music.connect(this.master);
      this.effects = context.createGain();
      this.effects.gain.value = 0.65;
      this.effects.connect(this.master);
      this.noiseBuffer = context.createBuffer(
        1,
        context.sampleRate,
        context.sampleRate,
      );
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // Decode once while the opening screen plays. Never start a delayed voice
      // from this promise: a pause, mute, or finished run must stay quiet.
      void fetch("/assets/audio/boss-fight.wav")
        .then((response) =>
          response.ok
            ? response.arrayBuffer()
            : Promise.reject(new Error("Boss voice unavailable")),
        )
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          this.bossVoice = buffer;
        })
        .catch(() => {
          /* The synthesized warning remains available if audio cannot load. */
        });
      return true;
    } catch {
      this.context = null;
      return false;
    }
  }

  private unlock(): void {
    if (this.context?.state === "suspended")
      void this.context.resume().catch(() => undefined);
  }

  private startMusic(): void {
    if (!this.context || !this.enabled || this.paused || this.timer !== null)
      return;
    this.anchor = this.context.currentTime;
    this.master!.gain.setTargetAtTime(0.7, this.anchor, 0.015);
    this.music!.gain.setValueAtTime(
      this.scene === "menu" ? 0.23 : 0.34,
      this.anchor,
    );
    if (this.decks.length === 0) this.addDeck(this.trackIndex, this.transport);
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private fadeMusic(): void {
    if (!this.context || !this.music || !this.enabled || this.paused) return;
    const now = this.context.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setTargetAtTime(
      this.scene === "menu" ? 0.23 : 0.34,
      now,
      0.18,
    );
  }

  private advanceTransport(): void {
    if (this.timer === null || !this.context) return;
    const now = this.context.currentTime;
    this.transport += Math.max(0, now - this.anchor);
    this.anchor = now;
  }

  private stopSounds(): void {
    this.advanceTransport();
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (this.context && this.music)
      this.music.gain.setValueAtTime(0, this.context.currentTime);
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* The source may have ended between frames. */
      }
    }
    this.sources.clear();
    this.lastEffects.clear();
  }

  private clearDecks(): void {
    for (const deck of this.decks) deck.bus.disconnect();
    this.decks = [];
  }

  private addDeck(track: number, start: number): void {
    const bus = this.context!.createGain();
    bus.gain.value = this.decks.length ? 0 : 1;
    bus.connect(this.music!);
    this.decks.push({ track, start, nextStep: 0, bus });
    this.trackIndex = track;
  }

  private schedule(): void {
    if (!this.context || !this.music || !this.enabled || this.paused) return;
    this.advanceTransport();
    const now = this.context.currentTime;
    const current = this.decks[this.decks.length - 1];
    if (
      current &&
      this.transport >=
        current.start + trackDuration(MUSIC_TRACKS[current.track]!)
    ) {
      // Two independent arrangements overlap during a smooth, equal-power crossfade.
      current.retireAt = this.transport + MUSIC_CROSSFADE_SECONDS;
      this.addDeck((current.track + 1) % MUSIC_TRACKS.length, this.transport);
    }
    this.decks = this.decks.filter((deck) => {
      if (deck.retireAt !== undefined && this.transport >= deck.retireAt) {
        deck.bus.disconnect();
        return false;
      }
      const track = MUSIC_TRACKS[deck.track]!;
      const sixteenth = 60 / track.bpm / 4;
      const age = this.transport - deck.start;
      const fade =
        deck.retireAt !== undefined
          ? Math.cos(
              (Math.min(
                1,
                (this.transport - (deck.retireAt - MUSIC_CROSSFADE_SECONDS)) /
                  MUSIC_CROSSFADE_SECONDS,
              ) *
                Math.PI) /
                2,
            )
          : Math.sin(
              (Math.min(1, age / MUSIC_CROSSFADE_SECONDS) * Math.PI) / 2,
            );
      deck.bus.gain.setTargetAtTime(fade, now, 0.035);
      // Skip stale notes after hidden-tab throttling; never emit a catch-up burst.
      if (deck.nextStep * sixteenth < age - 0.18)
        deck.nextStep = Math.ceil(age / sixteenth);
      while (deck.nextStep * sixteenth < age + 0.14) {
        this.musicStep(
          deck,
          deck.nextStep,
          now + Math.max(0, deck.nextStep * sixteenth - age),
        );
        deck.nextStep++;
      }
      return true;
    });
  }

  private musicStep(deck: MusicDeck, step: number, time: number): void {
    const track = MUSIC_TRACKS[deck.track]!;
    const sixteenth = 60 / track.bpm / 4;
    const beat = step % 16;
    const bar = Math.floor(step / 16) % track.bars;
    const chord = track.chords[bar % track.chords.length]!;
    // Middle eight thins to floating chords and a few response notes, then blooms again.
    const quiet = bar >= 8 && bar < 12;
    const title = this.scene === "menu";
    const phrase = track.phrases[bar % track.phrases.length]!;
    if (beat === 0) {
      chord.forEach((note, i) =>
        this.pad(
          note,
          time + i * (title ? 0.09 : 0.03),
          sixteenth * 18,
          title ? 0.024 : quiet ? 0.034 : 0.028,
          deck.bus,
        ),
      );
    }
    const note = phrase[beat]!;
    if (
      note > 0 &&
      (!title || beat % 4 === 0 || beat === 7) &&
      (!quiet || beat === 0 || beat === 8 || (bar === 11 && beat >= 12))
    ) {
      const variation = bar >= 12 && beat >= 8 ? 12 : 0;
      this.melodicTone(
        note + variation,
        time,
        sixteenth * (title ? 4.2 : quiet ? 3.4 : 2.1),
        title ? "sine" : track.lead,
        title ? 0.085 : quiet ? 0.07 : 0.1,
        deck.bus,
        bar % 2 ? 0.24 : -0.24,
      );
      // Bell-like overtones distinguish the nocturnal and glassy compositions.
      if (deck.track === 1 || deck.track === 2) {
        this.melodicTone(
          note + variation + 12,
          time,
          sixteenth * 1.4,
          "sine",
          0.02,
          deck.bus,
          0.35,
        );
      }
    }
    const arpeggio = track.arpeggio[(beat + (bar % 2 ? 3 : 0)) % 16]!;
    if (!quiet && arpeggio >= 0 && (!title || beat % 3 === 0)) {
      this.melodicTone(
        chord[arpeggio]! + 12,
        time,
        sixteenth * (title ? 3 : 1.7),
        "triangle",
        title ? 0.035 : 0.055,
        deck.bus,
        -0.4,
      );
    }
  }

  private pad(
    note: number,
    time: number,
    duration: number,
    volume: number,
    bus: AudioNode,
  ): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = this.frequency(note);
    oscillator.detune.value = note % 2 ? -4 : 4;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + duration * 0.2);
    envelope.gain.linearRampToValueAtTime(
      volume * 0.72,
      time + duration * 0.65,
    );
    envelope.gain.linearRampToValueAtTime(0, time + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    this.track(oscillator, () => envelope.disconnect());
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  private melodicTone(
    note: number,
    time: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    bus: AudioNode,
    pan: number,
  ): void {
    const panner = this.context!.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(bus);
    this.tone(
      this.frequency(note),
      time,
      duration,
      type,
      volume,
      panner,
      undefined,
      () => panner.disconnect(),
    );
  }

  private frequency(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  private tone(
    frequency: number,
    time: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    destination: AudioNode,
    endFrequency?: number,
    cleanup?: () => void,
  ): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        time + duration,
      );
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    this.track(oscillator, () => {
      envelope.disconnect();
      cleanup?.();
    });
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  private noise(
    time: number,
    duration: number,
    volume: number,
    cutoff: number,
    destination: AudioNode,
    highpass = false,
  ): void {
    if (!this.noiseBuffer) return;
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = highpass ? "highpass" : "lowpass";
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    this.track(source, () => {
      filter.disconnect();
      envelope.disconnect();
    });
    source.start(time, Math.random() * 0.5);
    source.stop(time + duration + 0.01);
  }

  private track(source: AudioScheduledSourceNode, cleanup: () => void): void {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      cleanup();
    };
  }
}
