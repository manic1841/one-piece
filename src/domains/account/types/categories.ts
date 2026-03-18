// AccountCategory
export const AccountCategory = {
  BANK: 'bank',
  CASH: 'cash',
  SECURITIES: 'securities',
  OTHER: 'other',
} as const;

export type AccountCategory = (typeof AccountCategory)[keyof typeof AccountCategory];

// Currency
export const CurrencyType = {
  TWD: 'TWD',
  USD: 'USD',
  EUR: 'EUR',
  JPY: 'JPY',
} as const;

export type CurrencyType = (typeof CurrencyType)[keyof typeof CurrencyType];
