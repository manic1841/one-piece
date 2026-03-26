import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportSettlement } from './useReportSettlement';

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

vi.mock('@/application/report/use_cases/getUnsettledStatsUseCase', () => ({
  getUnsettledStatsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'user@example.com' },
    isAdmin: false,
  }),
}));

vi.mock('@/domains/report/reportService', () => ({
  reportService: {
    generateIncomeStatement: vi.fn(),
    generateBalanceSheet: vi.fn(),
    generateCashFlow: vi.fn(),
    generateMonthlyFinancialReports: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: {
    getReport: vi.fn(),
  },
}));

describe('useReportSettlement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    const { reportService } = await import('../../../../domains/report/reportService');
    const { reportRepository } = await import('../../../../infra/repositories/reportRepository');
    const { getUnsettledStatsUseCase } = await import(
      '../../../../application/report/use_cases/getUnsettledStatsUseCase'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );

    vi.mocked(getUnsettledStatsUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      unsettledAccounts: [],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 0,
    });

    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      yearMonth: '2026-03',
      items: [],
      hasMissingRepayments: false,
      missingRepaymentAccountNames: [],
    });

    vi.mocked(reportService.generateIncomeStatement).mockResolvedValue({
      yearMonth: getCurrentYearMonth(),
      incomeTotal: 1000,
      expenseTotal: 400,
      netIncome: 600,
      incomeItems: [],
      expenseItems: [],
    });

    vi.mocked(reportService.generateBalanceSheet).mockResolvedValue({
      yearMonth: getCurrentYearMonth(),
      assets: { total: 5000, groups: {} },
      liabilities: { total: 1200, groups: {} },
      equity: { total: 3800, groups: {} },
    } as never);

    vi.mocked(reportRepository.getReport).mockResolvedValue(null);
  });

  it('treats zero active projects as settled and loads the summary', async () => {
    const { reportService } = await import('../../../../domains/report/reportService');
    const { getUnsettledStatsUseCase } = await import(
      '../../../../application/report/use_cases/getUnsettledStatsUseCase'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );
    const yearMonth = getCurrentYearMonth();
    const [year, month] = yearMonth.split('-').map(Number);

    vi.mocked(getUnsettledStatsUseCase.execute).mockResolvedValue({
      year,
      month,
      unsettledAccounts: [],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 0,
    });
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      year,
      month,
      yearMonth,
      items: [],
      hasMissingRepayments: false,
      missingRepaymentAccountNames: [],
    });

    const { result } = renderHook(() => useReportSettlement('household-1', 'user@example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.summary).not.toBeNull();
    });

    expect(result.current.summary).toEqual({
      totalRevenue: 1000,
      totalExpense: 400,
      netIncome: 600,
      netWorth: 3800,
    });
    expect(result.current.unsettledProjectNames).toEqual([]);
    expect(getUnsettledStatsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      year,
      month,
    });
    expect(previewDebtSettlementsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      year,
      month,
    });
    expect(reportService.generateIncomeStatement).toHaveBeenCalledWith(
      'household-1',
      yearMonth,
      expect.any(Function),
    );
    expect(reportService.generateBalanceSheet).toHaveBeenCalledWith(
      'household-1',
      yearMonth,
      expect.any(Function),
    );
  });

  it('blocks summary loading when any account, portfolio, debt, or project is unsettled', async () => {
    const { reportService } = await import('../../../../domains/report/reportService');
    const { getUnsettledStatsUseCase } = await import(
      '../../../../application/report/use_cases/getUnsettledStatsUseCase'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );

    vi.mocked(getUnsettledStatsUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      unsettledAccounts: [{ id: 'a2', name: 'Account 2' } as never],
      unsettledPortfolios: [{ id: 'p2', name: 'Portfolio 2' } as never],
      unsettledDebts: [{ id: 'd2', name: 'Debt 2' } as never],
      unsettledProjects: [{ id: 'project-2', name: 'Project 2' } as never],
      totalUnsettled: 4,
    });
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      yearMonth: '2026-03',
      items: [],
      hasMissingRepayments: true,
      missingRepaymentAccountNames: ['Debt 2'],
    });

    const { result } = renderHook(() => useReportSettlement('household-1', 'user@example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.reportsGenerated).toBe(false);
    expect(result.current.unsettledProjectNames).toEqual(['Project 2']);
    expect(result.current.unsettledAccountNames).toEqual(['Account 2']);
    expect(result.current.unsettledPortfolioNames).toEqual(['Portfolio 2']);
    expect(result.current.unsettledDebtNames).toEqual(['Debt 2']);
    expect(result.current.debtNoRepaymentWarningNames).toEqual(['Debt 2']);
    expect(reportService.generateIncomeStatement).not.toHaveBeenCalled();
    expect(reportService.generateBalanceSheet).not.toHaveBeenCalled();
  });

  it('loads the summary only when all active projects are settled', async () => {
    const { reportService } = await import('../../../../domains/report/reportService');
    const { reportRepository } = await import('../../../../infra/repositories/reportRepository');
    const { getUnsettledStatsUseCase } = await import(
      '../../../../application/report/use_cases/getUnsettledStatsUseCase'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );
    const yearMonth = getCurrentYearMonth();
    const [year, month] = yearMonth.split('-').map(Number);

    vi.mocked(getUnsettledStatsUseCase.execute).mockResolvedValue({
      year,
      month,
      unsettledAccounts: [],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 0,
    });
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      year,
      month,
      yearMonth,
      items: [],
      hasMissingRepayments: false,
      missingRepaymentAccountNames: [],
    });
    vi.mocked(reportRepository.getReport).mockResolvedValueOnce({ updatedAt: new Date() } as never);
    vi.mocked(reportRepository.getReport).mockResolvedValueOnce({ updatedAt: new Date() } as never);
    vi.mocked(reportRepository.getReport).mockResolvedValueOnce({ updatedAt: new Date() } as never);

    const { result } = renderHook(() => useReportSettlement('household-1', 'user@example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.summary).not.toBeNull();
    });

    expect(result.current.summary).toEqual({
      totalRevenue: 1000,
      totalExpense: 400,
      netIncome: 600,
      netWorth: 3800,
    });
    expect(result.current.reportsGenerated).toBe(true);
    expect(result.current.unsettledProjectNames).toEqual([]);
    expect(result.current.unsettledAccountNames).toEqual([]);
    expect(result.current.unsettledPortfolioNames).toEqual([]);
    expect(result.current.unsettledDebtNames).toEqual([]);
    expect(getUnsettledStatsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      year,
      month,
    });
    expect(reportService.generateIncomeStatement).toHaveBeenCalledWith(
      'household-1',
      yearMonth,
      expect.any(Function),
    );
    expect(reportService.generateBalanceSheet).toHaveBeenCalledWith(
      'household-1',
      yearMonth,
      expect.any(Function),
    );
  });
});
