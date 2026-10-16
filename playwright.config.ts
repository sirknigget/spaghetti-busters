import { defineConfig } from "@playwright/test";

const CI_TEST_TIMEOUT = 60000;
const LOCAL_TEST_TIMEOUT = 30000;
const EXPECT_TIMEOUT_MS = 7000;
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 900;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // WebGL software rendering is CPU-heavy in CI; keep playtests isolated.
  workers: 1,
  // Software-rendered input and inspection round trips are slower on CI runners.
  timeout: process.env.CI ? CI_TEST_TIMEOUT : LOCAL_TEST_TIMEOUT,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    viewport: { width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: LOCAL_TEST_TIMEOUT,
  },
});
