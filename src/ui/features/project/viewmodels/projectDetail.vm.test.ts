import { describe, expect, it } from 'vitest';

import {
  mapSnapshotToProjectDetailVM,
  mapTransactionToProjectDetailVM,
} from '@/ui/features/project/viewmodels/projectDetail.vm';

describe('projectDetail.vm', () => {
  it('maps transaction to record detail vm', () => {
    const vm = mapTransactionToProjectDetailVM({
      id: 'tx-1',
      date: new Date('2026-03-01'),
      amount: 1000,
      description: '薪資入帳',
      intentType: 'INCOME',
      intent: 'SALARY',
      entries: [],
      createdBy: 'u',
      updatedBy: 'u',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    expect(vm.type).toBe('RECORD');
    expect(vm.isIncome).toBe(true);
    expect(vm.amount).toBe(1000);
    expect(vm.amountText.startsWith('+')).toBe(true);
  });

  it('maps snapshot to snapshot detail vm', () => {
    const vm = mapSnapshotToProjectDetailVM({
      id: 'snap-1',
      year: 2026,
      month: 3,
      openingBalance: 10000,
      income: 5000,
      expense: 2000,
      closingBalance: 13000,
      createdBy: 'u',
      updatedBy: 'u',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    expect(vm.type).toBe('SNAPSHOT');
    expect(vm.title).toContain('2026-03');
    expect(vm.closingBalance).toBe(13000);
    expect(vm.closingBalanceText).toContain('13,000');
  });
});
