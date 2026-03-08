import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportType } from '../domains/finance/financeType';
import { EquitySubCategory, FinancingSubCategory } from '../domains/finance/types/categories';
import { reportRepository } from '../repositories/reportRepository';
import { type BalanceSheetData } from '../schemas/balanceSheet';
import { type FinancialReport } from '../schemas/report';
import { type AuthContext, accountService } from './accountService';
import { financialReportService } from './financialReportService';
import { householdService } from './householdService';
import { plannedIncomeService } from './plannedIncomeService';
import { type ProjectWithSnapshot, projectService } from './projectService';
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

      vi.spyOn(projectService, 'getProjects').mockResolvedValue([
        reProject,
        divProject,
      ] as ProjectWithSnapshot[]);
      vi.spyOn(projectService, 'getProjectById').mockImplementation(async (_hhId, pId) => {
        if (pId === reId) return reProject as ProjectWithSnapshot;
        if (pId === divId) return divProject as ProjectWithSnapshot;
        return null;
      });

      // Mock financial activity for the month
      vi.spyOn(financialReportService, 'generateFinancialReports').mockResolvedValue({
        incomeStatement: {
          data: { netIncome: 5000 },
          type: 'income_statement',
        } as unknown as FinancialReport,
        balanceSheet: { data: {} } as unknown as FinancialReport,
        cashFlow: { data: {} } as unknown as FinancialReport,
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
            } as unknown as ProjectWithSnapshot;
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
            } as unknown as ProjectWithSnapshot;
          }
          return { id: pId, snapshot: null } as unknown as ProjectWithSnapshot;
        },
      );

      const updateSpy = vi.spyOn(projectService, 'updateSnapshot').mockResolvedValue();
      vi.spyOn(projectService, 'getSnapshotForPeriod').mockResolvedValue(null);

      vi.spyOn(householdService, 'assertWritePermission').mockResolvedValue();

      // Execute
      const mockTx = {} as unknown as firestore.Transaction;
      await financialReportService.closeMonth(
        householdId,
        2024,
        3,
        userId,
        userEmail,
        { uid: userId, isGlobalAdmin: false } as AuthContext,
        undefined,
        mockTx,
      );

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
        expect.objectContaining({ uid: userId }),
        mockTx,
      );
    });
  });

  describe('saveFinancialReports', () => {
    it('should save reports and trigger closeMonth', async () => {
      const reports = [
        {
          id: 'is-2024-03',
          type: ReportType.INCOME_STATEMENT,
          year: 2024,
          month: 3,
          data: { netIncome: 5000 },
          startDate: new Date(),
          endDate: new Date(),
          status: 'draft',
          reconciled: true,
          cached: false,
          generatedAt: new Date(),
          generatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      ] as FinancialReport[];

      const auth = { uid: userId, isGlobalAdmin: false } as AuthContext;
      vi.spyOn(householdService, 'assertWritePermission').mockResolvedValue();
      const createSpy = vi
        .spyOn(
          reportRepository as unknown as { create: (...args: unknown[]) => Promise<string> },
          'create',
        )
        .mockResolvedValue('is-2024-03');
      const getClosingDataSpy = vi
        .spyOn(
          financialReportService as unknown as {
            getClosingData: (
              _hhId: string,
              _y: number,
              _m: number,
            ) => Promise<{ dividends: number; retainedEarningsProject: ProjectWithSnapshot }>;
          },
          'getClosingData',
        )
        .mockResolvedValue({
          dividends: 0,
          retainedEarningsProject: { id: 're-1' } as unknown as ProjectWithSnapshot,
        });
      const executeClosingSpy = vi
        .spyOn(
          financialReportService as unknown as {
            executeClosing: (...args: unknown[]) => Promise<void>;
          },
          'executeClosing',
        )
        .mockResolvedValue(undefined);

      await financialReportService.saveFinancialReports(householdId, reports, userEmail, auth);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'is-2024-03',
      );
      expect(getClosingDataSpy).toHaveBeenCalled();
      expect(executeClosingSpy).toHaveBeenCalledWith(
        householdId,
        2024,
        3,
        userEmail,
        auth,
        5000,
        0,
        expect.anything(),
        expect.anything(), // Transaction
      );
    });
  });

  describe('generateFinancialReports', () => {
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
        } as unknown as {
          id: string;
          name: string;
          category: string;
          currency: string;
          snapshot: {
            amount: number;
            holdings: Array<{
              symbol: string;
              name: string;
              quantity: number;
              cost: number;
              marketValue: number;
            }>;
          };
        },
      ]);

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
        (i: { category: string }) => i.category === EquitySubCategory.STOCK_PROFIT,
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
        unsettledProjects: [{ id: 'p1', name: 'Project 1', type: 'project' }],
        unsettledAccounts: [],
        unsettledPortfolios: [],
        totalUnsettled: 1,
      });

      await expect(
        financialReportService.generateFinancialReports(householdId, 2024, 3, userId),
      ).rejects.toThrow(/尚有項目未建立 2024\/3 快照/);
    });
  });
});
