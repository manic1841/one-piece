import { describe, expect, it } from 'vitest';

import {
  mapSnapshotToProjectDetailVM,
  mapTransactionToProjectDetailVM,
  toLatestSnapshot,
  toProjectMonthGroups,
  toRecentTotals,
} from '@/ui/features/project/viewmodels/projectDetail.vm';

const transaction = (overrides: Record<string, unknown> = {}) =>
  ({
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
    ...overrides,
  }) as never;

const snapshot = (overrides: Record<string, unknown> = {}) =>
  ({
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
    ...overrides,
  }) as never;

describe('projectDetail.vm', () => {
  it('maps a transaction to a record vm with a month key', () => {
    const vm = mapTransactionToProjectDetailVM(transaction());

    expect(vm.type).toBe('RECORD');
    expect(vm.isIncome).toBe(true);
    expect(vm.amount).toBe(1000);
    expect(vm.amountText.startsWith('+')).toBe(true);
    expect(vm.monthKey).toBe('2026-03');
  });

  it('maps a snapshot to a snapshot vm with a month key and label', () => {
    const vm = mapSnapshotToProjectDetailVM(snapshot());

    expect(vm.type).toBe('SNAPSHOT');
    expect(vm.monthKey).toBe('2026-03');
    expect(vm.monthLabel).toBe('2026-03');
    expect(vm.closingBalance).toBe(13000);
    expect(vm.closingBalanceText).toContain('13,000');
  });

  it('groups records and snapshots by month, newest first, using snapshot values when present', () => {
    const records = [
      mapTransactionToProjectDetailVM(transaction({ id: 'tx-2', date: new Date('2026-03-02') })),
      mapTransactionToProjectDetailVM(
        transaction({
          id: 'tx-3',
          date: new Date('2026-04-05'),
          intentType: 'EXPENSE',
          intent: undefined,
        }),
      ),
    ];
    const snapshots = [mapSnapshotToProjectDetailVM(snapshot())];

    const groups = toProjectMonthGroups(records, snapshots);

    expect(groups.map((group) => group.key)).toEqual(['2026-04', '2026-03']);
    const march = groups[1];
    expect(march.snapshot?.monthKey).toBe('2026-03');
    expect(march.records.map((record) => record.id)).toEqual(['tx-2']);
    // Snapshot values win over the derived record totals.
    expect(march.income).toBe(5000);
    expect(march.expense).toBe(2000);
    const april = groups[0];
    expect(april.snapshot).toBeNull();
    expect(april.records.map((record) => record.id)).toEqual(['tx-3']);
  });

  it('sums the most recent months for the summary totals', () => {
    const groups = toProjectMonthGroups(
      [
        mapTransactionToProjectDetailVM(transaction({ id: 'a', date: new Date('2026-03-01') })),
        mapTransactionToProjectDetailVM(
          transaction({
            id: 'b',
            date: new Date('2026-04-01'),
            intentType: 'EXPENSE',
            intent: undefined,
          }),
        ),
      ],
      [],
    );

    const totals = toRecentTotals(groups);
    expect(totals.income).toBe(1000);
    expect(totals.expense).toBe(1000);
    expect(totals.net).toBe(0);
  });

  it('picks the latest snapshot by month key', () => {
    const latest = toLatestSnapshot([
      mapSnapshotToProjectDetailVM(snapshot({ id: 'older', month: 1 })),
      mapSnapshotToProjectDetailVM(snapshot({ id: 'newer', month: 5, closingBalance: 999 })),
    ]);

    expect(latest?.id).toBe('newer');
    expect(toLatestSnapshot([])).toBeNull();
  });
});
