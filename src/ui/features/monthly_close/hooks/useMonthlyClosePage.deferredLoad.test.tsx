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
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

// #240: mounting IS the gate now; this file asserts the fan-out is exact and unduplicated.

// Stable hoisted identity: a fresh one per render would re-run every stage load.
const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn(),
    reopen: vi.fn(),
    confirmStage: vi.fn(),
    resetStagesFrom: vi.fn(),
  },
}));

// Non-empty entities so each dependent stage's prefill is observable at the boundary.
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

const renderWorkspace = (period: FinancialPeriod = inProgressPeriod()) =>
  renderHook(() =>
    useMonthlyClosePage({
      householdId: 'household-1',
      userEmail: 'user@test.com',
      yearMonth: period.yearMonth,
      initialPeriod: period,
    }),
  );

describe('useMonthlyClosePage loading fan-out (#240)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readinessFixture as never);
  });

  it('loads every stage exactly once on mount, with no duplicate load', async () => {
    const { result } = renderWorkspace();

    await waitFor(() => expect(result.current.pageVM.status).toBe('IN_PROGRESS'));
    await waitFor(() => expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalledTimes(1));

    for (const read of singleOwnerReads) {
      expect(read.execute).toHaveBeenCalledTimes(1);
    }
    // Entity-dependent prefills load once, with the real entities already in place.
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

  it('refreshes every stage exactly once after an accepted reopen', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.reopen).mockResolvedValue(inProgressPeriod() as never);
    confirmMock.mockResolvedValue(true);

    const { result } = renderWorkspace(closedPeriod());
    // The CLOSED period loads through the normal fan-out, once.
    await waitFor(() => expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.handleReopen();
    });

    // Exactly one more round: the explicit refreshAll after the reopen.
    await waitFor(() => expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalledTimes(2));
  });
});
