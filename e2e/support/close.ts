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
  // presence check. No dialog within the window means the stage had rows and
  // confirmed directly; every other failure surfaces at the caller's assertion.
  const dialog = page.getByRole('dialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2_000 });
  } catch {
    return;
  }
  await dialog.getByRole('button', { name: RECONFIRM_ACTION }).click();
};

/**
 * Start a period that has no record yet: `/close` → pick 2026-09 → 開始關帳.
 * The close specs need the period to be genuinely unstarted, which the seed
 * guarantees (issue #277).
 */
export const startSeptemberPeriod = async (page: Page): Promise<void> => {
  await page.goto('/close');
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByLabel('year-picker-year').click();
  await page.getByRole('option', { name: '2026' }).click();
  await page.getByLabel('year-picker-month').click();
  await page.getByRole('option', { name: 'SEP' }).click();
  await page.getByRole('button', { name: 'APPLY' }).click();
  await page.getByRole('button', { name: '開始關帳' }).click();
  await expect(page).toHaveURL(/\/close\/2026-09/);
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

/** Confirm stages 1–6, generate the reports, and stand on the Close Period summary. */
export const walkToCloseSummary = async (page: Page): Promise<void> => {
  await startSeptemberPeriod(page);
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
