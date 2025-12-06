import { type ProjectTransaction } from '@/domains/record/types';
import { projectTransactionService } from '@/services/projectTransactionService';
import { useCallback } from 'react';

export const useProjectTransactionCmds = (householdId?: string) => {
  const getProjectTransactionsForPeriod = useCallback(
    async (startDate: Date, endDate: Date, projectId?: string): Promise<ProjectTransaction[]> => {
      if (!householdId) return [];
      const data = await projectTransactionService.getProjectTransactionsForPeriod(
        householdId,
        startDate,
        endDate,
        projectId,
      );
      return data;
    },
    [householdId],
  );

  const getProjectTransactionsForProject = useCallback(
    async (projectId: string) => {
      if (!householdId) return [];
      const data = await projectTransactionService.getProjectTransactionsForProject(
        householdId,
        projectId,
      );
      return data;
    },
    [householdId],
  );

  return {
    getProjectTransactionsForPeriod,
    getProjectTransactionsForProject,
  };
};
