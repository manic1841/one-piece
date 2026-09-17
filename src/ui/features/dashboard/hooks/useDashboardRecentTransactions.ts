import { useEffect, useState } from 'react';

import { listRecentTransactionsUseCase } from '@/application/ledger/use_cases/listRecentTransactionsUseCase';
import { type Transaction } from '@/domains/ledger/schemas';
import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { mapTransactionToListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { type DashboardRecentVM } from '../viewmodels/dashboardRecent.vm';

const RECENT_TRANSACTION_LIMIT = 8;

const buildEmptyVm = (): DashboardRecentVM => ({ items: [] });

export function useDashboardRecentTransactions(householdId: string | undefined) {
  const auth = useAuthContext();
  const [vm, setVm] = useState<DashboardRecentVM>(buildEmptyVm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const transactions: Transaction[] = await listRecentTransactionsUseCase.execute({
            householdId,
            limit: RECENT_TRANSACTION_LIMIT,
            auth,
          });
          if (cancelled) return;
          setVm({ items: transactions.map((transaction) => mapTransactionToListItemVM(transaction)) });
          setError(null);
        } catch (err) {
          console.error('Failed to load recent transactions:', err);
          if (cancelled) return;
          setVm(buildEmptyVm());
          setError(DASHBOARD_RECENT_LABELS.LOAD_ERROR);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [householdId, auth]);

  return { vm, loading, error };
}
