import { defineConfig, devices } from '@playwright/test';

import { APP_ORIGIN } from './e2e/support/emulator';

/**
 * Playwright config for the minimal smoke suite (ADR-0082).
 *
 * - Chromium only: the risk lives in "numbers computed right / access gated
 *   right", not browser compatibility.
 * - Runs against the Vite dev server (`pnpm dev`), reusing its same-origin
 *   emulator proxy. The Firebase emulator itself is started externally, exactly
 *   like the integration tests; `globalSetup` only seeds it.
 * - Locally `pnpm test:e2e` can start the dev server (webServer); in CI the job
 *   starts emulators first, then this config starts Vite.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: APP_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: APP_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
