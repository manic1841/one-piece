import { useCallback } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountWithSnapshot } from '@/domains/account/types';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useAccounts() {
  const { loading, error, errorMessage, run } = useLoadingTask();

  const fetchAccounts = useCallback(
    async (
      householdId: string,
      auth: AuthContext,
      options?: { includeInactive?: boolean },
    ): Promise<LoadingTaskResult<Account[]>> => {
      const includeInactive = options?.includeInactive ?? false;
      return run(async () => {
        return await getAccountsUseCase.execute({ householdId, auth, includeInactive });
      });
    },
    [run],
  );

  const fetchAccountsWithSnapshots = useCallback(
    async (
      householdId: string,
      auth: AuthContext,
      options?: { includeInactive?: boolean },
    ): Promise<LoadingTaskResult<AccountWithSnapshot[]>> => {
      const includeInactive = options?.includeInactive ?? false;
      return run(async () => {
        return await getAccountsWithSnapshotsUseCase.execute({
          householdId,
          auth,
          includeInactive,
        });
      });
    },
    [run],
  );

  return { fetchAccounts, fetchAccountsWithSnapshots, loading, error, errorMessage };
}
