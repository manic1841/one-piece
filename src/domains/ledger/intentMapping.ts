import { LEDGER_CODES } from './constants';
import { IntentType } from './constants';

export interface IntentMappingInfo {
  intent: string;
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
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_FOOD,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'TRANSPORTATION',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'VEHICLE',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_VEHICLE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SHOPPING',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_SHOPPING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'ENTERTAINMENT',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_ENTERTAINMENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'LIVING',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_LIVING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'FAMILY',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_FAMILY,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'HEALTHCARE',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_HEALTHCARE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'EDUCATION',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_EDUCATION,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SOCIAL',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_SOCIAL,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'HOUSING',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_HOUSING,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'RENT',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_RENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'MORTGAGE_INTEREST',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_MORTGAGE_INTEREST,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'INSURANCE',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_INSURANCE,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'TAX',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_TAX,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'OTHER_EXPENSE',
    type: IntentType.EXPENSE,
    debitLedgerCode: LEDGER_CODES.EXPENSE_OTHER,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    debitUserSelect: true,
    allowedDebitPrefix: 'expense:',
  },

  // Incomes
  {
    intent: 'SALARY',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_SALARY,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:salary',
  },
  {
    intent: 'BONUS',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_BONUS,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:bonus',
  },
  {
    intent: 'INVESTMENT_INCOME',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_INVESTMENT,
  },
  {
    intent: 'REFUND_AS_INCOME',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_REFUND,
  },
  {
    intent: 'OTHER_INCOME',
    type: IntentType.INCOME,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.INCOME_OTHER,
    creditUserSelect: true,
    allowedCreditPrefix: 'income:',
  },

  // Transfers
  {
    intent: 'TRANSFER_GENERIC',
    type: IntentType.TRANSFER,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },

  // Investment
  {
    intent: 'SECURITY_BUY',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_INVESTMENT,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SECURITY_SELL',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_INVESTMENT,
  },
  {
    intent: 'REAL_ESTATE_BUY',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_PROPERTY,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    debitUserSelect: true,
    allowedDebitPrefix: 'asset:property',
  },
  {
    intent: 'REAL_ESTATE_SELL',
    type: IntentType.INVESTMENT,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.ASSET_PROPERTY,
    creditUserSelect: true,
    allowedCreditPrefix: 'asset:property',
  },

  // Financing
  {
    intent: 'LOAN_BORROW',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
  },
  {
    intent: 'LOAN_REPAYMENT',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
  },
  {
    intent: 'SHAREHOLDER_FINANCING',
    type: IntentType.FINANCING,
    debitLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditLedgerCode: LEDGER_CODES.EQUITY_CAPITAL,
  },
  {
    intent: 'DIVIDEND_PAYOUT',
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
