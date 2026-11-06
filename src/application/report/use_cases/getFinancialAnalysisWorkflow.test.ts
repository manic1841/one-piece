import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type FinancialReport } from '@/domains/report/schemas';
import { ReportType } from '@/domains/report/schemas';

import { getFinancialAnalysisWorkflow } from './getFinancialAnalysisWorkflow';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
  },
}));

const listReportsMock = vi.fn();
vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: { execute: (...args: unknown[]) => listReportsMock(...args) },
}));

const listPeriodsMock = vi.fn();
vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  ListFinancialPeriodsUseCase: vi.fn(function () {
    return { execute: (...args: unknown[]) => listPeriodsMock(...args) };
  }),
}));

const listPortfoliosMock = vi.fn();
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: (...args: unknown[]) => listPortfoliosMock(...args) },
}));

const listSnapshotsMock = vi.fn();
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: (...args: unknown[]) => listSnapshotsMock(...args) },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

const base = (yearMonth: string, type: ReportType) => ({
  id: `${yearMonth}-${type}`,
  householdId: 'h1',
  yearMonth,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const group = (label: string, total: number) => ({ label, total, items: [] });

const balanceSheet = (
  yearMonth: string,
  assets: number,
  liabilities: number,
  assetGroups: Record<string, number> = {},
): FinancialReport => ({
  ...base(yearMonth, ReportType.BALANCE_SHEET),
  type: ReportType.BALANCE_SHEET,
  data: {
    yearMonth,
    assets: {
      total: assets,
      groups: Object.fromEntries(
        Object.entries(assetGroups).map(([key, total]) => [key, group(key, total)]),
      ),
    },
    liabilities: { total: liabilities, groups: {} },
    equity: { total: assets - liabilities, groups: {} },
  },
});

const income = (yearMonth: string, incomeTotal: number, expenseTotal: number): FinancialReport => ({
  ...base(yearMonth, ReportType.INCOME_STATEMENT),
  type: ReportType.INCOME_STATEMENT,
  data: {
    yearMonth,
    incomeTotal,
    expenseTotal,
    netIncome: incomeTotal - expenseTotal,
    incomeItems: [],
    expenseItems: [],
  },
});

const cashFlow = (yearMonth: string, netCashChange: number): FinancialReport => ({
  ...base(yearMonth, ReportType.CASH_FLOW),
  type: ReportType.CASH_FLOW,
  data: {
    yearMonth,
    operating: { label: '營業', total: netCashChange, inflowItems: [], outflowItems: [] },
    investing: { label: '投資', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange,
    beginningBalance: 0,
    endingBalance: netCashChange,
    actualBalance: netCashChange,
    adjustment: 0,
  },
});

const period = (yearMonth: string, status: FinancialPeriod['status']): FinancialPeriod => ({
  id: yearMonth,
  yearMonth,
  status,
  stages: {},
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const snapshot = (
  year: number,
  month: number,
  gain: number,
  openingValue: number,
  holdings: { marketValue: number; leverage?: number }[] = [],
) => ({
  id: `${year}-${month}`,
  householdId: 'h1',
  portfolioId: 'p1',
  year,
  month,
  accounts:
    holdings.length === 0
      ? []
      : [
          {
            accountId: 'a1',
            accountName: 'Securities',
            category: 'securities' as const,
            value: 0,
            holdings: holdings.map((holding) => ({
              accountId: 'a1',
              label: 'ETF',
              marketValue: holding.marketValue,
              ...(holding.leverage === undefined ? {} : { leverage: holding.leverage }),
            })),
          },
        ],
  totalValue: 0,
  cashFlow: { deposits: 0, withdrawals: 0 },
  performance: {
    openingValue,
    closingValue: openingValue + gain,
    netCashFlow: 0,
    gain,
    returnRate: openingValue > 0 ? (gain / openingValue) * 100 : 0,
    cumulativeGain: 0,
    cumulativeReturnRate: 0,
  },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const run = (range: '1y' | '3y' | '5y' | 'all' = 'all') =>
  getFinancialAnalysisWorkflow.execute({ householdId: 'h1', auth, range });

describe('getFinancialAnalysisWorkflow', () => {
  beforeEach(() => {
    listReportsMock.mockReset();
    listPeriodsMock.mockReset();
    listPeriodsMock.mockResolvedValue([]);
    listPortfoliosMock.mockReset();
    listPortfoliosMock.mockResolvedValue([]);
    listSnapshotsMock.mockReset();
    listSnapshotsMock.mockResolvedValue([]);
  });

  it('anchors the latest balance sheet regardless of status, including when later months have other reports', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 900, 100),
      balanceSheet('2026-03', 1000, 100),
      income('2026-04', 5000, 4000),
    ]);
    listPeriodsMock.mockResolvedValue([period('2026-01', 'CLOSED')]);

    const result = await run();

    expect(result.anchor).toEqual({ yearMonth: '2026-03', closed: false });
    expect(result.kpis.assets).toBe(1000);
    expect(result.kpis.netWorth).toBe(900);
    expect(result.kpis.liabilities).toBe(100);
    expect(result.kpis.anchorClosed).toBe(false);
  });

  it('builds each block only from its own report type and omits months without one', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 900, 100),
      income('2026-01', 5000, 4000),
      balanceSheet('2026-02', 950, 100),
      cashFlow('2026-02', -200),
      balanceSheet('2026-03', 1000, 100),
      income('2026-03', 6000, 3000),
    ]);

    const result = await run();

    expect(result.netWorthPoints.map((point) => point.yearMonth)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
    expect(result.incomePoints.map((point) => point.yearMonth)).toEqual(['2026-01', '2026-03']);
    expect(result.cashFlowPoints.map((point) => point.yearMonth)).toEqual(['2026-02']);
  });

  it('computes the savings rate from the same-month income statement, null when it is missing', async () => {
    listReportsMock.mockResolvedValue([balanceSheet('2026-03', 1000, 100)]);

    const missing = await run();
    expect(missing.kpis.savingsRate).toBeNull();

    listReportsMock.mockResolvedValue([
      balanceSheet('2026-03', 1000, 100),
      income('2026-03', 5000, 4000),
    ]);

    const present = await run();
    expect(present.kpis.savingsRate).toBeCloseTo(20);
  });

  it('keeps a negative savings rate and nulls it when income is not positive', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      income('2026-01', 5000, 6000),
      balanceSheet('2026-02', 1000, 100),
      income('2026-02', 0, 200),
      balanceSheet('2026-03', 1000, 100),
      income('2026-03', 5000, 6000),
    ]);

    const result = await run();

    expect(result.incomePoints[0]?.savingsRate).toBeCloseTo(-20);
    expect(result.incomePoints[1]?.savingsRate).toBeNull();
    expect(result.kpis.savingsRate).toBeCloseTo(-20);
  });

  it('cuts every block to the range measured back from the anchor', async () => {
    const reports: FinancialReport[] = [];
    for (let month = 1; month <= 12; month++) {
      const yearMonth = `2026-${String(month).padStart(2, '0')}`;
      reports.push(balanceSheet(yearMonth, month * 100, 0));
      reports.push(income(yearMonth, 1000, 500));
    }
    listReportsMock.mockResolvedValue(reports);

    const result = await run('1y');

    // 12 months back from 2026-12 starts at 2026-01.
    expect(result.netWorthPoints).toHaveLength(12);
    expect(result.netWorthPoints[0]?.yearMonth).toBe('2026-01');
    expect(result.netWorthPoints.at(-1)?.yearMonth).toBe('2026-12');
  });

  it('drops ranges that select the same months and leaves only one option', async () => {
    listReportsMock.mockResolvedValue([balanceSheet('2026-03', 1000, 0)]);

    const result = await run('3y');

    // All four ranges select the same month; the requested label represents them.
    expect(result.availableRanges).toEqual(['3y']);
  });

  it('lets the requested range represent its months instead of an earlier duplicate', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2022-01', 100, 0),
      balanceSheet('2026-01', 300, 0),
    ]);

    const result = await run('5y');

    // 3y and 5y both reach back to 2022-01; the selected 5y replaces the duplicate 3y.
    expect(result.availableRanges).toEqual(['1y', '5y']);
  });

  it('keeps distinct shorter ranges when there is enough history', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2019-01', 50, 0),
      balanceSheet('2022-01', 100, 0),
      balanceSheet('2024-01', 200, 0),
      balanceSheet('2026-01', 300, 0),
    ]);

    const result = await run('all');

    expect(result.availableRanges).toEqual(['1y', '3y', '5y', 'all']);
  });

  it('lists distinct unclosed months inside the range, oldest first', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 100, 0),
      balanceSheet('2026-02', 200, 0),
      balanceSheet('2026-03', 300, 0),
      cashFlow('2026-02', -10),
    ]);
    listPeriodsMock.mockResolvedValue([
      period('2026-01', 'CLOSED'),
      period('2026-02', 'IN_PROGRESS'),
    ]);

    const result = await run();

    expect(result.unclosedMonths).toEqual(['2026-02', '2026-03']);
    expect(result.netWorthPoints.map((point) => point.closed)).toEqual([true, false, false]);
  });

  it('maps the three asset groups and omits months with no assets', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100, { cash: 200, investment: 300, property: 500 }),
      balanceSheet('2026-02', 0, 0, { cash: 0, investment: 0, property: 0 }),
      balanceSheet('2026-03', 1000, 100, { cash: -50, investment: 400, property: 650 }),
    ]);

    const result = await run();

    expect(result.assetCompositionPoints).toEqual([
      {
        yearMonth: '2026-01',
        closed: false,
        assetsTotal: 1000,
        cash: 200,
        investment: 300,
        property: 500,
      },
      {
        yearMonth: '2026-03',
        closed: false,
        assetsTotal: 1000,
        cash: -50,
        investment: 400,
        property: 650,
      },
    ]);
  });

  it('sums performance across portfolios and uses only months where every portfolio has a snapshot', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    listSnapshotsMock.mockImplementation(async ({ portfolioId }: { portfolioId: string }) =>
      portfolioId === 'p1'
        ? [snapshot(2026, 1, 100, 1000), snapshot(2026, 3, 40, 0)]
        : [snapshot(2026, 1, 50, 500), snapshot(2026, 3, 10, 0)],
    );
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
      balanceSheet('2026-03', 1000, 100),
    ]);

    const result = await run();

    expect(result.investmentPerformancePoints).toHaveLength(2);
    expect(result.investmentPerformancePoints[0]).toMatchObject({
      yearMonth: '2026-01',
      gain: 150,
      openingValue: 1500,
    });
    expect(result.investmentPerformancePoints[0]?.returnRate).toBeCloseTo(10);
    expect(result.investmentPerformancePoints[1]?.returnRate).toBeNull();
  });

  it('skips a performance month when one portfolio has no snapshot', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    listSnapshotsMock.mockImplementation(async ({ portfolioId }: { portfolioId: string }) =>
      portfolioId === 'p1'
        ? [snapshot(2026, 1, 100, 1000), snapshot(2026, 2, 100, 1000)]
        : [snapshot(2026, 1, 50, 500)],
    );
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
    ]);

    const result = await run();

    expect(result.investmentPerformancePoints.map((point) => point.yearMonth)).toEqual(['2026-01']);
  });

  it('ignores a portfolio with no snapshots when intersecting performance months', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    listSnapshotsMock.mockImplementation(async ({ portfolioId }: { portfolioId: string }) =>
      portfolioId === 'p1' ? [snapshot(2026, 1, 100, 1000), snapshot(2026, 2, 50, 500)] : [],
    );
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
    ]);

    const result = await run();

    expect(result.investmentPerformancePoints.map((point) => point.yearMonth)).toEqual([
      '2026-01',
      '2026-02',
    ]);
  });

  it('breaks leverage where one portfolio lacks the snapshots but keeps the debt point', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    listSnapshotsMock.mockImplementation(async ({ portfolioId }: { portfolioId: string }) =>
      portfolioId === 'p1'
        ? [
            snapshot(2026, 1, 0, 0, [{ marketValue: 100 }]),
            snapshot(2026, 2, 0, 0, [{ marketValue: 100 }]),
          ]
        : [snapshot(2026, 1, 0, 0, [{ marketValue: 100, leverage: 2 }])],
    );
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
    ]);

    const result = await run();

    expect(result.debtLeveragePoints.map((point) => point.yearMonth)).toEqual([
      '2026-01',
      '2026-02',
    ]);
    expect(result.debtLeveragePoints[0]?.leverage).toBeCloseTo(1.5);
    expect(result.debtLeveragePoints[1]?.leverage).toBeNull();
  });

  it('marks unclosed months on the snapshot blocks too', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }]);
    listSnapshotsMock.mockResolvedValue([snapshot(2026, 1, 0, 100), snapshot(2026, 2, 0, 100)]);
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
    ]);
    listPeriodsMock.mockResolvedValue([period('2026-01', 'CLOSED')]);

    const result = await run();

    expect(result.investmentPerformancePoints.map((point) => point.closed)).toEqual([true, false]);
    expect(result.debtLeveragePoints.map((point) => point.closed)).toEqual([true, false]);
  });

  it('computes the debt ratio and the market-value weighted leverage', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }]);
    listSnapshotsMock.mockResolvedValue([
      snapshot(2026, 1, 0, 0, [{ marketValue: 100, leverage: 2 }, { marketValue: 100 }]),
    ]);
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 100),
      balanceSheet('2026-02', 1000, 100),
      balanceSheet('2026-03', 0, 0),
    ]);

    const result = await run();

    expect(result.debtLeveragePoints).toHaveLength(2);
    expect(result.debtLeveragePoints[0]).toMatchObject({
      liabilities: 100,
      assetsTotal: 1000,
      leverage: 1.5,
    });
    expect(result.debtLeveragePoints[0]?.debtRatio).toBeCloseTo(10);
    // A month without a snapshot keeps its debt data and only breaks the leverage line.
    expect(result.debtLeveragePoints[1]?.leverage).toBeNull();
    expect(result.debtLeveragePoints[1]?.debtRatio).toBeCloseTo(10);
  });

  it('averages the month and the two before it into the cash coverage', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 0, { cash: 900 }),
      income('2026-01', 5000, 3000),
      balanceSheet('2026-02', 1000, 0, { cash: 900 }),
      income('2026-02', 5000, 6000),
      balanceSheet('2026-03', 1000, 0, { cash: 1200 }),
      income('2026-03', 5000, 3000),
    ]);

    const result = await run();

    // The first two months still lack earlier window months.
    expect(result.cashCoveragePoints.map((point) => point.coverageMonths)).toEqual([
      null,
      null,
      0.3,
    ]);
    expect(result.cashCoveragePoints[2]).toMatchObject({ cash: 1200, expenseAverage: 4000 });
  });

  it('nulls the coverage when a window month has no income statement', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 0, { cash: 900 }),
      income('2026-01', 5000, 3000),
      income('2026-03', 5000, 3000),
      balanceSheet('2026-03', 1000, 0, { cash: 1200 }),
    ]);

    const result = await run();

    expect(result.cashCoveragePoints.map((point) => point.coverageMonths)).toEqual([null, null]);
    expect(result.cashCoveragePoints[1]?.expenseAverage).toBeNull();
  });

  it('nulls the coverage when the average expense is not positive', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 1000, 0, { cash: 900 }),
      income('2026-01', 5000, 0),
      income('2025-12', 5000, 0),
      income('2025-11', 5000, 0),
    ]);

    const result = await run();

    expect(result.cashCoveragePoints[0]?.expenseAverage).toBe(0);
    expect(result.cashCoveragePoints[0]?.coverageMonths).toBeNull();
  });

  it('lets the coverage window reach outside the selected range', async () => {
    listReportsMock.mockResolvedValue([
      income('2025-10', 5000, 3000),
      income('2025-11', 5000, 3000),
      income('2025-12', 5000, 3000),
      balanceSheet('2025-12', 1000, 0, { cash: 900 }),
      income('2026-01', 5000, 3000),
      balanceSheet('2026-01', 1000, 0, { cash: 1200 }),
    ]);

    const result = await run('1y');

    expect(result.cashCoveragePoints.map((point) => point.yearMonth)).toEqual([
      '2025-12',
      '2026-01',
    ]);
    expect(result.cashCoveragePoints[0]?.coverageMonths).toBeCloseTo(0.3);
    expect(result.cashCoveragePoints[1]?.coverageMonths).toBeCloseTo(0.4);
  });

  it('marks unclosed months on the cash coverage block', async () => {
    listReportsMock.mockResolvedValue([
      income('2025-11', 5000, 2000),
      income('2025-12', 5000, 2000),
      balanceSheet('2025-12', 1000, 0, { cash: 600 }),
      income('2026-01', 5000, 2000),
      balanceSheet('2026-01', 1000, 0, { cash: 600 }),
    ]);
    listPeriodsMock.mockResolvedValue([period('2025-12', 'CLOSED')]);

    const result = await run();

    expect(result.cashCoveragePoints.map((point) => point.closed)).toEqual([true, false]);
  });

  it('cuts the new blocks to the range like the existing ones', async () => {
    listPortfoliosMock.mockResolvedValue([{ id: 'p1' }]);
    listSnapshotsMock.mockResolvedValue([
      snapshot(2024, 12, 0, 100),
      snapshot(2025, 12, 0, 100),
      snapshot(2026, 12, 0, 100),
    ]);
    listReportsMock.mockResolvedValue([
      balanceSheet('2024-12', 1000, 100, { cash: 1000 }),
      balanceSheet('2025-12', 1000, 100, { cash: 1000 }),
      balanceSheet('2026-12', 1000, 100, { cash: 1000 }),
    ]);

    const result = await run('1y');

    expect(result.assetCompositionPoints.map((point) => point.yearMonth)).toEqual(['2026-12']);
    expect(result.investmentPerformancePoints.map((point) => point.yearMonth)).toEqual(['2026-12']);
    expect(result.debtLeveragePoints.map((point) => point.yearMonth)).toEqual(['2026-12']);
    expect(result.cashCoveragePoints.map((point) => point.yearMonth)).toEqual(['2026-12']);
  });

  it('returns an empty page when there is no balance sheet at all', async () => {
    listReportsMock.mockResolvedValue([income('2026-03', 1000, 500)]);

    const result = await run();

    expect(result.anchor).toBeNull();
    expect(result.kpis.assets).toBeNull();
    expect(result.netWorthPoints).toEqual([]);
    expect(result.assetCompositionPoints).toEqual([]);
    expect(result.investmentPerformancePoints).toEqual([]);
    expect(result.debtLeveragePoints).toEqual([]);
    expect(result.cashCoveragePoints).toEqual([]);
    expect(result.availableRanges).toEqual([]);
  });
});
