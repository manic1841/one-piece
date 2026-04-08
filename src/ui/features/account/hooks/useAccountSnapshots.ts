import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useAccountSnapshots(householdId: string, accountId: string) {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const { loading, error, run } = useLoadingTask();

  const loadSnapshots = useCallback(async () => {
    run(async () => {
      if (!householdId || !accountId || !auth) return;
      const result = await getAccountSnapshotsUseCase.execute({ householdId, accountId, auth });
      setSnapshots(result);
    });
  }, [run, householdId, accountId, auth]);

  useEffect(() => {
    let ignore = false;

    const init = async () => {
      if (!householdId || !accountId) return;

      await run(async () => {
        const result = await getAccountSnapshotsUseCase.execute({ householdId, accountId, auth });
        if (!ignore) {
          setSnapshots(result);
        }
      });
    };

    init();

    return () => {
      ignore = true;
    };
  }, [householdId, accountId, run, auth]);

  return {
    loading,
    error,
    snapshots,
    reload: loadSnapshots,
  };
}
