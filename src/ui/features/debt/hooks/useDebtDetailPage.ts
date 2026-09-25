import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { buildTrendGeometry } from '@/ui/features/debt/components/detail/debtTrendGeometry';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useDebtSnapshots } from '@/ui/features/debt/hooks/useDebtSnapshots';
import {
  mapDebtPaymentTransactionToHistoryVM,
  type DebtPaymentHistoryItemVM,
} from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface UseDebtDetailPageArgs {
  /** Detail pages of the debt list pass the already-loaded row; the route passes nothing. */
  account?: DebtAccount;
}

/**
 * Owns DebtDetailPage's data: the loan row, its 12-month snapshots and payment
 * history, plus the enable/disable/delete commands. The page keeps only rendering.
 */
export const useDebtDetailPage = ({ account }: UseDebtDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();
  const { updateDebtAccount, removeDebtAccount } = useDebtAccountCmds(householdId);
  const { projects } = useProjects(householdId);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [fetchedAccount, setFetchedAccount] = useState<DebtAccount | null>(null);
  const [history, setHistory] = useState<DebtPaymentHistoryItemVM[]>([]);
  const { loading, run } = useLoadingTask({ initiallyLoading: true });

  const activeAccount = account ?? fetchedAccount;
  const { snapshots } = useDebtSnapshots(householdId, id ?? '');

  const fetchAccountRow = useCallback(async () => {
    const accounts = await listDebtAccountsUseCase.execute({
      householdId,
      includeInactive: true,
    });
    return accounts.find((a) => a.id === id) ?? null;
  }, [householdId, id]);

  const loadAccount = useCallback(async () => {
    // The guard belongs inside the task: `initiallyLoading` is released by
    // *initiating* a run, so every path must initiate one.
    await run(
      async () => (account || !householdId ? null : fetchAccountRow()),
      {
        // A guard path means "there is no loan here", which is the same outcome
        // as a failed fetch. Leaving a previously fetched loan on screen would
        // show one household's debt after that household is gone.
        writeBack: (result) => setFetchedAccount(result.ok ? result.value : null),
      },
    );
  }, [account, householdId, fetchAccountRow, run]);

  // Reload after a command. It deliberately bypasses the task: the page gates on
  // `loading` (`DebtDetailPage` renders "Loading..." while it is true), so
  // refetching through `run` would blank a page that already has its loan. Being
  // outside the task it also sits outside the mechanism's failure channel, so a
  // failed refetch reports itself to the console instead of vanishing.
  const refetchAccount = useCallback(async () => {
    if (account || !householdId) return;
    try {
      setFetchedAccount(await fetchAccountRow());
    } catch (caught) {
      console.error('Error reloading debt account:', caught);
      setFetchedAccount(null);
    }
  }, [account, householdId, fetchAccountRow]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    let mounted = true;
    if (!activeAccount) return;
    void (async () => {
      try {
        const { listDebtPaymentsUseCase } = await import(
          '@/application/debt/use_cases/listDebtPaymentsUseCase'
        );
        const transactions = await listDebtPaymentsUseCase.execute({
          householdId,
          debtAccountId: activeAccount.id,
          auth: {
            uid: userProfile?.uid ?? '',
            email: userProfile?.email,
          },
        });
        if (!mounted) return;
        setHistory(
          transactions.map((transaction) =>
            mapDebtPaymentTransactionToHistoryVM(transaction, {
              linkedLedgerCode: activeAccount.linkedLedgerCode,
            }),
          ),
        );
      } catch {
        if (mounted) setHistory([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeAccount, householdId, userProfile]);

  const trend = useMemo(
    () =>
      buildTrendGeometry(
        snapshots
          .slice()
          .reverse()
          .map((snapshot) => {
            const [year, month] = snapshot.yearMonth.split('-').map(Number);
            return { year, month, value: snapshot.closingBalance };
          }),
      ),
    [snapshots],
  );

  const handleDisable = useCallback(async () => {
    if (!activeAccount) return;
    const confirmed = await confirm({
      title: 'Disable this loan?',
      context: 'It will be hidden from the debt list and excluded from totals.',
      consequence: 'You can re-enable it later from the edit dialog.',
      confirmLabel: 'DISABLE',
    });
    if (!confirmed) return;
    await updateDebtAccount(activeAccount.id, { isActive: false });
    await refetchAccount();
  }, [activeAccount, confirm, refetchAccount, updateDebtAccount]);

  const handleDelete = useCallback(async () => {
    if (!activeAccount) return;
    const confirmed = await confirm({
      title: 'Delete this loan?',
      consequence: 'This action cannot be undone.',
    });
    if (!confirmed) return;
    await removeDebtAccount(activeAccount.id);
    navigate('/debt');
  }, [activeAccount, confirm, navigate, removeDebtAccount]);

  const handleEnable = useCallback(async () => {
    if (!activeAccount) return;
    await updateDebtAccount(activeAccount.id, { isActive: true });
    await refetchAccount();
  }, [activeAccount, refetchAccount, updateDebtAccount]);

  const formVm = useDebtAccountFormViewModel({
    householdId,
    initialAccount: activeAccount ?? undefined,
    projects,
    submitLabel: '儲存',
    onSubmitSuccess: () => {
      setIsEditOpen(false);
      void refetchAccount();
    },
    onCancel: () => setIsEditOpen(false),
  });

  return {
    activeAccount,
    snapshots,
    history,
    trend,
    loading,
    isEditOpen,
    setIsEditOpen,
    formVm,
    handleDisable,
    handleDelete,
    handleEnable,
  };
};

export type DebtDetailPageController = ReturnType<typeof useDebtDetailPage>;
