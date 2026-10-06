import { useCallback, useEffect, useMemo, useState } from 'react';

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

/**
 * Owns the account list's data: the rows, the drag order, the create command and
 * the view filter. The page keeps only rendering.
 */
export function useAccountListController() {
  const { userProfile } = useAuthState();
  const auth = useAuthIdentity();
  const householdId = userProfile?.householdId || '';

  const { fetchAccountsWithSnapshots, loading, error } = useAccounts();
  const { createAccount, reorderAccounts } = useAccountCmds(householdId);

  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!householdId) return;
    const result = await fetchAccountsWithSnapshots(householdId, auth, {
      includeInactive: true,
      // Written back through the task mechanism, not after `await`: a failed
      // fetch leaves the last good list on screen while `error` reports it.
      writeBack: (accounts) => setLocalAccounts([...accounts].sort(byOrder)),
    });
    return result;
  }, [householdId, auth, fetchAccountsWithSnapshots]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const rows = useMemo<AccountRowVM[]>(() => localAccounts.map(toAccountRowVM), [localAccounts]);
  const totalBalance = useMemo(() => accountTotalBalance(rows), [rows]);
  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);

  const create = useCallback(
    async (data: AccountCreate) => {
      // `order` belongs to drag, never typed: append the new account after the
      // existing ones so it lands at the end of its category section.
      const order = localAccounts.reduce((max, a) => Math.max(max, a.order ?? 0), -1) + 1;
      const result = await createAccount({ ...data, order });
      if (!result.ok) throw new Error(ACCOUNT_FORM_LABELS.SAVE_ERROR);
      setIsFormOpen(false);
      await loadAccounts();
    },
    [createAccount, loadAccounts, localAccounts],
  );

  const reorderRows = useCallback(
    (orderedRows: AccountRowVM[]) => {
      const byId = new Map(localAccounts.map((account) => [account.id, account]));
      if (!orderedRows.every((row) => byId.has(row.id))) return;

      // Sections reorder independently, but `order` is global: merge the visible
      // new order back into the full sequence so hidden rows and rows of other
      // categories keep their slots.
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
      ).then(() => loadAccounts());
    },
    [localAccounts, reorderAccounts, loadAccounts],
  );

  const openForm = useCallback(() => setIsFormOpen(true), []);
  const closeForm = useCallback(() => setIsFormOpen(false), []);

  return {
    loading,
    error,
    rows,
    totalBalance,
    activeCount,
    reload: loadAccounts,
    create,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    setShowInactive,
    reorderRows,
  };
}
