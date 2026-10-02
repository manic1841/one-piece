import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { MonthlyClosePage } from './MonthlyClosePage';

// Stable hoisted identity: a fresh one per render would re-run every stage load.
const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

beforeEach(() => {
  // Default: the user declines every prompt; tests that need acceptance override it.
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(false);
});

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

const renderWorkspace = (period: FinancialPeriod = inProgressPeriod()) =>
  render(
    <MemoryRouter>
      <MonthlyClosePage
        householdId="household-1"
        userEmail="user@test.com"
        yearMonth={period.yearMonth}
        initialPeriod={period}
      />
    </MemoryRouter>,
  );

describe('MonthlyClosePage (closed period)', () => {
  it('renders the read-only Step 8 close summary as the default view', async () => {
    renderWorkspace(closedPeriod());

    await waitFor(() => {
      expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
    });

    expect(screen.getByText('關帳總結')).toBeInTheDocument();
    expect(screen.queryByTestId('close-period-confirm')).not.toBeInTheDocument();
    expect(screen.getByText('本期已完成關帳')).toBeInTheDocument();
  });

  it('offers the reopen entry only while the period is locked', async () => {
    const { unmount } = renderWorkspace(closedPeriod());
    expect(
      await screen.findByRole('button', { name: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM }),
    ).toBeInTheDocument();
    unmount();

    renderWorkspace(inProgressPeriod());
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'CONTINUE →' })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM }),
    ).not.toBeInTheDocument();
  });

  it('links back to the period picker', async () => {
    renderWorkspace(inProgressPeriod());

    const switcher = await screen.findByRole('link', { name: MONTHLY_CLOSE_LABELS.SWITCH_PERIOD });
    expect(switcher).toHaveAttribute('href', '/close');
  });
});

describe('MonthlyClosePage (cascade-demoted period)', () => {
  it('keeps the recovery walk confirm button reachable (ADR-0066)', async () => {
    renderWorkspace(cascadeDemotedPeriod());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeInTheDocument();
    });
  });
});

// The completeness-check call count is the observable side of `refreshAll`.
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
    vi.mocked(workflow.confirmStage).mockResolvedValueOnce(null);

    renderWorkspace();

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
    vi.mocked(workflow.confirmStage).mockResolvedValueOnce({
      stageId: 'ACCOUNT_BALANCE',
      period: completed,
      data: undefined,
    });

    renderWorkspace();

    const confirmButton = await screen.findByRole('button', { name: 'CONTINUE →' });
    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(0));
    const callsBefore = await completenessCalls();

    fireEvent.click(confirmButton);
    await waitFor(() => expect(workflow.confirmStage).toHaveBeenCalled());

    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(callsBefore));
  });

  // T13 (#237): mounting loads once; an accepted reopen on the same mount still refreshes.
  it('refreshes stage data again after an accepted reopen', async () => {
    const workflow = (
      await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase')
    ).monthlyCloseWorkflowUseCase;
    confirmMock.mockResolvedValue(true);
    vi.mocked(workflow.reopen).mockResolvedValueOnce(inProgressPeriod());

    renderWorkspace(closedPeriod());

    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(0));
    const before = await completenessCalls();

    fireEvent.click(
      await screen.findByRole('button', { name: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM }),
    );

    await waitFor(() => expect(workflow.reopen).toHaveBeenCalled());
    // The mount's own round plus the explicit refreshAll after the reopen.
    await waitFor(async () => expect(await completenessCalls()).toBeGreaterThan(before));
  });
});

// T7 (#231): a failed entity load must surface, not leave the page silently empty.
describe('MonthlyClosePage (shared entity load failure)', () => {
  it('surfaces a failed entity load instead of an empty page', async () => {
    const accounts = await import('@/application/account/use_cases/getAccountsUseCase');
    vi.mocked(accounts.getAccountsUseCase.execute).mockRejectedValueOnce(new Error('boom'));

    renderWorkspace();

    expect(
      await screen.findByText('無法載入帳戶、專案與債務資料，請稍後再試。'),
    ).toBeInTheDocument();
  });
});
