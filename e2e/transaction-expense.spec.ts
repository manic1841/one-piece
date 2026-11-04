import { expect, test } from '@playwright/test';

import { QA_EMAIL, QA_PASSWORD, installEmulatorSession, signInEmulatorUser } from './support/qa';
import { pickFirstDetailCategory } from './support/ui';

const TARGET_PROJECT_NAME = '旅遊基金';
const EXPENSE_AMOUNT = 250;
const DESCRIPTION = `E2E 支出 ${Date.now()}`;

/**
 * Journey 3 — the highest-frequency flow: record an expense against a project
 * and see it land in the transaction list.
 */
test('expense is recorded and appears in the transaction list', async ({ page }) => {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The expense tab is the default: amount, category, then the project (which
  // sits behind the widget's edit mode), then the note.
  await dialog.getByPlaceholder('0.00').fill(String(EXPENSE_AMOUNT));
  await dialog.getByRole('button', { name: '生活費' }).click();
  await pickFirstDetailCategory(dialog);
  await dialog.getByTestId('project-mode-toggle').click();
  await dialog.getByRole('button', { name: TARGET_PROJECT_NAME }).click();
  await dialog.getByPlaceholder('補充這筆支出的脈絡').fill(DESCRIPTION);

  await dialog.getByRole('button', { name: '送出' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText(DESCRIPTION).filter({ visible: true }).first()).toBeVisible();
});
