import { defineConfig } from '@playwright/test';

// Test end-to-end contro lo stack reale sulla VPS, raggiunto via tunnel SSH
// (Twenty :33000, Hub/portale :33010, Mailpit :33025).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PORTALE_URL ?? 'http://localhost:33010',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium' },
  },
  projects: [
    { name: 'telefono', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1366, height: 900 } } },
  ],
});
