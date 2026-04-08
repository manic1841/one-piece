import { describe, expect, it } from 'vitest';

import { mapPortfolioToDetailVM, mapPortfolioToListItemVM } from './portfolioDisplay.vm';

describe('portfolioDisplay.vm', () => {
  it('maps list item vm with latest snapshot', () => {
    const portfolio = {
      id: 'p1',
      name: 'Main Portfolio',
      description: 'Long term holdings',
      accountIds: ['a1', 'a2'],
      isActive: true,
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const snapshot = {
      id: 's1',
      portfolioId: 'p1',
      year: 2026,
      month: 3,
      totalValue: 123456,
      accountSnapshots: [],
      performance: {
        monthlyReturn: 0,
        monthlyReturnRate: 0,
      },
      cashFlow: {
        deposits: 0,
        withdrawals: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const vm = mapPortfolioToListItemVM(portfolio, snapshot);

    expect(vm.id).toBe('p1');
    expect(vm.totalValue).toBe(123456);
    expect(vm.asOfDate).toBe('2026-03');
    expect(vm.accountCount).toBe(2);
    expect(vm.isActive).toBe(true);
  });

  it('maps detail vm with latest snapshot and history', () => {
    const portfolio = {
      id: 'p1',
      name: 'Main Portfolio',
      description: undefined,
      accountIds: ['a1'],
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const snapshots = [
      {
        id: 's-latest',
        portfolioId: 'p1',
        year: 2026,
        month: 3,
        totalValue: 2000,
        accountSnapshots: [],
        performance: {
          monthlyReturn: 0,
          monthlyReturnRate: 0,
        },
        cashFlow: {
          deposits: 0,
          withdrawals: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's-older',
        portfolioId: 'p1',
        year: 2026,
        month: 2,
        totalValue: 1800,
        accountSnapshots: [],
        performance: {
          monthlyReturn: 0,
          monthlyReturnRate: 0,
        },
        cashFlow: {
          deposits: 0,
          withdrawals: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const vm = mapPortfolioToDetailVM(portfolio, snapshots);

    expect(vm.id).toBe('p1');
    expect(vm.latestSnapshot?.id).toBe('s-latest');
    expect(vm.history).toHaveLength(2);
  });
});
