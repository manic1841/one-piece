import { type Locator, type Page } from '@playwright/test';

/** Parse a formatted money string (`NT$1,234`, `$ 1,234.50`, `$ —`) into a number. */
export const parseMoney = (text: string): number => {
  const cleaned = text.replace(/[^0-9.-]/g, '');
  return cleaned === '' ? Number.NaN : Number.parseFloat(cleaned);
};

/**
 * Reads a labelled metric inside a `PageSection` (e.g. the SUMMARY section's
 * `收入`). This is the live per-project figure: the hero PROJECT BALANCE is
 * snapshot-derived and only moves when the period is settled.
 */
export const readSectionMetric = async (
  page: Page,
  heading: string,
  label: string,
): Promise<number> => {
  const section = page.locator('section', { hasText: heading }).first();
  const tile = section.getByText(label, { exact: true }).first().locator('xpath=..');
  return parseMoney(await tile.innerText());
};

/**
 * Some intents need an explicit detail ledger code. When the
 * "屬性 / 詳細類別" select appears, pick its first option so the form can
 * resolve entries.
 */
export const pickFirstDetailCategory = async (dialog: Locator): Promise<void> => {
  const placeholder = dialog.getByText('選擇具體項目...');
  if ((await placeholder.count()) === 0) return;
  await placeholder.first().click();
  await dialog.page().getByRole('option').first().click();
};
