import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { MonthlyClosePage } from './MonthlyClosePage';

// Hoisted and stable on purpose: the real `useAuthIdentity` is memoized, and a
// fresh identity object per render would change every stage hook's load
// callback identity and re-run its effect forever.
const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

beforeEach(() => {
  // Default: the user declines every prompt. Tests that need acceptance
  // override it per case.
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(false);
});

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn().mockResolvedValue(closedPeriod()),
    reopen: vi.fn(),
    confirmStage: vi.fn(),
    resetStagesFrom: vi.fn(),
  },
}));

vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
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
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', activities: [], anomalies: [] }),
  },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: true, timestamps: {} }),
  },
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
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: {
    execute: vi.fn().mockResolvedValue({
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
    }),
  },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: {
    execute: vi.fn().mockResolvedValue({
      incomeStatement: {
        yearMonth: '2026-09',
        incomeTotal: 0,
        expenseTotal: 0,
        netIncome: 0,
        incomeItems: [],
        expenseItems: [],
      },
      balanceSheet: {
        yearMonth: '2026-09',
        assets: { total: 0, groups: {} },
        liabilities: { total: 0, groups: {} },
        equity: { total: 0, groups: {} },
      },
      cashFlow: {
        yearMonth: '2026-09',
        operating: { label: 'operating', total: 0, inflowItems: [], outflowItems: [] },
        investing: { label: 'investing', total: 0, inflowItems: [], outflowItems: [] },
        financing: { label: 'financing', total: 0, inflowItems: [], outflowItems: [] },
        netCashChange: 0,
        beginningBalance: 0,
        endingBalance: 0,
        actualBalance: 0,
        adjustment: 0,
      },
      isPersisted: true,
      timestamps: {},
    }),
  },
}));
vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

function closedPeriod(): FinancialPeriod {
  const stages = initialStageStates();
  for (const stageId of Object.keys(stages)) {
    stages[stageId] = {
      status: 'COMPLETED',
      confirmedAt: new Date('2026-09-20T10:00:00Z'),
      confirmedBy: 'user@test.com',
    };
  }
  return {
    id: '2026-09',
    yearMonth: '2026-09',
    status: 'CLOSED',
    stages,
    reviewSourceStageId: null,
    createdBy: 'user@test.com',
    createdAt: new Date(),
    updatedBy: 'user@test.com',
    updatedAt: new Date(),
  };
}

function cascadeDemotedPeriod(): FinancialPeriod {
  return {
    ...closedPeriod(),
    status: 'NEEDS_REVIEW',
    reviewSourceStageId: null,
    stages: initialStageStates(),
  };
}

function inProgressPeriod(): FinancialPeriod {
  return {
    id: '2026-09',
    yearMonth: '2026-09',
    status: 'IN_PROGRESS',
    stages: initialStageStates(),
    reviewSourceStageId: null,
    createdBy: 'user@test.com',
    createdAt: new Date(),
    updatedBy: 'user@test.com',
    updatedAt: new Date(),
  };
}

describe('MonthlyClosePage (closed period)', () => {
  it('renders the read-only Step 9 close summary as the default view', async () => {
    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);

    const startButton = screen.getByRole('button', { name: '開始關帳' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
    });

    expect(screen.getByText('關帳總結')).toBeInTheDocument();
    expect(screen.queryByTestId('close-period-confirm')).not.toBeInTheDocument();
    expect(screen.getByText('本期已完成關帳')).toBeInTheDocument();
  });
});

describe('MonthlyClosePage (cascade-demoted period)', () => {
  it('keeps the recovery walk confirm button reachable (ADR-0066)', async () => {
    vi.mocked(
      (await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase'))
        .monthlyCloseWorkflowUseCase.start,
    ).mockResolvedValueOnce(cascadeDemotedPeriod());

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);

    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeInTheDocument();
    });
  });
});

// The completeness-check load is the observable side of `refreshAll`, so its
// call count tells us whether a confirm ran the post-confirm refresh path.
describe('MonthlyClosePage (confirm side effects)', () => {
  const completenessCalls = async () => {
    const mod = await import(
      '@/application/settlement/use_cases/checkSettlementCompletenessUseCase'
    );
    return vi.mocked(mod.checkSettlementCompletenessUseCase.execute).mock.calls.length;
  };

  it('runs no afterConfirm or refresh when confirm fails', async () => {
    const workflow = (
      await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase')
    ).monthlyCloseWorkflowUseCase;
    vi.mocked(workflow.start).mockResolvedValueOnce(inProgressPeriod());
    vi.mocked(workflow.confirmStage).mockResolvedValueOnce(null);

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);
    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    const confirmButton = await screen.findByRole('button', { name: 'CONTINUE →' });
    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(0));
    const callsBefore = await completenessCalls();

    fireEvent.click(confirmButton);
    await waitFor(() => expect(workflow.confirmStage).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    expect(await completenessCalls()).toBe(callsBefore);
  });

  it('refreshes stage data when confirm succeeds', async () => {
    const workflow = (
      await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase')
    ).monthlyCloseWorkflowUseCase;
    const completed = inProgressPeriod();
    completed.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedAt: new Date('2026-09-20T10:00:00Z'),
      confirmedBy: 'user@test.com',
    };
    vi.mocked(workflow.start).mockResolvedValueOnce(inProgressPeriod());
    vi.mocked(workflow.confirmStage).mockResolvedValueOnce(completed);

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);
    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    const confirmButton = await screen.findByRole('button', { name: 'CONTINUE →' });
    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(0));
    const callsBefore = await completenessCalls();

    fireEvent.click(confirmButton);
    await waitFor(() => expect(workflow.confirmStage).toHaveBeenCalled());

    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(callsBefore));
  });

  // T13 (#237): start and reopen also land on a new period, so both must go
  // through the same page-level `refreshAll` as a confirm does — otherwise the
  // stages keep rendering the period that was open before.
  it('refreshes stage data after start', async () => {
    const workflow = (
      await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase')
    ).monthlyCloseWorkflowUseCase;
    vi.mocked(workflow.start).mockResolvedValueOnce(inProgressPeriod());

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);
    const before = await completenessCalls();

    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(before));
  });

  it('refreshes stage data again after a confirmed reopen', async () => {
    const workflow = (
      await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase')
    ).monthlyCloseWorkflowUseCase;
    // A CLOSED period offers the reopen prompt; accepting it must refresh too.
    confirmMock.mockResolvedValue(true);
    vi.mocked(workflow.start).mockResolvedValueOnce(closedPeriod());
    vi.mocked(workflow.reopen).mockResolvedValueOnce(inProgressPeriod());

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);
    const before = await completenessCalls();
    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    await waitFor(() => expect(workflow.reopen).toHaveBeenCalled());
    // Start refreshes once; the accepted reopen must refresh a second time, so
    // the delta has to be more than the single round start already produced.
    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(before + 1));
  });
});

// T7 (#231): the shared entity lists feed every stage's dropdowns and prefill.
// A failed read used to leave the page silently empty, so it gets its own copy.
describe('MonthlyClosePage (shared entity load failure)', () => {
  it('surfaces a failed entity load instead of an empty page', async () => {
    const accounts = await import('@/application/account/use_cases/getAccountsUseCase');
    vi.mocked(accounts.getAccountsUseCase.execute).mockRejectedValueOnce(new Error('boom'));

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);

    expect(
      await screen.findByText('無法載入帳戶、專案與債務資料，請稍後再試。'),
    ).toBeInTheDocument();
  });
});
