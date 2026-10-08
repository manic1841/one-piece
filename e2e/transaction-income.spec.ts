import { expect, test } from '@playwright/test';

import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';
import { parseMoney, pickFirstDetailCategory } from './support/ui';

const TARGET_PROJECT_ID = 'proj_travel';
const TARGET_PROJECT_NAME = '旅遊基金';
const INCOME_AMOUNT = 1000;

/** The month the recorded transaction lands in: the form defaults to today. */
const todayYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Resets first: the assertion below pins this month's income to exactly the
 * allocated amount, which only holds if the month starts with no activity. The
 * seed window ends at 2026-09, and a run that recorded a transaction earlier
 * would leave one behind.
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

/**
 * Journey 2 — record income, confirm its allocation, and see the target
 * project's income rise by the allocated amount.
 *
 * Read from the project's MONTHLY CASH FLOW row for the transaction's month,
 * not the SUMMARY total: the SUMMARY is a sliding 12-month window
 * (`PROJECT_SUMMARY_WINDOW_MONTHS`), so a month that opens a new group moves it
 * by (amount − the month that drops out of the window) rather than by the
 * amount. The hero PROJECT BALANCE is likewise out of scope — it is
 * snapshot-derived and only moves when the period is settled.
 */
test('income with allocation raises the project income', async ({ page }) => {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: '收入' }).click();

  await dialog.getByPlaceholder('0.00').fill(String(INCOME_AMOUNT));
  await dialog.getByRole('button', { name: '薪資' }).click();
  await pickFirstDetailCategory(dialog);

  // Allocation turns itself on: selecting the salary intent loads the saved
  // template, which enables the toggle once the project list it filters
  // against has loaded (useTransactionFormState). Wait for that settled state
  // instead of clicking the toggle — a blind click races the template write and
  // can land while it is already enabled, switching it back off.
  const allocationToggle = dialog.getByRole('checkbox', { name: '收入分配' });
  await expect(allocationToggle).toBeChecked();
  await expect(dialog.getByTestId('allocation-project-select')).toBeVisible();

  // Clear the template rows and allocate 100% to the target project.
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
  const monthRow = page.getByRole('row', { name: new RegExp(todayYearMonth()) });
  await expect(monthRow).toBeVisible();
  // Column order: 月份 / 期初 / 收入 / 支出 / 期末.
  await expect
    .poll(async () => parseMoney(await monthRow.getByRole('cell').nth(2).innerText()))
    .toBeCloseTo(INCOME_AMOUNT, 2);
});
