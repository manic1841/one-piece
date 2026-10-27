import { type Page, expect, test } from '@playwright/test';

import { QA_EMAIL, QA_PASSWORD, installEmulatorSession, signInEmulatorUser } from './support/qa';

/**
 * Journey: the projection workspace timeline. Device-level pointer drags and
 * the leave guard cannot be proven in jsdom, so this spec carries timeline
 * move/resize/reparent, Undo and the dirty-exit confirmation.
 */

/** Reach a valid setup with one income rule and one event bar. */
async function setupWorkspace(page: Page) {
  const session = await signInEmulatorUser(QA_EMAIL, QA_PASSWORD);
  await installEmulatorSession(page, session);

  await page.goto('/retirement/new?start=blank');
  await page.getByText('No closed period yet.').waitFor();
  await page.getByLabel('Opening net worth').fill('100000');
  await page.getByLabel('Birth year').fill('1990');
  await page.getByLabel('Life expectancy').fill('85');
  await page.getByLabel('Inflation rate (%)').fill('2');
  await page.getByLabel('Annual return rate (%)').fill('5');

  const age = page.getByLabel('Retirement age');
  await age.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.getByRole('button', { name: 'ADD RULE' }).click();
  // ADD opens the dialog on a fresh rule; confirming is what leaves the row.
  const inspector = page.getByTestId('rule-inspector');
  await inspector.getByLabel('Rule name').fill('Salary');
  await inspector.getByLabel('Method').click();
  await page.getByRole('option', { name: 'Fixed amount' }).click();
  await inspector.getByLabel('Amount').fill('1000');
  await page.getByTestId('rule-confirm').click();
  await expect(inspector).toBeHidden();

  await page.getByRole('button', { name: 'ADD EVENT' }).click();

  const timeline = page.getByTestId('life-event-timeline-editor');
  const bar = timeline.getByRole('button', { name: /Income/ }).first();
  await expect(bar).toBeVisible();
  await bar.click();
  await expect(page.getByTestId('life-event-inspector')).toBeVisible();
  return { timeline, bar };
}

test('timeline drag is undoable and a dirty workspace asks before leaving', async ({ page }) => {
  const { bar } = await setupWorkspace(page);

  const inspector = page.getByTestId('life-event-inspector');
  const startYear = inspector.getByLabel('Start year');
  const original = await startYear.inputValue();

  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(startYear).not.toHaveValue(original);

  const undo = page.getByRole('button', { name: 'UNDO' });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(startYear).toHaveValue(original);

  await page.getByRole('button', { name: 'CANCEL' }).click();
  await expect(page.getByText('Leave this workspace?')).toBeVisible();
  await page.getByRole('button', { name: 'LEAVE' }).click();
  await expect(page).toHaveURL(/\/retirement$/);
});

test('dragging a bar edge resizes the phase', async ({ page }) => {
  const { bar } = await setupWorkspace(page);

  const endYear = page.getByTestId('life-event-inspector').getByLabel('End year');
  const original = await endYear.inputValue();

  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  // The resize handle sits on the right edge, a couple of pixels inside the bar.
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 60, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(endYear).not.toHaveValue(original);
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
  await page.getByRole('button', { name: 'ADD EVENT' }).click();

  const inspector = page.getByTestId('life-event-inspector');
  await bar.click();
  await expect(inspector.getByText(/· Income/)).toBeVisible();

  const sourceBox = await bar.boundingBox();
  expect(sourceBox).not.toBeNull();
  if (sourceBox === null) return;

  const expenseBar = timeline.getByRole('button', { name: /Expense/ }).first();
  const targetBox = await expenseBar.boundingBox();
  expect(targetBox).not.toBeNull();
  if (targetBox === null) return;

  const startX = sourceBox.x + sourceBox.width / 2;
  await page.mouse.move(startX, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(startX, targetBox.y + targetBox.height / 2, { steps: 6 });
  await page.mouse.move(startX + 40, targetBox.y + targetBox.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect(inspector.getByText(/· Expense/)).toBeVisible();

  await page.getByRole('button', { name: 'UNDO' }).click();
  await expect(inspector.getByText(/· Income/)).toBeVisible();
});
