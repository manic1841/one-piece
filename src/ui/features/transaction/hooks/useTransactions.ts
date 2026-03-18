import { useCallback, useEffect, useMemo, useState } from 'react';

import { listRecentTransactionsUseCase } from '@/application/ledger/use_cases/listRecentTransactionsUseCase';
import { type Transaction } from '@/domains/ledger/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useTransactions(householdId?: string) {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await listRecentTransactionsUseCase.execute({ householdId, limit: 100, auth });
      setTransactions(data);
    });
  }, [run, householdId, auth]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    transactions,
    loading,
    error,
    reload: load,
  };
}
