import { expect, test } from '@playwright/test';

test('real audio context crossfades scores and preserves transport through pause and mute', async ({ page }) => {
  await page.goto('/');
  await page.mouse.click(10, 10);
  const initial = await page.evaluate(async () => {
    const { AudioEngine } = await new Function('return import("/src/game/audio.ts")')();
    const audio = new AudioEngine();
    (window as any).__audioTest = audio;
    audio.start();
    await audio.context.resume();
    return { state: audio.context.state, name: audio.trackName, timer: audio.timer !== null };
  });
  expect(initial).toEqual({ state: 'running', name: 'Prism Circuit', timer: true });
  await page.waitForTimeout(180);
  const transition = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.transport = 32.1;
    a.anchor = a.context.currentTime;
    a.schedule();
    return { decks: a.decks.length, name: a.trackName, retiring: a.decks[0].retireAt > a.transport };
  });
  expect(transition).toEqual({ decks: 2, name: 'Midnight Refactor', retiring: true });
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
  expect(await page.evaluate(() => {
    const a = (window as any).__audioTest;
    return { transport: a.transport, timer: a.timer, voices: a.sources.size, gain: a.master.gain.value };
  })).toEqual({ transport: paused, timer: null, voices: 0, gain: 0 });
  const resumed = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.resume();
    const timer = a.timer;
    a.resume(); a.start(); a.setEnabled(true); a.setEnabled(true);
    ['missile', 'grenade', 'explosion', 'stun', 'hazard', 'recover'].forEach(e => a.play(e));
    return { singleTimer: timer === a.timer, voices: a.sources.size, decks: a.decks.length };
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
  expect(await page.evaluate(() => {
    const a = (window as any).__audioTest;
    return { transport: a.transport, timer: a.timer, voices: a.sources.size };
  })).toEqual({ transport: muted, timer: null, voices: 0 });
  const end = await page.evaluate(() => {
    const a = (window as any).__audioTest;
    a.setEnabled(true);
    a.setWave(4); a.setWave(1);
    const name = a.trackName;
    a.finish();
    const sting = a.sources.size;
    a.pause();
    a.clearDecks();
    void a.context.close();
    return { name, sting, stopped: a.timer === null };
  });
  expect(end.name).toBe('Prism Circuit');
  expect(end.sting).toBeGreaterThan(0);
  expect(end.stopped).toBe(true);
});
