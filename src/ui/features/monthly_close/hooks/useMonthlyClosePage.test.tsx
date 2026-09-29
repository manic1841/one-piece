import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type CloseStageId, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
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

// T9 (#233) has no live implementer: every stage's `shouldBlock` returns null,
// so the refusal path is driven here by a faked stage controller.
const BLOCKED_REASON = '尚有未結算的專案，請先完成專案結算';

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
      shouldBlock: () =>
        stageId === 'PROJECT_SETTLEMENT'
          ? { blocked: true as const, reason: BLOCKED_REASON }
          : null,
      afterConfirm: vi.fn(),
      resetDraft: vi.fn(),
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

describe('useMonthlyClosePage (blocked confirm)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('shows the stage reason and submits nothing when a stage blocks', async () => {
    const result = await renderPage();

    await act(async () => {
      await result.current.handleConfirmStage('PROJECT_SETTLEMENT');
    });

    expect(result.current.blockedReason).toBe(BLOCKED_REASON);
    expect(monthlyCloseWorkflowUseCase.confirmStage).not.toHaveBeenCalled();
  });

  it('clears the reason once the stage is no longer the displayed one', async () => {
    const result = await renderPage();

    await act(async () => {
      await result.current.handleConfirmStage('PROJECT_SETTLEMENT');
    });
    expect(result.current.blockedReason).toBe(BLOCKED_REASON);

    act(() => {
      result.current.setViewingStageId('ACCOUNT_BALANCE' as CloseStageId);
    });

    expect(result.current.blockedReason).toBeNull();
  });

  it('clears the reason on a month switch', async () => {
    const result = await renderPage();

    await act(async () => {
      await result.current.handleConfirmStage('PROJECT_SETTLEMENT');
    });
    expect(result.current.blockedReason).toBe(BLOCKED_REASON);

    act(() => {
      result.current.selectYearMonth('2026-10');
    });

    expect(result.current.blockedReason).toBeNull();
  });
});
