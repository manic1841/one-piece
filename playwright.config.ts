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
  // No retries: a retry masks the first failure and, when the whole suite is
  // red, burns the job's timeout-minutes until GitHub cancels the step — after
  // which `gh run view --log-failed` prints nothing (issue #285). Failing on the
  // first attempt surfaces the real error immediately and keeps the run short.
  retries: 0,
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
