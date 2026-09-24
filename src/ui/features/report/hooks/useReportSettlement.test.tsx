import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSettlementStatusWorkflow } from '@/application/report/use_cases/getSettlementStatusWorkflow';

import { useReportSettlement } from './useReportSettlement';

vi.mock('@/application/report/use_cases/getSettlementStatusWorkflow', () => ({
  getSettlementStatusWorkflow: { execute: vi.fn() },
}));

// A stable identity on purpose: `useAuthIdentity` memoises on `user`, so a mock
// that builds a fresh object per call would give the hook a new `auth` on every
// render and its load effect would chase itself.
const { authState } = vi.hoisted(() => ({
  authState: { user: { uid: 'user-1', email: 'user@example.com' }, isAdmin: false },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => authState,
}));

const mockExecute = vi.mocked(getSettlementStatusWorkflow.execute);

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const buildReports = (overrides?: {
  isPersisted?: boolean;
  timestamps?: { incomeStatement?: string; balanceSheet?: string; cashFlow?: string };
}) =>
  ({
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
  }) as never;

const buildStatus = (options?: {
  isReady?: boolean;
  unsettled?: {
    accounts?: { name: string }[];
    portfolios?: { name: string }[];
    debts?: { name: string }[];
    projects?: { name: string }[];
  };
  reports?: unknown;
  missingRepaymentAccountNames?: string[];
}) => {
  const yearMonth = getCurrentYearMonth();
  const [year, month] = yearMonth.split('-').map(Number);
  const isReady = options?.isReady ?? true;

  return {
    year,
    month,
    debtPreview: {
      year,
      month,
      yearMonth,
      items: [],
      hasMissingRepayments: (options?.missingRepaymentAccountNames?.length ?? 0) > 0,
      missingRepaymentAccountNames: options?.missingRepaymentAccountNames ?? [],
    },
    readiness: {
      year,
      month,
      isReady,
      unsettledAccounts: options?.unsettled?.accounts ?? [],
      unsettledPortfolios: options?.unsettled?.portfolios ?? [],
      unsettledDebts: options?.unsettled?.debts ?? [],
      unsettledProjects: options?.unsettled?.projects ?? [],
      totalUnsettled: 0,
    },
    reports: isReady ? (options?.reports ?? buildReports()) : null,
  } as never;
};

const currentYearMonth = () => {
  const [year, month] = getCurrentYearMonth().split('-').map(Number);
  return { year, month };
};

describe('useReportSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(buildStatus());
  });

  it('treats zero active projects as settled and loads the summary', async () => {
    const { year, month } = currentYearMonth();
    const { result } = renderHook(() => useReportSettlement('household-1'));

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
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: 'household-1', year, month }),
    );
  });

  it('blocks summary loading when any account, portfolio, debt, or project is unsettled', async () => {
    mockExecute.mockResolvedValue(
      buildStatus({
        isReady: false,
        unsettled: {
          accounts: [{ name: 'Account 2' }],
          portfolios: [{ name: 'Portfolio 2' }],
          debts: [{ name: 'Debt 2' }],
          projects: [{ name: 'Project 2' }],
        },
      }),
    );

    const { result } = renderHook(() => useReportSettlement('household-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.reportsGenerated).toBe(false);
    expect(result.current.unsettledProjectNames).toEqual(['Project 2']);
    expect(result.current.unsettledAccountNames).toEqual(['Account 2']);
    expect(result.current.unsettledPortfolioNames).toEqual(['Portfolio 2']);
    expect(result.current.unsettledDebtNames).toEqual(['Debt 2']);
  });

  it('loads the summary only when all active projects are settled', async () => {
    mockExecute.mockResolvedValue(
      buildStatus({
        reports: buildReports({
          isPersisted: true,
          timestamps: { incomeStatement: '10:30', balanceSheet: '10:30', cashFlow: '10:30' },
        }),
      }),
    );

    const { result } = renderHook(() => useReportSettlement('household-1'));

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
  });

  it('surfaces the debts with no repayment record as warnings', async () => {
    mockExecute.mockResolvedValue(
      buildStatus({ missingRepaymentAccountNames: ['Loan A', 'Loan B'] }),
    );

    const { result } = renderHook(() => useReportSettlement('household-1'));

    await waitFor(() => {
      expect(result.current.debtNoRepaymentWarningNames).toEqual(['Loan A', 'Loan B']);
    });
  });

  it('shows its own copy when the load fails, not the raw failure', async () => {
    mockExecute.mockRejectedValue(new Error('permission-denied'));

    const { result } = renderHook(() => useReportSettlement('household-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('無法載入結算狀態，請稍後再試。');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('uses unified report label resolver with fallback support', async () => {
    renderHook(() => useReportSettlement('household-1'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
    });

    const resolver = mockExecute.mock.calls[0]?.[0]?.labelResolver;
    expect(typeof resolver).toBe('function');

    const resolveLabel = resolver as (code: string, fallbackLabel?: string) => string;
    expect(resolveLabel('income:salary')).toBe('薪資');
    expect(resolveLabel('unknown:code', '自訂分類')).toBe('自訂分類');
  });
});
