export const IntentType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  INVESTMENT: 'INVESTMENT',
  FINANCING: 'FINANCING',
  TRANSFER: 'TRANSFER',
  MANUAL: 'MANUAL',
  DEBT_PAYMENT: 'DEBT_PAYMENT',
} as const;

export type IntentType = (typeof IntentType)[keyof typeof IntentType];
