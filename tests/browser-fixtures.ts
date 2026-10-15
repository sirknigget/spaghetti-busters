import { expect, type Page } from "@playwright/test";

export async function enterGame(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Click to play", exact: true })
    .click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti);
}

export async function startDebrisGame(page: Page) {
  await enterGame(page);
  await page.waitForFunction(() => !!(window as any).__spaghetti?.world.debris);
}

export function collectBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  return errors;
}

export async function verifyFrozenGameplay(page: Page) {
  const time = await page.evaluate(
    () => (window as any).__spaghetti.simulation.progress.elapsed,
  );
  const frame = await page.evaluate(
    () => (window as any).__spaghetti.scene.lastFrame,
  );

  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__spaghetti.scene.lastFrame),
    )
    .toBeGreaterThan(frame);
  expect(
    await page.evaluate(
      () => (window as any).__spaghetti.simulation.progress.elapsed,
    ),
  ).toBe(time);

  return time;
}
