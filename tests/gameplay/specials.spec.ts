import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

test("specials clear clutter, target the leftmost threat and render a wide blast", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#enter").click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti);

  const homing = await page.evaluate(async () => {
    const { inspectHomingPriority } =
      await import("/tests/gameplay/specials-browser.ts");

    return inspectHomingPriority();
  });

  expect(homing.target).toBe(homing.urgent);
  expect(homing.target).not.toBe(homing.near);
  await verifyLintCleanup(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath("grenade-blast.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath("specials-mobile.png") });
  expect(errors).toEqual([]);
});

async function verifyLintCleanup(page: Page, testInfo: TestInfo) {
  await page.screenshot({ path: testInfo.outputPath("lint-before.png") });

  const cleanup = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

    s.world.specials = [];
    s.selectSpecial("lint");
    s.fireSpecial();
    r.update(0.08);

    return {
      count: s.world.blocks.length,
      destroyed: s.progress.blocksDestroyed,
      generations: s.world.blocks.map((b: any) => b.generation),
      meshes: w.blocks.size,
      pulse: w.scene.getObjectByName("lint-bomb-screen-wave").visible,
    };
  });

  expect(cleanup).toEqual({
    count: 2,
    destroyed: 2,
    generations: [1, 1],
    meshes: 2,
    pulse: true,
  });
  await page.screenshot({ path: testInfo.outputPath("lint-after.png") });

  const blast = await page.evaluate(async () => {
    const { inspectGrenadeBlast } =
      await import("/tests/gameplay/specials-browser.ts");

    return inspectGrenadeBlast();
  });

  expect(blast).toEqual({ radius: 300, alive: 1, visibleBlast: true });
}
