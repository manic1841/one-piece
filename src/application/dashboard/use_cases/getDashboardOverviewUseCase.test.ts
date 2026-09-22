import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  getDashboardOverviewUseCase,
  type DashboardOverview,
} from './getDashboardOverviewUseCase';
import { type FinancialReport } from '@/domains/report/schemas';
import { type PortfolioSnapshot } from '@/domains/portfolio/schemas';
import { type Transaction } from '@/domains/ledger/schemas';

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

const listPortfoliosMock = vi.fn();
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: {
    execute: (...args: unknown[]) => listPortfoliosMock(...args),
  },
}));

const listPortfolioSnapshotsMock = vi.fn();
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: {
    execute: (...args: unknown[]) => listPortfolioSnapshotsMock(...args),
  },
}));

const listDebtPaymentsMock = vi.fn();
vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listDebtPaymentsByDateRange: (...args: unknown[]) => listDebtPaymentsMock(...args),
  },
}));

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { ReportType } from '@/domains/report/schemas';

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

const buildCashFlow = (yearMonth: string, netCashChange: number): FinancialReport => ({
  id: `${yearMonth}-CASH_FLOW`,
  householdId: 'household-1',
  yearMonth,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  type: ReportType.CASH_FLOW,
  data: {
    yearMonth,
    operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange,
    beginningBalance: 0,
    endingBalance: netCashChange,
    actualBalance: netCashChange,
    adjustment: 0,
  },
});

const buildSnapshot = (
  portfolioId: string,
  gain: number,
  openingValue: number,
  holdings: { marketValue: number; leverage?: number }[] = [],
): PortfolioSnapshot => ({
  id: `snapshot-${portfolioId}`,
  portfolioId,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
  year: 2026,
  month: 8,
  accounts: [],
  totalValue: 0,
  cashFlow: { deposits: 0, withdrawals: 0 },
  performance: {
    openingValue,
    closingValue: 0,
    netCashFlow: 0,
    gain,
    returnRate: 0,
    cumulativeGain: 0,
    cumulativeReturnRate: 0,
  },
  ...(holdings.length > 0
    ? {
        accounts: [
          {
            accountId: `${portfolioId}-acc`,
            accountName: 'Brokerage',
            category: 'securities' as const,
            value: holdings.reduce((sum, h) => sum + h.marketValue, 0),
            holdings: holdings.map((h) => ({
              symbol: 'STK',
              name: 'Stock',
              cost: 0,
              marketValue: h.marketValue,
              leverage: h.leverage,
            })),
          },
        ],
      }
    : {}),
});

const buildDebtPayment = (amount: number): Transaction => ({
  id: `debt-${amount}`,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
  date: new Date(2026, 7, 5),
  intentType: 'DEBT_PAYMENT',
  amount,
  debtAccountId: 'debt-1',
  entries: [],
});

