import { toDetailItem } from '@/domains/project/mappers/toDetailItem';
import { type ProjectDetailData } from '@/domains/project/types';
import { useProjectTransactionCmds } from '@/hooks/useProjectTransactionCmds';
import { useTransactionCmds } from '@/hooks/useTransactionCmds';
import { useCallback, useEffect, useState } from 'react';

export const useProjectDetailView = (householdId?: string, projectId?: string) => {
  const { getTransactionsForProject } = useTransactionCmds(householdId);
  const { getProjectTransactionsForProject } = useProjectTransactionCmds(householdId);

  const [items, setItems] = useState<ProjectDetailData[]>([]);

  const fetchAllTransactions = useCallback(async () => {
    if (!householdId || !projectId) return [];

    const transactions = await getTransactionsForProject(projectId);
    const projectTransactions = await getProjectTransactionsForProject(projectId);

    const mappedTransactions = transactions.map(toDetailItem);
    const mappedProjectTransactions = projectTransactions.map(toDetailItem);
    return mappedProjectTransactions.concat(mappedTransactions);
  }, [householdId, projectId, getTransactionsForProject, getProjectTransactionsForProject]);

  useEffect(() => {
    const fetchItems = async () => {
      const data = await fetchAllTransactions();
      setItems(data);
    };
    fetchItems();
  }, [fetchAllTransactions]);

  return { items };
};
