import { startDebrisGame as start } from "#root/tests/shared/browser-fixtures.ts";
import { expect, test, type Page } from "@playwright/test";

function renderingErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

test("destroyed code collapses as its original perforated surface and physically settles without affecting gameplay", async ({
  page,
}, testInfo) => {
  const errors = renderingErrors(page);

  await start(page);

  const death = await page.evaluate(async () => {
    const { inspectCodeDisintegration } =
      await import("/tests/rendering/code-death-browser.ts");

    return inspectCodeDisintegration();
  });

  verifyDisintegrationSurface(death);
  await page.screenshot({
    path: testInfo.outputPath("code-disintegration-mid-fall.png"),
  });

  const settled = await page.evaluate(async () => {
    const { inspectSettled } =
      await import("/tests/rendering/code-death-browser.ts");

    return inspectSettled();
  });

  verifySettledDisintegration(settled);
  await page.screenshot({
    path: testInfo.outputPath("code-disintegration-on-floor.png"),
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({
    path: testInfo.outputPath("code-disintegration-mobile.png"),
  });
  await verifyDisintegrationReset(page);
  expect(errors).toEqual([]);
});

test("explosions, lint clearing and uncached boss deaths retain a surface even when every glyph is removed", async ({
  page,
}) => {
  const errors = renderingErrors(page);

  await start(page);

  const results = await page.evaluate(async () => {
    const { inspectSpecialCodeDeaths } =
      await import("/tests/rendering/code-death-browser.ts");

    return inspectSpecialCodeDeaths();
  });

  for (const result of results) {
    expect(result.wasCached).toBe(result.mode !== "uncached-boss");
    expect(result).toMatchObject({
      cleared: true,
      allGlyphsRemoved: true,
      surface: true,
      holes: true,
      glError: 0,
    });
    expect(result.effects.codeDeaths).toBe(1);
    expect(result.effects.codeParts).toBeGreaterThan(1);
    expect(result.effects.letters).toBeGreaterThan(0);
  }

  expect(errors).toEqual([]);
});

function verifyDisintegrationSurface(death: any) {
  expect(death.effects.codeDeaths).toBe(1);
  expect(death.effects.codeParts).toBeGreaterThanOrEqual(8);
  expect(death).toMatchObject({
    originalRemoved: true,
    originalCanvas: true,
    oldHoles: true,
    cleared: true,
  });
  expect(death.geometryCount).toBe(death.effects.codeParts);
  expect(death.areas.every((area: number) => area > 0)).toBe(true);
  expect(
    new Set(death.areas.map((area: number) => Math.round(area))).size,
  ).toBeGreaterThan(3);
  expect(death.effects.letters).toBeGreaterThan(6);
  expect(death.smoke).toBeGreaterThan(0);
  expect(death.sparks).toBeGreaterThan(0);
}

function verifySettledDisintegration(settled: any) {
  expect(settled.unchanged).toBe(true);
  expect(settled.pauseSafe).toBe(true);
  expect(settled.glError).toBe(0);
  expect(settled.end).toHaveLength(settled.start.length);
  expect(
    settled.end.some(
      (body: any, index: number) => body.y < settled.start[index].y - 100,
    ),
  ).toBe(true);
  expect(settled.end.every((body: any) => body.y >= 40)).toBe(true);
  expect(settled.effects.settled).toBeGreaterThan(0);
  expect(settled.effects.crumbled).toBeGreaterThan(0);
}

async function verifyDisintegrationReset(page: Page) {
  const reset = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;

    r.reset();

    return {
      effects: w.debris.diagnostics,
      fragments: w.scene.children.filter((mesh: any) =>
        mesh.name.startsWith("code-death-fragment-"),
      ).length,
    };
  });

  expect(reset.effects.rigidBodies).toBe(0);
  expect(reset.effects.particles).toBe(0);
  expect(reset.effects.codeDeaths).toBe(0);
  expect(reset.fragments).toBe(0);
}
