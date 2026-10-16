import { expect, type Page } from "@playwright/test";

export async function verifyTouchReviewAndPause(page: Page) {
  await page.waitForFunction(
    () => (window as any).__spaghetti.simulation.runtime.specialCooldown === 0,
  );
  await page.locator("#select-review").tap();
  await expect(page.locator("#select-review")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#fire-special").tap();
  await expect(page.locator("#review-ammo")).toHaveText("0");
  await expect(page.locator("#combo")).toContainText("ENEMIES FROZEN");
  await page.locator("#pause").click();
  await expect(page.locator("#resume")).toBeInViewport();
}

export async function verifyTouchFireAndGrenades(page: Page) {
  const box = await page.locator("canvas").boundingBox();

  await page.touchscreen.tap(
    box!.x + box!.width * 0.7,
    box!.y + box!.height * 0.45,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.shotsFired,
      ),
    )
    .toBeGreaterThan(0);
  await page.locator("#select-grenade").tap();
  await expect(page.locator("#select-grenade")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#fire-special").tap();
  await expect(page.locator("#grenade-ammo")).toHaveText("1");
  for (const selector of [
    "#select-homing",
    "#select-grenade",
    "#select-review",
    "#select-lint",
    "#fire-special",
  ]) {
    await expect(page.locator(selector)).toBeInViewport();
  }
}
