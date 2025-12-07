import { AccountCategory, CurrencyType } from '@/domains/account/types';

export const AccountCategoryLabels = {
  [AccountCategory.BANK]: 'Bank',
  [AccountCategory.CASH]: 'Cash',
  [AccountCategory.INVESTMENT]: 'Investment',
  [AccountCategory.OTHER]: 'Other',
} as const;

export const AccountCategoryOptions = Object.values(AccountCategory).map((key) => ({
  value: key,
  label: AccountCategoryLabels[key],
}));

export const CurrencyLabels = {
  [CurrencyType.TWD]: 'TWD (NT$)',
  [CurrencyType.USD]: 'USD ($)',
  [CurrencyType.EUR]: 'EUR (€)',
  [CurrencyType.JPY]: 'JPY (¥)',
} as const;

export const CurrencyOptions = Object.values(CurrencyType).map((key) => ({
  value: key,
  label: CurrencyLabels[key],
}));
