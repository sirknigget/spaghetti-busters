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
  const homing = await page.evaluate(() => {
    const { simulation: s, scene: r } = (window as any).__spaghetti;
    r.setPaused(true);
    s.blocks = [];
    s.pendingBlocks = 0;
    const urgent = s.spawnBlock({
      x: 390,
      y: 535,
      vx: -80,
      vy: 0,
      angle: 0.12,
      exception: true,
      code: ['throw new Error("urgent");'],
    });
    const large = s.spawnBlock({
      x: 930,
      y: 310,
      vx: -80,
      vy: 0,
      angle: -0.04,
      code: Array(7).fill(
        "const redundant = factoryFactory(JSON.parse(JSON.stringify(input)));",
      ),
    });
    const near = s.spawnBlock({
      x: 820,
      y: 540,
      vx: -80,
      vy: 0,
      code: ["const close = 1;"],
    });
    s.specials.push({
      id: 9901,
      type: "homing",
      x: 730,
      y: 580,
      vx: 640,
      vy: 0,
      angle: 0,
      life: 5,
    });
    r.update(1 / 120);
    return {
      target: s.specials[0].targetId,
      urgent: urgent.id,
      near: near.id,
      large: large.id,
    };
  });
  expect(homing.target).toBe(homing.urgent);
  expect(homing.target).not.toBe(homing.near);
  await page.screenshot({ path: testInfo.outputPath("lint-before.png") });
  const cleanup = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    s.specials = [];
    s.selectSpecial("lint");
    s.fireSpecial();
    r.update(0.08);
    return {
      count: s.blocks.length,
      destroyed: s.blocksDestroyed,
      generations: s.blocks.map((b: any) => b.generation),
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
  const blast = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
    s.blocks = [];
    s.particles = [];
    s.wave = 7;
    for (const [x, y] of [
      [690, 350],
      [910, 390],
    ])
      s.spawnBlock({
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0.12,
        code: ['const armored = eval("oops");'],
      });
    s.spawnBlock({
      x: 1250,
      y: 560,
      vx: 0,
      vy: 0,
      angle: 0,
      code: ["const outside = true;"],
    });
    s.specials.push({
      id: 9902,
      type: "grenade",
      x: 700,
      y: 360,
      vx: 0,
      vy: 0,
      angle: 0,
      life: 2,
      fuse: 0.001,
    });
    r.update(0.08);
    return {
      radius: s.explosions[0].radius,
      alive: s.blocks.length,
      visibleBlast: w.explosionMeshes.some(
        (mesh: any) => mesh.visible && mesh.scale.x > 100,
      ),
    };
  });
  expect(blast).toEqual({ radius: 300, alive: 1, visibleBlast: true });
  await page.screenshot({ path: testInfo.outputPath("grenade-blast.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath("specials-mobile.png") });
  expect(errors).toEqual([]);
});
