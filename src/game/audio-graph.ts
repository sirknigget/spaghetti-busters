import { MIX } from "./audio-config";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/** Shared Web Audio routing; created only after a trusted browser gesture. */
export class AudioGraph {
  readonly master: GainNode;
  readonly music: GainNode;
  readonly effects: GainNode;
  readonly noiseBuffer: AudioBuffer;
  bossVoice: AudioBuffer | null = null;

  constructor(
    readonly context: AudioContext,
    enabled: boolean,
  ) {
    this.master = context.createGain();
    this.master.gain.value = enabled ? MIX.masterVolume : 0;
    this.connectLimiter();
    this.music = context.createGain();
    this.connectEchoes();
    this.music.connect(this.master);
    this.effects = context.createGain();
    this.effects.gain.value = 0.65;
    this.effects.connect(this.master);
    this.noiseBuffer = this.createNoise();
  }

  private connectLimiter() {
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.knee.value = 14;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.12;
    this.master.connect(limiter);
    limiter.connect(this.context.destination);
  }

  private connectEchoes() {
    // A quiet stereo dotted-eighth echo gives the chip palette space, without drums.
    for (const [delayTime, pan] of [
      [MIX.echoLeftDelay, -MIX.echoPan],
      [MIX.echoRightDelay, MIX.echoPan],
    ]) {
      const delay = this.context.createDelay(1);
      delay.delayTime.value = delayTime!;
      const echo = this.context.createGain();
      echo.gain.value = 0.17;
      const panner = this.context.createStereoPanner();
      panner.pan.value = pan!;
      this.music.connect(delay);
      delay.connect(echo);
      echo.connect(panner);
      panner.connect(this.master);
    }
  }

  private createNoise() {
    const context = this.context;
    const buffer = context.createBuffer(
      1,
      context.sampleRate,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * MIX.bipolarRange - 1;
    }

    return buffer;
  }

  async loadVoice() {
    // Decode once; playback remains gated by the engine's mute/pause state.
    try {
      const response = await fetch("/assets/audio/boss-fight.wav");
      if (response.ok) {
        this.bossVoice = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
      }
    } catch {
      /* The synthesized warning remains available if audio cannot load. */
    }
  }
}

export function openAudioGraph(enabled: boolean): AudioGraph | null {
  try {
    const Context = window.AudioContext ?? window.webkitAudioContext;

    if (!Context) {
      return null;
    }
    const graph = new AudioGraph(new Context(), enabled);
    void graph.loadVoice();

    return graph;
  } catch {
    return null;
  }
}
