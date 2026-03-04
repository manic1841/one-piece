import { useCallback, useEffect, useState } from 'react';

import { type AccountSnapshot } from '../schemas';
import { accountService } from '../services/accountService';
import { useLoadingTask } from './useLoadingTask';

export function useAccountSnapshots(householdId: string, accountId: string) {
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const { loading, error, run } = useLoadingTask();

  const loadSnapshots = useCallback(async () => {
    run(async () => {
      if (!householdId || !accountId) return;
      const snapshots = await accountService.getSnapshots(householdId, accountId);
      setSnapshots(snapshots);
    });
  }, [run, householdId, accountId]);

  useEffect(() => {
    let ignore = false;

    const init = async () => {
      if (!householdId || !accountId) return;

      await run(async () => {
        const result = await accountService.getSnapshots(householdId, accountId);
        if (!ignore) {
          setSnapshots(result);
        }
      });
    };

    init();

    return () => {
      ignore = true;
    };
  }, [householdId, accountId, run]);

  return {
    loading,
    error,
    snapshots,
    reload: loadSnapshots,
  };
}
