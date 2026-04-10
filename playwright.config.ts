import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__e2e__',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
    env: { PATH: process.env.PATH ?? '' },
  },
});
