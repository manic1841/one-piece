import { transactionService } from '@/services/transactionService';
import { useCallback } from 'react';

export const useTransactionCmds = (householdId?: string) => {
  const getTransactionsForPeriod = useCallback(
    async (startDate: Date, endDate: Date, projectId?: string) => {
      if (!householdId) return [];
      const data = await transactionService.getTransactions(householdId, {
        startDate,
        endDate,
        projectId,
      });
      return data;
    },
    [householdId],
  );

  const getTransactionsForProject = useCallback(
    async (projectId: string) => {
      if (!householdId) return [];
      const data = await transactionService.getTransactions(householdId, { projectId });
      return data;
    },
    [householdId],
  );

  return {
    getTransactionsForPeriod,
    getTransactionsForProject,
  };
};
