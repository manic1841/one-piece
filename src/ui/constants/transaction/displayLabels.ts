import { getLedgerLabel } from '@/ui/constants/report/ledgerCodeLabels';

const INTENT_TYPE_LABELS: Record<string, string> = {
  INCOME: '收入',
  EXPENSE: '支出',
  INVESTMENT: '投資',
  FINANCING: '融資',
  TRANSFER: '轉帳',
  DEBT_PAYMENT: '還款',
  LIABILITY_BORROW: '借款入帳',
  MANUAL: '手動分錄',
};

const INTENT_LABELS: Record<string, string> = {
  // Expenses
  FOOD: '餐飲',
  TRANSPORTATION: '交通',
  VEHICLE: '汽車',
  SHOPPING: '購物',
  ENTERTAINMENT: '娛樂',
  LIVING: '生活費',
  FAMILY: '家庭',
  HEALTHCARE: '醫療',
  EDUCATION: '教育',
  SOCIAL: '社交',
  HOUSING: '家居',
  RENT: '房租',
  MORTGAGE_INTEREST: '房貸利息',
  LOAN_INTEREST: '借貸利息',
  INSURANCE: '保險',
  TAX: '稅金',
  OTHER_EXPENSE: '其他支出',

  // Incomes
  SALARY: '薪資',
  BONUS: '獎金',
  INVESTMENT_INCOME: '投資收益',
  REFUND_AS_INCOME: '退款回補',
  OTHER_INCOME: '其他收入',

  // Transfers
  TRANSFER_GENERIC: '轉帳',

  // Investment
  SECURITY_BUY: '買入證券',
  SECURITY_SELL: '賣出證券',
  REAL_ESTATE_BUY: '買入不動產',
  REAL_ESTATE_SELL: '賣出不動產',

  // Financing
  LOAN_BORROW: '借貸入帳',
  LOAN_REPAYMENT: '借貸還款',
  SHAREHOLDER_FINANCING: '股東融資',
  DIVIDEND_PAYOUT: '發放分紅',
};

const LEDGER_LABEL_OVERRIDES: Record<string, string> = {
  'income:salary': '薪資',
  'income:investment': '投資收益',
};

const LEDGER_PREFIX_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: 'income:salary', label: '薪資' },
  { prefix: 'income:bonus', label: '獎金' },
  { prefix: 'income:investment', label: '投資收益' },
  { prefix: 'income:refund', label: '退款回補' },
  { prefix: 'income:other', label: '其他收入' },
];

export const ACCOUNTING_DETAILS_ENTRY_LABEL = '會計科目';
export const NO_CASH_ENTRY_LABEL = 'NO CASH ENTRY';
export const TRACKING_LABEL = 'tracking-widest';
export const TRANSACTION_COUNT_SUFFIX = '筆交易';
export const MONTH_HEADER_TRACKING_LABEL = 'tracking-heading';

export const getIntentTypeLabel = (intentType?: string | null): string => {
  if (!intentType) return '';
  return INTENT_TYPE_LABELS[intentType] ?? intentType;
};

export const getIntentLabel = (intent?: string | null): string => {
  if (!intent) return '';
  return INTENT_LABELS[intent] ?? intent;
};

export const getUnifiedLedgerCodeLabel = (code?: string | null): string => {
  if (!code) return '';

  const exactLabel = LEDGER_LABEL_OVERRIDES[code] ?? getLedgerLabel(code);
  if (exactLabel !== code) {
    return exactLabel;
  }

  const prefixMatch = LEDGER_PREFIX_LABELS.find((item) => code.startsWith(item.prefix));
  return prefixMatch?.label ?? code;
};

export const getTransactionCategoryLabel = (input: {
  intentType?: string | null;
  intent?: string | null;
  ledgerCode?: string | null;
  getLedgerLabel?: (code: string) => string;
}): string => {
  const { intentType, intent, ledgerCode, getLedgerLabel: externalLedgerLabel } = input;

  if (ledgerCode) {
    const externalLabel = externalLedgerLabel?.(ledgerCode);
    if (externalLabel && externalLabel !== ledgerCode) {
      return externalLabel;
    }

    return getUnifiedLedgerCodeLabel(ledgerCode);
  }

  if (intent) {
    return getIntentLabel(intent);
  }

  if (intentType) {
    return getIntentTypeLabel(intentType);
  }

  return '未分類';
};
