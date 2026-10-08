import { expect, test } from '@playwright/test';

import { expectCloseStep } from './support/close';
import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';

/** The period reopened. Seeded `CLOSED` with all eight stages completed. */
const REOPENED_PERIOD = '2026-07';
/**
 * The later closed period that must cascade. `2026-08` is seeded `CLOSED`; the
 * month after it (`2026-09`) has no record, so reopening `2026-08` instead would
 * have nothing to demote. The two are deliberately adjacent for that reason.
 */
const DEMOTED_PERIOD = '2026-08';

/**
 * The copy each state renders, pinned here so a wording change fails the spec
 * instead of silently matching something else on the page.
 */
const REOPEN_ACTION = '重新開啟';
const REOPEN_DIALOG_TITLE = '此期間已經關帳';
const FINALIZED_BANNER = '本期已完成關帳';
const IN_PROGRESS_BADGE = 'IN PROGRESS';
const CLOSED_BADGE = 'CLOSED';
const EXISTING_REPORTS_WARNING = '此期間已有先前產生的報表';
const CASCADE_BANNER = '此期間已改為待審閱：前期關帳已重新開啟';
const NEEDS_REVIEW_BADGE = 'NEEDS REVIEW';

/**
 * Journey — reopening a closed period cascades (ADR-0066, issue #278).
 *
 * Reopen withdraws the *finalize decision*, not the work: the reopened period
 * keeps its completed stages and goes back to IN_PROGRESS with Financial Reports
 * and Close Period reset to PENDING, while every later closed period is demoted
 * to NEEDS_REVIEW because its close may rest on pre-correction history. The
 * state transitions are unit-tested (`financial_period/stateMachine.test.ts`);
 * what no lower seam can assert is that the cascade actually lands across
 * periods — a second period's *record* is rewritten by reopening the first, and
 * this spec reads it back through the UI.
 *
 * Both periods are seeded `CLOSED`, so nothing has to be built first and the
 * spec goes straight to the periods by URL — the same entry point
 * `report-drift-blocks-close` uses.
 *
 * Mutates close state, so reset first: reopening is one-way from the spec's
 * point of view, and a repeat run must not inherit an already-reopened `2026-07`.
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

test('reopening a closed period demotes every later closed period to needs-review', async ({
  page,
}) => {
  // Two page loads, a reopen round-trip and the stage re-reads that follow it;
  // past the default 30s budget.
  test.slow();

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  // 1. Stand on the closed period. A `CLOSED` period renders read-only on the
  //    Close Period summary and offers reopen as its only accepted mutation
  //    (ADR-0071/0066).
  await page.goto(`/close/${REOPENED_PERIOD}`);
  await expect(page.getByText(FINALIZED_BANNER)).toBeVisible({ timeout: 20_000 });
  await expectCloseStep(page, 8);

  // 2. Reopen behind its confirmation dialog. The header action and the dialog's
  //    confirm share their label, so the click goes through the dialog.
  await page.getByRole('button', { name: REOPEN_ACTION }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(REOPEN_DIALOG_TITLE)).toBeVisible();
  await dialog.getByRole('button', { name: REOPEN_ACTION }).click();

  // 3. The finalize decision is withdrawn: the period is in progress again, no
  //    longer CLOSED, and the walk is back at Financial Reports (step 7) —
  //    CLOSE_PERIOD and FINANCIAL_REPORTS reset to PENDING while the other six
  //    stages stay completed. (The record's exact shape is asserted at the
  //    application layer; what this layer adds is that the user sees it.)
  await expect(page.getByText(FINALIZED_BANNER)).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(IN_PROGRESS_BADGE).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(CLOSED_BADGE)).toHaveCount(0);
  await expectCloseStep(page, 7);

  // 4. The reports the period produced are retained as the comparison baseline
  //    (CONTEXT §已產生報表): persisted, but the stage is PENDING again, which is
  //    exactly what the existing-reports warning states. Reports deleted by the
  //    reopen would drop the flag and this warning with it.
  await expect(page.getByText(EXISTING_REPORTS_WARNING)).toBeVisible({ timeout: 20_000 });

  // 5. The cascade: the later closed period's *record* was rewritten by
  //    reopening the first one, so its screen shows the demotion. This is the
  //    only outcome the UI can add here — the demoted shape itself (NEEDS_REVIEW,
  //    reviewSourceStageId null, all eight stages left COMPLETED, unlike a full
  //    reopen) is asserted where it can be read exactly, at the application
  //    layer (`monthlyCloseWorkflowUseCase.integration.test.ts`, ADR-0066).
  await page.goto(`/close/${DEMOTED_PERIOD}`);
  await expect(page.getByText(CASCADE_BANNER)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(NEEDS_REVIEW_BADGE).first()).toBeVisible();
  await expect(page.getByText(CLOSED_BADGE)).toHaveCount(0);
});
