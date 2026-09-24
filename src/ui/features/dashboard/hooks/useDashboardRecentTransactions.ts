import { useCallback, useEffect, useState } from 'react';

import { listRecentTransactionsUseCase } from '@/application/ledger/use_cases/listRecentTransactionsUseCase';
import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { mapTransactionToListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { type DashboardRecentVM } from '../viewmodels/dashboardRecent.vm';

const RECENT_TRANSACTION_LIMIT = 8;

const buildEmptyVm = (): DashboardRecentVM => ({ items: [] });

export function useDashboardRecentTransactions(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [vm, setVm] = useState<DashboardRecentVM>(buildEmptyVm);
  const { loading, error, run } = useLoadingTask();
  const errorMessage = error === null ? null : DASHBOARD_RECENT_LABELS.LOAD_ERROR;

  const loadData = useCallback(async () => {
    if (!householdId) return;

    const result = await run(async () => {
      return listRecentTransactionsUseCase.execute({
        householdId,
        limit: RECENT_TRANSACTION_LIMIT,
        auth,
      });
    });

    setVm(
      result.ok
        ? { items: result.value.map((transaction) => mapTransactionToListItemVM(transaction)) }
        : buildEmptyVm(),
    );
  }, [householdId, auth, run]);

  useEffect(() => {
    // The analyzer cannot see through the awaited write-back in `loadData` and
    // reports this as a synchronous setState; the write-back lands in a promise
    // continuation, not in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  return { vm, loading, error, errorMessage };
}
