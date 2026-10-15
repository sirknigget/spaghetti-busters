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
  const initial = await page.evaluate(() => {
    const {
      world: w,
      scene: runtime,
      simulation: s,
    } = (window as any).__spaghetti;
    runtime.setPaused(true);
    const block = s.blocks[0];
    runtime.draw();
    const mesh = w.blocks.get(block.id);
    const geometry = mesh.children[0].geometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const rotation = mesh.rotation.toArray().slice(0, 3);
    block.age += 1;
    runtime.draw();

    return {
      webgl: w.renderer.isWebGLRenderer,
      perspective: w.camera.isPerspectiveCamera,
      depth: box.max.z - box.min.z,
      shadows: w.renderer.shadowMap.enabled,
      specialist: !!w.scene.getObjectByName("sculpted-code-quality-specialist"),
      cannon: !!w.scene.getObjectByName("volumetric-refactor-cannon"),
      environment: !!w.scene.getObjectByName("sculpted-mint-city"),
      rotatesX: mesh.rotation.x !== rotation[0],
      rotatesY: mesh.rotation.y !== rotation[1],
      triangles: w.renderer.info.render.triangles,
    };
  });
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
  const damaged = await page.evaluate(() => {
    const {
      world: w,
      scene: runtime,
      simulation: s,
    } = (window as any).__spaghetti;
    const block = s.blocks[0];
    const old = w.blocks.get(block.id);
    let disposed = false;
    old.children[0].geometry.addEventListener(
      "dispose",
      () => (disposed = true),
    );
    const cell = block.cells.find(
      (c: any) => c.alive && Math.abs(c.x) < 70 && Math.abs(c.y) < 50,
    );
    cell.alive = false;
    block.hits++;
    runtime.draw();
    const group = w.blocks.get(block.id);
    // An interior dead cell must leave no front-face triangle at its center.
    const positions = group.children[0].geometry.attributes.position;
    const frontCount = group.children[0].geometry.groups[0].count;
    let coversHole = false;
    for (let i = 0; i < frontCount; i += 3) {
      const ax = positions.getX(i);
      const ay = positions.getY(i);
      const bx = positions.getX(i + 1);
      const by = positions.getY(i + 1);
      const cx = positions.getX(i + 2);
      const cy = positions.getY(i + 2);
      const cross = (x1: number, y1: number, x2: number, y2: number) =>
        x1 * y2 - y1 * x2;
      const area = cross(bx - ax, by - ay, cx - ax, cy - ay);
      if (Math.abs(area) < 0.00001) {
        continue;
      }
      const u = cross(cell.x - ax, -cell.y - ay, cx - ax, cy - ay) / area;
      const v = cross(bx - ax, by - ay, cell.x - ax, -cell.y - ay) / area;
      if (u >= 0 && v >= 0 && u + v <= 1) {
        coversHole = true;
      }
    }
    runtime.reset();

    return {
      removed: group.userData.removedCells,
      coversHole,
      disposed,
      staleRemoved: old.parent === null,
      cache: w.blocks.size,
      live: s.blocks.length,
    };
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
  const time = await page.evaluate(
    () => (window as any).__spaghetti.simulation.elapsed,
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
    await page.evaluate(() => (window as any).__spaghetti.simulation.elapsed),
  ).toBe(time);
  await page.evaluate(() =>
    (window as any).__contextExtension.restoreContext(),
  );
  await expect(page.locator("#resume")).toBeEnabled();
  await page.locator("#resume").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__spaghetti.simulation.elapsed),
    )
    .toBeGreaterThan(time);
  await page.setViewportSize({ width: 1024, height: 650 });
  const box = await page.locator("canvas").boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 2);
  expect(box!.width).toBeLessThanOrEqual(1024);
});
