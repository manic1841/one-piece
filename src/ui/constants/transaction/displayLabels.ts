import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
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

const INTENT_LABEL_OVERRIDES: Record<string, string> = {
  SALARY: '薪資',
  INVESTMENT_INCOME: '投資收益',
};

const INTENT_LABELS = DEFAULT_INTENT_MAPPINGS.reduce<Record<string, string>>((acc, item) => {
  acc[item.intent] = INTENT_LABEL_OVERRIDES[item.intent] ?? item.label;
  return acc;
}, {});

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
