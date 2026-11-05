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

const balanceSheet = (yearMonth: string, assets: number, liabilities: number): FinancialReport => ({
  ...base(yearMonth, ReportType.BALANCE_SHEET),
  type: ReportType.BALANCE_SHEET,
  data: {
    yearMonth,
    assets: { total: assets, groups: {} },
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

const run = (range: '1y' | '3y' | '5y' | 'all' = 'all') =>
  getFinancialAnalysisWorkflow.execute({ householdId: 'h1', auth, range });

describe('getFinancialAnalysisWorkflow', () => {
  beforeEach(() => {
    listReportsMock.mockReset();
    listPeriodsMock.mockReset();
    listPeriodsMock.mockResolvedValue([]);
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

  it('returns an empty page when there is no balance sheet at all', async () => {
    listReportsMock.mockResolvedValue([income('2026-03', 1000, 500)]);

    const result = await run();

    expect(result.anchor).toBeNull();
    expect(result.kpis.assets).toBeNull();
    expect(result.netWorthPoints).toEqual([]);
    expect(result.availableRanges).toEqual([]);
  });
});
