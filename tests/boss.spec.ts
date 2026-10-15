import { expect, test } from "@playwright/test";

test("fifth wave announces a solid factory boss, tracks damage and produces code; timeout stays legible", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("/");
  await page.locator("#enter").click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !!(window as any).__spaghetti);
  const entry = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    r.setPaused(true);
    s.blocks = [];
    s.pendingBlocks = 0;
    s.wave = 4;
    s.waveTimer = 0.99;
    const headline = document.querySelector("#boss-announcement")!;
    (window as any).__bossTiming = [];
    new MutationObserver(() =>
      (window as any).__bossTiming.push({
        hidden: (headline as HTMLElement).hidden,
        time: performance.now(),
      }),
    ).observe(headline, { attributes: true, attributeFilter: ["hidden"] });
    r.update(0.09); // Clear wave 4 and enter wave 5 through normal progression.
    const boss = s.blocks.find((b: any) => b.boss);
    boss.x = 905;
    boss.y = 366;
    r.draw();
    const mesh = w.blocks.get(boss.id);
    return {
      wave: s.wave,
      total: s.waveTotal,
      count: s.blocks.length,
      health: s.bossHealth,
      depth: mesh.userData.solidDepth,
      title: mesh.userData.bossTitle,
      reactor: !!mesh.getObjectByName("factory-boss-reactor"),
      armor: boss.toughness,
    };
  });
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
  await expect(page.locator("#boss-announcement")).toBeVisible();
  await expect(page.locator("#boss-announcement h2")).toHaveText(
    "Boss fight - FactoryFactoryFactory is pushed to main!",
  );
  await expect(page.locator("#boss-health-meter")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await page.screenshot({ path: testInfo.outputPath("boss-arrival.png") });
  await expect(page.locator("#boss-announcement")).toBeHidden();
  const timing = await page.evaluate(() => (window as any).__bossTiming);
  const shown = timing.find((x: any) => !x.hidden),
    hidden = timing.find((x: any) => x.hidden);
  expect(hidden.time - shown.time).toBeGreaterThan(900);
  expect(hidden.time - shown.time).toBeLessThan(1400);
  const battle = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    const boss = s.blocks.find((b: any) => b.boss),
      cell = boss.cells.find(
        (c: any) => c.alive && Math.abs(c.x) < 30 && Math.abs(c.y) < 30,
      );
    s.damage(boss, cell.x, cell.y, { vy: 0 }, 75, 3);
    const health = s.bossHealth;
    s.bossSpawnTimer = 0.01;
    r.update(0.09);
    const generated = s.blocks.find((b: any) => b.bossMinion);
    const hazard = s.spawnHazard({
      x: 430,
      y: 530,
      durationMs: 1800,
      vx: -400,
      vy: 0,
    });
    r.draw();
    const timeout = w.scene.getObjectByName("timeout-solid");
    return {
      health,
      generated: !!generated,
      generatedSolid: w.blocks.get(generated.id).userData.solidDepth,
      timeout: timeout.userData,
      width: hazard.durationMs.toString().length,
    };
  });
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
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath("boss-mobile.png") });
  const layout = await page.locator("#boss-health").boundingBox();
  expect(layout!.x).toBeGreaterThanOrEqual(0);
  expect(layout!.x + layout!.width).toBeLessThanOrEqual(844);
  await page.evaluate(() => {
    const { simulation: s, scene: r } = (window as any).__spaghetti;
    s.blocks = [];
    s.pendingBlocks = 0;
    s.waveTimer = 0.99;
    r.update(0.09); // Return to normal wave 6.
    s.blocks = [];
    s.pendingBlocks = 0;
    s.wave = 9;
    s.waveTimer = 0.99;
    r.update(0.09);
    s.blocks.find((b: any) => b.boss).x = 905;
    r.draw();
  });
  await expect(page.locator("#boss-announcement")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("boss-arrival-mobile.png"),
  });
  expect(errors).toEqual([]);
});
