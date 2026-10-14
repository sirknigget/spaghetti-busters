import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  fullyParallel:true,
  timeout:30000,
  expect:{timeout:7000},
  use:{baseURL:process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',viewport:{width:1440,height:900},trace:'retain-on-failure'},
  webServer:{command:'npm run dev',url:'http://localhost:3000',reuseExistingServer:true,timeout:30000},
});
