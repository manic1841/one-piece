import { calculateBalance as calculate } from '@/domains/project/calculator';
import { useProjectCmds } from '@/hooks/useProjectCmds';
import { useProjectTransactionCmds } from '@/hooks/useProjectTransactionCmds';
import { useTransactionCmds } from '@/hooks/useTransactionCmds';
import { useCallback, useEffect, useState } from 'react';

export const useProjectBalance = (householdId?: string, projectId?: string) => {
  const { getLatestSnapshots } = useProjectCmds(householdId);
  const { getTransactionsForPeriod } = useTransactionCmds(householdId);
  const { getProjectTransactionsForPeriod } = useProjectTransactionCmds(householdId);
  const [balance, setBalance] = useState<number>(0);

  const calculateBalance = useCallback(async () => {
    if (!householdId || !projectId) return 0;

    const snapshot = await getLatestSnapshots(projectId);
    const snapshotDate = snapshot ? new Date(snapshot.year, snapshot.month) : null;

    const txns = await getTransactionsForPeriod(snapshotDate || new Date(0), new Date(), projectId);

    const pts = await getProjectTransactionsForPeriod(
      snapshotDate || new Date(0),
      new Date(),
      projectId,
    );

    return calculate(snapshot ? snapshot.closingBalance : 0, projectId, txns, pts);
  }, [
    householdId,
    projectId,
    getLatestSnapshots,
    getTransactionsForPeriod,
    getProjectTransactionsForPeriod,
  ]);

  useEffect(() => {
    const fetchBalance = async () => {
      const bal = await calculateBalance();
      setBalance(bal);
    };
    fetchBalance();
  }, [calculateBalance]);

  return { balance };
};
