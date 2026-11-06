import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { buildBalanceSheetReport, buildFinancialPeriod, buildIncomeReport } from '@/test/factories';

import { getReportSummaryWorkflow } from './getReportSummaryWorkflow';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
  },
}));

const calls: string[] = [];

const listReportsMock = vi.fn();
vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: {
    execute: (...args: unknown[]) => {
      calls.push('reports');
      return listReportsMock(...args);
    },
  },
}));

const listPeriodsMock = vi.fn();
vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  ListFinancialPeriodsUseCase: vi.fn(function () {
    return {
      execute: (...args: unknown[]) => {
        calls.push('periods');
        return listPeriodsMock(...args);
      },
    };
  }),
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

const run = () => getReportSummaryWorkflow.execute({ householdId: 'h1', auth });

describe('getReportSummaryWorkflow', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.mocked(householdPermissionService.assertReadPermission).mockClear();
    vi.mocked(householdPermissionService.assertReadPermission).mockImplementation(async () => {
      calls.push('permission');
    });
    listReportsMock.mockReset();
    listPeriodsMock.mockReset();
    listPeriodsMock.mockResolvedValue([]);
  });

  it('anchors the latest balance sheet even when a later month has other reports', async () => {
    listReportsMock.mockResolvedValue([
      buildBalanceSheetReport('2026-01', 900, 100),
      buildBalanceSheetReport('2026-03', 1000, 100),
      buildIncomeReport('2026-04', 5000, 4000),
    ]);
    listPeriodsMock.mockResolvedValue([buildFinancialPeriod('2026-01', 'CLOSED')]);

    const result = await run();

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
      buildBalanceSheetReport('2026-03', 1000, 100),
      buildIncomeReport('2026-01', 5000, 4000),
      buildIncomeReport('2026-03', 5000, 3000),
    ]);
    listPeriodsMock.mockResolvedValue([buildFinancialPeriod('2026-03', 'CLOSED')]);

    const result = await run();

    expect(result.kpis.savingsRate).toBe(40);
    expect(result.kpis.anchorClosed).toBe(true);
  });

  it('leaves the savings rate null when the anchor month has no income statement', async () => {
    listReportsMock.mockResolvedValue([buildBalanceSheetReport('2026-03', 1000, 100)]);

    const result = await run();

    expect(result.kpis.savingsRate).toBeNull();
  });

  it('returns an empty summary without any balance sheet', async () => {
    listReportsMock.mockResolvedValue([buildIncomeReport('2026-03', 5000, 3000)]);

    const result = await run();

    expect(result.kpis).toEqual({
      yearMonth: null,
      assets: null,
      netWorth: null,
      liabilities: null,
      savingsRate: null,
      anchorClosed: null,
    });
  });

  it('asserts read permission before reading reports and periods', async () => {
    listReportsMock.mockResolvedValue([]);

    await run();

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'h1',
      'user-1',
      false,
    );
    expect(calls[0]).toBe('permission');
    expect(calls.slice(1).sort()).toEqual(['periods', 'reports']);
  });
});
