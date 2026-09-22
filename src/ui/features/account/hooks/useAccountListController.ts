import { useCallback, useEffect, useState } from 'react';

import {
  type AccountCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types/account';
import { useAuth } from '@/infra/contexts/useAuth';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export function useAccountListController() {
  const { userProfile } = useAuth();
  const auth = useAuthContext();
  const householdId = userProfile?.householdId || '';

  const { fetchAccountsWithSnapshots, loading: loadingAccounts } = useAccounts();
  const { createAccount, reorderAccounts } = useAccountCmds(householdId);

  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);
  const [snapshotAccountId, setSnapshotAccountId] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!householdId) return;

    const data = await fetchAccountsWithSnapshots(
      householdId,
      auth,
      { includeInactive: true },
    );
    setAccounts(data);
    setLocalAccounts(data);
  }, [householdId, fetchAccountsWithSnapshots, auth]);

  useEffect(() => {
    const init = async () => {
      await loadAccounts();
    };
    init();
  }, [loadAccounts]);

  const handleCreate = useCallback(
    async (data: AccountCreate) => {
      await createAccount(data);
      setShowForm(false);
      await loadAccounts();
    },
    [createAccount, loadAccounts],
  );

  const moveAccount = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setLocalAccounts((prev) => {
      const sourceIndex = prev.findIndex((account) => account.id === sourceId);
      const targetIndex = prev.findIndex((account) => account.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const next = [...prev];
      const [movedAccount] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedAccount);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggedAccountId(id);
    setDragOverAccountId(id);
  }, []);

  const handleDragEnter = useCallback(
    (id: string) => {
      if (!draggedAccountId || draggedAccountId === id) return;
      setDragOverAccountId(id);
    },
    [draggedAccountId],
  );

  const handleDrop = useCallback(
    (id: string) => {
      if (!draggedAccountId) return;
      moveAccount(draggedAccountId, id);
      setDraggedAccountId(null);
      setDragOverAccountId(null);
    },
    [draggedAccountId, moveAccount],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedAccountId(null);
    setDragOverAccountId(null);
  }, []);

  const saveOrder = useCallback(async () => {
    const accountOrders = localAccounts.map((account, index) => ({
      id: account.id,
      order: index,
    }));

    await reorderAccounts(accountOrders);
    setIsReorderMode(false);
    setDraggedAccountId(null);
    setDragOverAccountId(null);
    await loadAccounts();
  }, [localAccounts, reorderAccounts, loadAccounts]);

  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setLocalAccounts(accounts);
    setDraggedAccountId(null);
    setDragOverAccountId(null);
  }, [accounts]);

  const closeSnapshotEditor = useCallback(async () => {
    setSnapshotAccountId(null);
    await loadAccounts();
  }, [loadAccounts]);

  const closeHistoryDialog = useCallback(async () => {
    setHistoryAccountId(null);
    await loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    localAccounts,
    loadingAccounts,
    showForm,
    setShowForm,
    isReorderMode,
    setIsReorderMode,
    draggedAccountId,
    dragOverAccountId,
    snapshotAccountId,
    setSnapshotAccountId,
    historyAccountId,
    setHistoryAccountId,
    handleCreate,
    handleDragStart,
    handleDragEnter,
    handleDrop,
    handleDragEnd,
    saveOrder,
    cancelReorderMode,
    closeSnapshotEditor,
    closeHistoryDialog,
  };
}
