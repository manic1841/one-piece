import { type Page, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import {
  QA_EMAIL,
  QA_HOUSEHOLD_ID,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';
import { parseMoney, pickFirstDetailCategory } from './support/ui';

/** The project the extra expense is booked against, and its display name. */
const TARGET_PROJECT_ID = 'proj_travel';
const TARGET_PROJECT_NAME = '旅遊基金';
/**
 * The month whose figure is read. Two properties make it the right row:
 * - **No project snapshot exists for it.** The seed snapshots projects only for
 *   the report months (`2026-07`…`09`), and a snapshotted month's row shows the
 *   frozen close-time figures instead of the live journal
 *   (`projectDetail.vm.ts`: `group.income = group.snapshot?.income ?? totals.income`).
 *   Booking an expense there would move nothing.
 * - **Inside the seed window**, so the row already exists with a non-zero income
 *   to anchor the reading on: `proj_travel` takes 8% of every seeded salary.
 */
const FIGURE_MONTH = '2026-06';
/** Pinned so the expense lands on FIGURE_MONTH instead of whatever "today" is. */
const EXPENSE_DATE = '2026-06-15';
const EXPENSE_AMOUNT = 250;
const DESCRIPTION = `E2E 備份還原 ${Date.now()}`;

/** Cash-flow row column order: 月份 / 期初 / 收入 / 支出 / 期末. */
const INCOME_COLUMN = 2;
const EXPENSE_COLUMN = 3;

const EXPORT_ACTION = '備份資料庫';
const RESTORE_ACTION = '還原備份';
const RESTORE_CONFIRM = '確認還原';
/** The restore summary the page prints; the counts are whatever the use case returned. */
const RESTORE_SUCCESS = /還原完成：已清除 \d+ 筆，並匯入 \d+ 筆資料。/;

/**
 * Read one month's income and expense from the project's MONTHLY CASH FLOW row.
 * `NaN` while the row is absent, so `expect.poll` retries instead of asserting on
 * a half-loaded table; the row's income is the anchor that proves the reading is
 * a real populated figure rather than a missing row read as zero.
 */
const readMonthFigure = async (
  page: Page,
  yearMonth: string,
): Promise<{ income: number; expense: number }> => {
  const row = page.getByTestId(`project-month-${yearMonth}`);
  if ((await row.count()) === 0) return { income: Number.NaN, expense: Number.NaN };
  const cells = row.getByRole('cell');
  return {
    income: parseMoney(await cells.nth(INCOME_COLUMN).innerText()),
    expense: parseMoney(await cells.nth(EXPENSE_COLUMN).innerText()),
  };
};

/**
 * Journey — a backup exported from Settings restores the household (CONTEXT
 * §備份).
 *
 * The export/restore *logic*, including the payload surviving a JSON hop, is
 * covered at the application layer (`householdBackupRestore.integration.test.ts`
 * calls the use cases directly). What only a browser can reach is the file
 * plumbing around it: the download the export writes, the real file chooser that
 * feeds the restore, and the confirmation that names the file.
 *
 * The round-trip is made observable by one recognizable change: an expense booked
 * into a seeded month. The project's monthly figure moves by exactly that amount,
 * and the restore — taken before the expense existed — must move it back. Both
 * the income and the expense of the same row are read, so a row that simply
 * vanished would fail the income comparison instead of passing the expense one.
 *
 * Mutates the household, so reset first: the restore would otherwise put back a
 * state of unknown age.
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

test('an exported backup can be uploaded back and restores the household', async ({
  page,
}, testInfo) => {
  // Three page loads plus a full delete-and-reimport of the household; past the
  // default 30s budget.
  test.slow();

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  // 1. Baseline. Read before anything else can touch the month, so step 5's
  //    restore back to these figures is what proves the file captured this
  //    state. The row arrives with the project's own load, so wait for its income
  //    to populate rather than reading the table mid-flight.
  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  await expect
    .poll(async () => (await readMonthFigure(page, FIGURE_MONTH)).income, { timeout: 20_000 })
    .toBeGreaterThan(0);
  const before = await readMonthFigure(page, FIGURE_MONTH);

  // 2. Export from the settings page, capturing the browser download.
  await page.goto('/settings/backup');
  const exportButton = page.getByRole('button', { name: EXPORT_ACTION });
  await expect(exportButton).toBeEnabled({ timeout: 20_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

  const backupPath = testInfo.outputPath('household-backup.json');
  await download.saveAs(backupPath);

  // The download produced a real file holding this household's payload — the
  // restore below is the proof it is complete enough to be accepted.
  const payload = JSON.parse(await readFile(backupPath, 'utf8')) as {
    schemaVersion: number;
    householdId: string;
  };
  expect(payload.schemaVersion).toBe(1);
  expect(payload.householdId).toBe(QA_HOUSEHOLD_ID);

  // 3. Make the change: book an expense into the month read above so it moves
  //    that row. Nothing is asserted on the transaction list itself — the project
  //    figure is derived from the same journal, and unlike the list it is not
  //    subject to paging.
  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();
  const form = page.getByRole('dialog');
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: TARGET_PROJECT_NAME }).click();
  await form.getByRole('button', { name: '生活費' }).click();
  await pickFirstDetailCategory(form);
  await form.getByPlaceholder('0.00').fill(String(EXPENSE_AMOUNT));
  await form.getByLabel('日期').fill(EXPENSE_DATE);
  await form.getByPlaceholder('補充這筆支出的脈絡').fill(DESCRIPTION);
  await form.getByRole('button', { name: '送出' }).click();
  await expect(form).toBeHidden();

  // The change landed where the round-trip will read it: the expense moved by
  // exactly the amount, on the same row (income unchanged, so the row did not
  // simply shift).
  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  await expect
    .poll(async () => (await readMonthFigure(page, FIGURE_MONTH)).expense)
    .toBeCloseTo(before.expense + EXPENSE_AMOUNT, 2);
  const afterChange = await readMonthFigure(page, FIGURE_MONTH);
  expect(afterChange.income).toBeCloseTo(before.income, 2);

  // 4. Restore the file taken before the change. The upload goes through the
  //    button that opens the real file chooser, not a direct setInputFiles on the
  //    hidden input, so the user's path is what gets exercised.
  await page.goto('/settings/backup');
  const restoreButton = page.getByRole('button', { name: RESTORE_ACTION });
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    restoreButton.click(),
  ]);
  await fileChooser.setFiles(backupPath);

  // The restore is destructive, so it is gated behind a confirmation that names
  // the file — which also proves the chooser fed it the file we saved.
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog).toContainText('household-backup.json');
  await confirmDialog.getByRole('button', { name: RESTORE_CONFIRM }).click();
  await expect(page.getByText(RESTORE_SUCCESS)).toBeVisible({ timeout: 60_000 });

  // 5. The household is back to the exported state: the figure the change moved
  //    is back on its baseline, and the income anchor confirms it is still the
  //    same populated row.
  await page.goto(`/projects/${TARGET_PROJECT_ID}`);
  await expect
    .poll(async () => (await readMonthFigure(page, FIGURE_MONTH)).expense)
    .toBeCloseTo(before.expense, 2);
  const afterRestore = await readMonthFigure(page, FIGURE_MONTH);
  expect(afterRestore.income).toBeCloseTo(before.income, 2);
});
