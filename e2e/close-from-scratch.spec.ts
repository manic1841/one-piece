import { expect, test } from '@playwright/test';

import {
  confirmAccountBalanceStage,
  confirmCloseStage,
  confirmStages,
  expectCloseStep,
  generateReports,
  openAccountBalanceStage,
  openPeriod,
} from './support/close';
import {
  QA_EMAIL,
  QA_PASSWORD,
  countAccountSnapshots,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';

const PERIOD = '2026-09';
/** Any seeded account: the re-confirm upserts its snapshot for the period. */
const ACCOUNT_BALANCE_ACCOUNT_ID = 'acc_bank_main';

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
 * completed stage (the 重新確認 path) must not move the walk on, and the repeat
 * confirm must upsert one snapshot doc per period rather than append (checked
 * through the emulator's REST API; the write path itself is covered at the
 * application layer, `monthlyCloseWorkflowUseCase.test.ts`, ADR-0052).
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
  await openPeriod(page, PERIOD);
  await confirmAccountBalanceStage(page);

  // Idempotency: revisit the completed stage from the pipeline and confirm it
  // again. The walk must stay where it is, not advance or rewind, and the
  // repeat confirm must upsert one snapshot doc per period rather than append.
  const snapCountBefore = await countAccountSnapshots(ACCOUNT_BALANCE_ACCOUNT_ID);
  // A wrong read path would return 0 twice and the comparison below would pass
  // for the wrong reason.
  expect(snapCountBefore).toBeGreaterThan(0);
  await expectCloseStep(page, 2);
  await openAccountBalanceStage(page, { fromPipeline: true });
  await confirmCloseStage(page);
  await expectCloseStep(page, 2);
  expect(await countAccountSnapshots(ACCOUNT_BALANCE_ACCOUNT_ID)).toBe(snapCountBefore);

  // Stages 2–6, then generate the reports (which also confirms stage 7).
  await confirmStages(page, 2, 6);
  await generateReports(page);

  // Stage 8: the summary's final action opens a confirmation dialog. Scope it
  // to the summary: the pipeline's step 08 carries the same label but is still
  // disabled at this point, so `.first()` would hit an inert button.
  const closeAction = page.getByTestId('close-period-confirm');
  await expect(closeAction).toBeVisible({ timeout: 20_000 });
  await closeAction.click();
  await page.getByRole('dialog').getByRole('button', { name: '正式關帳' }).click();

  // Closed, and the period shows up in the report history with figures.
  await expect(page.getByText('已關帳').first()).toBeVisible({ timeout: 20_000 });
  await page.goto('/reports');
  const closedRow = page.getByRole('row', { name: new RegExp(PERIOD) });
  await expect(closedRow).toBeVisible();
  await expect(closedRow).not.toContainText('—');
});

/**
 * The phone keeps the report statements as tabs. The list used to be
 * `hidden md:inline-flex` while every panel was force-mounted, so the phone
 * stacked all three statements and had nothing to switch with. Runs after the
 * close above: it reads the period that run just closed.
 */
test('the phone switches report statements instead of stacking them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto(`/reports/${PERIOD}`);

  const balanceTab = page.getByRole('tab', { name: '資產負債表' });
  await expect(balanceTab).toBeVisible({ timeout: 20_000 });
  // The tab list scrolls inside itself rather than widening the page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);

  await balanceTab.click();
  await expect(page.getByText('負債 + 權益').first()).toBeVisible();
});
