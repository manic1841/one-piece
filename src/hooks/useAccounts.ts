import { type AccountWithSnapshot } from '@/domains/account/types';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { accountService } from '@/services/accountService';
import { useCallback, useEffect, useState } from 'react';

export function useAccounts(householdId?: string) {
  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await accountService.getAccountWithSnapshots(householdId);
      setAccounts(data);
    });
  }, [run, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    accounts,
    loading,
    error,
    reload: load,
  };
}
