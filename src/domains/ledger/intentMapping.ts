export const IntentType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  INVESTMENT: 'INVESTMENT',
  FINANCING: 'FINANCING',
  TRANSFER: 'TRANSFER',
  PROJECT_TRANSFER: 'PROJECT_TRANSFER',
  MANUAL: 'MANUAL',
} as const;

export type IntentType = (typeof IntentType)[keyof typeof IntentType];

export interface IntentMappingInfo {
  intent: string;
  label: string;
  type: IntentType;
  debitLedgerCode: string;
  creditLedgerCode: string;
}

export const DEFAULT_INTENT_MAPPINGS: IntentMappingInfo[] = [
  // Expenses
  {
    intent: 'FOOD',
    label: '餐飲',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:food',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'TRANSPORTATION',
    label: '交通',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:transportation',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'SHOPPING',
    label: '購物',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:shopping',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'ENTERTAINMENT',
    label: '娛樂',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:entertainment',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'HOUSING',
    label: '居住',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:housing',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'RENT',
    label: '房租',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:rent',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'MORTGAGE_INTEREST',
    label: '房貸利息',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:mortgage_interest',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'INSURANCE',
    label: '保險',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:insurance',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'TAX',
    label: '稅金',
    type: IntentType.EXPENSE,
    debitLedgerCode: 'expense:tax',
    creditLedgerCode: 'asset:cash',
  },

  // Incomes
  {
    intent: 'SALARY',
    label: '薪水',
    type: IntentType.INCOME,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'income:salary',
  },
  {
    intent: 'BONUS',
    label: '獎金',
    type: IntentType.INCOME,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'income:bonus',
  },
  {
    intent: 'INVESTMENT_INCOME',
    label: '投資收入',
    type: IntentType.INCOME,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'income:investment',
  },
  {
    intent: 'REFUND_AS_INCOME',
    label: '退款回補',
    type: IntentType.INCOME,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'income:refund',
  },

  // Transfers
  {
    intent: 'TRANSFER_GENERIC',
    label: '轉帳',
    type: IntentType.TRANSFER,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'asset:cash',
  },

  // Investment
  {
    intent: 'SECURITY_BUY',
    label: '買入證券',
    type: IntentType.INVESTMENT,
    debitLedgerCode: 'asset:investment',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'SECURITY_SELL',
    label: '賣出證券',
    type: IntentType.INVESTMENT,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'asset:investment',
  },
  {
    intent: 'REAL_ESTATE_BUY',
    label: '買入不動產',
    type: IntentType.INVESTMENT,
    debitLedgerCode: 'asset:property',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'REAL_ESTATE_SELL',
    label: '賣出不動產',
    type: IntentType.INVESTMENT,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'asset:property',
  },

  // Financing
  {
    intent: 'LOAN_BORROW',
    label: '借貸入帳',
    type: IntentType.FINANCING,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'liability:loan',
  },
  {
    intent: 'LOAN_REPAYMENT',
    label: '借貸還款',
    type: IntentType.FINANCING,
    debitLedgerCode: 'liability:loan',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'SHAREHOLDER_FINANCING',
    label: '股東融資',
    type: IntentType.FINANCING,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'equity:owner_investment',
  },
  {
    intent: 'DIVIDEND_PAYOUT',
    label: '發放分紅',
    type: IntentType.FINANCING,
    debitLedgerCode: 'equity:owner_draw',
    creditLedgerCode: 'asset:cash',
  },
  {
    intent: 'INITIAL_CAPITAL',
    label: '初始資金',
    type: IntentType.FINANCING,
    debitLedgerCode: 'asset:cash',
    creditLedgerCode: 'equity:initial_capital',
  },
];

export const getIntentMapping = (intent: string): IntentMappingInfo | undefined => {
  return DEFAULT_INTENT_MAPPINGS.find((mapping) => mapping.intent === intent);
};

export const getIntentsByType = (type: IntentType): IntentMappingInfo[] => {
  return DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === type);
};
