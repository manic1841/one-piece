import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAccountListController } from './useAccountListController';
import { type AccountFetchOptions } from './useAccounts';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      householdId: 'household-1',
    },
  }),
}));

const fetchAccountsWithSnapshots = vi.fn();
const { createAccount, reorderAccounts } = vi.hoisted(() => ({
  createAccount: vi.fn().mockResolvedValue({ ok: true, value: 'acc-new' }),
  reorderAccounts: vi
    .fn<(orders: Array<{ id: string; order: number }>) => Promise<void>>()
    .mockResolvedValue(undefined),
}));

vi.mock('@/ui/features/account/hooks/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccounts: vi.fn(),
    fetchAccountsWithSnapshots,
    loading: false,
    error: null,
    errorMessage: null,
  }),
}));

vi.mock('@/ui/features/account/hooks/useAccountCmds', () => ({
  useAccountCmds: () => ({
    createAccount,
    reorderAccounts,
    loading: false,
    error: null,
    errorMessage: null,
  }),
}));

const accountWithSnapshot = (id: string, name: string, order: number, category = 'bank') => ({
  id,
  name,
  category: category as 'bank',
  currency: 'TWD',
  order,
  isActive: true,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  snapshot: null,
});

/** Three bank rows so a section reorder has to be merged into a longer sequence. */
const accountsFixture = [
  accountWithSnapshot('a1', 'First', 0),
  accountWithSnapshot('a2', 'Second', 1),
  accountWithSnapshot('a3', 'Third', 2),
];

const setFetchedAccounts = (accounts: typeof accountsFixture): void => {
  fetchAccountsWithSnapshots.mockImplementation(
    async (_householdId, _auth, options?: AccountFetchOptions<typeof accountsFixture>) => {
      options?.writeBack?.(accounts);
      return { ok: true, value: accounts };
    },
  );
};

describe('useAccountListController', () => {
  it('exposes only the rows/create/reorder/view-filter surface', async () => {
    setFetchedAccounts(accountsFixture);

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(3);
    });

    expect(Object.keys(result.current).sort()).toEqual([
      'activeCount',
      'closeForm',
      'create',
      'error',
      'isFormOpen',
      'loading',
      'openForm',
      'reload',
      'reorderRows',
      'rows',
      'setShowInactive',
      'showInactive',
      'totalBalance',
    ]);
  });

  it('reorderRows persists the full order sequence', async () => {
    let committed = accountsFixture;

    fetchAccountsWithSnapshots.mockImplementation(async (_householdId, _auth, options) => {
      options?.writeBack?.(committed);
      return { ok: true, value: committed };
    });
    // The refetch after a reorder returns the accounts with their persisted
    // order, so the mock must apply the new order values too.
    reorderAccounts.mockImplementation(async (orders) => {
      committed = orders.map((entry) => ({
        ...accountsFixture.find((account) => account.id === entry.id)!,
        order: entry.order,
      }));
    });

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(3);
    });

    const [first, second, third] = result.current.rows;
    await act(async () => {
      result.current.reorderRows([third, first, second]);
    });

    expect(reorderAccounts).toHaveBeenCalledWith([
      { id: 'a3', order: 0 },
      { id: 'a1', order: 1 },
      { id: 'a2', order: 2 },
    ]);
    await waitFor(() => {
      expect(result.current.rows.map((row) => row.id)).toEqual(['a3', 'a1', 'a2']);
    });
  });

  it('reorderRows merges a section-only reorder back into the global order', async () => {
    // a0 is a cash row: its slot must survive a bank-only reorder.
    const mixed = [accountWithSnapshot('a0', 'Wallet', 0, 'cash'), ...accountsFixture];
    setFetchedAccounts(mixed);

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(4);
    });

    const bankRows = result.current.rows.filter((row) => row.category === 'bank');
    await act(async () => {
      result.current.reorderRows([bankRows[2], bankRows[0], bankRows[1]]);
    });

    expect(reorderAccounts).toHaveBeenCalledWith([
      { id: 'a0', order: 0 },
      { id: 'a3', order: 1 },
      { id: 'a1', order: 2 },
      { id: 'a2', order: 3 },
    ]);
  });

  it('ignores a reorder whose rows do not belong to the loaded list', async () => {
    setFetchedAccounts(accountsFixture);

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(3);
    });

    reorderAccounts.mockClear();
    await act(async () => {
      result.current.reorderRows([{ ...result.current.rows[0], id: 'ghost' }]);
    });

    expect(reorderAccounts).not.toHaveBeenCalled();
  });
});
