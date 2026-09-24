import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportSettlement } from './useReportSettlement';

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/report/use_cases/generateFinancialReportsUseCase', () => ({
  generateFinancialReportsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    user: { uid: 'user-1', email: 'user@example.com' },
    isAdmin: false,
  }),
}));

const buildPreviewResult = (overrides?: {
  isPersisted?: boolean;
  timestamps?: { incomeStatement?: string; balanceSheet?: string; cashFlow?: string };
}) => ({
  incomeStatement: {
    yearMonth: getCurrentYearMonth(),
    incomeTotal: 1000,
    expenseTotal: 400,
    netIncome: 600,
    incomeItems: [],
    expenseItems: [],
  },
  balanceSheet: {
    yearMonth: getCurrentYearMonth(),
    assets: { total: 5000, groups: {} },
    liabilities: { total: 1200, groups: {} },
    equity: { total: 3800, groups: {} },
  },
  cashFlow: {
    yearMonth: getCurrentYearMonth(),
    operating: { label: '', total: 0, inflowItems: [], outflowItems: [] },
    investing: { label: '', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 0,
    beginningBalance: 0,
    endingBalance: 0,
    actualBalance: 0,
    adjustment: 0,
  },
  isPersisted: overrides?.isPersisted ?? false,
  timestamps: overrides?.timestamps ?? {},
});

describe('useReportSettlement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    const { getSettlementReadinessUseCase } = await import(
      '../../../../application/report/use_cases/getSettlementReadinessUseCase'
    );
    const { previewFinancialReportsWorkflow } = await import(
      '../../../../application/report/use_cases/previewFinancialReportsWorkflow'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );

    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      isReady: true,
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

    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(buildPreviewResult());
  });

  it('treats zero active projects as settled and loads the summary', async () => {
    const { getSettlementReadinessUseCase } = await import(
      '../../../../application/report/use_cases/getSettlementReadinessUseCase'
    );
    const { previewFinancialReportsWorkflow } = await import(
      '../../../../application/report/use_cases/previewFinancialReportsWorkflow'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );
    const yearMonth = getCurrentYearMonth();
    const [year, month] = yearMonth.split('-').map(Number);

    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year,
      month,
      isReady: true,
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
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(buildPreviewResult());

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
    expect(getSettlementReadinessUseCase.execute).toHaveBeenCalledWith({
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
      auth: { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false },
    });
    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: 'household-1', year, month }),
    );
  });

  it('blocks summary loading when any account, portfolio, debt, or project is unsettled', async () => {
    const { previewFinancialReportsWorkflow } = await import(
      '../../../../application/report/use_cases/previewFinancialReportsWorkflow'
    );
    const { getSettlementReadinessUseCase } = await import(
      '../../../../application/report/use_cases/getSettlementReadinessUseCase'
    );

    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      isReady: false,
      unsettledAccounts: [{ id: 'a2', name: 'Account 2' } as never],
      unsettledPortfolios: [{ id: 'p2', name: 'Portfolio 2' } as never],
      unsettledDebts: [{ id: 'd2', name: 'Debt 2' } as never],
      unsettledProjects: [{ id: 'project-2', name: 'Project 2' } as never],
      totalUnsettled: 4,
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
    expect(previewFinancialReportsWorkflow.execute).not.toHaveBeenCalled();
  });

  it('loads the summary only when all active projects are settled', async () => {
    const { getSettlementReadinessUseCase } = await import(
      '../../../../application/report/use_cases/getSettlementReadinessUseCase'
    );
    const { previewFinancialReportsWorkflow } = await import(
      '../../../../application/report/use_cases/previewFinancialReportsWorkflow'
    );
    const { previewDebtSettlementsUseCase } = await import(
      '../../../../application/settlement/use_cases/previewDebtSettlementsUseCase'
    );
    const yearMonth = getCurrentYearMonth();
    const [year, month] = yearMonth.split('-').map(Number);

    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year,
      month,
      isReady: true,
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
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      buildPreviewResult({
        isPersisted: true,
        timestamps: { incomeStatement: '10:30', balanceSheet: '10:30', cashFlow: '10:30' },
      }),
    );

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
    expect(result.current.reportTimestamps).toEqual({
      incomeStatement: '10:30',
      balanceSheet: '10:30',
      cashFlow: '10:30',
    });
    expect(result.current.unsettledProjectNames).toEqual([]);
    expect(getSettlementReadinessUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      year,
      month,
    });
    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: 'household-1', year, month }),
    );
  });

  it('uses unified report label resolver with fallback support', async () => {
    const { previewFinancialReportsWorkflow } = await import(
      '../../../../application/report/use_cases/previewFinancialReportsWorkflow'
    );

    renderHook(() => useReportSettlement('household-1', 'user@example.com'));

    await waitFor(() => {
      expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalled();
    });

    const resolver = vi.mocked(previewFinancialReportsWorkflow.execute).mock.calls[0]?.[0]
      ?.labelResolver;
    expect(typeof resolver).toBe('function');

    const resolveLabel = resolver as (code: string, fallbackLabel?: string) => string;
    expect(resolveLabel('income:salary')).toBe('薪資');
    expect(resolveLabel('unknown:code', '自訂分類')).toBe('自訂分類');
  });
});
