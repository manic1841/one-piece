import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportType } from '../domains/finance/financeType';
import { reportRepository } from '../repositories/reportRepository';
import { type FinancialReport } from '../schemas/report';
import { type AuthContext } from './accountService';
import { financialClosingService } from './financialClosingService';
import { financialReportService } from './financialReportService';
import { householdService } from './householdService';
import { type ProjectWithSnapshot } from './projectService';

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

describe('FinancialReportService Integration - saveFinancialReports', () => {
  const householdId = 'test-household';
  const userId = 'test-user';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
        reportRepository as unknown as { create: (...args: any[]) => Promise<string> },
        'create',
      )
      .mockResolvedValue('is-2024-03');

    vi.spyOn(financialClosingService, 'getClosingData').mockResolvedValue({
      dividends: 0,
      retainedEarningsProject: { id: 're-1' } as unknown as ProjectWithSnapshot,
    });

    const executeClosingSpy = vi
      .spyOn(financialClosingService, 'executeClosing')
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
