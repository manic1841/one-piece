import { useCallback, useEffect, useRef, useState } from 'react';

import { deleteTransactionUseCase } from '@/application/ledger/use_cases/deleteTransactionUseCase';
import { getTransactionAllocationUseCase } from '@/application/ledger/use_cases/getTransactionAllocationUseCase';
import { listRecentTransactionsUseCase } from '@/application/ledger/use_cases/listRecentTransactionsUseCase';
import { type Allocation } from '@/domains/allocation/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

type TransactionListQuery = {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
};

export function useTransactions(householdId?: string) {
  const auth = useAuthIdentity();
  const lastQueryRef = useRef<TransactionListQuery>({ limit: 100 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(
    async (query?: TransactionListQuery) => {
      const effectiveQuery = query ?? lastQueryRef.current;
      lastQueryRef.current = effectiveQuery;

      run(async () => {
        if (!householdId) return;

        const data = await listRecentTransactionsUseCase.execute({
          householdId,
          limit: effectiveQuery.limit ?? 100,
          startDate: effectiveQuery.startDate,
          endDate: effectiveQuery.endDate,
          auth,
        });

        setTransactions(data);
      });
    },
    [run, householdId, auth],
  );

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

  const getTransactionAllocation = useCallback(
    async (transactionId: string): Promise<Allocation | null> => {
      if (!householdId) return null;

      return getTransactionAllocationUseCase.execute({
        householdId,
        transactionId,
        auth,
      });
    },
    [householdId, auth],
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
    getTransactionAllocation,
  };
}
