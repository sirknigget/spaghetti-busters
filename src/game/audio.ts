/** Original, asset-free arcade soundtrack and sound effects. Starts on a user gesture. */
export class AudioEngine {
  enabled = true;

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private lastEffects = new Map<string, number>();
  private started = false;
  private paused = false;
  private nextBeat = 0;
  private step = 0;
  private readonly sixteenth = 60 / 156 / 4;

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
      this.master.gain.setTargetAtTime(enabled ? 0.7 : 0, context.currentTime, 0.015);
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
  }

  /** Stop the groove but let the final descending sting finish naturally. */
  finish(): void {
    this.stopSounds();
    this.play('gameover');
    this.paused = true;
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
    if (!context || !this.effects || !this.enabled || this.paused || !this.started) return;
    const time = context.currentTime;
    const previous = this.lastEffects.get(event) ?? -Infinity;
    if (time - previous < (event === 'hit' ? 0.032 : event === 'shot' ? 0.035 : 0.065)) return;
    this.lastEffects.set(event, time);
    const bus = this.effects;
    switch (event) {
      case 'shot':
        this.tone(720, time, 0.085, 'square', 0.1, bus, 135);
        this.noise(time, 0.035, 0.045, 1800, bus);
        break;
      case 'hit':
        this.tone(210 + Math.random() * 130, time, 0.06, 'triangle', 0.16, bus, 70);
        this.noise(time, 0.06, 0.07, 1100, bus);
        break;
      case 'split':
        this.noise(time, 0.19, 0.2, 1300, bus);
        this.tone(230, time, 0.19, 'sawtooth', 0.08, bus, 45);
        this.tone(570, time + 0.025, 0.1, 'square', 0.04, bus, 165);
        break;
      case 'destroy':
        this.noise(time, 0.28, 0.2, 850, bus);
        this.tone(110, time, 0.25, 'triangle', 0.28, bus, 32);
        [76, 81, 88].forEach((note, index) => {
          this.tone(this.frequency(note), time + 0.045 * index, 0.095, 'square', 0.035, bus);
        });
        break;
      case 'pickup':
        [69, 72, 76, 81, 84].forEach((note, index) => {
          this.tone(this.frequency(note), time + index * 0.055, 0.14, 'square', 0.085, bus);
        });
        break;
      case 'ammo':
        [76, 81, 88].forEach((note, index) => {
          this.tone(this.frequency(note), time + index * 0.045, 0.1, 'triangle', 0.19, bus);
        });
        break;
      case 'wave':
        [57, 64, 69, 72, 76, 81].forEach((note, index) => {
          this.tone(this.frequency(note), time + index * 0.075, 0.2, 'square', 0.07, bus);
        });
        break;
      case 'gameover':
        [69, 67, 64, 60, 57, 45].forEach((note, index) => {
          this.tone(this.frequency(note), time + index * 0.14, index === 5 ? 0.65 : 0.22, 'triangle', 0.2, bus);
        });
        break;
    }
  }

  private initialize(): boolean {
    if (this.context) return true;
    try {
      const BrowserAudioContext = window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      this.music.gain.value = 0.28;
      this.music.connect(this.master);
      this.effects = context.createGain();
      this.effects.gain.value = 0.65;
      this.effects.connect(this.master);
      this.noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      this.context = null;
      return false;
    }
  }

  private unlock(): void {
    if (this.context?.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  private startMusic(): void {
    if (!this.context || !this.enabled || this.paused || this.timer !== null) return;
    this.nextBeat = this.context.currentTime + 0.04;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private stopSounds(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* The source may have ended between frames. */ }
    }
    this.sources.clear();
    this.lastEffects.clear();
  }

  private schedule(): void {
    if (!this.context || !this.music || !this.enabled || this.paused) return;
    const now = this.context.currentTime;
    // Hidden tabs may stall timers. Resume at the next note, without a burst of old notes.
    if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.025;
    while (this.nextBeat < now + 0.14) {
      this.musicStep(this.step, this.nextBeat);
      this.step = (this.step + 1) % 64;
      this.nextBeat += this.sixteenth;
    }
  }

  private musicStep(step: number, time: number): void {
    const bus = this.music!;
    const beat = step % 16;
    const bar = Math.floor(step / 16);
    const root = [33, 29, 36, 31][bar]!;
    if (beat % 4 === 0) {
      this.tone(145, time, 0.17, 'sine', 0.65, bus, 40);
      this.noise(time, 0.018, 0.035, 1700, bus);
    }
    if (beat === 4 || beat === 12) {
      this.noise(time, 0.105, 0.23, 2400, bus);
      this.tone(175, time, 0.065, 'triangle', 0.14, bus, 95);
    }
    if (beat % 2 === 0 || beat === 15) {
      this.noise(time, beat === 14 ? 0.08 : 0.033, beat % 4 === 2 ? 0.09 : 0.045, 7800, bus, true);
    }
    if (beat % 2 === 0) {
      const bass = root + ([0, 0, 12, 0, 7, 0, 12, 7][beat / 2] ?? 0);
      this.tone(this.frequency(bass), time, 0.14, 'triangle', 0.42, bus);
      this.tone(this.frequency(bass + 12), time, 0.09, 'square', 0.045, bus);
    }
    const melodies = [
      [76, -1, 81, 79, -1, 76, 72, -1, 74, -1, 76, -1, 79, 76, 72, 74],
      [77, -1, 81, -1, 84, 81, -1, 77, 76, -1, 72, 76, -1, 77, 76, 72],
      [76, -1, 79, 84, -1, 79, 76, -1, 74, 76, -1, 79, 84, -1, 83, 79],
      [74, -1, 79, -1, 83, 79, 74, -1, 76, -1, 79, 76, 74, 71, 74, 76],
    ];
    const note = melodies[bar]![beat]!;
    if (note > 0) {
      this.tone(this.frequency(note), time, 0.115, 'square', beat % 4 === 0 ? 0.075 : 0.055, bus);
      // A quiet octave echo gives the chip lead a wider, contemporary tail.
      this.tone(this.frequency(note - 12), time + this.sixteenth * 1.5, 0.09, 'triangle', 0.055, bus);
    }
  }

  private frequency(midi: number): number { return 440 * 2 ** ((midi - 69) / 12); }

  private tone(frequency: number, time: number, duration: number, type: OscillatorType,
    volume: number, destination: AudioNode, endFrequency?: number): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    this.track(oscillator, () => envelope.disconnect());
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  private noise(time: number, duration: number, volume: number, cutoff: number,
    destination: AudioNode, highpass = false): void {
    if (!this.noiseBuffer) return;
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    this.track(source, () => { filter.disconnect(); envelope.disconnect(); });
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
