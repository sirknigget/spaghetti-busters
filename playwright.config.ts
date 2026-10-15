import { defineConfig } from "@playwright/test";

const CI_TEST_TIMEOUT = 60000;
const LOCAL_TEST_TIMEOUT = 30000;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // WebGL software rendering is CPU-heavy in CI; keep playtests isolated.
  workers: 1,
  // Software-rendered input and inspection round trips are slower on CI runners.
  timeout: process.env.CI ? CI_TEST_TIMEOUT : LOCAL_TEST_TIMEOUT,
  expect: { timeout: 7000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
