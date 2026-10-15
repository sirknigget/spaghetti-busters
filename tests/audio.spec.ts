import { expect, test } from "@playwright/test";
import {
  verifyGameMusicTransition,
  verifyMenuMute,
  verifyMenuScheduler,
  verifyReturnToMenu,
} from "./audio-menu-checks";
import {
  verifyFinishSting,
  verifyMutedTransport,
  verifyPausedTransport,
  verifyResumedScheduler,
  verifyTrackCrossfade,
} from "./audio-transport-checks";
import { verifyBossVoice } from "./audio-voice-checks";

test("title music unlocks on a gesture, transitions into the run, and returns without duplicate schedulers", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await page.evaluate(async () => {
    const audioModulePath = "/src/game/audio.ts";
    const { AudioEngine } = await import(audioModulePath);
    const audio = new AudioEngine();
    (window as any).__menuAudioTest = audio;
    document.addEventListener("pointerdown", () => audio.enterMenu(), {
      once: true,
    });

    return { started: audio.started, context: audio.graph?.context ?? null };
  });
  expect(initial).toEqual({ started: false, context: null });
  await page.mouse.click(10, 10);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__menuAudioTest.graph.context.state),
    )
    .toBe("running");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__menuAudioTest.graph.music.gain.value,
      ),
    )
    .toBeCloseTo(0.23, 2);
  await verifyMenuScheduler(page);
  await verifyGameMusicTransition(page);
  await verifyReturnToMenu(page);
  await verifyMenuMute(page);
});

test("real audio context crossfades scores and preserves transport through pause and mute", async ({
  page,
}) => {
  await page.goto("/");
  await page.mouse.click(10, 10);
  const initial = await page.evaluate(async () => {
    const audioModulePath = "/src/game/audio.ts";
    const { AudioEngine } = await import(audioModulePath);
    const audio = new AudioEngine();
    (window as any).__audioTest = audio;
    audio.start();
    await audio.graph.context.resume();

    return {
      state: audio.graph.context.state,
      name: audio.trackName,
      timer: audio.score.timer !== null,
    };
  });
  expect(initial).toEqual({
    state: "running",
    name: "Prism Circuit",
    timer: true,
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__audioTest.synth.sources.size),
    )
    .toBeGreaterThan(0);
  await verifyTrackCrossfade(page);
  await verifyPausedTransport(page);
  await verifyResumedScheduler(page);
  await verifyMutedTransport(page);
  await verifyFinishSting(page);
});

test("bundled boss voice decodes, plays once with its cue and stops on pause or mute", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#enter").click();
  await page.evaluate(async () => {
    const audioModulePath = "/src/game/audio.ts";
    const { AudioEngine } = await import(audioModulePath);
    const audio = new AudioEngine();
    (window as any).__bossAudio = audio;
    audio.enterGame();
  });
  await page.waitForFunction(
    () => !!(window as any).__bossAudio.graph.bossVoice,
  );
  await verifyBossVoice(page);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__bossAudio;
      a.resume();
      a.setEnabled(false);
      a.play("boss");
      const muted = a.synth.sources.size === 0;
      a.pause();
      void a.graph.context.close();

      return muted;
    }),
  ).toBe(true);
});
