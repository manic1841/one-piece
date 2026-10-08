import { expect, test } from '@playwright/test';

import { installEmulatorSession, signInEmulatorUser, signInNonWhitelistedUser } from './support/qa';
import { QA_EMAIL, QA_PASSWORD } from './support/qa';

/**
 * Journey 1 — the entry gate. If this breaks, nothing else in the app is
 * reachable, so it is the first smoke test.
 */
test.describe('auth gate', () => {
  test('a whitelisted user reaches the app', async ({ page }) => {
    const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
    await installEmulatorSession(page, session);

    await page.goto('/');

    await expect(page).not.toHaveURL(/\/access-denied/);
    await expect(page.getByText('NET WORTH', { exact: true })).toBeVisible();
  });

  test('a non-whitelisted user is denied', async ({ page }) => {
    const session = await signInNonWhitelistedUser();
    await installEmulatorSession(page, session);

    await page.goto('/');

    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  });
});
