import { expect, test } from '@playwright/test';

import {
  confirmAccountBalanceStage,
  confirmCloseStage,
  confirmStages,
  expectCloseStep,
  generateReports,
  startSeptemberPeriod,
} from './support/close';
import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';

const PERIOD = '2026-09';
const ACCOUNT_BALANCE_STAGE = '帳戶餘額';

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
  await startSeptemberPeriod(page);
  await confirmAccountBalanceStage(page);

  // Idempotency: revisit the completed stage from the pipeline and confirm it
  // again. The walk must stay where it is, not advance or rewind.
  await expectCloseStep(page, 2);
  await page.getByTestId('close-pipeline-toggle').click();
  await page.getByRole('button', { name: ACCOUNT_BALANCE_STAGE }).click();
  await confirmCloseStage(page);
  await expectCloseStep(page, 2);

  // Stages 2–6, then generate the reports (which also confirms stage 7).
  await confirmStages(page, 2, 6);
  await generateReports(page);

  // Stage 8: the summary's final action opens a confirmation dialog.
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
