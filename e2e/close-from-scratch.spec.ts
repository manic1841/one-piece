import { type Page, expect, test } from '@playwright/test';

import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';

const PERIOD = '2026-09';
const ACCOUNT_BALANCE_STAGE = '帳戶餘額';
const RECONFIRM_ACTION = '重新確認，繼續關帳';

/**
 * The confirm bar's action label depends on the stage's state (fresh step,
 * re-confirm after visiting back, or review-after-pause), so match any of them
 * and let the state decide.
 */
const CONFIRM_ACTIONS = /CONTINUE →|重新確認，繼續關帳|審閱完畢，繼續關帳/;

/** The walk's progress indicator while it sits on step `n` of 8. */
const expectStep = async (page: Page, n: number): Promise<void> => {
  const marker = `${String(n).padStart(2, '0')} / 08`;
  await expect(page.getByText(marker).first()).toBeVisible({ timeout: 20_000 });
};

/**
 * Confirm the stage on screen, accepting the empty-stage warning dialog when a
 * stage has no rows to record.
 */
const confirmStage = async (page: Page): Promise<void> => {
  const action = page.getByRole('button', { name: CONFIRM_ACTIONS }).first();
  await expect(action).toBeEnabled();
  await action.click();

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: RECONFIRM_ACTION }).click();
  }
};

/** Pick `SEP 2026` in the year-month popover on the `/close` picker. */
const selectPeriod = async (page: Page): Promise<void> => {
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByLabel('year-picker-year').click();
  await page.getByRole('option', { name: '2026' }).click();
  await page.getByLabel('year-picker-month').click();
  await page.getByRole('option', { name: 'SEP' }).click();
  await page.getByRole('button', { name: 'APPLY' }).click();
};

/**
 * Journey: close a period that has NOT been started, from scratch — 開始關帳 plus
 * all eight stages (帳戶餘額 → … → Close Period). Replaces the earlier spec that
 * began from a seeded IN_PROGRESS period: everything it covered is reached at
 * the tail of this one, so the half-done entry added no coverage of its own.
 *
 * The seed deliberately leaves 2026-09 without a period record but keeps its
 * account/portfolio/project/debt snapshots and its three reports (issue #277),
 * so this run also covers "reports existed before any close record".
 *
 * Idempotency is asserted where the user can see it: re-confirming an already
 * completed stage (the 重新確認 path) must not move the walk on. That a repeated
 * confirm writes no duplicate documents is a persistence claim, covered at the
 * application layer (`monthlyCloseWorkflowUseCase.test.ts`, ADR-0052) rather
 * than through the browser (ADR-0082).
 *
 * This spec mutates close state, so it resets the emulator first: it can be run
 * standalone and never inherits a period left CLOSED by a previous run.
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

test('closing a period from scratch runs all eight stages', async ({ page }) => {
  // Eight emulator round-trips plus a reset; the default 30s budget is not
  // enough (it lands around 28s), so treat this as a slow test.
  test.slow();

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  // Start the period. Before this the period has no record at all.
  await page.goto('/close');
  await selectPeriod(page);
  await page.getByRole('button', { name: '開始關帳' }).click();
  await expect(page).toHaveURL(new RegExp(`/close/${PERIOD}`));

  // Stage 1: the confirm bar renders before the snapshot prefill arrives, so
  // wait for the ending-balance inputs to be seeded (clicking earlier would
  // submit an empty draft and be rejected).
  await expectStep(page, 1);
  await expect(page.getByRole('heading', { name: ACCOUNT_BALANCE_STAGE }).first()).toBeVisible();
  await expect(page.locator('input[id^="ending-"]').first()).not.toHaveValue('');
  await confirmStage(page);

  // Idempotency: revisit the completed stage from the pipeline and confirm it
  // again. The walk must stay where it is, not advance or rewind.
  await expectStep(page, 2);
  await page.getByTestId('close-pipeline-toggle').click();
  await page.getByRole('button', { name: ACCOUNT_BALANCE_STAGE }).click();
  await confirmStage(page);
  await expectStep(page, 2);

  // Stages 2–6: each confirm is idempotent and creates its own artifacts.
  // Driven by the walk position, not the stage view title: some views label
  // themselves differently from their stage (e.g. 就緒檢查 for completeness).
  for (const step of [2, 3, 4, 5, 6] as const) {
    await expectStep(page, step);
    await confirmStage(page);
  }

  // Stage 7: generating the reports also confirms the stage and advances to the
  // Close Period summary.
  await expectStep(page, 7);
  const generate = page.getByTestId('generate-reports');
  await expect(generate).toBeEnabled();
  await generate.click();

  // Stage 8: the summary's final action opens a confirmation dialog.
  await expectStep(page, 8);
  const closeAction = page.getByRole('button', { name: '正式關帳' }).first();
  await expect(closeAction).toBeVisible({ timeout: 20_000 });
  await closeAction.click();
  await page.getByRole('dialog').getByRole('button', { name: '正式關帳' }).click();

  // Closed, and the period shows up in the report history with figures.
  await expect(page.getByText('CLOSED').first()).toBeVisible({ timeout: 20_000 });
  await page.goto('/reports');
  const closedRow = page.getByRole('row', { name: new RegExp(PERIOD) });
  await expect(closedRow).toBeVisible();
  await expect(closedRow).not.toContainText('—');
});
