import { expect, type Page } from "@playwright/test";
import { point } from "./game-input";

export async function fireReviewThroughControls(page: Page) {
  await page.keyboard.press("Digit3");
  await expect(page.locator("#select-review")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await point(page, 900, 350);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await expect(page.locator("#review-ammo")).toHaveText("0");
  await expect(page.locator("#game-screen")).toHaveClass(/reviewing/);
  await expect(page.locator("#combo")).toContainText("ENEMIES FROZEN");
}

export async function verifyReviewFreeze(page: Page) {
  const { positions, freezeRemaining } = await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    return {
      positions: s.world.blocks.map((b: any) => ({ id: b.id, x: b.x, y: b.y })),
      freezeRemaining: s.player.freezeRemaining,
    };
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.player.freezeRemaining,
      ),
    )
    .toBeLessThan(freezeRemaining - 0.1);
  expect(
    await page.evaluate(() =>
      (window as any).__spaghetti.simulation.world.blocks.map((b: any) => ({
        id: b.id,
        x: b.x,
        y: b.y,
      })),
    ),
  ).toEqual(positions);
}

export async function verifyLintControls(page: Page) {
  await page.waitForFunction(
    () => (window as any).__spaghetti.simulation.runtime.specialCooldown === 0,
  );
  await page.keyboard.press("Digit4");
  await expect(page.locator("#select-lint")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await expect(page.locator("#lint-ammo")).toHaveText("0");
  const result = await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    return {
      count: s.world.blocks.length,
      smallSurvives: s.world.blocks.some(
        (b: any) => b.id === (window as any).__lintSmallId,
      ),
      shots: s.progress.shotsFired,
    };
  });
  expect(result.count).toBe(4);
  expect(result.smallSurvives).toBe(false);
  expect(result.shots).toBe(0);
}

export async function verifyNumpadSelection(page: Page) {
  await page.keyboard.press("Numpad3");
  await expect(page.locator("#select-review")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Numpad4");
  await expect(page.locator("#select-lint")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

export async function collectReleasedTripleShot(page: Page) {
  await page.evaluate(() => {
    const p = (window as any).__spaghetti.simulation.world.pickups[0];
    p.x = 600;
    p.y = 350;
    p.vx = 0;
    p.vy = 0;
  });
  await point(page, 600, 350);
  await page.mouse.down();
  await expect(page.locator("#weapon")).toHaveText("TRIPLE SHOT");
  await page.mouse.up();
  await expect(page.locator("#ammo")).toContainText("ROUNDS REMAINING");
  expect(
    await page.evaluate(
      () => (window as any).__spaghetti.simulation.player.ammo,
    ),
  ).toBeGreaterThan(12);
}
