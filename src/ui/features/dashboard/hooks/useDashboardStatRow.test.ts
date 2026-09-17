import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/debt/use_cases/getNextMonthDebtDueUseCase', () => ({
  getNextMonthDebtDueUseCase: {
    execute: vi.fn(),
  },
}));

import { useDashboardStatRow } from './useDashboardStatRow';
import { getNextMonthDebtDueUseCase } from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';

describe('useDashboardStatRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads next-month debt due and returns loading state', async () => {
    vi.mocked(getNextMonthDebtDueUseCase.execute).mockResolvedValue({
      total: 420,
      yearMonth: '2026-10',
    });

    const { result } = renderHook(() => useDashboardStatRow('household-1'));

    await waitFor(() =>
      expect(result.current.nextMonthDue).toEqual({ total: 420, yearMonth: '2026-10' }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getNextMonthDebtDueUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
    });
  });

  it('returns null next-month due on load failure without throwing', async () => {
    vi.mocked(getNextMonthDebtDueUseCase.execute).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useDashboardStatRow('household-1'));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.nextMonthDue).toBeNull();
  });

  it('does not load when householdId is undefined', async () => {
    renderHook(() => useDashboardStatRow(undefined));

    await act(async () => {});

    expect(getNextMonthDebtDueUseCase.execute).not.toHaveBeenCalled();
  });
});
