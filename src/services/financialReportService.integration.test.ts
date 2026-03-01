import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PROJECTS } from '@/constants/project/defaultProjects';
import { EquitySubCategory, FinancingSubCategory } from '@/domains/finance/types';

import { accountService } from './accountService';
import { financialReportService } from './financialReportService';
import { plannedIncomeService } from './plannedIncomeService';
import { portfolioService } from './portfolioService';
import { projectService } from './projectService';

describe('FinancialReportService Integration', () => {
  const householdId = 'test-household';
  const userId = 'test-user';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('closeMonth', () => {
    it('should correctly calculate and record Retained Earnings snapshot', async () => {
      // Mock portfolio gain
      vi.spyOn(portfolioService, 'getStockGainLoss').mockResolvedValue({
        totalMarketValue: 10000,
        totalCost: 8000,
        totalGainLoss: 2000,
      } as any);

      // Mock projects - specifically Retained Earnings
      const reConfig = DEFAULT_PROJECTS.find(
        (p: any) => p.accounting?.balanceSheet?.subcategory === EquitySubCategory.RETAINED_EARNINGS,
      )!;
      const reId = 're-project-id';
      vi.spyOn(projectService, 'getProjects').mockResolvedValue([{ id: reId, ...reConfig } as any]);
      vi.spyOn(projectService, 'getProjectById').mockResolvedValue({
        id: reId,
        ...reConfig,
      } as any);

      // Mock financial activity for the month
      vi.spyOn(financialReportService, 'generateFinancialReports').mockResolvedValue({
        incomeStatement: { data: { netIncome: 5000 }, type: 'income_statement' } as any,
        balanceSheet: { data: {} } as any,
        cashFlow: { data: {} } as any,
        reconciliation: { reconciled: true, difference: 0 },
      });

      // Mock snapshots to return 1000 dividend (OWNER_DEPOSIT)
      vi.spyOn(projectService, 'getProjectWithSnapshot').mockImplementation(
        async (hhId: string, pId: string, y: number, m: number) => {
          const p = await projectService.getProjectById(hhId, pId);
          if (p?.accounting?.cashFlow?.subcategory === FinancingSubCategory.OWNER_DEPOSIT) {
            return {
              ...p,
              snapshot: {
                expense: 1000,
                income: 0,
                openingBalance: 0,
                closingBalance: -1000,
                year: y,
                month: m,
                id: 'snap-1',
              },
            } as any;
          }
          return { ...p, snapshot: null } as any;
        },
      );

      const updateSpy = vi.spyOn(projectService, 'updateSnapshot').mockResolvedValue();
      vi.spyOn(projectService, 'getSnapshotForPeriod').mockResolvedValue(null);

      // Execute
      await financialReportService.closeMonth(householdId, 2024, 3, userId, userEmail);

      // Verify
      expect(updateSpy).toHaveBeenCalledWith(
        householdId,
        reId,
        'snap-1',
        expect.objectContaining({
          income: 5000,
          expense: 1000,
          closingBalance: 4000,
        }),
        userEmail,
      );
    });
  });

  describe('generateFinancialReports', () => {
    it('should include stock gain/loss in balance sheet', async () => {
      // Setup necessary service mocks
      vi.spyOn(projectService, 'getProjects').mockResolvedValue([]);
      vi.spyOn(plannedIncomeService, 'getPlannedIncomes').mockResolvedValue([]);
      vi.spyOn(accountService, 'getAccounts').mockResolvedValue([]);
      vi.spyOn(accountService, 'getAccountWithSnapshots').mockResolvedValue([]);
      vi.spyOn(accountService, 'getAccountSnapshots').mockResolvedValue([]);

      // Mock portfolio gain
      vi.spyOn(portfolioService, 'getStockGainLoss').mockResolvedValue({
        totalMarketValue: 15000,
        totalCost: 10000,
        totalGainLoss: 5000,
      } as any);

      // Execute
      const reports = await financialReportService.generateFinancialReports(
        householdId,
        2024,
        3,
        userId,
      );

      // Verify
      const bsData = reports.balanceSheet.data as any;
      const stockProfitItem = bsData.equity.items.find(
        (i: any) => i.category === EquitySubCategory.STOCK_PROFIT,
      );

      expect(stockProfitItem).toBeDefined();
      expect(stockProfitItem.amount).toBe(5000);
      expect(stockProfitItem.subItems[0].name).toBe('股市累計盈虧');
    });
  });
});
