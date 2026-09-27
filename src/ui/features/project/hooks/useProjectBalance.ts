import { useEffect, useState } from 'react';

import { useProjectQueries } from './useProjects';

export const useProjectBalance = (householdId?: string, projectId?: string) => {
  const { getProjectBalance } = useProjectQueries(householdId || '');
  const [balance, setBalance] = useState<number>(0);
  const [monthInfo, setMonthInfo] = useState<{ year?: number; month?: number }>({});

  useEffect(() => {
    const fetchBalance = async () => {
      if (!projectId) return;

      const result = await getProjectBalance(projectId);
      if (result.ok && result.value) {
        setBalance(result.value.balance || 0);
        setMonthInfo({ year: result.value.year, month: result.value.month });
      }
    };
    fetchBalance();
  }, [projectId, getProjectBalance]);

  return { balance, ...monthInfo };
};
