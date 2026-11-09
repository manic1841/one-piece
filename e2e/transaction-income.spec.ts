import { expect, test } from '@playwright/test';

import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';
import { parseMoney, pickFirstDetailCategory, readSettledMoney } from './support/ui';

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
 * project's balance rise by the allocated amount.
 *
 * Read the hero PROJECT BALANCE rather than the SUMMARY total: the balance is
 * derived live, so the allocation moves it by exactly the amount, while the
 * SUMMARY is a sliding 12-month window that shifts by (amount − the month
 * dropping out). The balance is anchored to the newest snapshot, so the
 * expectation is a delta against the page's own earlier reading.
 *
 * The hero counts up from zero on mount, so both readings wait for the figure to
 * settle; a raw `innerText` would sample a mid-animation frame.
 */
test('income with allocation raises the project balance', async ({ page }) => {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  const balance = page.getByTestId('project-balance');
  await expect(balance).toBeVisible();
  const before = await readSettledMoney(balance);
  expect(before).toBeGreaterThan(0);

  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: '收入' }).click();

  await dialog.getByPlaceholder('0.00').fill(String(INCOME_AMOUNT));
  await dialog.getByRole('button', { name: '薪資' }).click();
  await pickFirstDetailCategory(dialog);

  // Allocation turns itself on: selecting the salary intent loads the saved
  // template, whose rows show up in the project read view once the project list
  // it filters against has loaded (useTransactionFormState). Wait for that
  // settled state instead of clicking anything — a blind interaction races the
  // template.
  const projectRows = dialog.getByRole('list', { name: '專案分配' }).getByRole('listitem');
  await expect(projectRows.first()).toBeVisible();

  // Drop whatever the template selected, then allocate the target project alone.
  // The sweep is scoped to the project group: the category chips are
  // `aria-pressed` too, and re-clicking the selected category would clear the
  // detail code.
  await dialog.getByTestId('project-mode-toggle').click();
  const projectChips = dialog.getByRole('group', { name: '專案' });
  // Re-query each round: every click re-renders the group, so a snapshot of the
  // locators goes stale after the first one.
  while ((await projectChips.getByRole('button', { pressed: true }).count()) > 0) {
    await projectChips.getByRole('button', { pressed: true }).first().click();
  }
  await projectChips.getByRole('button', { name: TARGET_PROJECT_NAME }).click();
  await expect(projectRows).toHaveText([`${TARGET_PROJECT_NAME}100%`]);

  await dialog.getByRole('button', { name: '送出' }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  // By test id, not by accessible name: the expanded month renders a nested
  // details row whose text also carries the month's dates.
  const monthRow = page.getByTestId(`project-month-${todayYearMonth()}`);
  await expect(monthRow).toBeVisible();
  // Column order: 月份 / 期初 / 收入 / 支出 / 期末.
  await expect
    .poll(async () => parseMoney(await monthRow.getByRole('cell').nth(2).innerText()))
    .toBeCloseTo(INCOME_AMOUNT, 2);
  await expect
    .poll(async () => readSettledMoney(page.getByTestId('project-balance')))
    .toBeCloseTo(before + INCOME_AMOUNT, 2);
});
