import { expect, test } from '@playwright/test';

import { expectCloseStep, readSummaryFigure, walkToCloseSummary } from './support/close';
import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';
import { pickFirstDetailCategory } from './support/ui';

const PERIOD = '2026-09';
const TARGET_PROJECT_NAME = '旅遊基金';
const EXPENSE_AMOUNT = 250;
/** The summary row the booked expense moves; its drift delta must be −250. */
const MOVED_FIGURE = '本期淨利';

/**
 * Journey 4 — report drift blocks the close, and the shortcut out of the block
 * actually works (ADR-0073, issue #279).
 *
 * The gate exists because the backend close check only asks whether reports are
 * persisted; a transaction booked after FINANCIAL_REPORTS was confirmed would
 * otherwise be frozen into a closed period whose reports no longer describe it.
 * The shortcut the block offers ("go back and regenerate") is the only way out
 * that does not reopen the whole walk, so this spec walks it end to end.
 *
 * Mutates close state, so reset first: the run must start with 2026-09
 * unstarted and its seeded reports intact (#277).
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

test('a late expense drifts the reports and blocks the close until they are regenerated', async ({
  page,
}) => {
  // The full walk plus a second visit to the reports stage: well past the
  // default 30s budget.
  test.slow();

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  // 1. Reach the Close Period summary with the reports already generated and
  //    the stage confirmed. The figures read here are the persisted baseline:
  //    the reports were just generated from this very preview.
  await walkToCloseSummary(page);
  await expectCloseStep(page, 8);
  const baseline = await readSummaryFigure(page, MOVED_FIGURE);

  // 2. Book an expense into the period after the reports were produced. The
  //    date is pinned so the transaction lands in the period being closed, not
  //    in whatever month "today" happens to be.
  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增交易' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: TARGET_PROJECT_NAME }).click();
  await dialog.getByRole('button', { name: '生活費' }).click();
  await pickFirstDetailCategory(dialog);
  await dialog.getByPlaceholder('0.00').fill(String(EXPENSE_AMOUNT));
  await dialog.getByLabel('日期').fill('2026-09-15');
  await dialog.getByPlaceholder('補充這筆支出的脈絡').fill(`E2E 漂移 ${Date.now()}`);
  await dialog.getByRole('button', { name: '送出' }).click();
  await expect(dialog).toBeHidden();

  // 3. The preview no longer matches the persisted reports, so the summary
  //    shows the drift (persisted -> live) and refuses to close.
  await page.goto(`/close/${PERIOD}`);
  const driftBlock = page.getByTestId('close-drift-block');
  await expect(driftBlock).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/NT\$[\d,]+ -> NT\$[\d,]+/).first()).toBeVisible();
  // The left operand is the persisted figure, the right one the live preview:
  // direction pinned by the value captured before the expense existed.
  const drifted = await readSummaryFigure(page, MOVED_FIGURE);
  expect(drifted.persisted).toBeCloseTo(baseline.persisted, 2);
  expect(drifted.preview).toBeCloseTo(drifted.persisted - EXPENSE_AMOUNT, 2);

  // 4. The gate is expressed as a disabled action, so there is nothing to submit
  //    and nothing new is persisted; the period is still not closed.
  const closeAction = page.getByTestId('close-period-confirm');
  await expect(closeAction).toBeDisabled();
  await page.reload();
  await expect(driftBlock).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('close-period-confirm')).toBeDisabled();
  await expect(page.getByText('CLOSED')).toHaveCount(0);

  // 5. Take the shortcut the block offers. The completed reports stage keeps its
  //    action while it drifts, so the instruction is followable.
  await page.getByTestId('review-reports').click();
  const panel = page.getByTestId('reports-generated-panel');
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(panel).toContainText('重新產生會以目前預覽覆寫');
  const regenerate = page.getByTestId('generate-reports');
  await expect(regenerate).toHaveText('REGENERATE REPORTS');
  await regenerate.click();

  // Regenerating persists the current preview and then reloads it, so the drift
  // hint clears only after a write plus a re-read — budget for round-trips, not
  // for the 5s default that a locally-loaded emulator can just miss.
  await expect(panel).not.toContainText('重新產生會以目前預覽覆寫', { timeout: 20_000 });

  // 6. Back on the summary the gate has lifted and the close goes through.
  await page
    .getByRole('button', { name: /CONTINUE →/ })
    .first()
    .click();
  await expect(driftBlock).toBeHidden({ timeout: 20_000 });
  await expect(closeAction).toBeEnabled({ timeout: 20_000 });
  await closeAction.click();
  await page.getByRole('dialog').getByRole('button', { name: '正式關帳' }).click();

  await expect(page.getByText('CLOSED').first()).toBeVisible({ timeout: 20_000 });
});
