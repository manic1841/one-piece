import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAccountListController } from './useAccountListController';

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
const { reorderAccounts } = vi.hoisted(() => ({
  reorderAccounts: vi.fn<(orders: Array<{ id: string; order: number }>) => Promise<void>>()
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
    createAccount: vi.fn().mockResolvedValue(undefined),
    reorderAccounts,
    loading: false,
    error: null,
    errorMessage: null,
  }),
}));

const accountWithSnapshot = (id: string, name: string, order: number) => ({
  id,
  name,
  category: 'bank' as const,
  currency: 'TWD',
  order,
  isActive: true,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  snapshot: null,
});

const accountsFixture = [
  accountWithSnapshot('a1', 'First', 0),
  accountWithSnapshot('a2', 'Second', 1),
  accountWithSnapshot('a3', 'Third', 2),
];

describe('useAccountListController', () => {
  it('exposes only the load/create/reorder surface with no dead drag state machine', async () => {
    fetchAccountsWithSnapshots.mockResolvedValue({ ok: true, value: accountsFixture });

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.localAccounts).toHaveLength(3);
    });

    const surface = Object.keys(result.current).sort();

    expect(surface).toEqual([
      'accounts',
      'closeHistoryDialog',
      'closeSnapshotEditor',
      'handleCreate',
      'handleReorder',
      'historyAccountId',
      'loadingAccounts',
      'localAccounts',
      'setHistoryAccountId',
      'setShowForm',
      'setSnapshotAccountId',
      'showForm',
      'snapshotAccountId',
    ]);
    expect(surface).not.toContain('isReorderMode');
    expect(surface).not.toContain('draggedAccountId');
    expect(surface).not.toContain('dragOverAccountId');
    expect(surface).not.toContain('handleDragStart');
    expect(surface).not.toContain('handleDragEnter');
    expect(surface).not.toContain('handleDrop');
    expect(surface).not.toContain('handleDragEnd');
    expect(surface).not.toContain('saveOrder');
    expect(surface).not.toContain('cancelReorderMode');
  });

  it('handleReorder reorders localAccounts and persists the full order sequence', async () => {
    let committed = accountsFixture;

    fetchAccountsWithSnapshots.mockImplementation(() => Promise.resolve({ ok: true, value: committed }));
    reorderAccounts.mockImplementation(async (orders) => {
      committed = orders.map((entry) =>
        accountsFixture.find((account) => account.id === entry.id)!,
      );
    });

    const { result } = renderHook(() => useAccountListController());

    await waitFor(() => {
      expect(result.current.localAccounts).toHaveLength(3);
    });

    await act(async () => {
      result.current.handleReorder([
        accountsFixture[2],
        accountsFixture[0],
        accountsFixture[1],
      ]);
    });

    expect(reorderAccounts).toHaveBeenCalledWith([
      { id: 'a3', order: 0 },
      { id: 'a1', order: 1 },
      { id: 'a2', order: 2 },
    ]);
    await waitFor(() => {
      expect(result.current.localAccounts[0].id).toBe('a3');
      expect(result.current.localAccounts[1].id).toBe('a1');
      expect(result.current.localAccounts[2].id).toBe('a2');
    });
  });
});
