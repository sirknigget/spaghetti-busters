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
  const hit = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    r.setPaused(true);
    s.blocks = [];
    s.pendingBlocks = 0;
    const block = s.spawnBlock({
      x: 850,
      y: 320,
      vx: 0,
      vy: 0,
      angle: 0,
      code: Array(7).fill(
        "const tangled = factoryFactory(JSON.parse(JSON.stringify(input)));",
      ),
    });
    r.draw();
    const cell = block.cells.find(
      (c: any) => Math.abs(c.x) < 20 && Math.abs(c.y) < 30,
    );
    s.damage(block, cell.x, cell.y, { vx: 1080, vy: 0 });
    r.update(0.12);
    const mesh = w.blocks.get(block.id),
      v = mesh.userData.fractureVisual;
    const holes = [...v.holes.values()] as any[];
    return {
      effects: w.debris.diagnostics,
      holes: holes.length,
      ragged: holes.some(
        (p: any) => new Set(p.map((q: any) => q.x.toFixed(2))).size > 4,
      ),
      smoke: w.scene.getObjectByName("physics-buoyant-turbulent-smoke").count,
      sparks: w.scene.getObjectByName("physics-incandescent-sparks").count,
    };
  });
  expect(hit.effects.letters).toBeGreaterThan(0);
  expect(hit.effects.rigidBodies).toBeGreaterThan(0);
  expect(hit.holes).toBeGreaterThan(0);
  expect(hit.ragged).toBe(true);
  expect(hit.smoke).toBeGreaterThan(0);
  expect(hit.sparks).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("impact.png") });
  const fall = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    const gameplay = () =>
      JSON.stringify({
        blocks: s.blocks,
        robots: s.robots,
        score: s.score,
        ammo: s.ammo,
        elapsed: s.elapsed,
      });
    const before = gameplay(),
      start = w.debris.bodySnapshots;
    for (let i = 0; i < 240; i++) w.debris.update(1 / 120);
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
  const paused = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;
    const before = w.debris.bodySnapshots;
    r.draw();
    r.draw();
    return JSON.stringify(before) === JSON.stringify(w.debris.bodySnapshots);
  });
  expect(paused).toBe(true);
  expect(errors).toEqual([]);
});

test("fractures preserve the same surface and holes through repeated splits and damage", async ({
  page,
}, testInfo) => {
  await start(page);
  const fracture = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    r.setPaused(true);
    s.blocks = [];
    s.pendingBlocks = 0;
    const parent = s.spawnBlock({
      x: 870,
      y: 340,
      vx: 0,
      vy: 0,
      angle: 0,
      code: Array(9).fill(
        "const originalSurface = factoryFactory(JSON.parse(JSON.stringify(input)));",
      ),
    });
    r.draw();
    const dead = parent.cells.find(
      (c: any) => Math.abs(c.x) < 20 && Math.abs(c.y) < 30,
    );
    dead.alive = false;
    parent.hits++;
    r.draw();
    const canvas = w.blocks.get(parent.id).userData.fractureVisual.canvas;
    s.selectSpecial("lint");
    s.fireSpecial();
    r.draw();
    const halves = s.blocks.map((b: any) => w.blocks.get(b.id));
    const a = halves.map((mesh: any) => mesh.userData.fractureVisual);
    const child = s.blocks[0],
      cell = child.cells.find((c: any) => c.alive);
    s.damage(child, cell.x, cell.y, { vx: 1080, vy: 0 });
    r.draw();
    const rebuilt = w.blocks.get(child.id).userData.fractureVisual;
    r.update(0.2);
    return {
      count: halves.length,
      inherited: a.every((v: any) => v.canvas === canvas),
      clipped: a.every((v: any) => v.regions.length === 2 && v.holes.size > 0),
      offsets: a.map((v: any) => v.offset),
      afterDamage: rebuilt.canvas === canvas && rebuilt.regions.length === 2,
      names: halves.map((m: any) => m.children[0].name),
    };
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
    const original = w.blocks.get(s.blocks[0].id).userData.fractureVisual
      .canvas;
    s.specialCooldown = 0;
    s.specialAmmo.lint = 1;
    s.selectSpecial("lint");
    s.fireSpecial();
    r.update(0.18);
    return {
      count: s.blocks.length,
      inherited: s.blocks.every((b: any) => {
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
  const outcome = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    r.setPaused(true);
    s.blocks = [];
    s.pendingBlocks = 0;
    s.robots = [];
    const robot = s.spawnRobot({ brand: "anthropic", x: 630, y: 360 });
    robot.state = "thinking";
    robot.stateTime = -10;
    r.draw();
    for (let i = 0; i < 14; i++) {
      s.bullets.push({
        id: 20000 + i,
        x: robot.x - 55,
        y: robot.y,
        vx: 1080,
        vy: 0,
        life: 1,
        weapon: "single",
      });
      s.update(1 / 120);
      r.draw();
    }
    const before = { health: robot.health, alive: s.robots.length };
    s.bullets.push({
      id: 20015,
      x: robot.x - 55,
      y: robot.y,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    s.update(1 / 120);
    r.draw();
    return {
      before,
      alive: s.robots.length,
      effects: w.debris.diagnostics,
      head: !!w.scene.getObjectByName("fallen-robot-head"),
      arm: !!w.scene.getObjectByName("fallen-robot-arm-1"),
    };
  });
  expect(outcome.before).toEqual({ health: 1, alive: 1 });
  expect(outcome.alive).toBe(0);
  expect(outcome.effects.robotParts).toBeGreaterThan(6);
  expect(outcome.head).toBe(true);
  expect(outcome.arm).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("robot-dismantles.png") });
  const settled = await page.evaluate(() => {
    const { scene: r, world: w } = (window as any).__spaghetti;
    for (let i = 0; i < 600; i++) w.debris.update(1 / 120);
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
  expect(errors).toEqual([]);
});
