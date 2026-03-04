import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EquitySubCategory, FinancingSubCategory } from '../domains/finance/types/categories';
import { accountService } from './accountService';
import { financialReportService } from './financialReportService';
import { plannedIncomeService } from './plannedIncomeService';
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
      // Mock projects - specifically Retained Earnings and a Dividend source
      const reId = 're-project-id';
      const divId = 'div-project-id';
      const householdId = 'test-household';

      const reProject = {
        id: reId,
        name: 'Retained Earnings',
        accounting: {
          balanceSheet: { subcategory: EquitySubCategory.RETAINED_EARNINGS },
        },
      };

      const divProject = {
        id: divId,
        name: 'Dividends',
        accounting: {
          cashFlow: { subcategory: FinancingSubCategory.OWNER_DEPOSIT },
        },
      };

      vi.spyOn(projectService, 'getProjects').mockResolvedValue([reProject, divProject] as any);
      vi.spyOn(projectService, 'getProjectById').mockImplementation(async (_hhId, pId) => {
        if (pId === reId) return reProject as any;
        if (pId === divId) return divProject as any;
        return null;
      });

      // Mock financial activity for the month
      vi.spyOn(financialReportService, 'generateFinancialReports').mockResolvedValue({
        incomeStatement: { data: { netIncome: 5000 }, type: 'income_statement' } as any,
        balanceSheet: { data: {} } as any,
        cashFlow: { data: {} } as any,
        reconciliation: { reconciled: true, difference: 0 },
      });

      // Mock snapshots: RE has existing snapshot, DIV has 1000 expense
      vi.spyOn(projectService, 'getProjectWithSnapshot').mockImplementation(
        async (_hhId: string, pId: string, y: number, m: number) => {
          if (pId === divId) {
            return {
              ...divProject,
              snapshot: {
                expense: 1000,
                income: 0,
                openingBalance: 0,
                closingBalance: -1000,
                year: y,
                month: m,
                id: 'snap-div',
              },
            } as any;
          }
          if (pId === reId) {
            return {
              ...reProject,
              snapshot: {
                year: y,
                month: m,
                openingBalance: 0,
                income: 0,
                expense: 0,
                closingBalance: 0,
                id: 'snap-re-1',
              },
            } as any;
          }
          return { id: pId, snapshot: null } as any;
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
        'snap-re-1',
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
      vi.spyOn(accountService, 'getAccountSnapshots').mockResolvedValue([]);

      // Mock account with holdings resulting in 5000 gain
      vi.spyOn(accountService, 'getAccountWithSnapshots').mockResolvedValue([
        {
          id: 'inv-1',
          name: 'Investment Account',
          category: 'investment',
          currency: 'TWD',
          snapshot: {
            amount: 15000,
            holdings: [
              {
                symbol: 'STOCK1',
                name: 'Stock 1',
                quantity: 100,
                cost: 10000,
                marketValue: 15000,
              },
            ],
          },
        } as any,
      ]);

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
