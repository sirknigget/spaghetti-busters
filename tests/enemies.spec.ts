import { enterGame as start, collectBrowserErrors } from "./browser-fixtures";
import { expect, test, type Page } from "@playwright/test";

test("a tough branded robot intercepts shots, thinks, and creates a huge solid block", async ({
  page,
}) => {
  const errors = collectBrowserErrors(page);

  await start(page);

  const shielding = await page.evaluate(async () => {
    const modulePath = "/tests/enemies-browser.ts";
    const { inspectShielding } = await import(modulePath);

    return inspectShielding();
  });

  expect(shielding).toMatchObject({
    robots: 1,
    hits: 0,
    damaged: true,
    health: 14,
    model: true,
  });
  await verifyRobotGeneration(page);
  await verifyRobotLogo(page);

  await verifyRobotRemoved(page);
  expect(errors).toEqual([]);
});

async function verifyRobotRemoved(page: Page) {
  const removed = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

    s.world.robots = [];
    r.draw();

    return !w.scene.getObjectByName("ai-code-robot-openai");
  });

  expect(removed).toBe(true);
}

test("angry code throws solid exceptions and code review visibly freezes the attackers", async ({
  page,
}) => {
  await start(page);

  const state = await page.evaluate(async () => {
    const modulePath = "/tests/enemies-browser.ts";
    const { inspectState } = await import(modulePath);

    return inspectState();
  });

  expect(state.angry).toBe(true);
  expect(state.exception).toBe(true);
  expect(state.exceptionSolid).toBeGreaterThan(0);
  expect(state.after).toEqual(state.before);
  expect(state.freeze).toBeGreaterThan(0.9);
});

async function verifyRobotGeneration(page: Page) {
  const generated = await page.evaluate(() => {
    const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

    for (let i = 0; i < 9; i++) {
      s.update(0.25);
    }

    r.draw();

    const huge = s.world.blocks.find((b: any) => b.cells.length > 450);

    return {
      state: s.world.robots[0].state,
      generated: s.world.events.includes("generate"),
      huge: !!huge,
      solid: huge ? w.blocks.get(huge.id).userData.solidDepth : 0,
    };
  });

  expect(generated).toMatchObject({
    state: "leaving",
    generated: true,
    huge: true,
  });
  expect(generated.solid).toBeGreaterThan(20);
}

async function verifyRobotLogo(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = (window as any).__spaghetti.world;
        const robot = w.scene.getObjectByName("ai-code-robot-openai");
        let loaded = false;

        robot?.traverse((child: any) => {
          if (child.material?.map?.image?.src?.includes("/brands/openai.svg")) {
            loaded = true;
          }
        });

        return loaded;
      }),
    )
    .toBe(true);
}
