// AccountCategory
export const AccountCategory = {
  BANK: 'bank',
  CASH: 'cash',
  INVESTMENT: 'investment',
  OTHER: 'other',
} as const;

export type AccountCategory = (typeof AccountCategory)[keyof typeof AccountCategory];
