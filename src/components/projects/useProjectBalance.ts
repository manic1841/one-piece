import { useProjectCmds } from '@/hooks/useProjectCmds';
import { useEffect, useState } from 'react';

export const useProjectBalance = (householdId?: string, projectId?: string) => {
  const { getProjectBalance } = useProjectCmds(householdId);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!householdId || !projectId) return;

      const bal = await getProjectBalance(projectId);
      setBalance(bal || 0);
    };
    fetchBalance();
  }, [householdId, projectId, getProjectBalance]);

  return { balance };
};
