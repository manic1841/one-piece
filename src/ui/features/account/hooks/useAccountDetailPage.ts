import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { checkAccountMonthlyUsageUseCase } from '@/application/account/use_cases/checkAccountMonthlyUsageUseCase';
import { getAccountHistoryUseCase } from '@/application/account/use_cases/getAccountHistoryUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { type AccountSnapshot, type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { buildTrendGeometry } from '@/ui/features/account/components/detail/accountTrendGeometry';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { type HoldingRowVM, toHoldingRowVM } from '@/ui/features/account/viewmodels/account.vm';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface UseAccountDetailPageArgs {
  /** The list page passes the already-loaded row; the route passes nothing. */
  account?: AccountWithSnapshot;
}

/**
 * Owns AccountDetailPage's data: the account row, its snapshot history, the
 * holdings rows and the enable/disable command. The page keeps only rendering.
 */
export const useAccountDetailPage = ({ account }: UseAccountDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();
  const { updateAccount } = useAccountCmds(householdId);

  const [fetchedAccount, setFetchedAccount] = useState<AccountWithSnapshot | null>(null);
  const { loading, run } = useLoadingTask({ initiallyLoading: true });
  const [history, setHistory] = useState<AccountSnapshot[]>([]);
  const [statusOverride, setStatusOverride] = useState<boolean | null>(null);

  const activeAccount = account ?? fetchedAccount;
  const activeId = activeAccount?.id ?? null;

  // Adjusting state during render, not in an effect: the override is local to the
  // account it was set for, and React's documented pattern for it avoids the
  // extra render an effect would cost.
  const [overrideForId, setOverrideForId] = useState(activeId);
  if (overrideForId !== activeId) {
    setOverrideForId(activeId);
    setStatusOverride(null);
  }

  const auth = useMemo(
    () => ({ uid: userProfile?.uid ?? '', email: userProfile?.email }),
    [userProfile],
  );

  const refetchAccount = useCallback(async () => {
    if (account || !householdId) return;
    try {
      const accounts = await getAccountsWithSnapshotsUseCase.execute({
        householdId,
        auth,
        includeInactive: true,
      });
      setFetchedAccount(accounts.find((a) => a.id === id) ?? null);
    } catch {
      setFetchedAccount(null);
    }
  }, [account, householdId, id, auth]);

  const loadAccount = useCallback(async () => {
    // The guard belongs inside the task: `initiallyLoading` is released by
    // *initiating* a run, so every path must initiate one.
    await run(
      async () =>
        account || !householdId
          ? null
          : getAccountsWithSnapshotsUseCase.execute({ householdId, auth, includeInactive: true }),
      {
        writeBack: (result) =>
          setFetchedAccount(result.ok ? (result.value?.find((a) => a.id === id) ?? null) : null),
      },
    );
  }, [account, householdId, id, auth, run]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    let ignore = false;
    const loadHistory = async () => {
      if (!householdId || !id) {
        return;
      }
      try {
        const snapshots = await getAccountHistoryUseCase.execute({
          householdId,
          accountId: id,
          auth,
        });
        if (!ignore) setHistory(snapshots);
      } catch {
        if (!ignore) setHistory([]);
      }
    };
    void loadHistory();
    return () => {
      ignore = true;
    };
  }, [householdId, id, auth]);

  const trend = useMemo(
    () =>
      buildTrendGeometry(
        history.map((snapshot) => ({
          year: snapshot.year,
          month: snapshot.month,
          value: snapshot.amount,
        })),
      ),
    [history],
  );

  const holdings: HoldingRowVM[] = useMemo(() => {
    const snapshotHoldings = activeAccount?.snapshot?.holdings ?? [];
    return snapshotHoldings.map((holding, index) => toHoldingRowVM(holding, index));
  }, [activeAccount?.snapshot]);

  const historyRows = useMemo(() => history.slice().reverse(), [history]);

  const isActive = statusOverride ?? activeAccount?.isActive !== false;

  const handleToggleActive = useCallback(async () => {
    if (!activeAccount) return;
    const nextActive = !isActive;

    if (!nextActive) {
      const now = new Date();
      const warning = await checkAccountMonthlyUsageUseCase.execute({
        householdId,
        accountId: activeAccount.id,
        accountCategory: activeAccount.category,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        auth,
      });

      if (warning.hasReferences) {
        const confirmed = await confirm({
          title: 'Disable this account?',
          context: `It has ${warning.referenceCount} transactions this month.`,
          consequence:
            'Disabled accounts no longer appear in bookkeeping or month-end settlement menus.',
          confirmLabel: 'DISABLE',
          cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
      }
    }

    const result = await updateAccount(activeAccount.id, { isActive: nextActive });
    if (!result.ok) {
      return;
    }
    setStatusOverride(nextActive);
    if (!account) {
      await refetchAccount();
    }
  }, [account, activeAccount, auth, confirm, householdId, isActive, refetchAccount, updateAccount]);

  return {
    activeAccount,
    loading,
    isActive,
    trend,
    holdings,
    historyRows,
    handleToggleActive,
  };
};

export type AccountDetailPageController = ReturnType<typeof useAccountDetailPage>;
