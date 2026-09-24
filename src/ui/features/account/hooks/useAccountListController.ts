import { useCallback, useEffect, useState } from 'react';

import {
  type AccountCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types/account';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

export function useAccountListController() {
  const { userProfile } = useAuthState();
  const auth = useAuthIdentity();
  const householdId = userProfile?.householdId || '';

  const { fetchAccountsWithSnapshots, loading: loadingAccounts } = useAccounts();
  const { createAccount, reorderAccounts } = useAccountCmds(householdId);

  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [showForm, setShowForm] = useState(false);
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

  const handleReorder = useCallback(
    (ordered: AccountWithSnapshot[]) => {
      const baseIds = new Set(localAccounts.map((account) => account.id));
      if (
        ordered.length !== localAccounts.length ||
        !ordered.every((account) => baseIds.has(account.id))
      ) {
        return;
      }

      setLocalAccounts(ordered);
      void reorderAccounts(
        ordered.map((account, index) => ({ id: account.id, order: index })),
      ).then(() => loadAccounts());
    },
    [localAccounts, reorderAccounts, loadAccounts],
  );

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
    snapshotAccountId,
    setSnapshotAccountId,
    historyAccountId,
    setHistoryAccountId,
    handleCreate,
    handleReorder,
    closeSnapshotEditor,
    closeHistoryDialog,
  };
}
