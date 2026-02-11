import { useCallback, useEffect, useState } from 'react';

import { type ProjectTransaction } from '@/domains/record/types/';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { projectTransactionService } from '@/services/projectTransactionService';

export const useProjectTransactions = (householdId?: string) => {
  const [projectTransactions, setProjectTransactions] = useState<ProjectTransaction[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await projectTransactionService.getProjectTransactions(householdId);
      setProjectTransactions(data);
    });
  }, [run, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    projectTransactions,
    loading,
    error,
    reload: load,
  };
};
