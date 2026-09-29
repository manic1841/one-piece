import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';

import { useTransactionValidationStage } from './useTransactionValidationStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: { execute: vi.fn() },
}));

const mockExecute = vi.mocked(validateMonthTransactionsUseCase.execute);

const renderStage = (yearMonth = '2026-08') =>
  renderHook(
    ({ ym }: { ym: string }) =>
      useTransactionValidationStage({
        householdId: 'household-1',
        selectedYearMonth: ym,
        confirmingStageId: null,
      }),
    { initialProps: { ym: yearMonth } },
  );

describe('useTransactionValidationStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({
      yearMonth: '2026-08',
      checkedCount: 4,
      issues: [{ transactionId: 't1', description: '餐飲', reason: '分配總和不等於 100%' }],
    });
  });

  it('reports the month issue list and checked count from one validation call', async () => {
    const { result } = renderStage();

    await waitFor(() => expect(result.current.checkedCount).toBe(4));
    expect(result.current.transactionIssues).toEqual([
      { transactionId: 't1', description: '餐飲', reason: '分配總和不等於 100%' },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('clears the evidence on a month switch before the new month loads', async () => {
    const { result, rerender } = renderStage();
    await waitFor(() => expect(result.current.checkedCount).toBe(4));

    mockExecute.mockReturnValue(new Promise(() => {}));
    act(() => rerender({ ym: '2026-09' }));

    expect(result.current.transactionIssues).toEqual([]);
    expect(result.current.checkedCount).toBe(0);
  });

  it('exposes refresh so a confirm rebuilds the evidence', async () => {
    const { result } = renderStage();
    await waitFor(() => expect(result.current.checkedCount).toBe(4));

    mockExecute.mockResolvedValue({ yearMonth: '2026-08', checkedCount: 5, issues: [] });
    await act(() => result.current.refresh?.());

    expect(result.current.checkedCount).toBe(5);
  });
});
