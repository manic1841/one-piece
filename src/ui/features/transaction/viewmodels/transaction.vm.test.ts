import { describe, expect, it } from 'vitest';

import {
  mapTransactionVMToAllocationData,
  mapTransactionVMToDomain,
  parseTransactionFormVM,
} from '@/ui/features/transaction/viewmodels/transaction.vm';

describe('transaction.vm', () => {
  const toYmdLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('parses a valid expense vm', () => {
    const vm = parseTransactionFormVM({
      intentType: 'EXPENSE',
      date: '2026-03-26',
      amount: 1200,
      ledgerCode: 'expense:food',
      description: 'Lunch',
    });

    expect(vm.intentType).toBe('EXPENSE');
    expect(vm.amount).toBe(1200);
  });

  it('rejects non-positive amount', () => {
    expect(() =>
      parseTransactionFormVM({
        intentType: 'EXPENSE',
        date: '2026-03-26',
        amount: 0,
        ledgerCode: 'expense:food',
      }),
    ).toThrow('Amount must be greater than zero.');
  });

  it('rejects transfer with same source/target project', () => {
    expect(() =>
      parseTransactionFormVM({
        intentType: 'TRANSFER',
        date: '2026-03-26',
        amount: 500,
        fromProjectId: 'project-1',
        toProjectId: 'project-1',
      }),
    ).toThrow('Source and target projects must be different.');
  });

  it('rejects allocation when percentage sum is not 100', () => {
    expect(() =>
      parseTransactionFormVM({
        intentType: 'INCOME',
        date: '2026-03-26',
        amount: 3000,
        triggerAllocation: true,
        allocationDirection: 'INCOME',
        allocationItems: [
          { projectId: 'p1', percentage: 40 },
          { projectId: 'p2', percentage: 50 },
        ],
      }),
    ).toThrow('Allocation percentages must sum to 100%. Current sum: 90%');
  });

  it('maps expense vm to domain transaction using fallback ledger logic', () => {
    const vm = parseTransactionFormVM({
      intentType: 'EXPENSE',
      date: '2026-03-26',
      amount: 1800,
      ledgerCode: 'expense:food',
      description: 'Dinner',
      projectId: 'project-1',
    });

    const domain = mapTransactionVMToDomain(vm, 'user@example.com');

    expect(domain.createdBy).toBe('user@example.com');
    expect(toYmdLocal(domain.date)).toBe('2026-03-26');
    expect(domain.intentType).toBe('EXPENSE');
    expect(domain.projectId).toBe('project-1');
    expect(domain.entries).toEqual([
      {
        ledgerCode: 'expense:food',
        debit: 1800,
        credit: 0,
      },
      {
        ledgerCode: 'asset:cash',
        debit: 0,
        credit: 1800,
      },
    ]);
  });

  it('maps allocation payload only when allocation is enabled', () => {
    const vm = parseTransactionFormVM({
      intentType: 'INCOME',
      date: '2026-03-26',
      amount: 10000,
      triggerAllocation: true,
      allocationDirection: 'INCOME',
      allocationItems: [
        { projectId: 'p1', percentage: 60 },
        { projectId: 'p2', percentage: 40 },
      ],
    });

    const allocation = mapTransactionVMToAllocationData(vm, 'tx-123');

    expect(allocation).not.toBeNull();
    expect(allocation?.transactionId).toBe('tx-123');
    expect(allocation ? toYmdLocal(allocation.transactionDate) : '').toBe('2026-03-26');
    expect(allocation?.direction).toBe('INCOME');
    expect(allocation?.items).toEqual([
      { projectId: 'p1', percentage: 60 },
      { projectId: 'p2', percentage: 40 },
    ]);
  });

  it('returns null allocation payload when allocation is disabled', () => {
    const vm = parseTransactionFormVM({
      intentType: 'INCOME',
      date: '2026-03-26',
      amount: 1000,
    });

    expect(mapTransactionVMToAllocationData(vm, 'tx-123')).toBeNull();
  });
});
