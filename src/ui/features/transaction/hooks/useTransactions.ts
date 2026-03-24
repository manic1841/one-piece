import { useCallback, useEffect, useMemo, useState } from 'react';

import { deleteTransactionUseCase } from '@/application/ledger/use_cases/deleteTransactionUseCase';
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

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      if (!householdId) return;
      await run(async () => {
        await deleteTransactionUseCase.execute({
          householdId,
          transactionId,
          auth,
        });
        await load();
      });
    },
    [householdId, auth, run, load],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    transactions,
    loading,
    error,
    reload: load,
    deleteTransaction,
  };
}
