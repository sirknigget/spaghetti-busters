import { expect, type Page } from "@playwright/test";
import { enterGame } from "./browser-fixtures";

export async function start(page: Page) {
  await enterGame(page);
  await expect(page.locator("#game-screen")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
}

export async function point(page: Page, x: number, y: number) {
  const box = await page.locator("canvas").boundingBox();

  await page.mouse.move(
    box!.x + (x / 1280) * box!.width,
    box!.y + (y / 720) * box!.height,
  );
}

export async function holdPlayerStun(page: Page) {
  return await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    // Keep slow software-WebGL input checks inside the stun window; recovery is
    // advanced explicitly below, independently of browser scheduling delays.
    s.player.stunRemaining = 30;

    return {
      y: s.player.playerY,
      shots: s.progress.shotsFired,
      ammo: s.player.specialAmmo.homing,
    };
  });
}

export async function verifyBlockedControls(
  page: Page,
  before: { y: any; shots: any; ammo: any },
) {
  await point(page, 900, 570);
  await page.mouse.down();

  const blockedTime = await page.evaluate(
    () => (window as any).__spaghetti.simulation.progress.elapsed,
  );

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.elapsed,
      ),
    )
    .toBeGreaterThan(blockedTime + 0.1);
  await page.mouse.up();
  await page.mouse.click(1000, 650, { button: "right" });

  const after = await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    return {
      y: s.player.playerY,
      shots: s.progress.shotsFired,
      ammo: s.player.specialAmmo.homing,
    };
  });

  expect(after).toEqual(before);
}

export async function verifyResumedKeyboardControls(page: Page, time: any) {
  await page.locator("#resume").click();
  await page.keyboard.down("ArrowDown");
  await page.keyboard.down("Space");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.player.playerY,
      ),
    )
    .toBeGreaterThan(400);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.shotsFired,
      ),
    )
    .toBeGreaterThan(1);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("Space");

  const state = await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    return {
      y: s.player.playerY,
      shots: s.progress.shotsFired,
      elapsed: s.progress.elapsed,
    };
  });

  expect(state.y).toBeGreaterThan(400);
  expect(state.shots).toBeGreaterThan(1);
  expect(state.elapsed).toBeGreaterThan(time);
}
