import { describe, expect, it } from 'vitest';

import {
  mapPortfolioToDetailVM,
  mapPortfolioToRowVM,
  mapPortfoliosToOverviewVM,
} from './portfolioDisplay.vm';

const portfolio = {
  id: 'p1',
  name: 'Main Portfolio',
  securitiesAccountId: 'a1',
  bankAccountId: 'a2',
  isActive: true,
  order: 2,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const snapshot = {
  id: 's1',
  year: 2026,
  month: 3,
  totalValue: 123456,
  accounts: [],
  cashFlow: { deposits: 0, withdrawals: 0 },
  performance: {
    openingValue: 100000,
    closingValue: 123456,
    netCashFlow: 0,
    gain: 23456,
    returnRate: 23.46,
    cumulativeGain: 23456,
    cumulativeReturnRate: 23.46,
  },
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const names = new Map([
  ['a1', 'Brokerage'],
  ['a2', 'Main Bank'],
]);

describe('portfolioDisplay.vm', () => {
  it('maps a list row with preformatted value, return and as-of text', () => {
    const vm = mapPortfolioToRowVM(portfolio, snapshot, names);

    expect(vm.id).toBe('p1');
    expect(vm.securitiesName).toBe('Brokerage');
    expect(vm.bankName).toBe('Main Bank');
    expect(vm.valueText).toContain('123,456');
    expect(vm.returnRate).toBe(23.46);
    expect(vm.returnRateText).toBe('23.5%');
    expect(vm.asOfText).toBe('2026-03');
    expect(vm.isActive).toBe(true);
  });

  it('falls back to an em dash when there is no snapshot or account name', () => {
    const vm = mapPortfolioToRowVM(portfolio, undefined, new Map());

    expect(vm.valueText).toContain('0');
    expect(vm.returnRate).toBeNull();
    expect(vm.returnRateText).toBe('—');
    expect(vm.asOfText).toBeNull();
    expect(vm.securitiesName).toBe('—');
  });

  it('aggregates the overview total from the latest snapshots', () => {
    const second = { ...portfolio, id: 'p2' };
    const vm = mapPortfoliosToOverviewVM(
      [portfolio, second],
      new Map([
        ['p1', snapshot as never],
        ['p2', { ...snapshot, totalValue: 1000 } as never],
      ]),
    );

    expect(vm.totalValueText).toContain('124,456');
  });

  it('excludes inactive portfolios from the overview total', () => {
    const inactive = { ...portfolio, id: 'p2', isActive: false };
    const vm = mapPortfoliosToOverviewVM(
      [portfolio, inactive],
      new Map([
        ['p1', snapshot as never],
        ['p2', { ...snapshot, totalValue: 999999 } as never],
      ]),
    );

    expect(vm.totalValueText).toContain('123,456');
  });

  it('maps the detail VM from the frozen snapshot performance', () => {
    const vm = mapPortfolioToDetailVM(portfolio, [snapshot], names);

    expect(vm.totalValueText).toContain('123,456');
    expect(vm.asOfText).toBe('2026-03');
    expect(vm.securitiesName).toBe('Brokerage');
    expect(vm.monthlyReturnText).toBe('23.46%');
    expect(vm.breakdown).toEqual({
      previousValueText: expect.stringContaining('100,000'),
      currentValueText: expect.stringContaining('123,456'),
      investmentCashFlowText: expect.stringContaining('0'),
      calculatedReturnText: expect.stringContaining('23,456'),
    });
    expect(vm.performanceRows).toHaveLength(1);
    expect(vm.performanceRows[0]?.returnText).toBe('23.46%');
    expect(vm.trend.hasData).toBe(true);
  });

  it('reports an empty detail VM when there are no snapshots', () => {
    const vm = mapPortfolioToDetailVM(portfolio, [], names);

    expect(vm.asOfText).toBeNull();
    expect(vm.monthlyReturnText).toBe('—');
    expect(vm.performanceRows).toEqual([]);
    expect(vm.trend.hasData).toBe(false);
  });
});
