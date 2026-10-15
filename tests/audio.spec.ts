import { expect, test } from "@playwright/test";

test("title music unlocks on a gesture, transitions into the run, and returns without duplicate schedulers", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await page.evaluate(async () => {
    const { AudioEngine } = await new Function(
      'return import("/src/game/audio.ts")',
    )();
    const audio = new AudioEngine();
    (window as any).__menuAudioTest = audio;
    document.addEventListener("pointerdown", () => audio.enterMenu(), {
      once: true,
    });
    return { started: audio.started, context: audio.context };
  });
  expect(initial).toEqual({ started: false, context: null });
  await page.mouse.click(10, 10);
  await page.waitForTimeout(250);
  const menu = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    const timer = a.timer;
    a.enterMenu();
    a.enterMenu();
    a.play("menu-hover");
    const hoverVoices = a.sources.size;
    a.play("menu-hover");
    return {
      state: a.context.state,
      scene: a.scene,
      singleTimer: timer === a.timer,
      voices: a.sources.size,
      hoverLimited: a.sources.size === hoverVoices,
      gain: a.music.gain.value,
    };
  });
  expect(menu.state).toBe("running");
  expect(menu.scene).toBe("menu");
  expect(menu.singleTimer).toBe(true);
  expect(menu.hoverLimited).toBe(true);
  expect(menu.voices).toBeGreaterThan(0);
  expect(menu.gain).toBeCloseTo(0.23, 2);
  const run = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    const timer = a.timer;
    const transport = a.transport;
    a.enterGame();
    a.play("menu-click");
    return {
      scene: a.scene,
      sameTimer: a.timer === timer,
      sameTransport: a.transport === transport,
    };
  });
  expect(run).toEqual({ scene: "game", sameTimer: true, sameTransport: true });
  await page.waitForTimeout(700);
  expect(
    await page.evaluate(() => (window as any).__menuAudioTest.music.gain.value),
  ).toBeGreaterThan(0.33);
  const returned = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.finish();
    a.enterMenu();
    a.pause();
    a.resume();
    return {
      scene: a.scene,
      timer: a.timer !== null,
      paused: a.paused,
      voices: a.sources.size,
    };
  });
  expect(returned.scene).toBe("menu");
  expect(returned.timer).toBe(true);
  expect(returned.paused).toBe(false);
  const muted = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.setEnabled(false);
    a.enterMenu();
    a.play("menu-click");
    a.play("menu-hover");
    return { timer: a.timer, voices: a.sources.size };
  });
  expect(muted).toEqual({ timer: null, voices: 0 });
  const unmuted = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.setEnabled(true);
    const result = { timer: a.timer !== null, scene: a.scene };
    a.pause();
    void a.context.close();
    return result;
  });
  expect(unmuted).toEqual({ timer: true, scene: "menu" });
});

test("real audio context crossfades scores and preserves transport through pause and mute", async ({
  page,
}) => {
  await page.goto("/");
  await page.mouse.click(10, 10);
  const initial = await page.evaluate(async () => {
    const { AudioEngine } = await new Function(
      'return import("/src/game/audio.ts")',
    )();
    const audio = new AudioEngine();
    (window as any).__audioTest = audio;
    audio.start();
    await audio.context.resume();
    return {
      state: audio.context.state,
      name: audio.trackName,
      timer: audio.timer !== null,
    };
  });
  expect(initial).toEqual({
    state: "running",
    name: "Prism Circuit",
    timer: true,
  });
  await page.waitForTimeout(180);
  const transition = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.transport = 32.1;
    a.anchor = a.context.currentTime;
    a.schedule();
    return {
      decks: a.decks.length,
      name: a.trackName,
      retiring: a.decks[0].retireAt > a.transport,
    };
  });
  expect(transition).toEqual({
    decks: 2,
    name: "Midnight Refactor",
    retiring: true,
  });
  await page.waitForTimeout(250);
  const crossfade = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    return a.decks.map((d: any) => d.bus.gain.value);
  });
  expect(crossfade[0]).toBeGreaterThan(0);
  expect(crossfade[1]).toBeGreaterThan(0);
  expect(crossfade[1]).toBeLessThan(1);
  const paused = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.pause();
    return a.transport;
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__audioTest;
      return {
        transport: a.transport,
        timer: a.timer,
        voices: a.sources.size,
        gain: a.master.gain.value,
      };
    }),
  ).toEqual({ transport: paused, timer: null, voices: 0, gain: 0 });
  const resumed = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.resume();
    const timer = a.timer;
    a.resume();
    a.start();
    a.setEnabled(true);
    a.setEnabled(true);
    ["missile", "grenade", "explosion", "stun", "hazard", "recover"].forEach(
      (e) => a.play(e),
    );
    return {
      singleTimer: timer === a.timer,
      voices: a.sources.size,
      decks: a.decks.length,
    };
  });
  expect(resumed.singleTimer).toBe(true);
  expect(resumed.voices).toBeGreaterThan(0);
  expect(resumed.decks).toBe(2);
  const muted = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.setEnabled(false);
    return a.transport;
  });
  await page.waitForTimeout(180);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__audioTest;
      return { transport: a.transport, timer: a.timer, voices: a.sources.size };
    }),
  ).toEqual({ transport: muted, timer: null, voices: 0 });
  const end = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.setEnabled(true);
    a.setWave(4);
    a.setWave(1);
    const name = a.trackName;
    a.finish();
    const sting = a.sources.size;
    a.pause();
    a.clearDecks();
    void a.context.close();
    return { name, sting, stopped: a.timer === null };
  });
  expect(end.name).toBe("Prism Circuit");
  expect(end.sting).toBeGreaterThan(0);
  expect(end.stopped).toBe(true);
});

test("bundled boss voice decodes, plays once with its cue and stops on pause or mute", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#enter").click();
  await page.evaluate(async () => {
    const { AudioEngine } = await new Function(
      'return import("/src/game/audio.ts")',
    )();
    const audio = new AudioEngine();
    (window as any).__bossAudio = audio;
    audio.enterGame();
  });
  await page.waitForFunction(() => !!(window as any).__bossAudio.bossVoice);
  const voice = await page.evaluate(() => {
    const a = (window as any).__bossAudio;
    a.play("boss");
    const source = [...a.sources].find(
      (s: any) => s.buffer === a.bossVoice,
    ) as AudioBufferSourceNode;
    const data = a.bossVoice.getChannelData(0);
    const result = {
      duration: a.bossVoice.duration,
      audible: data.some((v: number) => Math.abs(v) > 0.1),
      sources: [...a.sources].filter((s: any) => s.buffer === a.bossVoice)
        .length,
      played: !!source,
    };
    a.pause();
    return { ...result, stopped: a.sources.size === 0 };
  });
  expect(voice).toMatchObject({
    audible: true,
    sources: 1,
    played: true,
    stopped: true,
  });
  expect(voice.duration).toBeGreaterThan(0.7);
  expect(voice.duration).toBeLessThan(1.5);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__bossAudio;
      a.resume();
      a.setEnabled(false);
      a.play("boss");
      const muted = a.sources.size === 0;
      a.pause();
      void a.context.close();
      return muted;
    }),
  ).toBe(true);
});
