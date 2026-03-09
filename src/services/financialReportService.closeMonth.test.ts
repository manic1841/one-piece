import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EquitySubCategory, FinancingSubCategory } from '../domains/finance/types/categories';
import { type AuthContext } from './accountService';
import { financialClosingService } from './financialClosingService';
import { financialReportService } from './financialReportService';
import { householdService } from './householdService';
import { type ProjectWithSnapshot, projectService } from './projectService';

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

describe('FinancialClosingService Integration - closeMonth', () => {
  const householdId = 'test-household';
  const userId = 'test-user';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly calculate and record Retained Earnings snapshot', async () => {
    // Mock projects - specifically Retained Earnings and a Dividend source
    const reId = 're-project-id';
    const divId = 'div-project-id';

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
      } as any,
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
    await financialClosingService.closeMonth(
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
