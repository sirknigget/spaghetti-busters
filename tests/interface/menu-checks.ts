import { expect, type Page } from "@playwright/test";

export async function verifyHelpDialog(page: Page) {
  await page.getByRole("button", { name: "Help: how to play" }).click();
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.locator("dialog")).toContainText("TRIPLE_SHOT");
  await expect(page.locator("dialog")).toContainText(
    "Heavily armored AI robots",
  );
  await expect(page.locator("dialog")).toContainText(
    "lint splits big blocks in half and destroys small ones",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
}
