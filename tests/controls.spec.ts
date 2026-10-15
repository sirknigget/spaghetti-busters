import { expect, test } from "@playwright/test";
import {
  fireReviewThroughControls,
  verifyLintControls,
  verifyNumpadSelection,
  verifyReviewFreeze,
} from "./game-bonus-checks";
import { placeLargeLintTargets, placeSmallLintTarget } from "./game-fixtures";
import {
  holdPlayerStun,
  point,
  start,
  verifyBlockedControls,
} from "./game-input";

test("right click launches selected special and never fires the primary cannon", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await point(page, 900, 350);
  await page.mouse.click(1000, 440, { button: "right" });
  await expect(page.locator("#homing-ammo")).toHaveText("2");
  expect(
    await page.evaluate(
      () => (window as any).__spaghetti.simulation.progress.shotsFired,
    ),
  ).toBe(0);
  await page.keyboard.press("Digit2");
  await expect(page.locator("#select-grenade")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.waitForFunction(
    () => (window as any).__spaghetti.simulation.runtime.specialCooldown === 0,
  );
  await page.mouse.click(1000, 440, { button: "right" });
  await expect(page.locator("#grenade-ammo")).toHaveText("1");
  expect(
    await page.evaluate(
      () => (window as any).__spaghetti.simulation.progress.shotsFired,
    ),
  ).toBe(0);
  await page.keyboard.press("Digit1");
  await expect(page.locator("#select-homing")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("timeout collision paralyzes movement and all weapons, then recovers", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    s.spawnHazard({
      x: 100,
      y: s.player.playerY,
      durationMs: 2000,
      vx: 0,
      vy: 0,
    });
  });
  await expect(page.locator("#game-screen")).toHaveClass(/stunned/);
  await expect(page.locator("#combo")).toContainText("EVENT LOOP BLOCKED");

  const before = await holdPlayerStun(page);

  await verifyBlockedControls(page, before);
  await page.evaluate(() => {
    (window as any).__spaghetti.simulation.player.stunRemaining = 0.05;
  });
  await expect(page.locator("#game-screen")).not.toHaveClass(/stunned/);
  await page.mouse.click(1000, 650);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.shotsFired,
      ),
    )
    .toBeGreaterThan(before.shots);
});

test("review and lint use keys 3 and 4, freeze enemies, then split large code and clear small fragments", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await placeLargeLintTargets(page);
  await placeSmallLintTarget(page);
  await fireReviewThroughControls(page);
  await verifyReviewFreeze(page);
  await verifyLintControls(page);
  await verifyNumpadSelection(page);
  expect(errors).toEqual([]);
});
