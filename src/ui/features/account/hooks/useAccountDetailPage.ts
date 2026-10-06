import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { checkAccountMonthlyUsageUseCase } from '@/application/account/use_cases/checkAccountMonthlyUsageUseCase';
import { getAccountHistoryUseCase } from '@/application/account/use_cases/getAccountHistoryUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { type AccountSnapshot, type AccountWithSnapshot } from '@/domains/account/types/account';
import { toMonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { ACCOUNT_DANGER_LABELS } from '@/ui/constants/account/detailLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import {
  formatSignedCurrency,
  toAccountHistoryRows,
} from '@/ui/features/account/viewmodels/accountDetail.vm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface UseAccountDetailPageArgs {
  /** The list page may pass the already-loaded row; the route passes nothing. */
  account?: AccountWithSnapshot;
}

/**
 * Owns AccountDetailPage's data: the account row, its 12-period history, the
 * derived trend series, the rename command and the enable/disable command. The
 * page keeps only rendering.
 */
export const useAccountDetailPage = ({ account }: UseAccountDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();
  const { updateAccount, deleteAccount } = useAccountCmds(householdId);

  const [fetchedAccount, setFetchedAccount] = useState<AccountWithSnapshot | null>(null);
  const [history, setHistory] = useState<AccountSnapshot[]>([]);
  const [reloadNonce, setReloadNonce] = useState(0);
  const {
    loading: accountLoading,
    error: accountError,
    run: runAccount,
  } = useLoadingTask({ initiallyLoading: true });
  const {
    loading: historyLoading,
    error: historyError,
    run: runHistory,
  } = useLoadingTask({ initiallyLoading: true });

  const activeAccount = account ?? fetchedAccount;
  const activeId = activeAccount?.id ?? id ?? null;

  // Adjusting state during render, not in an effect: the overrides are local to
  // the account they were set for, and React's documented pattern for it avoids
  // the extra render an effect would cost.
  const [overrides, setOverrides] = useState<{
    forId: string | null;
    name: string | null;
    isActive: boolean | null;
  }>({ forId: activeId, name: null, isActive: null });
  if (overrides.forId !== activeId) {
    setOverrides({ forId: activeId, name: null, isActive: null });
  }

  const auth = useMemo(
    () => ({ uid: userProfile?.uid ?? '', email: userProfile?.email }),
    [userProfile],
  );

  useEffect(() => {
    // The guard belongs inside the task: `initiallyLoading` is released by
    // *initiating* a run, so every path must initiate one.
    const controller = new AbortController();
    void runAccount(
      async () =>
        account || !householdId
          ? null
          : getAccountsWithSnapshotsUseCase.execute({ householdId, auth, includeInactive: true }),
      {
        signal: controller.signal,
        writeBack: (result) =>
          setFetchedAccount(result.ok ? (result.value?.find((a) => a.id === id) ?? null) : null),
      },
    );
    return () => controller.abort();
  }, [account, householdId, id, auth, runAccount, reloadNonce]);

  useEffect(() => {
    const controller = new AbortController();
    void runHistory(
      async () => {
        if (!householdId || !id) return [];
        return getAccountHistoryUseCase.execute({ householdId, accountId: id, auth });
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (result.ok) setHistory(result.value);
        },
      },
    );
    return () => controller.abort();
  }, [householdId, id, auth, runHistory, reloadNonce]);

  const loading = accountLoading || historyLoading;
  // A failed load is reported as an error, never as "this account does not exist".
  const error = loading ? null : (accountError ?? historyError);
  const notFound = !loading && error === null && activeAccount === undefined;

  const reload = useCallback(() => setReloadNonce((nonce) => nonce + 1), []);

  const historyRows = useMemo(() => toAccountHistoryRows(history), [history]);
  const latestRow = historyRows[0];

  const trend = useMemo(
    () =>
      toMonthTrendSeries(
        history.map((snapshot) => ({
          year: snapshot.year,
          month: snapshot.month,
          value: snapshot.amount,
        })),
        (point, index, ordered) => {
          const previous = ordered[index - 1];
          if (previous === undefined) return undefined;
          return formatSignedCurrency(point.value - previous.value);
        },
      ),
    [history],
  );

  const isActive = overrides.isActive ?? activeAccount?.isActive !== false;
  const name = overrides.name ?? activeAccount?.name ?? '';

  const handleRename = useCallback(
    async (nextName: string) => {
      if (!activeAccount) return;
      const result = await updateAccount(activeAccount.id, { name: nextName });
      if (!result.ok) return;
      // No refetch: the row's other fields do not change on a rename, and
      // reloading would blank the page back to its skeleton for a moment.
      setOverrides((previous) => ({ ...previous, name: nextName }));
    },
    [activeAccount, updateAccount],
  );

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
    setOverrides((previous) => ({ ...previous, isActive: nextActive }));
  }, [activeAccount, auth, confirm, householdId, isActive, updateAccount]);

  const handleDelete = useCallback(async () => {
    if (!activeAccount) return;
    const confirmed = await confirm({
      title: ACCOUNT_DANGER_LABELS.DELETE_TITLE,
      consequence: ACCOUNT_DANGER_LABELS.DELETE_CONSEQUENCE,
      confirmLabel: ACCOUNT_DANGER_LABELS.CONFIRM,
    });
    if (!confirmed) return;
    await deleteAccount(activeAccount.id);
    navigate('/accounts');
  }, [activeAccount, confirm, deleteAccount, navigate]);

  return {
    activeAccount,
    name,
    loading,
    error,
    notFound,
    reload,
    isActive,
    trend,
    historyRows,
    latestRow,
    handleRename,
    handleToggleActive,
    handleDelete,
  };
};

export type AccountDetailPageController = ReturnType<typeof useAccountDetailPage>;
