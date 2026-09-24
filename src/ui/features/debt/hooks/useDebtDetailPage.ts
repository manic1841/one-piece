import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { buildTrendGeometry } from '@/ui/features/debt/components/detail/debtTrendGeometry';
import { type PaymentHistoryRow } from '@/ui/features/debt/components/detail/DebtPaymentsTable';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useDebtSnapshots } from '@/ui/features/debt/hooks/useDebtSnapshots';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { formatCurrency, formatDate } from '@/ui/utils';

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
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const activeAccount = account ?? fetchedAccount;
  const { snapshots } = useDebtSnapshots(householdId, id ?? '');

  const fetchAccount = useCallback(async () => {
    if (account || !householdId) return;
    const accounts = await listDebtAccountsUseCase.execute({
      householdId,
      includeInactive: true,
    });
    setFetchedAccount(accounts.find((a) => a.id === id) ?? null);
  }, [account, householdId, id]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (account || !householdId) {
        setLoading(false);
        return;
      }
      await fetchAccount();
      if (!ignore) {
        setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [account, householdId, id, fetchAccount]);

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
          transactions.map((transaction) => {
            const principal =
              transaction.entries.find((entry) => entry.ledgerCode.startsWith('liability:'))?.debit ||
              0;
            const interest =
              transaction.entries.find((entry) => entry.ledgerCode === 'expense:interest')?.debit ||
              0;
            const total = transaction.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
            return {
              id: transaction.id,
              dateText: formatDate(transaction.date),
              descriptionText: (transaction as { note?: string }).note || '還款',
              principalText: formatCurrency(principal),
              interestText: formatCurrency(interest),
              totalText: formatCurrency(total),
            };
          }),
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
    await fetchAccount();
  }, [activeAccount, confirm, fetchAccount, updateDebtAccount]);

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
    await fetchAccount();
  }, [activeAccount, fetchAccount, updateDebtAccount]);

  const formVm = useDebtAccountFormViewModel({
    householdId,
    initialAccount: activeAccount ?? undefined,
    projects,
    submitLabel: '儲存',
    onSubmitSuccess: () => {
      setIsEditOpen(false);
      void fetchAccount();
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
