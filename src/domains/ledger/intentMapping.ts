export const IntentType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  TRANSFER: 'TRANSFER',
} as const;

export type IntentType = typeof IntentType[keyof typeof IntentType];

export interface IntentMappingInfo {
  intent: string;
  label: string;
  type: IntentType;
  debitLedgerCode: string;
  creditLedgerCode: string;
}

export const DEFAULT_INTENT_MAPPINGS: IntentMappingInfo[] = [
  // Expenses
  { intent: 'FOOD', label: '餐飲', type: IntentType.EXPENSE, debitLedgerCode: 'expense:food', creditLedgerCode: 'asset:cash' },
  { intent: 'TRANSPORTATION', label: '交通', type: IntentType.EXPENSE, debitLedgerCode: 'expense:transportation', creditLedgerCode: 'asset:cash' },
  { intent: 'SHOPPING', label: '購物', type: IntentType.EXPENSE, debitLedgerCode: 'expense:shopping', creditLedgerCode: 'asset:cash' },
  { intent: 'ENTERTAINMENT', label: '娛樂', type: IntentType.EXPENSE, debitLedgerCode: 'expense:entertainment', creditLedgerCode: 'asset:cash' },
  { intent: 'HOUSING', label: '居住', type: IntentType.EXPENSE, debitLedgerCode: 'expense:housing', creditLedgerCode: 'asset:cash' },
  
  // Incomes
  { intent: 'SALARY', label: '薪水', type: IntentType.INCOME, debitLedgerCode: 'asset:cash', creditLedgerCode: 'income:salary' },
  { intent: 'BONUS', label: '獎金', type: IntentType.INCOME, debitLedgerCode: 'asset:cash', creditLedgerCode: 'income:bonus' },
  { intent: 'INVESTMENT_INCOME', label: '投資收入', type: IntentType.INCOME, debitLedgerCode: 'asset:cash', creditLedgerCode: 'income:investment' },

  // Transfers
  { intent: 'TRANSFER_GENERIC', label: '轉帳', type: IntentType.TRANSFER, debitLedgerCode: 'asset:cash', creditLedgerCode: 'asset:cash' },
];

export const getIntentMapping = (intent: string): IntentMappingInfo | undefined => {
  return DEFAULT_INTENT_MAPPINGS.find((mapping) => mapping.intent === intent);
};

export const getIntentsByType = (type: IntentType): IntentMappingInfo[] => {
  return DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === type);
};
