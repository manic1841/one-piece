import { describe, expect, it } from 'vitest';

import { type Transaction } from '@/domains/ledger/schemas';

import { validateMonthTransactions } from './validator';

const baseTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-1',
    date: new Date('2026-09-02'),
    intentType: 'EXPENSE',
    intent: 'FOOD',
    amount: 100,
    projectId: null,
    allocationId: null,
    debtAccountId: null,
    createdBy: 'user@test.com',
    entries: [
      { ledgerCode: 'expense:food', debit: 100, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: 100 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAt: new Date(),
    ...overrides,
  }) as Transaction;

describe('validateMonthTransactions', () => {
  it('returns no issues for valid transactions', () => {
    const result = validateMonthTransactions([baseTransaction()]);

    expect(result.checkedCount).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it('flags unbalanced entries', () => {
    const result = validateMonthTransactions([
      baseTransaction({
        entries: [
          { ledgerCode: 'expense:food', debit: 100, credit: 0 },
          { ledgerCode: 'asset:cash', debit: 0, credit: 90 },
        ],
      }),
    ]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.reason).toBe('借貸不平衡');
  });

  it('flags unknown intents', () => {
    const result = validateMonthTransactions([baseTransaction({ intent: 'NO_SUCH_INTENT' })]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.reason).toBe('意圖映射不存在');
  });

  it('flags invalid amounts', () => {
    const result = validateMonthTransactions([baseTransaction({ amount: undefined })]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.reason).toBe('金額無效');
  });

  it('flags unknown ledger codes', () => {
    const result = validateMonthTransactions([
      baseTransaction({
        entries: [
          { ledgerCode: 'expense:mystery', debit: 100, credit: 0 },
          { ledgerCode: 'asset:cash', debit: 0, credit: 100 },
        ],
      }),
    ]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.reason).toBe('科目無效：expense:mystery');
  });

  it('flags transactions with fewer than two entries', () => {
    const result = validateMonthTransactions([
      baseTransaction({ entries: [{ ledgerCode: 'expense:food', debit: 100, credit: 0 }] }),
    ]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.reason).toBe('分錄少於兩行');
  });

  it('reports checkedCount for the full batch', () => {
    const result = validateMonthTransactions([baseTransaction(), baseTransaction({ id: 'tx-2' })]);

    expect(result.checkedCount).toBe(2);
  });
});
