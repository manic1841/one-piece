import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

const { authIdentity, refreshSpy, confirmMock, afterConfirmSpy } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  refreshSpy: vi.fn().mockResolvedValue(undefined),
  confirmMock: vi.fn(),
  afterConfirmSpy: vi.fn(),
}));

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
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
vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./useCloseStepRegistry', () => {
  const stageIds = [
    'ACCOUNT_BALANCE',
    'SECURITIES_TRADE',
    'PORTFOLIO_CASH_FLOW',
    'PROJECT_SETTLEMENT',
    'DEBT_REPAYMENT',
    'COMPLETENESS_CHECK',
    'FINANCIAL_REPORTS',
    'CLOSE_PERIOD',
  ] as const;
  const step = (stageId: (typeof stageIds)[number]) => ({
    control: {
      stageId,
      confirming: false,
      buildRequest: () => ({ stageId }) as never,
      afterConfirm: afterConfirmSpy,
      refresh: refreshSpy,
    },
    render: () => null,
    evidence: () => ({ kind: 'NONE' as const }),
  });
  return {
    useCloseStepRegistry: () =>
      Object.fromEntries(stageIds.map((stageId) => [stageId, step(stageId)])),
  };
});

/** A live period whose current stage is PROJECT_SETTLEMENT. */
function periodAwaitingProjectSettlement(): FinancialPeriod {
  const stages = initialStageStates();
  // PROJECT_SETTLEMENT is current once everything ahead of it in the walk is done.
  const done = ['ACCOUNT_BALANCE', 'SECURITIES_TRADE', 'PORTFOLIO_CASH_FLOW'] as const;
  for (const stageId of done) {
    stages[stageId] = {
      status: 'COMPLETED',
      confirmedAt: new Date('2026-09-10T10:00:00Z'),
      confirmedBy: 'user@test.com',
    };
  }
  return {
    id: '2026-09',
    yearMonth: '2026-09',
    status: 'IN_PROGRESS',
    stages,
    reviewSourceStageId: null,
    createdBy: 'user@test.com',
    createdAt: new Date(),
    updatedBy: 'user@test.com',
    updatedAt: new Date(),
  };
}

describe('useMonthlyClosePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
  });

  const renderPage = async () => {
    const { result } = renderHook(() =>
      useMonthlyClosePage({
        householdId: 'household-1',
        userEmail: 'user@test.com',
        yearMonth: '2026-09',
        initialPeriod: periodAwaitingProjectSettlement(),
      }),
    );
    await waitFor(() => expect(result.current.displayedStageId).toBe('PROJECT_SETTLEMENT'));
    return result;
  };

  it('seeds the page VM from the period the route already resolved', async () => {
    const result = await renderPage();

    expect(result.current.yearMonth).toBe('2026-09');
    expect(result.current.pageVM.status).toBe('IN_PROGRESS');
    expect(result.current.pageVM.stages).toHaveLength(8);
  });

  // #237: `refreshAll` is the page's one refresh entry, so no call site names a stage's data.
  it('refreshes every stage after a reset-navigation', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.resetStagesFrom).mockResolvedValue(
      periodAwaitingProjectSettlement() as never,
    );
    const result = await renderPage();
    refreshSpy.mockClear();

    await act(async () => {
      await result.current.handleGoToStageWithReset('ACCOUNT_BALANCE');
    });

    expect(monthlyCloseWorkflowUseCase.resetStagesFrom).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledTimes(8);
  });

  it('refreshes every stage after a successful confirm', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue({
      stageId: 'ACCOUNT_BALANCE',
      period: periodAwaitingProjectSettlement(),
      data: undefined,
    } as never);
    const result = await renderPage();
    refreshSpy.mockClear();

    await act(async () => {
      await result.current.handleConfirmStage('ACCOUNT_BALANCE');
    });

    expect(monthlyCloseWorkflowUseCase.confirmStage).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledTimes(8);
  });

  it('dispatches the confirm result slice to the stage afterConfirm', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue({
      stageId: 'ACCOUNT_BALANCE',
      period: periodAwaitingProjectSettlement(),
      data: undefined,
    } as never);
    const result = await renderPage();
    afterConfirmSpy.mockClear();

    await act(async () => {
      await result.current.handleConfirmStage('ACCOUNT_BALANCE');
    });

    expect(afterConfirmSpy).toHaveBeenCalledWith(undefined);
  });

  it('reopens the period and refreshes every stage after the user accepts', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(monthlyCloseWorkflowUseCase.reopen).mockResolvedValue(
      periodAwaitingProjectSettlement() as never,
    );
    const result = await renderPage();
    refreshSpy.mockClear();

    await act(async () => {
      await result.current.handleReopen();
    });

    expect(monthlyCloseWorkflowUseCase.reopen).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: 'household-1', yearMonth: '2026-09' }),
    );
    expect(refreshSpy).toHaveBeenCalledTimes(8);
  });

  it('does not reopen when the user declines the confirmation', async () => {
    confirmMock.mockResolvedValue(false);
    const result = await renderPage();
    refreshSpy.mockClear();

    await act(async () => {
      await result.current.handleReopen();
    });

    expect(monthlyCloseWorkflowUseCase.reopen).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('surfaces a reopen failure as error text', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(monthlyCloseWorkflowUseCase.reopen).mockRejectedValue(new Error('boom'));
    const result = await renderPage();

    await act(async () => {
      await result.current.handleReopen();
    });

    expect(result.current.error).toBeTruthy();
  });
});
