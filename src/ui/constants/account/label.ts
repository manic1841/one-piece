import { AccountCategory, CurrencyType } from '@/domains/account/types';

export const AccountCategoryLabels = {
  [AccountCategory.BANK]: '銀行',
  [AccountCategory.CASH]: '現金',
  [AccountCategory.SECURITIES]: '券商',
  [AccountCategory.OTHER]: '帳戶',
} as const;

export const AccountCategoryOptions = Object.values(AccountCategory).map((key) => ({
  value: key,
  label: AccountCategoryLabels[key],
}));

/**
 * Section headings on the account list, one group per category. Deliberately
 * English (a visual grouping style, not a data label), and deliberately partial:
 * only the three categories the list groups by today.
 */
export const AccountCategorySectionTitles: Partial<Record<AccountCategory, string>> = {
  [AccountCategory.CASH]: 'CASH',
  [AccountCategory.BANK]: 'BANK',
  [AccountCategory.SECURITIES]: 'SECURITIES',
};

export const CurrencyLabels = {
  [CurrencyType.TWD]: 'TWD (NT$)',
  [CurrencyType.USD]: 'USD (US$)',
  [CurrencyType.EUR]: 'EUR (€)',
  [CurrencyType.JPY]: 'JPY (¥)',
} as const;

export const CurrencyOptions = Object.values(CurrencyType).map((key) => ({
  value: key,
  label: CurrencyLabels[key],
}));
