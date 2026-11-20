import { type Locator } from '@playwright/test';

/** Parse a formatted money string (`NT$1,234`, `$ 1,234.50`, `$ —`) into a number. */
export const parseMoney = (text: string): number => {
  const cleaned = text.replace(/[^0-9.-]/g, '');
  return cleaned === '' ? Number.NaN : Number.parseFloat(cleaned);
};

/**
 * Read a money figure once it has stopped moving.
 *
 * Project balances count up from zero on mount and interpolate on every change
 * (motion-system §5.2), so a single `innerText` can catch a mid-animation frame.
 * Two identical samples 60ms apart mean the number has settled.
 */
export const readSettledMoney = async (locator: Locator): Promise<number> => {
  let previous = Number.NaN;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const current = parseMoney(await locator.innerText());
    if (!Number.isNaN(current) && current === previous) return current;
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return previous;
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