const buildPeriod = (status: string) => ({
  id: '2026-08',
  yearMonth: '2026-08',
  status,
  stages: {},
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
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
    listPortfoliosMock.mockResolvedValue([]);
    listDebtPaymentsMock.mockResolvedValue([]);
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
    expect(result.anchor?.assets).toBe(600);
    expect(result.anchor?.liabilities).toBe(150);
  });

  it('skips unclosed months and anchors to the latest closed one', async () => {
    listReportsMock.mockResolvedValue([
      buildBalanceSheet('2026-07', 500, 120),
      buildBalanceSheet('2026-08', 600, 150),
    ]);
    listPortfoliosMock.mockResolvedValue([]);
    listDebtPaymentsMock.mockResolvedValue([]);
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
    listPortfoliosMock.mockResolvedValue([]);
    listDebtPaymentsMock.mockResolvedValue([]);
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

  it('assembles the four anchored pulse metrics', async () => {
    listReportsMock.mockResolvedValue([
      buildBalanceSheet('2026-08', 600, 150),
      buildCashFlow('2026-08', -12300),
    ]);
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));
    listPortfoliosMock.mockResolvedValue([
      { id: 'portfolio-1', createdBy: '', createdAt: new Date(), updatedBy: '', updatedAt: new Date(), name: 'P1', securitiesAccountId: 'acc-1', bankAccountId: 'acc-2', isActive: true, order: 0 },
      { id: 'portfolio-2', createdBy: '', createdAt: new Date(), updatedBy: '', updatedAt: new Date(), name: 'P2', securitiesAccountId: 'acc-3', bankAccountId: 'acc-4', isActive: true, order: 1 },
    ]);
    listPortfolioSnapshotsMock.mockImplementation((request: {
      portfolioId: string;
      year?: number;
      month?: number;
    }) => {
      if (
        request.year !== 2026 ||
        request.month !== 8 ||
        request.portfolioId !== 'portfolio-1'
      ) {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        buildSnapshot('portfolio-1', 5000, 100000),
        buildSnapshot('portfolio-1', 3000, 90000, [{ marketValue: 20000, leverage: 2 }]),
      ]);
    });
    listDebtPaymentsMock.mockResolvedValue([buildDebtPayment(9000), buildDebtPayment(4500)]);

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.pulse).not.toBeNull();
    expect(result.pulse?.netCashFlow).toBe(-12300);
    expect(result.pulse?.investmentReturn).toBeCloseTo(4.21, 2);
    expect(result.pulse?.investmentLeverage).toBeCloseTo(2.0, 5);
    expect(result.pulse?.monthlyDebtPayment).toBe(13500);
    expect(listDebtPaymentsMock).toHaveBeenCalledWith(
      'household-1',
      new Date(2026, 7, 1),
      new Date(2026, 8, 1),
    );
  });

  it('returns null pulse metrics when the anchor month lacks data', async () => {
    listReportsMock.mockResolvedValue([buildBalanceSheet('2026-08', 600, 150)]);
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));
    listPortfoliosMock.mockResolvedValue([]);
    listDebtPaymentsMock.mockResolvedValue([]);

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.pulse?.netCashFlow).toBeNull();
    expect(result.pulse?.investmentReturn).toBeNull();
    expect(result.pulse?.investmentLeverage).toBeNull();
    expect(result.pulse?.monthlyDebtPayment).toBeNull();
  });

  it('returns no pulse when there is no anchor', async () => {
    listReportsMock.mockResolvedValue([]);
    listDebtPaymentsMock.mockResolvedValue([]);

    const result = await getDashboardOverviewUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.pulse).toBeNull();
    expect(listDebtPaymentsMock).not.toHaveBeenCalled();
  });

  describe('ytd baseline resolution', () => {
    it('uses same-year January net worth as the baseline', async () => {
      listReportsMock.mockResolvedValue([
        buildBalanceSheet('2026-01', 400, 100),
        buildBalanceSheet('2026-08', 600, 150),
      ]);
      listPortfoliosMock.mockResolvedValue([]);
      listDebtPaymentsMock.mockResolvedValue([]);
      getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

      const result = await getDashboardOverviewUseCase.execute({
        householdId: 'household-1',
        auth,
      });

      expect(result.anchor?.ytdBaseline).toMatchObject({
        yearMonth: '2026-01',
        netWorth: 300,
      });
    });

    it('falls back to the earliest report of the anchor year when January is missing', async () => {
      listReportsMock.mockResolvedValue([
        buildBalanceSheet('2026-08', 600, 150),
        buildBalanceSheet('2026-03', 440, 120),
        buildBalanceSheet('2026-05', 520, 130),
      ]);
      listPortfoliosMock.mockResolvedValue([]);
      listDebtPaymentsMock.mockResolvedValue([]);
      getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

      const result = await getDashboardOverviewUseCase.execute({
        householdId: 'household-1',
        auth,
      });

      expect(result.anchor?.ytdBaseline).toMatchObject({
        yearMonth: '2026-03',
        netWorth: 320,
      });
    });

    it('returns null baseline when the anchor year has no earlier report', async () => {
      listReportsMock.mockResolvedValue([buildBalanceSheet('2026-08', 600, 150)]);
      listPortfoliosMock.mockResolvedValue([]);
      listDebtPaymentsMock.mockResolvedValue([]);
      getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

      const result = await getDashboardOverviewUseCase.execute({
        householdId: 'household-1',
        auth,
      });

      expect(result.anchor?.ytdBaseline).toBeNull();
    });

    it('does not use prior-year reports as the baseline', async () => {
      listReportsMock.mockResolvedValue([
        buildBalanceSheet('2025-12', 500, 100),
        buildBalanceSheet('2026-08', 600, 150),
      ]);
      listPortfoliosMock.mockResolvedValue([]);
      listDebtPaymentsMock.mockResolvedValue([]);
      getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

      const result = await getDashboardOverviewUseCase.execute({
        householdId: 'household-1',
        auth,
      });

      expect(result.anchor?.ytdBaseline).toBeNull();
    });
  });

  describe('balance sheet composition and cash flow series', () => {
    it('surfaces the anchor composition and a 12-month cash flow series', async () => {
      listReportsMock.mockResolvedValue([
        buildBalanceSheet('2026-07', 500, 120),
        buildCashFlow('2026-07', 3200),
        buildBalanceSheet('2026-08', 600, 150),
        buildCashFlow('2026-08', -12300),
      ]);
      listPortfoliosMock.mockResolvedValue([]);
      listDebtPaymentsMock.mockResolvedValue([]);
      getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

      const result = await getDashboardOverviewUseCase.execute({
        householdId: 'household-1',
        auth,
      });

      expect(result.anchor?.composition).toEqual({
        assets: [
          { key: 'cash', label: '現金與銀行', amount: 600 },
          { key: 'investment', label: '投資資產', amount: 0 },
          { key: 'property', label: '不動產', amount: 0 },
        ],
        liabilities: [{ key: 'loan', label: '貸款', amount: 150 }],
      });
      expect(result.cashFlowSeries).toHaveLength(12);
      expect(result.cashFlowSeries[0]).toMatchObject({
        year: 2025,
        month: 9,
        netCashFlow: null,
      });
      expect(result.cashFlowSeries[9]).toMatchObject({
        year: 2026,
        month: 6,
        netCashFlow: null,
      });
      expect(result.cashFlowSeries[10]).toMatchObject({
        year: 2026,
        month: 7,
        netCashFlow: 3200,
      });
      expect(result.cashFlowSeries[11]).toMatchObject({
        year: 2026,
        month: 8,
        netCashFlow: -12300,
      });
    });
  });
});
