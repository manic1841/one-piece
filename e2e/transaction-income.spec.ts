import { expect, test } from '@playwright/test';

import { installEmulatorSession, signInEmulatorUser } from './support/qa';
import { QA_EMAIL, QA_PASSWORD } from './support/qa';
import { pickFirstDetailCategory, readSectionMetric } from './support/ui';

const TARGET_PROJECT_ID = 'proj_travel';
const TARGET_PROJECT_NAME = '旅遊基金';
const INCOME_AMOUNT = 1000;

/**
 * Journey 2 — record income, confirm its allocation, and see the target
 * project's income rise by the allocated amount.
 *
 * The hero PROJECT BALANCE is snapshot-derived (it only moves when the period
 * is settled), so the live per-project effect is read from the SUMMARY income.
 */
test('income with allocation raises the project income', async ({ page }) => {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  const before = await readSectionMetric(page, 'SUMMARY', '收入');

  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: '收入' }).click();

  await dialog.getByPlaceholder('0.00').fill(String(INCOME_AMOUNT));
  await dialog.getByRole('button', { name: '薪資' }).click();
  await pickFirstDetailCategory(dialog);

  // Turn on allocation. Selecting the salary intent auto-loads a default
  // allocation template, so clear it and allocate 100% to the target project.
  await dialog.locator('label', { hasText: '收入分配' }).getByRole('checkbox').click();
  await expect(dialog.getByTestId('allocation-project-select')).toBeVisible();
  await dialog.getByTestId('allocation-clear-button').click();
  await dialog.getByTestId('allocation-project-select').selectOption(TARGET_PROJECT_ID);
  await dialog.getByTestId('allocation-add-button').click();
  const row = dialog.getByTestId(`allocation-row-${TARGET_PROJECT_ID}`);
  await expect(row).toBeVisible();
  await expect(row).toContainText(TARGET_PROJECT_NAME);
  await row.locator('input').fill('100');

  await dialog.getByRole('button', { name: '送出' }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  const after = await readSectionMetric(page, 'SUMMARY', '收入');

  expect(after).toBeCloseTo(before + INCOME_AMOUNT, 2);
});
