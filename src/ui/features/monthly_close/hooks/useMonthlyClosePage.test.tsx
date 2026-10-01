import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { initialStageStates } from '@/domains/financial_period/schemas';

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
    'TRANSACTION_VALIDATION',
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
function periodAwaitingProjectSettlement() {
  const stages = initialStageStates();
  // The walk order is the pageVM's own (ACCOUNT_BALANCE, TRANSACTION_VALIDATION,
  // SECURITIES_TRADE, PORTFOLIO_CASH_FLOW, ...), so PROJECT_SETTLEMENT is the
  // current stage once everything ahead of it is completed.
  const done = [
    'ACCOUNT_BALANCE',
    'TRANSACTION_VALIDATION',
    'SECURITIES_TRADE',
    'PORTFOLIO_CASH_FLOW',
  ] as const;
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
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(
      periodAwaitingProjectSettlement() as never,
    );
  });

  const renderPage = async () => {
    const { result } = renderHook(() => useMonthlyClosePage({}));
    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.displayedStageId).toBe('PROJECT_SETTLEMENT'));
    return result;
  };

  // #237: `refreshAll` is the page's one refresh entry — every stage that opted
  // in, and no call site has to know which stage owns which loaded data.
  it('refreshes every stage after a reset-navigation', async () => {
    const result = await renderPage();
    refreshSpy.mockClear();

    await act(async () => {
      await result.current.handleGoToStageWithReset('ACCOUNT_BALANCE');
    });

    expect(monthlyCloseWorkflowUseCase.resetStagesFrom).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledTimes(9);
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
    expect(refreshSpy).toHaveBeenCalledTimes(9);
  });

  // #250: the page dispatches the result back to the stage that produced it, as
  // that stage's own slice.
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
});
