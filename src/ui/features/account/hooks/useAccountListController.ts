import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type Account,
  type AccountCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types/account';
import { useAuth } from '@/infra/contexts/useAuth';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccountExport } from '@/ui/features/account/hooks/useAccountExport';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';

export function useAccountListController() {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';

  const { fetchAccountsWithSnapshots, loading: loadingAccounts } = useAccounts();
  const { createAccount, reorderAccounts, updateAccount } = useAccountCmds(householdId);
  const { exportToCSV, importFromCSV } = useAccountExport();

  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [snapshotAccountId, setSnapshotAccountId] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAccounts = useCallback(async () => {
    if (!householdId) return;

    const data = await fetchAccountsWithSnapshots(householdId, {
      uid: userProfile?.uid || '',
      isGlobalAdmin: false,
    });
    setAccounts(data);
    setLocalAccounts(data);
  }, [householdId, fetchAccountsWithSnapshots, userProfile?.uid]);

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

  const handleUpdate = useCallback(
    async (data: AccountCreate) => {
      if (!editingAccount) return;

      await updateAccount(editingAccount.id, data);
      setEditingAccount(null);
      await loadAccounts();
    },
    [editingAccount, updateAccount, loadAccounts],
  );

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const result = await importFromCSV(file);
      setImporting(false);

      if (result.errors.length > 0) {
        alert(
          `匯入完成。成功: ${result.success}, 失敗: ${result.failed}\n\n錯誤資訊:\n${result.errors.join('\n')}`,
        );
      } else {
        alert(`匯入成功！共 ${result.success} 筆紀錄`);
      }

      if (result.success > 0) {
        await loadAccounts();
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importFromCSV, loadAccounts],
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
    editingAccount,
    setEditingAccount,
    snapshotAccountId,
    setSnapshotAccountId,
    historyAccountId,
    setHistoryAccountId,
    fileInputRef,
    importing,
    exportToCSV,
    handleCreate,
    handleUpdate,
    handleImport,
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
