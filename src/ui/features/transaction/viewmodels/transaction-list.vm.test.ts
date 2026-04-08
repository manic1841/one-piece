import { describe, expect, it } from 'vitest';

import { type Transaction } from '@/domains/ledger/schemas';

import { mapTransactionToListItemVM } from './transaction-list.vm';

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => {
  return {
    id: 'tx-1',
    createdBy: 'user@example.com',
    createdAt: new Date('2026-03-27T00:00:00.000Z'),
    updatedBy: 'user@example.com',
    updatedAt: new Date('2026-03-27T00:00:00.000Z'),
    date: new Date('2026-03-15T00:00:00.000Z'),
    description: 'Base description',
    intentType: 'EXPENSE',
    amount: 1200,
    projectId: 'project-1',
    entries: [
      {
        ledgerCode: 'expense:food',
        debit: 1200,
        credit: 0,
      },
      {
        ledgerCode: 'asset:cash',
        debit: 0,
        credit: 1200,
      },
    ],
    ...overrides,
  };
};

describe('transaction-list.vm', () => {
  it('maps expense transaction into UI-ready VM fields', () => {
    const transaction = buildTransaction({
      date: new Date('2026-03-15T00:00:00.000Z'),
      entries: [
        {
          ledgerCode: 'expense:food',
          debit: 1200,
          credit: 0,
        },
        {
          ledgerCode: 'asset:cash',
          debit: 0,
          credit: 1200,
        },
      ],
    });

    const vm = mapTransactionToListItemVM(transaction);

    expect(vm.id).toBe('tx-1');
    expect(vm.intentType).toBe('EXPENSE');
    expect(vm.categoryKey).toBe('food');
    expect(vm.categoryLabel).toBe('餐飲');
    expect(vm.displayTitle).toBe('Base description');
    expect(vm.dateText).toBe('2026-03-15');
    expect(vm.monthKey).toBe('2026-03');
    expect(vm.sortTimestamp).toBe(new Date('2026-03-15T00:00:00.000Z').getTime());
    expect(vm.signedAmount).toBe(-1200);
    expect(vm.amountText).toBe('$1,200');
    expect(vm.isPositive).toBe(false);
    expect(vm.hasCashLedger).toBe(true);
  });

  it('uses fallback sign logic and marks missing cash entry', () => {
    const transaction = buildTransaction({
      intentType: 'INCOME',
      intent: 'SALARY',
      amount: 3500,
      entries: [
        {
          ledgerCode: 'income:salary',
          debit: 0,
          credit: 3500,
        },
      ],
    });

    const vm = mapTransactionToListItemVM(transaction);

    expect(vm.categoryKey).toBe('salary');
    expect(vm.categoryLabel).toBe('薪資');
    expect(vm.signedAmount).toBe(3500);
    expect(vm.amountText).toBe('$3,500');
    expect(vm.isPositive).toBe(true);
    expect(vm.hasCashLedger).toBe(false);
  });

  it('allows injected label/project mapping for view rendering', () => {
    const transaction = buildTransaction({
      description: undefined,
      entries: [
        {
          ledgerCode: 'expense:food',
          debit: 980,
          credit: 0,
        },
        {
          ledgerCode: 'asset:cash',
          debit: 0,
          credit: 980,
        },
      ],
    });

    const vm = mapTransactionToListItemVM(transaction, {
      projectName: 'Alpha Project',
      getLedgerLabel: () => '自訂餐飲',
    });

    expect(vm.categoryLabel).toBe('自訂餐飲');
    expect(vm.displayTitle).toBe('自訂餐飲');
    expect(vm.projectName).toBe('Alpha Project');
  });
});
