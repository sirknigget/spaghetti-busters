import { verifyFrozenGameplay } from "./browser-fixtures";
import { expect, test, type Page } from "@playwright/test";
import { collectReleasedTripleShot } from "./game-bonus-checks";
import { point, start, verifyResumedKeyboardControls } from "./game-input";

test("pointer fire chips code, scores points and renders without errors", async ({
  page,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await point(page, 1000, 330);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.score,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.progress.shotsFired,
      ),
    )
    .toBeGreaterThan(3);
  await page.mouse.up();
  await verifyShotDamage(page);
  await expect(page.locator("#score")).not.toHaveText("000000");
  expect(errors).toEqual([]);
});

async function verifyShotDamage(page: Page) {
  const state = await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    return {
      shots: s.progress.shotsFired,
      chipped: s.world.blocks.some((b: any) => b.hits > 0 || b.generation > 0),
      score: s.progress.score,
    };
  });

  expect(state.shots).toBeGreaterThan(3);
  expect(state.chipped).toBe(true);
  expect(state.score).toBeGreaterThan(0);
}

test("pause freezes the simulation, resume and keyboard controls work", async ({
  page,
}) => {
  await start(page);
  await page.keyboard.press("KeyP");
  await expect(page.locator("#game-overlay")).toBeVisible();

  const time = await verifyFrozenGameplay(page);

  await verifyResumedKeyboardControls(page, time);
});

test("magic variable releases a weapon and another hit equips it", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    s.world.blocks = [];
    s.spawnBlock({
      x: 650,
      y: 330,
      vx: 0,
      vy: 0,
      angle: 0,
      code: ["TRIPLE_SHOT = true;"],
    });
  });
  await point(page, 650, 328);
  await page.mouse.down();
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__spaghetti.simulation.world.pickups.length,
      ),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("#weapon")).toHaveText("SINGLE SHOT");
  await collectReleasedTripleShot(page);
});
