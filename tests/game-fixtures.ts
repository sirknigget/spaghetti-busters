import { type Page } from "@playwright/test";

export async function placeLargeLintTargets(page: Page) {
  await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    s.world.blocks = [];
    s.runtime.pendingBlocks = 0;
    for (const [x, y] of [
      [640, 270],
      [1000, 460],
    ]) {
      s.spawnBlock({
        x,
        y,
        vx: -80,
        vy: 10,
        angle: 0,
        code: [
          "const redundant = values.map(value => ({ ...value }));",
          "if (true === Boolean(redundant.length !== 0)) {",
          "  return redundant.filter(item => Boolean(!!item));",
          "  return JSON.parse(JSON.stringify(redundant.map(value => ({value}))));",
          "  // factoryFactoryFactory approves another unnecessary abstraction",
          "}",
        ],
      });
    }
  });
}

export async function placeSmallLintTarget(page: Page) {
  await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;
    const small = s.spawnBlock({
      x: 400,
      y: 520,
      vx: -80,
      vy: 0,
      exception: true,
      code: ['throw new Error("oops");'],
    });

    (window as any).__lintSmallId = small.id;
  });
}
