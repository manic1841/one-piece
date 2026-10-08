import { type Page, expect } from '@playwright/test';

import { parseMoney } from './ui';

/**
 * Shared engine for the close specs. The walk is eight stages long and every
 * close spec has to reach the same places, so the primitives live here and each
 * spec composes the journey it is about.
 */

const RECONFIRM_ACTION = '重新確認，繼續關帳';

/**
 * The confirm bar's action label is `CONTINUE →` for a fresh step and
 * `重新確認，繼續關帳` when the stage is revisited after it was completed
 * (`useCloseStageChrome` emits exactly these two, plus LOADING while in flight),
 * so match both and let the state decide.
 */
const CONFIRM_ACTIONS = /CONTINUE →|重新確認，繼續關帳/;

/** Wait for the walk to sit on step `n` of 8, using the progress indicator. */
export const expectCloseStep = async (page: Page, n: number): Promise<void> => {
  const marker = `${String(n).padStart(2, '0')} / 08`;
  await expect(page.getByText(marker).first()).toBeVisible({ timeout: 20_000 });
};

/** The ACCOUNT_BALANCE stage's label on the pipeline and its view title. */
const ACCOUNT_BALANCE_STAGE = '帳戶餘額';

/** English month abbreviations, matching the period picker's MONTH options. */
const PICKER_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/**
 * Confirm the stage on screen, accepting the empty-stage warning dialog when a
 * stage has no rows to record.
 */
export const confirmCloseStage = async (page: Page): Promise<void> => {
  const action = page.getByRole('button', { name: CONFIRM_ACTIONS }).first();
  await expect(action).toBeEnabled();
  await action.click();

  // A confirm gate (empty-stage warning) opens its dialog after the click, and
  // Radix mounts the content only while open — so a bounded wait for it *is* the
  // presence check. Only a timeout means "no dialog, the stage had rows"; any
  // other rejection is a real failure and must not be read as absence.
  const dialog = page.getByRole('dialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2_000 });
  } catch (error) {
    if ((error as Error).name !== 'TimeoutError') throw error;
    return;
  }
  await dialog.getByRole('button', { name: RECONFIRM_ACTION }).click();
};

/**
 * Select `yearMonth` in `/close`'s picker and press 開始關帳. A period with no
 * record is started; one that already exists is returned unchanged by the use
 * case and simply opened — which is how the app's 切換期間 flows (`useCase.start`
 * short-circuits on an existing record), so the same path serves both.
 */
export const openPeriod = async (page: Page, yearMonth: string): Promise<void> => {
  const [year, month] = yearMonth.split('-');
  await page.goto('/close');
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByLabel('year-picker-year').click();
  await page.getByRole('option', { name: year }).click();
  await page.getByLabel('year-picker-month').click();
  await page.getByRole('option', { name: PICKER_MONTHS[Number(month) - 1] }).click();
  await page.getByRole('button', { name: 'APPLY' }).click();
  await page.getByRole('button', { name: '開始關帳' }).click();
  await expect(page).toHaveURL(new RegExp(`/close/${yearMonth}`));
};

/**
 * Show the ACCOUNT_BALANCE stage. An active period sitting on step 1 already has
 * it on screen; a `CLOSED` period opens on the read-only summary, so the walk
 * has to be expanded and the stage picked from the pipeline.
 */
export const openAccountBalanceStage = async (
  page: Page,
  { fromPipeline = false }: { fromPipeline?: boolean } = {},
): Promise<void> => {
  if (fromPipeline) {
    await page.getByTestId('close-pipeline-toggle').click();
    await page.getByRole('button', { name: ACCOUNT_BALANCE_STAGE }).first().click();
  }
  await expect(page.locator('input[id^="ending-"]').first()).toBeVisible({ timeout: 20_000 });
};

/**
 * Read one account's ending-balance field, waiting for its seeded value. Read-only
 * periods render the same inputs disabled but populated with that month's settled
 * snapshot, so this reads the draft for an active period and the record for a
 * closed one. The prefill arrives with the stage's async load — after the input is
 * already on screen — so the wait belongs here, not at each call site.
 */
export const readSeededEndingBalance = async (page: Page, accountId: string): Promise<number> => {
  const field = page.locator(`input#ending-${accountId}`).first();
  await expect
    .poll(async () => parseMoney(await field.inputValue()), { timeout: 20_000 })
    .not.toBeNaN();
  return parseMoney(await field.inputValue());
};

/**
 * Confirm the ACCOUNT_BALANCE stage. The confirm bar renders before the snapshot
 * prefill arrives, so this waits for the ending-balance inputs to be seeded
 * first — clicking earlier would submit an empty draft and be rejected.
 */
export const confirmAccountBalanceStage = async (page: Page): Promise<void> => {
  await expectCloseStep(page, 1);
  await expect(page.locator('input[id^="ending-"]').first()).not.toHaveValue('');
  await confirmCloseStage(page);
};

/**
 * Confirm steps `first`…`last` in order. Driven by the walk position, not the
 * stage view title: some views label themselves differently from their stage
 * (e.g. 就緒檢查 for completeness).
 */
export const confirmStages = async (page: Page, first: number, last: number): Promise<void> => {
  for (let step = first; step <= last; step += 1) {
    await expectCloseStep(page, step);
    await confirmCloseStage(page);
  }
};

/**
 * Generate the reports. For an unconfirmed stage this both persists them and
 * confirms the stage, advancing the walk to the Close Period summary.
 */
export const generateReports = async (page: Page): Promise<void> => {
  await expectCloseStep(page, 7);
  const generate = page.getByTestId('generate-reports');
  await expect(generate).toBeEnabled();
  await generate.click();
  await expectCloseStep(page, 8);
};

/**
 * The period the close-from-scratch journey starts. The seed leaves it unstarted
 * (#277), which is what makes that journey start from nothing.
 */
const SCRATCH_PERIOD = '2026-09';

/** Confirm stages 1–6, generate the reports, and stand on the Close Period summary. */
export const walkToCloseSummary = async (page: Page): Promise<void> => {
  await openPeriod(page, SCRATCH_PERIOD);
  await confirmAccountBalanceStage(page);
  await confirmStages(page, 2, 6);
  await generateReports(page);
};

/**
 * Read one Close Period summary figure by its row label. A figure whose reports
 * drifted renders as `<persisted> -> <preview>`, so both operands come back in
 * order; without drift both sides are the same single value.
 */
export const readSummaryFigure = async (
  page: Page,
  label: string,
): Promise<{ persisted: number; preview: number }> => {
  const cell = page.getByTestId('close-summary-panel').getByText(label, { exact: true });
  const [persisted, preview = persisted] = (
    await cell.locator('..').locator('span').nth(1).innerText()
  )
    .split('->')
    .map((part) => parseMoney(part));
  return { persisted, preview };
};
