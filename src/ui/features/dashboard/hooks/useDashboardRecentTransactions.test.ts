import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';

import { useDashboardRecentTransactions } from './useDashboardRecentTransactions';

vi.mock('@/application/ledger/use_cases/listRecentTransactionsUseCase', () => ({
  listRecentTransactionsUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
}));

const executeMock = vi.fn();

const buildTransaction = (id: string, day: number) => ({
  id,
  createdBy: 'user@example.com',
  createdAt: new Date(2026, 7, day),
  date: new Date(2026, 7, day),
  description: `Transaction ${id}`,
  intentType: 'EXPENSE',
  amount: 100 + day,
  entries: [
    { ledgerCode: 'expense:food', debit: 100 + day, credit: 0 },
    { ledgerCode: 'asset:cash', debit: 0, credit: 100 + day },
  ],
});

describe('useDashboardRecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the latest 8 transactions and maps them through the list item model', async () => {
    executeMock.mockResolvedValue([buildTransaction('tx-2', 12), buildTransaction('tx-1', 5)]);

    const { result } = renderHook(() => useDashboardRecentTransactions('household-1'));

    await waitFor(() => expect(result.current.vm.items).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.vm.items[0].id).toBe('tx-2');
    expect(result.current.vm.items[0].displayTitle).toBe('Transaction tx-2');
    expect(executeMock).toHaveBeenCalledWith({
      householdId: 'household-1',
      limit: 8,
      auth: expect.objectContaining({ uid: '' }),
    });
  });

  it('does nothing without a household', async () => {
    const { result } = renderHook(() => useDashboardRecentTransactions(undefined));

    await act(async () => {});
    expect(executeMock).not.toHaveBeenCalled();
    expect(result.current.vm.items).toHaveLength(0);
  });

  it('surfaces a load error from the constants layer', async () => {
    executeMock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDashboardRecentTransactions('household-1'));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(DASHBOARD_RECENT_LABELS.LOAD_ERROR),
    );
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.loading).toBe(false);
    expect(result.current.vm.items).toHaveLength(0);
  });
});
