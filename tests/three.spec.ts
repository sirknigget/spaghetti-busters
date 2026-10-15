import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Click to play", exact: true })
    .click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti);
}

test("WebGL renders solid code and models with real three-axis rotation and damage holes", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);

  const initial = await inspectInitialWebGL(page);

  expect(initial).toMatchObject({
    webgl: true,
    perspective: true,
    shadows: true,
    specialist: true,
    cannon: true,
    environment: true,
    rotatesX: true,
    rotatesY: true,
  });
  expect(initial.depth).toBeGreaterThan(20);
  expect(initial.triangles).toBeGreaterThan(1000);

  const damaged = await page.evaluate(async () => {
    const modulePath = "/tests/three-browser.ts";
    const { inspectDamageHole } = await import(modulePath);

    return inspectDamageHole();
  });

  expect(damaged).toMatchObject({
    removed: 1,
    coversHole: false,
    disposed: true,
    staleRemoved: true,
  });
  expect(damaged.cache).toBe(damaged.live);
  expect(errors).toEqual([]);
});

test("WebGL context loss pauses safely and restores the scene", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const { renderer } = (window as any).__spaghetti;

    (window as any).__contextExtension = renderer
      .getContext()
      .getExtension("WEBGL_lose_context");
    if (!(window as any).__contextExtension) {
      throw new Error("Browser has no context-loss testing extension");
    }

    (window as any).__contextExtension.loseContext();
  });
  await expect(page.locator("#game-overlay")).toBeVisible();
  await expect(page.locator("#resume")).toBeDisabled();

  const time = await verifyContextLossPause(page);

  await page.evaluate(() =>
    (window as any).__contextExtension.restoreContext(),
  );
  await expect(page.locator("#resume")).toBeEnabled();
  await page.locator("#resume").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.elapsed,
      ),
    )
    .toBeGreaterThan(time);
  await page.setViewportSize({ width: 1024, height: 650 });

  const box = await page.locator("canvas").boundingBox();

  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 2);
  expect(box!.width).toBeLessThanOrEqual(1024);
});

async function verifyContextLossPause(page: Page) {
  const time = await page.evaluate(
    () => (window as any).__spaghetti.simulation.progress.elapsed,
  );
  const lostFrame = await page.evaluate(
    () => (window as any).__spaghetti.scene.lastFrame,
  );

  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__spaghetti.scene.lastFrame),
    )
    .toBeGreaterThan(lostFrame);
  expect(
    await page.evaluate(
      () => (window as any).__spaghetti.simulation.progress.elapsed,
    ),
  ).toBe(time);

  return time;
}

async function inspectInitialWebGL(page: Page) {
  return await page.evaluate(async () => {
    const modulePath = "/tests/three-browser.ts";
    const { inspectInitialWebGL } = await import(modulePath);

    return inspectInitialWebGL();
  });
}
