import { type Page, expect, test } from '@playwright/test';

import { installEmulatorSession, signInEmulatorUser } from './support/qa';
import { QA_EMAIL, QA_PASSWORD } from './support/qa';

const PERIOD = '2026-09';
const CONFIRM_LABELS = ['CONTINUE →', '重新確認，繼續關帳', '審閱完畢，繼續關帳'];

/**
 * Click a close step's confirm action. The label varies by state
 * (fresh step vs. re-confirm/review), so wait for whichever is present.
 */
const confirmCurrentStage = async (page: Page): Promise<void> => {
  let found: string | null = null;
  await expect
    .poll(
      async () => {
        for (const label of CONFIRM_LABELS) {
          const button = page.getByRole('button', { name: label }).first();
          if (await button.isVisible().catch(() => false)) {
            found = label;
            return label;
          }
        }
        return null;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();

  await page.getByRole('button', { name: found! }).first().click();

  // A confirm gate (e.g. empty-stage warning) may open a dialog afterwards.
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: '重新確認，繼續關帳' }).click();
  }
};

/**
 * Journey 4 — settle a period and see its reports. Uses the seeded period that
 * is already IN PROGRESS (first five stages done), so the test drives the
 * remaining stages: completeness check, financial reports, then close.
 */
test('settling a period generates its reports', async ({ page }) => {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto(`/close/${PERIOD}`);

  // Completeness check.
  await confirmCurrentStage(page);

  // Financial reports: generating also confirms the stage, and the walk
  // advances straight to the Close Period summary.
  await expect(page.getByRole('heading', { name: '財務報表' })).toBeVisible();
  const generate = page.getByTestId('generate-reports');
  await expect(generate).toBeEnabled();
  await generate.click();

  // Close period: the summary's final action opens a confirmation dialog.
  const closeButton = page.getByRole('button', { name: '正式關帳' }).first();
  await expect(closeButton).toBeVisible({ timeout: 20_000 });
  await closeButton.click();
  await page.getByRole('dialog').getByRole('button', { name: '正式關帳' }).click();

  await expect(page.getByText('CLOSED').first()).toBeVisible();

  await page.goto('/reports');
  await expect(page.getByText(PERIOD).filter({ visible: true }).first()).toBeVisible();
});
