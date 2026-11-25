import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AccountCreate, type AccountWithSnapshot } from '@/domains/account/types/account';
import { ACCOUNT_FORM_LABELS } from '@/ui/constants/account/formLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import {
  type AccountRowVM,
  accountTotalBalance,
  toAccountRowVM,
} from '@/ui/features/account/viewmodels/accountList.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { mergeReorderedIds } from '@/ui/utils/reorder';

const byOrder = (a: AccountWithSnapshot, b: AccountWithSnapshot): number =>
  (a.order ?? 0) - (b.order ?? 0);

/** Owns list data and presentation state; the application layer owns workflows. */
export function useAccountListController() {
  const { userProfile } = useAuthState();
  const auth = useAuthIdentity();
  const householdId = userProfile?.householdId || '';

  const { fetchAccountsWithSnapshots, loading, error } = useAccounts();
  const { createAccount, reorderAccounts } = useAccountCmds(householdId);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [hasLoadedInactive, setHasLoadedInactive] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const loadAccounts = useCallback(
    async (includeInactive: boolean) => {
      // The signal discards older responses; it does not cancel Firestore I/O.
      requestRef.current?.abort();
      const request = new AbortController();
      requestRef.current = request;

      if (!householdId) return;
      return fetchAccountsWithSnapshots(
        householdId,
        auth,
        {
          includeInactive,
          writeBack: (accounts) => {
            if (includeInactive) setHasLoadedInactive(true);
            setLocalAccounts([...accounts].sort(byOrder));
          },
        },
        request.signal,
      );
    },
    [householdId, auth, fetchAccountsWithSnapshots],
  );

  useEffect(() => {
    void loadAccounts(false);
  }, [loadAccounts]);

  const toggleInactive = useCallback(
    (next: boolean) => {
      setShowInactive(next);
      if (next && !hasLoadedInactive) void loadAccounts(true);
    },
    [hasLoadedInactive, loadAccounts],
  );

  const rows = useMemo<AccountRowVM[]>(() => localAccounts.map(toAccountRowVM), [localAccounts]);
  const totalBalance = useMemo(() => accountTotalBalance(rows), [rows]);
  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);

  const reload = useCallback(
    () => loadAccounts(showInactive || hasLoadedInactive),
    [loadAccounts, showInactive, hasLoadedInactive],
  );

  const create = useCallback(
    async (data: AccountCreate) => {
      // The application layer reads all accounts to append, not this filtered list.
      const result = await createAccount(data);
      if (!result.ok) throw new Error(ACCOUNT_FORM_LABELS.SAVE_ERROR);
      setIsFormOpen(false);
      await reload();
    },
    [createAccount, reload],
  );

  const reorderRows = useCallback(
    (orderedRows: AccountRowVM[]) => {
      // Never renumber an active-only subset: inactive rows would keep the same
      // slots. The UI disables drag until the complete list has loaded.
      if (!hasLoadedInactive) return;

      const byId = new Map(localAccounts.map((account) => [account.id, account]));
      if (!orderedRows.every((row) => byId.has(row.id))) return;

      const mergedIds = mergeReorderedIds(
        localAccounts.map((account) => account.id),
        orderedRows.map((row) => row.id),
      );
      const ordered = mergedIds
        .map((id) => byId.get(id))
        .filter((account): account is AccountWithSnapshot => account !== undefined);

      setLocalAccounts(ordered);
      void reorderAccounts(
        ordered.map((account, index) => ({ id: account.id, order: index })),
      ).then(() => reload());
    },
    [localAccounts, hasLoadedInactive, reorderAccounts, reload],
  );

  const openForm = useCallback(() => setIsFormOpen(true), []);
  const closeForm = useCallback(() => setIsFormOpen(false), []);

  return {
    loading,
    error,
    rows,
    totalBalance,
    activeCount,
    reload,
    create,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    setShowInactive: toggleInactive,
    canReorder: hasLoadedInactive,
    reorderRows,
  };
}
