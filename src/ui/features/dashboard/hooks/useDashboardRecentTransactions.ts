import { useCallback, useEffect, useState } from 'react';

import { listRecentTransactionsUseCase } from '@/application/ledger/use_cases/listRecentTransactionsUseCase';
import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { mapTransactionToListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

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

    await run(
      async () =>
        listRecentTransactionsUseCase.execute({
          householdId,
          limit: RECENT_TRANSACTION_LIMIT,
          auth,
        }),
      {
        writeBack: (result) =>
          setVm(
            result.ok
              ? {
                  items: result.value.map((transaction) => mapTransactionToListItemVM(transaction)),
                }
              : buildEmptyVm(),
          ),
      },
    );
  }, [householdId, auth, run]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { vm, loading, error, errorMessage };
}
