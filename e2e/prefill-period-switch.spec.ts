import { expect, test } from '@playwright/test';

import { openAccountBalanceStage, openPeriod, readSeededEndingBalance } from './support/close';
import {
  QA_EMAIL,
  QA_PASSWORD,
  installEmulatorSession,
  resetQaEnvironment,
  signInEmulatorUser,
} from './support/qa';

/** The period a draft is left in — started by this spec, so it is editable. */
const DRAFTED_PERIOD = '2026-09';
/** The period switched to — `CLOSED` in the seed, so its inputs are the record. */
const SETTLED_PERIOD = '2026-08';
/**
 * The account read throughout. Its ending balance differs between the two
 * months in the seed (money flowing through the payroll account), which is what
 * makes "the prefill source belongs to its own period" observable.
 */
const ACCOUNT_ID = 'acc_bank_main';
/** Deliberately not a seeded figure, so a leak cannot be mistaken for a prefill. */
const DRAFT = '999999';

/**
 * Journey 5 — prefill and drafts are period-scoped (CONTEXT §預填: 預填資料只屬於
 * 單一財務期間，切換期間時舊期間的草稿與預填來源必須即時退役，不得殘留).
 *
 * It walks the boundary the user actually crosses — type into one period, switch
 * through the picker, read the next — and asserts the outcome the user sees: the
 * second period's field holds *its own* figure, neither the draft nor the first
 * period's prefill. Both halves of that fail if the prefill loader stops keying
 * off `yearMonth` (`drafted !== settled` and `afterSwitch === settled`).
 *
 * What this layer does *not* pin is the in-page retirement of an
 * already-mounted draft: the switch reloads, so the workspace unmounts on its
 * own. That is pinned at unit level in `ClosePeriodRouteGate.test.tsx` (a
 * param-only change leaves no previous period mounted, per
 * ui-layer-architecture.md §Seed-Once Ownership); scripting a param→param swap
 * from here would be plumbing, not a journey (ADR-0082).
 *
 * The switched-to period is `CLOSED`, which is the strongest form of the
 * assertion available: its inputs render disabled holding *settled* snapshot
 * values, so it must show that month's record — a leaked draft would be visible
 * even though the field cannot be typed into.
 *
 * Mutates close state (starting 2026-09), so reset first.
 */
test.beforeAll(() => {
  resetQaEnvironment();
});

test('a draft entered in one period never leaks into the next', async ({ page }) => {
  // Two period transitions plus an unstarted period's eight-stage record; past
  // the default 30s budget.
  test.slow();

  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  // 1. Read the settled period's own figure first. This is the value the switch
  //    has to land on, captured before anything else can influence it.
  await openPeriod(page, SETTLED_PERIOD);
  await openAccountBalanceStage(page, { fromPipeline: true });
  const settled = await readSeededEndingBalance(page, ACCOUNT_ID);

  // 2. Start the drafted period and leave a recognizable draft in its
  //    ACCOUNT_BALANCE stage, without confirming.
  await openPeriod(page, DRAFTED_PERIOD);
  const ending = page.locator(`input#ending-${ACCOUNT_ID}`).first();
  await expect(ending).toBeEnabled();
  const drafted = await readSeededEndingBalance(page, ACCOUNT_ID);
  // The prefill source is per-period: the two months do not share a baseline.
  expect(drafted).not.toBe(settled);

  await ending.fill(DRAFT);
  await expect(ending).toHaveValue(DRAFT);

  // 3. Switch period through the app's own path. The next period must show its
  //    own settled figure — not the draft, and not the other period's prefill.
  await openPeriod(page, SETTLED_PERIOD);
  await openAccountBalanceStage(page, { fromPipeline: true });
  await expect(ending).toBeDisabled();
  const afterSwitch = await readSeededEndingBalance(page, ACCOUNT_ID);

  expect(afterSwitch).not.toBe(Number(DRAFT));
  expect(afterSwitch).not.toBe(drafted);
  expect(afterSwitch).toBe(settled);
});
