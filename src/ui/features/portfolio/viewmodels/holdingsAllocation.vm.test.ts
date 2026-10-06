import { describe, expect, it } from 'vitest';

import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';

import { buildAggregateAllocationVM, buildPortfolioAllocationVM } from './holdingsAllocation.vm';

const holding = (symbol: string, marketValue: number, leverage?: number) => ({
  symbol,
  name: symbol,
  cost: marketValue,
  marketValue,
  ...(leverage === undefined ? {} : { leverage }),
});

const snapshotWith = (
  accounts: Array<{
    value: number;
    holdings?: ReturnType<typeof holding>[];
    category?: 'securities' | 'bank' | 'cash' | 'other';
  }>,
): PortfolioSnapshot =>
  ({
    id: 's1',
    year: 2026,
    month: 9,
    totalValue: accounts.reduce((sum, account) => sum + account.value, 0),
    accounts: accounts.map((account, index) => ({
      accountId: `a${index}`,
      accountName: `Account ${index}`,
      category: account.category ?? 'securities',
      value: account.value,
      holdings: account.holdings ?? [],
    })),
  }) as unknown as PortfolioSnapshot;

const portfolio = (id: string, isActive = true) =>
  ({ id, isActive }) as unknown as import('@/domains/portfolio/types/portfolio').Portfolio;

describe('buildPortfolioAllocationVM', () => {
  it('reports no data when the snapshot is missing or has no holdings', () => {
    expect(buildPortfolioAllocationVM(undefined).hasData).toBe(false);
    expect(buildPortfolioAllocationVM(snapshotWith([{ value: 5000 }])).hasData).toBe(false);
  });

  it('turns holdings into aligned market and exposure segments', () => {
    const vm = buildPortfolioAllocationVM(
      snapshotWith([
        {
          value: 300000,
          holdings: [holding('2330', 100000), holding('0050', 200000)],
        },
      ]),
    );

    expect(vm.hasData).toBe(true);
    // Market order desc: 0050 then 2330; exposure uses the same order (colors align).
    expect(vm.marketSegments.map((segment) => segment.label)).toEqual(['0050', '2330']);
    expect(vm.marketSegments.map((segment) => segment.value)).toEqual([200000, 100000]);
    expect(vm.exposureSegments.map((segment) => segment.value)).toEqual([200000, 100000]);
    expect(vm.marketTotalText).toContain('300,000');
  });

  it('multiplies exposure by leverage', () => {
    const vm = buildPortfolioAllocationVM(
      snapshotWith([{ value: 100000, holdings: [holding('TQQQ', 100000, 3)] }]),
    );

    expect(vm.marketTotalText).toContain('100,000');
    expect(vm.exposureSegments[0]?.value).toBe(300000);
    expect(vm.exposureTotalText).toContain('300,000');
  });

  it('anchors the holdings to the account TWD value (currency-safe)', () => {
    // Foreign account: raw market values are 100,000 but the account is worth 3,100,000 TWD.
    const vm = buildPortfolioAllocationVM(
      snapshotWith([{ value: 3100000, holdings: [holding('NVDA', 100000)] }]),
    );

    expect(vm.marketSegments[0]?.value).toBe(3100000);
    expect(vm.marketTotalText).toContain('3,100,000');
  });

  it('ignores holdings on non-securities accounts', () => {
    const vm = buildPortfolioAllocationVM(
      snapshotWith([
        { value: 100000, category: 'securities', holdings: [holding('2330', 100000)] },
        { value: 50000, category: 'bank', holdings: [holding('2330', 50000)] },
      ]),
    );

    expect(vm.marketSegments).toEqual([{ label: '2330', value: 100000 }]);
    expect(vm.marketTotalText).toContain('100,000');
  });

  it('drops zero-value holdings instead of drawing an empty slice', () => {
    const vm = buildPortfolioAllocationVM(
      snapshotWith([{ value: 100000, holdings: [holding('2330', 100000), holding('DEAD', 0)] }]),
    );

    expect(vm.marketSegments.map((segment) => segment.label)).toEqual(['2330']);
  });

  it('folds everything past the top seven into a single 其他 slice', () => {
    const holdings = Array.from({ length: 9 }, (_, index) =>
      holding(`S${index}`, (index + 1) * 10000),
    );
    const vm = buildPortfolioAllocationVM(snapshotWith([{ value: 450000, holdings }]));

    expect(vm.marketSegments).toHaveLength(8);
    expect(vm.marketSegments[7]?.label).toBe('其他');
    // S0 (10,000) + S1 (20,000) are the two smallest, folded together.
    expect(vm.marketSegments[7]?.value).toBe(30000);
  });
});

describe('buildAggregateAllocationVM', () => {
  it('sums the same symbol across portfolios', () => {
    const vm = buildAggregateAllocationVM(
      [portfolio('p1'), portfolio('p2')],
      new Map<string, PortfolioSnapshot>([
        ['p1', snapshotWith([{ value: 100000, holdings: [holding('2330', 100000)] }])],
        ['p2', snapshotWith([{ value: 50000, holdings: [holding('2330', 50000)] }])],
      ]),
    );

    expect(vm.marketSegments).toEqual([{ label: '2330', value: 150000 }]);
    expect(vm.marketTotalText).toContain('150,000');
  });

  it('excludes inactive portfolios', () => {
    const vm = buildAggregateAllocationVM(
      [portfolio('p1'), portfolio('p2', false)],
      new Map<string, PortfolioSnapshot>([
        ['p1', snapshotWith([{ value: 100000, holdings: [holding('2330', 100000)] }])],
        ['p2', snapshotWith([{ value: 50000, holdings: [holding('2330', 50000)] }])],
      ]),
    );

    expect(vm.marketTotalText).toContain('100,000');
  });
});
