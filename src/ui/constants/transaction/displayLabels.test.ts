import { describe, expect, it } from 'vitest';

import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';

import {
  getIntentLabel,
  getIntentTypeLabel,
  getTransactionCategoryLabel,
  getUnifiedLedgerCodeLabel,
} from './displayLabels';

describe('displayLabels pinning', () => {
  it('pins canonical intentType wording', () => {
    expect(getIntentTypeLabel('INCOME')).toBe('收入');
    expect(getIntentTypeLabel('EXPENSE')).toBe('支出');
    expect(getIntentTypeLabel('INVESTMENT')).toBe('投資');
    expect(getIntentTypeLabel('FINANCING')).toBe('融資');
    expect(getIntentTypeLabel('TRANSFER')).toBe('轉帳');
    expect(getIntentTypeLabel('DEBT_PAYMENT')).toBe('還款');
    expect(getIntentTypeLabel('LIABILITY_BORROW')).toBe('借款入帳');
    expect(getIntentTypeLabel('MANUAL')).toBe('手動分錄');
  });

  it('pins high-risk intent wording', () => {
    expect(getIntentLabel('SALARY')).toBe('薪資');
    expect(getIntentLabel('INVESTMENT_INCOME')).toBe('投資收益');
    expect(getIntentLabel('LIVING')).toBe('生活費');
    expect(getIntentLabel('SOCIAL')).toBe('社交');
    expect(getIntentLabel('HOUSING')).toBe('家居');
    expect(getIntentLabel('REFUND_AS_INCOME')).toBe('退款回補');
  });

  it('covers every domain intent mapping with a display label', () => {
    const unlabeled = DEFAULT_INTENT_MAPPINGS.filter(
      (mapping) =>
        !getIntentLabel(mapping.intent) || getIntentLabel(mapping.intent) === mapping.intent,
    );

    expect(unlabeled.map((mapping) => mapping.intent)).toEqual([]);
  });

  it('pins the full intent label table in sync with domain mappings', () => {
    const expectedByIntent: Record<string, string> = {
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
      SALARY: '薪資',
      BONUS: '獎金',
      INVESTMENT_INCOME: '投資收益',
      REFUND_AS_INCOME: '退款回補',
      OTHER_INCOME: '其他收入',
      TRANSFER_GENERIC: '轉帳',
      SECURITY_BUY: '買入證券',
      SECURITY_SELL: '賣出證券',
      REAL_ESTATE_BUY: '買入不動產',
      REAL_ESTATE_SELL: '賣出不動產',
      LOAN_BORROW: '借貸入帳',
      LOAN_REPAYMENT: '借貸還款',
      SHAREHOLDER_FINANCING: '股東融資',
      DIVIDEND_PAYOUT: '發放分紅',
    };

    expect(Object.keys(expectedByIntent).sort()).toEqual(
      DEFAULT_INTENT_MAPPINGS.map((mapping) => mapping.intent).sort(),
    );

    for (const [intent, label] of Object.entries(expectedByIntent)) {
      expect(getIntentLabel(intent)).toBe(label);
    }
  });

  it('pins high-risk ledger code wording', () => {
    expect(getUnifiedLedgerCodeLabel('expense:living')).toBe('生活費');
    expect(getUnifiedLedgerCodeLabel('expense:housing')).toBe('家居');
    expect(getUnifiedLedgerCodeLabel('expense:social')).toBe('社交');
    expect(getUnifiedLedgerCodeLabel('income:refund')).toBe('退款回補');
    expect(getUnifiedLedgerCodeLabel('income:salary')).toBe('薪資');
    expect(getUnifiedLedgerCodeLabel('income:investment')).toBe('投資收益');
  });

  it('falls back to the raw code for unknown ledger codes', () => {
    expect(getUnifiedLedgerCodeLabel('expense:unknown_code')).toBe('expense:unknown_code');
  });

  it('resolves transaction category with ledger code precedence', () => {
    expect(
      getTransactionCategoryLabel({
        intentType: 'EXPENSE',
        intent: 'HOUSING',
        ledgerCode: 'expense:housing',
      }),
    ).toBe('家居');

    expect(getTransactionCategoryLabel({ intent: 'SALARY' })).toBe('薪資');
    expect(getTransactionCategoryLabel({ intentType: 'DEBT_PAYMENT' })).toBe('還款');
    expect(getTransactionCategoryLabel({})).toBe('未分類');
  });

  it('honors an external ledger label resolver when provided', () => {
    expect(
      getTransactionCategoryLabel({
        ledgerCode: 'expense:housing',
        getLedgerLabel: () => '自訂住房支出',
      }),
    ).toBe('自訂住房支出');
  });
});
