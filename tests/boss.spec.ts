import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

test("fifth wave announces a solid factory boss, tracks damage and produces code; timeout stays legible", async ({
  page,
}, testInfo) => {
  const errors: string[] = collectBossErrors(page);

  await startBossBattle(page);

  const entry = await inspectBossEntry(page);

  expect(entry).toMatchObject({
    wave: 5,
    total: 1,
    count: 1,
    title: "FactoryFactoryFactory",
    reactor: true,
    armor: 6,
  });
  expect(entry.depth).toBeGreaterThan(50);
  expect(entry.health.current).toBe(entry.health.max);
  await verifyBossAnnouncement(page, testInfo);

  const battle = await inspectBossBattle(page);

  expect(battle.health.current).toBeLessThan(entry.health.current);
  expect(battle.generated).toBe(true);
  expect(battle.generatedSolid).toBeGreaterThan(20);
  expect(battle.timeout).toMatchObject({ height: 54, fontSize: 20 });
  expect(battle.timeout.width).toBeGreaterThan(300);
  await expect(page.locator("#boss-health-meter")).not.toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.locator("#boss-announcement")).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("boss-battle.png") });
  await verifyMobileBossLayout(page, testInfo);
  await verifyNextMobileBoss(page, testInfo);
  expect(errors).toEqual([]);
});

async function startBossBattle(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("/");
  await page.locator("#enter").click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti);
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
}

function collectBossErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) {
      errors.push(`${r.status()} ${r.url()}`);
    }
  });

  return errors;
}

async function inspectBossEntry(page: Page) {
  return await page.evaluate(async () => {
    const modulePath = "/tests/boss-browser.ts";
    const { inspectBossEntry } = await import(modulePath);

    return inspectBossEntry();
  });
}

async function verifyBossAnnouncement(page: Page, testInfo: TestInfo) {
  await expect(page.locator("#boss-announcement")).toBeVisible();
  await expect(page.locator("#boss-announcement h2")).toHaveText(
    "Boss fight - FactoryFactoryFactory is pushed to main!",
  );
  await expect(page.locator("#boss-health-meter")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await page.screenshot({ path: testInfo.outputPath("boss-arrival.png") });
  // Check both sides of the one-second boundary without wall-clock races.
  await page.clock.fastForward(999);
  await expect(page.locator("#boss-announcement")).toBeVisible();
  await page.clock.fastForward(1);
  await expect(page.locator("#boss-announcement")).toBeHidden();

  const timing = await page.evaluate(() => (window as any).__bossTiming);
  const shown = timing.find((x: any) => !x.hidden);
  const hidden = timing.find((x: any) => x.hidden);

  expect(hidden.time - shown.time).toBeGreaterThan(900);
  expect(hidden.time - shown.time).toBeLessThan(1400);
}

async function inspectBossBattle(page: Page) {
  return await page.evaluate(async () => {
    const modulePath = "/tests/boss-browser.ts";
    const { inspectBossBattle } = await import(modulePath);

    return inspectBossBattle();
  });
}

async function verifyMobileBossLayout(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath("boss-mobile.png") });

  const layout = await page.locator("#boss-health").boundingBox();

  expect(layout!.x).toBeGreaterThanOrEqual(0);
  expect(layout!.x + layout!.width).toBeLessThanOrEqual(844);
}

async function verifyNextMobileBoss(page: Page, testInfo: TestInfo) {
  await page.evaluate(() => {
    const { simulation: s, scene: r } = (window as any).__spaghetti;

    s.world.blocks = [];
    s.runtime.pendingBlocks = 0;
    s.runtime.waveTimer = 0.99;
    r.update(0.09); // Return to normal wave 6.
    s.world.blocks = [];
    s.runtime.pendingBlocks = 0;
    s.progress.wave = 9;
    s.runtime.waveTimer = 0.99;
    r.update(0.09);
    s.world.blocks.find((b: any) => b.boss).x = 905;
    r.draw();
  });
  await expect(page.locator("#boss-announcement")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("boss-arrival-mobile.png"),
  });
}
