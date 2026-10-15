import type { TestInfo } from "@playwright/test";
import { expect, test, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/");
  await page.locator("#enter").click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti?.world.debris);
}

test("hits create entropy-driven debris, falling letters, smoke and sparks without changing gameplay", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const hit = await page.evaluate(async () => {
    const modulePath = "/tests/physics-browser.ts";
    const { inspectHit } = await import(modulePath);

    return inspectHit();
  });
  expect(hit.effects.letters).toBeGreaterThan(0);
  expect(hit.effects.rigidBodies).toBeGreaterThan(0);
  expect(hit.holes).toBeGreaterThan(0);
  expect(hit.ragged).toBe(true);
  expect(hit.smoke).toBeGreaterThan(0);
  expect(hit.sparks).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("impact.png") });
  await verifyFallingDebris(page, testInfo);
  await verifyPausedDebris(page);
  expect(errors).toEqual([]);
});

test("fractures preserve the same surface and holes through repeated splits and damage", async ({
  page,
}, testInfo) => {
  await start(page);
  const fracture = await page.evaluate(async () => {
    const modulePath = "/tests/physics-browser.ts";
    const { inspectInitialFracture } = await import(modulePath);

    return inspectInitialFracture();
  });
  expect(fracture).toMatchObject({
    count: 2,
    inherited: true,
    clipped: true,
    afterDamage: true,
  });
  expect(fracture.offsets[0]).not.toEqual(fracture.offsets[1]);
  await page.screenshot({ path: testInfo.outputPath("torn-surface.png") });
  const repeated = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    const original = w.blocks.get(s.world.blocks[0].id).userData.fractureVisual
      .canvas;
    s.runtime.specialCooldown = 0;
    s.player.specialAmmo.lint = 1;
    s.selectSpecial("lint");
    s.fireSpecial();
    r.update(0.18);

    return {
      count: s.world.blocks.length,
      inherited: s.world.blocks.every((b: any) => {
        const v = w.blocks.get(b.id).userData.fractureVisual;

        return v.canvas === original && v.regions.length === 3;
      }),
    };
  });
  expect(repeated).toEqual({ count: 4, inherited: true });
  await page.screenshot({ path: testInfo.outputPath("repeated-fracture.png") });
});

test("fifteenth hit dismantles the actual robot into physical assemblies that settle on the pavement", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const outcome = await page.evaluate(async () => {
    const modulePath = "/tests/physics-browser.ts";
    const { inspectRobotDismantling } = await import(modulePath);

    return inspectRobotDismantling();
  });
  expect(outcome.before).toEqual({ health: 1, alive: 1 });
  expect(outcome.alive).toBe(0);
  expect(outcome.effects.robotParts).toBeGreaterThan(6);
  expect(outcome.head).toBe(true);
  expect(outcome.arm).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("robot-dismantles.png") });
  await verifyRobotWreckage(page, testInfo);
  expect(errors).toEqual([]);
});

async function verifyRobotWreckage(page: Page, testInfo: TestInfo) {
  const settled = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;
    for (let i = 0; i < 600; i++) {
      w.debris.update(1 / 120);
    }
    r.draw();

    return { effects: w.debris.diagnostics, bodies: w.debris.bodySnapshots };
  });
  expect(settled.effects.settled).toBeGreaterThan(5);
  expect(
    settled.bodies
      .filter((b: any) => b.kind === "robot")
      .every((b: any) => b.y >= 40),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("robot-wreckage.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath("wreckage-mobile.png") });
  const reset = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;
    r.reset();

    return w.debris.diagnostics;
  });
  expect(reset.rigidBodies).toBe(0);
  expect(reset.particles).toBe(0);
}

async function verifyFallingDebris(page: Page, testInfo: TestInfo) {
  const fall = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    const gameplay = () =>
      JSON.stringify({
        blocks: s.world.blocks,
        robots: s.world.robots,
        score: s.progress.score,
        ammo: s.player.ammo,
        elapsed: s.progress.elapsed,
      });
    const before = gameplay();
    const start = w.debris.bodySnapshots;
    for (let i = 0; i < 240; i++) {
      w.debris.update(1 / 120);
    }
    const end = w.debris.bodySnapshots;
    r.draw();

    return {
      unchanged: gameplay() === before,
      start,
      end,
      effects: w.debris.diagnostics,
    };
  });
  expect(fall.unchanged).toBe(true);
  expect(
    fall.end.some((p: any, i: number) => p.y < fall.start[i].y - 100),
  ).toBe(true);
  expect(fall.end.every((p: any) => p.y >= 40)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("debris-on-floor.png") });
}

async function verifyPausedDebris(page: Page) {
  const paused = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;
    const before = w.debris.bodySnapshots;
    r.draw();
    r.draw();

    return JSON.stringify(before) === JSON.stringify(w.debris.bodySnapshots);
  });
  expect(paused).toBe(true);
}
