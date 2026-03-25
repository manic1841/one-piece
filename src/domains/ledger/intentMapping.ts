import { LEDGER_CODES } from './constants';
import { IntentType } from './constants';

export interface IntentMappingInfo {
  intent: string;
  label: string;
  type: IntentType;
  debitLedgerCode: string;
  creditLedgerCode: string;
  debitUserSelect?: boolean;
  creditUserSelect?: boolean;
  allowedDebitPrefix?: string;
  allowedCreditPrefix?: string;
}

export const DEFAULT_INTENT_MAPPINGS: IntentMappingInfo[] = [
  // Expenses
  {
    intent: 'FOOD',
    label: '餐飲',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_FOOD,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'TRANSPORTATION',
    label: '交通',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'VEHICLE',
    label: '汽車',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_VEHICLE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SHOPPING',
    label: '購物',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_SHOPPING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'ENTERTAINMENT',
    label: '娛樂',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_ENTERTAINMENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'LIVING',
    label: '生活',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_LIVING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'HEALTHCARE',
    label: '醫療',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_HEALTHCARE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'EDUCATION',
    label: '教育',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_EDUCATION,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SOCIAL',
    label: '社交',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_SOCIAL,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'HOUSING',
    label: '居住',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_HOUSING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'RENT',
    label: '房租',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_RENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'MORTGAGE_INTEREST',
    label: '房貸利息',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_MORTGAGE_INTEREST,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'INSURANCE',
    label: '保險',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_INSURANCE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'TAX',
    label: '稅金',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_TAX,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'OTHER_EXPENSE',
    label: '其他支出',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_OTHER,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    debitUserSelect: true,
    allowedDebitPrefix: 'expense:',
  },

  // Incomes
  {
    intent: 'SALARY',
    label: '薪水',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_SALARY,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:salary',
  },
  {
    intent: 'BONUS',
    label: '獎金',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_BONUS,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:bonus',
  },
  {
    intent: 'INVESTMENT_INCOME',
    label: '投資收入',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_INVESTMENT,
  },
  {
    intent: 'REFUND_AS_INCOME',
    label: '退款回補',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_REFUND,
  },
  {
    intent: 'OTHER_INCOME',
    label: '其他收入',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_OTHER,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:',
  },

  // Transfers
  {
    intent: 'TRANSFER_GENERIC',
    label: '轉帳',
    type: IntentType.TRANSFER,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },

  // Investment
  {
    intent: 'SECURITY_BUY',
    label: '買入證券',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_INVESTMENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SECURITY_SELL',
    label: '賣出證券',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_INVESTMENT,
  },
  {
    intent: 'REAL_ESTATE_BUY',
    label: '買入不動產',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_PROPERTY,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    debitUserSelect: true,
    allowedDebitPrefix: 'asset:property',
  },
  {
    intent: 'REAL_ESTATE_SELL',
    label: '賣出不動產',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_PROPERTY,
    creditUserSelect: true,
    allowedCreditPrefix: 'asset:property',
  },

  // Financing
  {
    intent: 'LOAN_BORROW',
    label: '借貸入帳',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
  },
  {
    intent: 'LOAN_REPAYMENT',
    label: '借貸還款',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SHAREHOLDER_FINANCING',
    label: '股東融資',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.EQUITY_CAPITAL,
  },
  {
    intent: 'DIVIDEND_PAYOUT',
    label: '發放分紅',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.EQUITY_CAPITAL,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
];

export const getIntentMapping = (intent: string): IntentMappingInfo | undefined => {
  return DEFAULT_INTENT_MAPPINGS.find((mapping) => mapping.intent === intent);
};

export const getIntentsByType = (type: IntentType): IntentMappingInfo[] => {
  return DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === type);
};

/**
 * Determines whether a project transaction represents inflow (income) or outflow (expense)
 * from the project's perspective.
 *
 * - INCOME intentType → always income
 * - EXPENSE / DEBT_PAYMENT intentType → always expense
 * - FINANCING / INVESTMENT → determined by intent mapping:
 *     if the mapped debitLedgerCode is asset:cash, cash flows in → income
 *     (e.g. SHAREHOLDER_FINANCING, LOAN_BORROW, SECURITY_SELL)
 * - Unrecognised/MANUAL → conservative fallback of expense
 */
export function isTransactionProjectIncome(
  intentType: string | null | undefined,
  intent: string | null | undefined,
): boolean {
  if (intentType === IntentType.INCOME || intentType === IntentType.LIABILITY_BORROW) return true;
  if (intentType === IntentType.EXPENSE || intentType === IntentType.DEBT_PAYMENT) return false;

  if (intent) {
    const mapping = getIntentMapping(intent);
    if (mapping) {
      return mapping.debitLedgerCode === LEDGER_CODES.ASSET_CASH;
    }
  }

  return false;
}
