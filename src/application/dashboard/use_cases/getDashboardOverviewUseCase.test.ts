import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  getDashboardOverviewUseCase,
  type DashboardOverview,
} from './getDashboardOverviewUseCase';
import { type FinancialReport } from '@/domains/report/schemas';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
  },
}));

const getFinancialPeriodMock = vi.fn();
vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: vi.fn(function () {
    return {
      execute: (...args: unknown[]) => getFinancialPeriodMock(...args),
    };
  }),
}));

const listReportsMock = vi.fn();
vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: {
    execute: (...args: unknown[]) => listReportsMock(...args),
  },
}));

import { householdPermissionService } from '@/application/household/householdPermissionService';

const auth = { uid: 'user-1', isGlobalAdmin: false };

const buildBalanceSheet = (
  yearMonth: string,
  assetsTotal: number,
  liabilitiesTotal: number,
): FinancialReport => ({
  id: `${yearMonth}-BALANCE_SHEET`,
  householdId: 'household-1',
  yearMonth,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  type: 'BALANCE_SHEET',
  data: {
    yearMonth,
    assets: {
      total: assetsTotal,
      groups: {
        cash: { label: '現金與銀行', total: assetsTotal, items: [] },
        investment: { label: '投資資產', total: 0, items: [] },
        property: { label: '不動產', total: 0, items: [] },
      },
    },
    liabilities: {
      total: liabilitiesTotal,
      groups: {
        loan: { label: '貸款', total: liabilitiesTotal, items: [] },
      },
    },
    equity: {
      total: assetsTotal - liabilitiesTotal,
      groups: {
        openingEquity: { label: '期初餘額', total: 0, items: [] },
        netIncome: { label: '本期淨利', total: 0, items: [] },
        capital: { label: '資本', total: 0, items: [] },
        stock_gain: { label: '股票損益', total: 0, items: [] },
        adjustment: { label: '調整', total: 0, items: [] },
      },
    },
  },
});

const buildPeriod = (status: 'OPEN' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'CLOSED') => ({
  yearMonth: '2026-08',
  status,
  stages: {},
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('GetDashboardOverviewUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertReadPermission).mockResolvedValue(undefined);
  });

  it('anchors to the latest CLOSED balance sheet month', async () => {
    listReportsMock.mockResolvedValue([
      buildBalanceSheet('2026-06', 400, 100),
      buildBalanceSheet('2026-08', 600, 150),
      buildBalanceSheet('2026-07', 500, 120),
    ]);
    getFinancialPeriodMock.mockImplementation(() =>
      Promise.resolve(buildPeriod('CLOSED')),
    );

    const result: DashboardOverview = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.anchor).not.toBeNull();
    expect(result.anchor?.yearMonth).toBe('2026-08');
    expect(result.anchor?.netWorth).toBe(450);
  });

  it('skips unclosed months and anchors to the latest closed one', async () => {
    listReportsMock.mockResolvedValue([
      buildBalanceSheet('2026-07', 500, 120),
      buildBalanceSheet('2026-08', 600, 150),
    ]);
    getFinancialPeriodMock.mockImplementation((req: { yearMonth: string }) =>
      Promise.resolve(buildPeriod(req.yearMonth === '2026-07' ? 'CLOSED' : 'IN_PROGRESS')),
    );

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.anchor?.yearMonth).toBe('2026-07');
    expect(result.anchor?.netWorth).toBe(380);
  });

  it('returns a 12-month series with gaps for missing months', async () => {
    listReportsMock.mockResolvedValue([buildBalanceSheet('2025-12', 300, 100)]);
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.anchor?.netWorthSeries).toHaveLength(12);
    expect(result.anchor?.netWorthSeries[11]).toMatchObject({
      year: 2025,
      month: 12,
      netAssets: 200,
    });
    expect(result.anchor?.netWorthSeries[0]).toMatchObject({ year: 2025, month: 1, netAssets: null });
  });

  it('returns no anchor when no balance sheet month is closed', async () => {
    listReportsMock.mockResolvedValue([buildBalanceSheet('2026-08', 600, 150)]);
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('IN_PROGRESS'));

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.anchor).toBeNull();
  });

  it('returns no anchor when there are no reports', async () => {
    listReportsMock.mockResolvedValue([]);

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.anchor).toBeNull();
    expect(getFinancialPeriodMock).not.toHaveBeenCalled();
  });
});
