import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function verifyTrackCrossfade(page: Page) {
  const transition = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.score.transport = 32.1;
    a.score.anchor = a.graph.context.currentTime;
    a.score.schedule();

    return {
      decks: a.score.decks.length,
      name: a.trackName,
      retiring: a.score.decks[0].retireAt > a.score.transport,
    };
  });
  expect(transition).toEqual({
    decks: 2,
    name: "Midnight Refactor",
    retiring: true,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__audioTest.score.decks[1].bus.gain.value,
      ),
    )
    .toBeGreaterThan(0);
  const crossfade = await page.evaluate(() => {
    const a = (window as any).__audioTest;

    return a.score.decks.map((d: any) => d.bus.gain.value);
  });
  expect(crossfade[0]).toBeGreaterThan(0);
  expect(crossfade[1]).toBeGreaterThan(0);
  expect(crossfade[1]).toBeLessThan(1);
}

export async function verifyPausedTransport(page: Page) {
  const paused = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.pause();

    return { transport: a.score.transport, clock: a.graph.context.currentTime };
  });
  // The audio clock keeps processing while the musical transport remains paused.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__audioTest.graph.context.currentTime,
      ),
    )
    .toBeGreaterThan(paused.clock + 0.1);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__audioTest;

      return {
        transport: a.score.transport,
        timer: a.score.timer,
        voices: a.synth.sources.size,
        gain: a.graph.master.gain.value,
      };
    }),
  ).toEqual({ transport: paused.transport, timer: null, voices: 0, gain: 0 });
}

export async function verifyResumedScheduler(page: Page) {
  const resumed = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.resume();
    const timer = a.score.timer;
    a.resume();
    a.start();
    a.setEnabled(true);
    a.setEnabled(true);
    ["missile", "grenade", "explosion", "stun", "hazard", "recover"].forEach(
      (e) => a.play(e),
    );

    return {
      singleTimer: timer === a.score.timer,
      voices: a.synth.sources.size,
      decks: a.score.decks.length,
    };
  });
  expect(resumed.singleTimer).toBe(true);
  expect(resumed.voices).toBeGreaterThan(0);
  expect(resumed.decks).toBe(2);
}

export async function verifyMutedTransport(page: Page) {
  const muted = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.setEnabled(false);

    return { transport: a.score.transport, clock: a.graph.context.currentTime };
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__audioTest.graph.context.currentTime,
      ),
    )
    .toBeGreaterThan(muted.clock + 0.1);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__audioTest;

      return {
        transport: a.score.transport,
        timer: a.score.timer,
        voices: a.synth.sources.size,
      };
    }),
  ).toEqual({ transport: muted.transport, timer: null, voices: 0 });
}

export async function verifyFinishSting(page: Page) {
  const end = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.setEnabled(true);
    a.setWave(4);
    a.setWave(1);
    const name = a.trackName;
    a.finish();
    const sting = a.synth.sources.size;
    a.pause();
    a.score.clearDecks();
    void a.graph.context.close();

    return { name, sting, stopped: a.score.timer === null };
  });
  expect(end.name).toBe("Prism Circuit");
  expect(end.sting).toBeGreaterThan(0);
  expect(end.stopped).toBe(true);
}
