import { useCallback, useEffect, useState } from 'react';

import { toDetailItem } from '@/domains/project/mappers/toDetailItem';
import { type ProjectDetailData } from '@/domains/project/types';
import { useProjectCmds } from '@/hooks/useProjectCmds';

export const useProjectDetailView = (householdId?: string, projectId?: string) => {
  const { getRecords } = useProjectCmds(householdId);

  const [items, setItems] = useState<ProjectDetailData[]>([]);

  const fetchAllTransactions = useCallback(async () => {
    if (!householdId || !projectId) return [];

    const records = await getRecords(projectId);
    return records || [];
  }, [householdId, projectId, getRecords]);

  useEffect(() => {
    const fetchItems = async () => {
      const data = await fetchAllTransactions();
      setItems(data.map(toDetailItem));
    };
    fetchItems();
  }, [fetchAllTransactions]);

  return { items };
};
