import { type Page, expect, test } from '@playwright/test';

import { QA_EMAIL, QA_PASSWORD, installEmulatorSession, signInEmulatorUser } from './support/qa';

/**
 * Journey: the projection workspace timeline. Device-level pointer drags and
 * the leave guard cannot be proven in jsdom, so this spec carries timeline
 * move/resize/reparent, Undo and the dirty-exit confirmation.
 */

/** Selects a year from a year field; the list holds every projection year. */
async function pickYear(scope: ReturnType<Page['getByTestId']>, label: string, year: string) {
  await scope.getByLabel(label).click();
  await scope.page().getByRole('option', { name: year, exact: true }).click();
}

/** Reach a valid setup with one income rule and one event bar. */
async function setupWorkspace(page: Page) {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto('/retirement/new');
  // The opening resolves either from a seeded closed period or from nothing;
  // waiting for whichever note lands keeps the typed amount from being
  // overwritten by a late seed.
  await page.getByText(/No closed period yet\.|Derived from the latest closed period\./).waitFor();
  await page.getByRole('button', { name: 'Edit baseline' }).click();
  await page.getByLabel('Opening net worth').fill('100000');
  await page.getByLabel('Birth year').click();
  await page.getByRole('option', { name: '1990', exact: true }).click();
  await page.getByLabel('Life expectancy').click();
  await page.getByRole('option', { name: '85', exact: true }).click();
  await page.getByLabel('Inflation rate (%)').fill('2');
  await page.getByLabel('Annual return rate (%)').fill('5');
  await page.getByLabel('Retirement age').click();
  await page.getByRole('option', { name: '60', exact: true }).click();

  await page.getByRole('button', { name: 'ADD RULE' }).click();
  // ADD opens the dialog on a fresh rule; confirming is what leaves the row.
  const inspector = page.getByTestId('rule-inspector');
  await inspector.getByLabel('Rule name').fill('Salary');
  await inspector.getByLabel('Method').click();
  await page.getByRole('option', { name: 'Fixed amount' }).click();
  await inspector.getByLabel('Amount').fill('1000');
  await page.getByTestId('rule-confirm').click();
  await expect(inspector).toBeHidden();

  await page.getByRole('button', { name: 'ADD EVENT' }).first().click();

  const eventInspector = page.getByTestId('life-event-inspector');
  await pickYear(eventInspector, 'Start year', '2030');
  await pickYear(eventInspector, 'End year', '2030');

  const timeline = page.getByTestId('life-event-timeline-editor');
  const bar = timeline.locator('[data-bar="0:0"]');
  await expect(bar).toBeVisible();
  await bar.click();
  await expect(eventInspector).toBeVisible();
  return { timeline, bar };
}

test('timeline drag is undoable and a dirty workspace asks before leaving', async ({ page }) => {
  const { bar } = await setupWorkspace(page);

  const inspector = page.getByTestId('life-event-inspector');
  const startYear = inspector.getByLabel('Start year');
  const original = (await startYear.textContent())?.trim();

  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(startYear).not.toHaveText(original ?? '');

  const undo = page.getByRole('button', { name: 'UNDO' });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(startYear).toHaveText(original ?? '');

  await page.getByRole('button', { name: 'BACK TO PROJECTIONS' }).click();
  await expect(page.getByText('Leave this workspace?')).toBeVisible();
  await page.getByRole('button', { name: 'LEAVE' }).click();
  await expect(page).toHaveURL(/\/retirement$/);
});

test('dragging a bar edge resizes the phase', async ({ page }) => {
  const { bar } = await setupWorkspace(page);

  const endYear = page.getByTestId('life-event-inspector').getByLabel('End year');
  const original = (await endYear.textContent())?.trim();

  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  // The resize handle sits on the right edge, a couple of pixels inside the bar.
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 60, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(endYear).not.toHaveText(original ?? '');
});

test('preview compares retirement ages without changing the result until applied', async ({
  page,
}) => {
  await setupWorkspace(page);
  await page
    .getByTestId('life-event-inspector')
    .getByRole('spinbutton', { name: 'Amount', exact: true })
    .fill('500');
  await page.getByRole('button', { name: 'CALCULATE' }).click();
  const comparison = page.getByRole('region', { name: 'WHAT IF YOU RETIRE…' });
  await expect(comparison).toBeVisible();
  const metric = page.getByTestId('metric-retirement-net-worth');
  const original = await metric.textContent();
  await comparison.getByRole('button', { name: 'Retire one year earlier' }).click();
  await expect(comparison.getByRole('columnheader', { name: 'Try · 59' })).toBeVisible();
  await expect(metric).toHaveText(original ?? '');
  await comparison.getByRole('button', { name: 'USE AGE 59' }).click();
  await expect(comparison.getByRole('columnheader', { name: 'Current · 59' })).toBeVisible();
  await expect(metric).toContainText('Age 59 · 2049');
  await page.getByRole('button', { name: 'BACK TO SETUP' }).click();
  await expect(page.getByLabel('Retirement age')).toHaveText('59');
});

test('dragging a bar onto another row reparents the phase and Undo restores it', async ({
  page,
}) => {
  const { timeline, bar } = await setupWorkspace(page);

  // A second event of the opposite type gives the drag a different row.
  await page.getByRole('button', { name: 'ADD RULE' }).click();
  const rule = page.getByTestId('rule-inspector');
  await rule.getByLabel('Side').click();
  await page.getByRole('option', { name: 'Expense' }).click();
  await rule.getByLabel('Rule name').fill('Rent');
  await rule.getByLabel('Method').click();
  await page.getByRole('option', { name: 'Fixed amount' }).click();
  await rule.getByLabel('Amount').fill('500');
  await page.getByTestId('rule-confirm').click();
  await expect(rule).toBeHidden();
  await page.getByRole('button', { name: 'ADD EVENT' }).first().click();

  const inspector = page.getByTestId('life-event-inspector');
  await pickYear(inspector, 'Start year', '2032');
  await pickYear(inspector, 'End year', '2032');
  // The type is a switch; on is expense, so no menu is involved.
  await inspector.getByRole('switch').click();
  await expect(inspector.getByRole('switch')).toBeChecked();
  // The window followed the typed year; walk back to reach the older bar.
  await page.getByRole('button', { name: 'Pan 5 years back' }).click();
  await bar.click();
  await expect(inspector.getByRole('switch')).not.toBeChecked();
  await expect(timeline.locator('[data-bar]')).toHaveCount(2);

  const sourceBox = await bar.boundingBox();
  expect(sourceBox).not.toBeNull();
  if (sourceBox === null) return;

  const expenseBar = timeline.locator('[data-bar="1:0"]');
  const targetBox = await expenseBar.boundingBox();
  expect(targetBox).not.toBeNull();
  if (targetBox === null) return;

  const startX = sourceBox.x + sourceBox.width / 2;
  await page.mouse.move(startX, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(startX, targetBox.y + targetBox.height / 2, { steps: 6 });
  await page.mouse.move(startX + 40, targetBox.y + targetBox.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(inspector.getByRole('switch')).toBeChecked();
  // The row it left keeps a blank phase instead of collapsing; the target row
  // keeps its own bar alongside the moved one.
  await expect(timeline.locator('[data-bar^="0:"]')).toHaveCount(1);
  await expect(timeline.locator('[data-bar^="1:"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'UNDO' }).click();
  await expect(inspector.getByRole('switch')).not.toBeChecked();
});
