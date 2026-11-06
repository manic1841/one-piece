import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';

import { getReportSummaryWorkflow } from './getReportSummaryWorkflow';

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

const run = () => getReportSummaryWorkflow.execute({ householdId: 'h1', auth });

describe('getReportSummaryWorkflow', () => {
  beforeEach(() => {
    vi.mocked(householdPermissionService.assertReadPermission).mockClear();
    listReportsMock.mockReset();
    listPeriodsMock.mockReset();
    listPeriodsMock.mockResolvedValue([]);
  });

  it('anchors the latest balance sheet even when a later month has other reports', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-01', 900, 100),
      balanceSheet('2026-03', 1000, 100),
      income('2026-04', 5000, 4000),
    ]);
    listPeriodsMock.mockResolvedValue([period('2026-01', 'CLOSED')]);

    const result = await run();

    expect(result.anchor).toEqual({ yearMonth: '2026-03', closed: false });
    expect(result.kpis).toEqual({
      yearMonth: '2026-03',
      assets: 1000,
      netWorth: 900,
      liabilities: 100,
      savingsRate: null,
      anchorClosed: false,
    });
  });

  it('takes the savings rate from the anchor month only', async () => {
    listReportsMock.mockResolvedValue([
      balanceSheet('2026-03', 1000, 100),
      income('2026-01', 5000, 4000),
      income('2026-03', 5000, 3000),
    ]);
    listPeriodsMock.mockResolvedValue([period('2026-03', 'CLOSED')]);

    const result = await run();

    expect(result.kpis.savingsRate).toBe(40);
    expect(result.kpis.anchorClosed).toBe(true);
    expect(result.anchor).toEqual({ yearMonth: '2026-03', closed: true });
  });

  it('leaves the savings rate null when the anchor month has no income statement', async () => {
    listReportsMock.mockResolvedValue([balanceSheet('2026-03', 1000, 100)]);

    const result = await run();

    expect(result.kpis.savingsRate).toBeNull();
  });

  it('returns an empty summary without any balance sheet', async () => {
    listReportsMock.mockResolvedValue([income('2026-03', 5000, 3000)]);

    const result = await run();

    expect(result.anchor).toBeNull();
    expect(result.kpis).toEqual({
      yearMonth: null,
      assets: null,
      netWorth: null,
      liabilities: null,
      savingsRate: null,
      anchorClosed: null,
    });
  });

  it('asserts read permission before reading', async () => {
    listReportsMock.mockResolvedValue([]);

    await run();

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'h1',
      'user-1',
      false,
    );
  });
});
