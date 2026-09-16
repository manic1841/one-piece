import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn(),
    confirmStage: vi.fn(),
  },
}));
vi.mock('@/ui/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false }),
}));

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClose } from './useMonthlyClose';

const period = () => ({
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  reviewSourceStageId: null,
  id: '2026-09',
  createdBy: 'user@test.com',
  createdAt: new Date(),
  updatedBy: 'user@test.com',
  updatedAt: new Date(),
});

describe('useMonthlyClose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the close and stores the period', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(period());

    const { result } = renderHook(() =>
      useMonthlyClose({ householdId: 'household-1', userEmail: 'user@test.com' }),
    );

    await act(async () => {
      result.current.selectYearMonth('2026-09');
    });
    await act(async () => {
      await result.current.start();
    });

    expect(monthlyCloseWorkflowUseCase.start).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-09',
      userEmail: 'user@test.com',
      auth: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
    });
    await waitFor(() => expect(result.current.pageVM.isStarted).toBe(true));
  });

  it('surfaces a start failure as error text', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useMonthlyClose({ householdId: 'household-1', userEmail: 'user@test.com' }),
    );

    await act(async () => {
      result.current.selectYearMonth('2026-09');
    });
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('delegates stage confirmation with assembled request context', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue(period());

    const { result } = renderHook(() =>
      useMonthlyClose({ householdId: 'household-1', userEmail: 'user@test.com' }),
    );

    await act(async () => {
      result.current.selectYearMonth('2026-09');
    });
    await act(async () => {
      await result.current.confirmStage({
        stageId: 'ACCOUNT_BALANCE',
        accountBalances: [{ accountId: 'a-1', amount: 100 }],
      });
    });

    expect(monthlyCloseWorkflowUseCase.confirmStage).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-09',
      userEmail: 'user@test.com',
      auth: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
      stageId: 'ACCOUNT_BALANCE',
      accountBalances: [{ accountId: 'a-1', amount: 100 }],
    });
  });

  it('selecting a new month clears the loaded period', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(period());

    const { result } = renderHook(() =>
      useMonthlyClose({ householdId: 'household-1', userEmail: 'user@test.com' }),
    );

    await act(async () => {
      result.current.selectYearMonth('2026-09');
    });
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.selectYearMonth('2026-10');
    });

    expect(result.current.period).toBeNull();
    expect(result.current.pageVM.isStarted).toBe(false);
  });
});
