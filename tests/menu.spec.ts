import { expect, test } from "@playwright/test";
import { start } from "./game-input";
import {
  verifyTouchFireAndGrenades,
  verifyTouchReviewAndPause,
} from "./game-touch-checks";
import { verifyHelpDialog } from "./menu-checks";

test("opening screen, help popup and sound control", async ({ page }) => {
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;

    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        (window as any).__openingAudioContext = this;
      }
    };
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/Spaghetti Busters/);
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#prelude button")).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as any).__openingAudioContext),
  ).toBeUndefined();
  await page
    .getByRole("button", { name: "Click to play", exact: true })
    .click();
  await expect(page.locator("#prelude")).toBeHidden();
  await expect(page.locator("#opening-audio-status")).toHaveText(
    "♫ OPENING THEME · SOUND ON",
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__openingAudioContext.state),
    )
    .toBe("running");
  await expect(page.locator("h1")).toContainText("SPAGHETTI");
  await verifyHelpDialog(page);
  await page.locator("#menu [data-sound]").click();
  await expect(page.locator("#menu [data-sound]")).toHaveText("SOUND OFF");
  expect(errors).toEqual([]);
});

test("escaped chunk ends run, saves best score and restart resets play", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__spaghetti.simulation;

    s.progress.score = 1234;
    s.world.blocks[0].x = -1000;
  });
  await expect(page.locator("#overlay-title")).toHaveText("BUILDFAILED.");
  await expect(page.locator("#results")).toContainText("001234");
  await expect(page.locator("#resume")).toBeHidden();
  await page.locator("#restart").click();
  await expect(page.locator("#game-overlay")).toBeHidden();
  await expect(page.locator("#score")).toHaveText("000000");
  await page.keyboard.press("KeyP");
  await page.locator("#quit").click();
  await expect(page.locator("#menu-best")).toHaveText("001234");
  await page.reload();
  await page.locator("#enter").click();
  await expect(page.locator("#menu-best")).toHaveText("001234");
});

test("touch landscape is playable and menu fits a phone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(page.locator("#enter")).toBeInViewport();
  await page.locator("#enter").tap();
  await expect(page.locator("#start")).toBeInViewport();
  await expect(page.locator("#help")).toBeInViewport();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator("#start").click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".orientation-hint")).toBeHidden();
  await expect(page.locator("#pause")).toBeInViewport();
  await verifyTouchFireAndGrenades(page);
  await verifyTouchReviewAndPause(page);
  await context.close();
});
