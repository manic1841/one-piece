import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

// Issue #240: entering a month that has no loaded period must issue no close
// reads at all; the nine stage auto-loads and the shared entity lists start only
// once the month's period exists. This seam is `useMonthlyClosePage` observed at
// the application use-case boundary, with the real registry and stage hooks in
// place so the gate's reach across every stage is what is under test.

// Hoisted and stable on purpose: the real `useAuthIdentity` is memoized, and a
// fresh identity object per render would change every stage hook's load
// callback identity and re-run its effect forever.
const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'household-1', email: 'user@test.com' } }),
}));
vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn(),
    reopen: vi.fn(),
    confirmStage: vi.fn(),
    resetStagesFrom: vi.fn(),
  },
}));

// Shared entity lists: non-empty so each entity-dependent stage prefill is
// observable at the use-case boundary.
vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'acc-1' }]) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'p-1', name: '長期' }]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: {
    execute: vi.fn().mockResolvedValue([{ id: 'proj-1', name: '裝修', isActive: true }]),
  },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'debt-1' }]) },
}));

// Per-stage loads.
vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase', () => ({
  getMonthInvestmentFinancingUseCase: {
    execute: vi.fn().mockResolvedValue({
      buys: [],
      sells: [],
      shareholderFinancing: [],
      dividendPayout: [],
    }),
  },
}));
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', activities: [], anomalies: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/report/use_cases/getStoredReportsBundleUseCase', () => ({
  getStoredReportsBundleUseCase: {
    execute: vi.fn().mockResolvedValue({
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    }),
  },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: false, timestamps: {} }),
  },
}));

const readinessFixture = {
  year: 2026,
  month: 9,
  isReady: true,
  totalAccounts: 0,
  totalPortfolios: 0,
  totalDebts: 0,
  totalProjects: 0,
  unsettledAccounts: [],
  unsettledPortfolios: [],
  unsettledDebts: [],
  unsettledProjects: [],
  totalUnsettled: 0,
};

/** Every read a loaded month issues: the shared entities and the nine stages. */
const closeReads = [
  // Shared entities.
  getAccountsUseCase,
  listPortfoliosUseCase,
  listProjectsUseCase,
  listDebtAccountsUseCase,
  // ACCOUNT_BALANCE.
  getAccountSnapshotsUseCase,
  getPreviousSnapshotUseCase,
  // SECURITIES_TRADE.
  getMonthInvestmentFinancingUseCase,
  // PORTFOLIO_CASH_FLOW.
  listPortfolioSnapshotsUseCase,
  // PROJECT_SETTLEMENT (listProjectsUseCase is shared with the entities above).
  listProjectSnapshotsUseCase,
  // DEBT_REPAYMENT.
  previewDebtSettlementsUseCase,
  // TRANSACTION_VALIDATION.
  validateMonthTransactionsUseCase,
  // COMPLETENESS_CHECK.
  checkSettlementCompletenessUseCase,
  getSettlementReadinessUseCase,
  // FINANCIAL_REPORTS.
  listAllLedgerCodesUseCase,
  previewFinancialReportsWorkflow,
  getStoredReportsBundleUseCase,
  getReportPersistenceStateUseCase,
];

/** Reads owned by exactly one stage — a duplicate effect would double these. */
const singleOwnerReads = [
  getMonthInvestmentFinancingUseCase,
  validateMonthTransactionsUseCase,
  checkSettlementCompletenessUseCase,
  getSettlementReadinessUseCase,
  listAllLedgerCodesUseCase,
  previewFinancialReportsWorkflow,
  getStoredReportsBundleUseCase,
  getReportPersistenceStateUseCase,
];

const inProgressPeriod = (): FinancialPeriod => ({
  id: '2026-09',
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  reviewSourceStageId: null,
  createdBy: 'user@test.com',
  createdAt: new Date(),
  updatedBy: 'user@test.com',
  updatedAt: new Date(),
});

const closedPeriod = (): FinancialPeriod => {
  const stages = initialStageStates();
  for (const stageId of Object.keys(stages)) {
    stages[stageId] = {
      status: 'COMPLETED',
      confirmedAt: new Date('2026-09-20T10:00:00Z'),
      confirmedBy: 'user@test.com',
    };
  }
  return { ...inProgressPeriod(), status: 'CLOSED', stages };
};

const expectNoCloseReads = () => {
  for (const read of closeReads) {
    expect(read.execute).not.toHaveBeenCalled();
  }
};

describe('useMonthlyClosePage deferred loading (#240)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readinessFixture as never);
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(inProgressPeriod() as never);
  });

  it('issues no close reads before the month is started', () => {
    renderHook(() => useMonthlyClosePage({}));

    expectNoCloseReads();
  });

  it('loads every stage exactly once after start, with no duplicate load', async () => {
    const { result } = renderHook(() => useMonthlyClosePage({}));

    await act(async () => {
      await result.current.handleStart();
    });

    await waitFor(() => expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalledTimes(1));

    for (const read of singleOwnerReads) {
      expect(read.execute).toHaveBeenCalledTimes(1);
    }
    // Entity-dependent prefills: the shared lists arrive after start, so the
    // stage reloads once with the real entities (the empty pass issues no read).
    expect(getAccountSnapshotsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getPreviousSnapshotUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listPortfolioSnapshotsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listProjectSnapshotsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(previewDebtSettlementsUseCase.execute).toHaveBeenCalledTimes(1);
    // Shared entities, loaded once by the page.
    expect(getAccountsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listPortfoliosUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listDebtAccountsUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('issues no reads when switching to another unstarted month', async () => {
    const { result } = renderHook(() => useMonthlyClosePage({}));
    await act(async () => {
      await result.current.handleStart();
    });
    await waitFor(() => expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalled());

    vi.clearAllMocks();
    act(() => {
      result.current.selectYearMonth('2026-10');
    });
    await act(async () => {});

    expectNoCloseReads();
  });

  it('still refreshes explicitly after an accepted reopen', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(closedPeriod() as never);
    vi.mocked(monthlyCloseWorkflowUseCase.reopen).mockResolvedValue(inProgressPeriod() as never);
    confirmMock.mockResolvedValue(true);

    const { result } = renderHook(() => useMonthlyClosePage({}));
    // Start the unstarted month: it returns a CLOSED period, whose reopen prompt
    // the user accepts in the same call. The reopen's `refreshAll` closes over
    // the pre-period render, so it must not be blocked by the gate.
    await act(async () => {
      await result.current.handleStart();
    });

    await waitFor(() => expect(monthlyCloseWorkflowUseCase.reopen).toHaveBeenCalled());
    // Once for the CLOSED period loading through the gate, once more for the
    // explicit refresh after the reopen.
    await waitFor(() =>
      expect(
        vi.mocked(validateMonthTransactionsUseCase.execute).mock.calls.length,
      ).toBeGreaterThanOrEqual(2),
    );
  });
});
