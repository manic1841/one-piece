import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportType } from '../domains/finance/financeType';
import { EquitySubCategory } from '../domains/finance/types/categories';
import { type BalanceSheetData } from '../schemas/balanceSheet';
import { type FinancialReport } from '../schemas/report';
import { accountService } from './accountService';
import { financialReportService } from './financialReportService';
import { plannedIncomeService } from './plannedIncomeService';
import { portfolioService } from './portfolioService';
import { projectService } from './projectService';
import { settlementService } from './settlementService';

// Mock runTransaction to execute immediately in tests
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof firestore>();
  return {
    ...actual,
    runTransaction: vi.fn(
      (_db: firestore.Firestore, cb: (tx: firestore.Transaction) => Promise<void>) =>
        cb({
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        } as unknown as firestore.Transaction),
    ),
  };
});

// Mock logger to prevent spamming test output
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FinancialReportService Integration - generateFinancialReports', () => {
  const householdId = 'test-household';
  const userId = 'test-user';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should include stock gain/loss in balance sheet', async () => {
    // Setup necessary service mocks
    vi.spyOn(settlementService, 'getUnsettledStats').mockResolvedValue({
      year: 2024,
      month: 3,
      unsettledProjects: [],
      unsettledAccounts: [],
      unsettledPortfolios: [],
      totalUnsettled: 0,
    });
    vi.spyOn(projectService, 'getProjects').mockResolvedValue([]);
    vi.spyOn(plannedIncomeService, 'getPlannedIncomes').mockResolvedValue([]);
    vi.spyOn(accountService, 'getAccounts').mockResolvedValue([]);
    vi.spyOn(accountService, 'getAccountSnapshots').mockResolvedValue([]);
    vi.spyOn(financialReportService, 'getFinancialReport').mockResolvedValue(null);

    vi.spyOn(accountService, 'getAccountWithSnapshots').mockResolvedValue([]);

    // Mock portfolio stock gain
    vi.spyOn(portfolioService, 'getStockGainLoss').mockResolvedValue({
      totalMarketValue: 15000,
      totalCost: 10000,
      totalGainLoss: 5000,
    });

    // Execute
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      2024,
      3,
      userId,
    );

    // Verify
    const bsData = reports.balanceSheet.data as unknown as BalanceSheetData;
    const stockProfitItem = bsData.equity.items.find(
      (i: any) => i.category === EquitySubCategory.STOCK_PROFIT,
    );

    expect(stockProfitItem).toBeDefined();
    if (stockProfitItem && stockProfitItem.subItems) {
      expect(stockProfitItem.amount).toBe(5000);
      expect(stockProfitItem.subItems[0].name).toBe('股市累計盈虧');
    }
  });

  it('should throw error if snapshots are missing', async () => {
    vi.spyOn(settlementService, 'getUnsettledStats').mockResolvedValue({
      year: 2024,
      month: 3,
      unsettledProjects: [{ id: 'p1', name: 'Project 1', type: 'project' }] as any,
      unsettledAccounts: [],
      unsettledPortfolios: [],
      totalUnsettled: 1,
    });

    await expect(
      financialReportService.generateFinancialReports(householdId, 2024, 3, userId),
    ).rejects.toThrow(/無法產生報表：尚有項目未建立 2024\/3 快照/);
  });

  it('should use ending balance from previous Cash Flow report as beginning cash', async () => {
    // 1. Mock prerequisites
    vi.spyOn(settlementService, 'getUnsettledStats').mockResolvedValue({
      year: 2024,
      month: 3,
      unsettledProjects: [],
      unsettledAccounts: [],
      unsettledPortfolios: [],
      totalUnsettled: 0,
    });
    vi.spyOn(projectService, 'getProjects').mockResolvedValue([]);
    vi.spyOn(plannedIncomeService, 'getPlannedIncomes').mockResolvedValue([]);
    vi.spyOn(accountService, 'getAccounts').mockResolvedValue([]);
    vi.spyOn(portfolioService, 'getStockGainLoss').mockResolvedValue({
      totalMarketValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
    });

    // 2. Mock previous month's report
    const prevReport = {
      type: ReportType.CASH_FLOW,
      year: 2024,
      month: 2,
      data: {
        endingBalance: 8888,
      },
    } as unknown as FinancialReport;

    // Mock getFinancialReport inside the service
    vi.spyOn(financialReportService, 'getFinancialReport').mockResolvedValue(prevReport);

    // 3. Execute for Month 3
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      2024,
      3,
      userId,
    );

    // 4. Verify
    const cfData = reports.cashFlow.data as unknown as { beginningBalance: number };
    expect(cfData.beginningBalance).toBe(8888);
  });

  it('should fallback to account snapshots if previous report is missing', async () => {
    // 1. Mock prerequisites
    vi.spyOn(settlementService, 'getUnsettledStats').mockResolvedValue({
      year: 2024,
      month: 3,
      unsettledProjects: [],
      unsettledAccounts: [],
      unsettledPortfolios: [],
      totalUnsettled: 0,
    });
    vi.spyOn(projectService, 'getProjects').mockResolvedValue([]);
    vi.spyOn(plannedIncomeService, 'getPlannedIncomes').mockResolvedValue([]);
    const mockAccount = { id: 'acc1', name: 'Acc 1' } as unknown as any;
    vi.spyOn(accountService, 'getAccounts').mockResolvedValue([mockAccount]);
    vi.spyOn(portfolioService, 'getStockGainLoss').mockResolvedValue({
      totalMarketValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
    });

    // 2. Mock NO previous report
    vi.spyOn(financialReportService, 'getFinancialReport').mockResolvedValue(null);

    // 3. Mock previous account snapshots
    const mockSnapshots = [{ amount: 5000 }, { amount: 3000 }] as unknown as any;
    vi.spyOn(accountService, 'getAccountSnapshots').mockResolvedValue(mockSnapshots);
    vi.spyOn(accountService, 'getAccountWithSnapshots').mockResolvedValue([]);

    // 4. Execute
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      2024,
      3,
      userId,
    );

    // 5. Verify fallback worked
    const cfData = reports.cashFlow.data as unknown as { beginningBalance: number };
    expect(cfData.beginningBalance).toBe(8000);
  });
});
