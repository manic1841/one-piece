import { useEffect, useState } from 'react';

import { useProjectCmds } from '@/hooks/useProjectCmds';

export const useProjectBalance = (householdId?: string, projectId?: string) => {
  const { getProjectBalance } = useProjectCmds(householdId);
  const [balance, setBalance] = useState<number>(0);
  const [monthInfo, setMonthInfo] = useState<{ year?: number; month?: number }>({});

  useEffect(() => {
    const fetchBalance = async () => {
      if (!projectId) return;

      const data = await getProjectBalance(projectId);
      if (data) {
        setBalance(data.balance || 0);
        setMonthInfo({ year: data.year, month: data.month });
      }
    };
    fetchBalance();
  }, [projectId, getProjectBalance]);

  return { balance, ...monthInfo };
};
