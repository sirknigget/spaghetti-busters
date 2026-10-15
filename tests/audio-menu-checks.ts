import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function verifyMenuScheduler(page: Page) {
  const menu = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    const timer = a.score.timer;
    a.enterMenu();
    a.enterMenu();
    a.play("menu-hover");
    const hoverVoices = a.synth.sources.size;
    a.play("menu-hover");

    return {
      state: a.graph.context.state,
      scene: a.score.scene,
      singleTimer: timer === a.score.timer,
      voices: a.synth.sources.size,
      hoverLimited: a.synth.sources.size === hoverVoices,
      gain: a.graph.music.gain.value,
    };
  });
  expect(menu.state).toBe("running");
  expect(menu.scene).toBe("menu");
  expect(menu.singleTimer).toBe(true);
  expect(menu.hoverLimited).toBe(true);
  expect(menu.voices).toBeGreaterThan(0);
  expect(menu.gain).toBeCloseTo(0.23, 2);
}

export async function verifyGameMusicTransition(page: Page) {
  const run = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    const timer = a.score.timer;
    const transport = a.score.transport;
    a.enterGame();
    a.play("menu-click");

    return {
      scene: a.score.scene,
      sameTimer: a.score.timer === timer,
      sameTransport: a.score.transport === transport,
    };
  });
  expect(run).toEqual({ scene: "game", sameTimer: true, sameTransport: true });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__menuAudioTest.graph.music.gain.value,
      ),
    )
    .toBeGreaterThan(0.33);
}

export async function verifyReturnToMenu(page: Page) {
  const returned = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.finish();
    a.enterMenu();
    a.pause();
    a.resume();

    return {
      scene: a.score.scene,
      timer: a.score.timer !== null,
      paused: a.paused,
      voices: a.synth.sources.size,
    };
  });
  expect(returned.scene).toBe("menu");
  expect(returned.timer).toBe(true);
  expect(returned.paused).toBe(false);
}

export async function verifyMenuMute(page: Page) {
  const muted = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.setEnabled(false);
    a.enterMenu();
    a.play("menu-click");
    a.play("menu-hover");

    return { timer: a.score.timer, voices: a.synth.sources.size };
  });
  expect(muted).toEqual({ timer: null, voices: 0 });
  const unmuted = await page.evaluate(() => {
    const a = (window as any).__menuAudioTest;
    a.setEnabled(true);
    const result = { timer: a.score.timer !== null, scene: a.score.scene };
    a.pause();
    void a.graph.context.close();

    return result;
  });
  expect(unmuted).toEqual({ timer: true, scene: "menu" });
}
