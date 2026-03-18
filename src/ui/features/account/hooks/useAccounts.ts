import { useCallback } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountWithSnapshot } from '@/domains/account/types';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useAccounts() {
  const { loading, error, run } = useLoadingTask();

  const fetchAccounts = useCallback(
    async (householdId: string, auth: AuthContext): Promise<Account[]> => {
      const result = await run(async () => {
        return await getAccountsUseCase.execute({ householdId, auth });
      });
      return result ?? [];
    },
    [run],
  );

  const fetchAccountsWithSnapshots = useCallback(
    async (householdId: string, auth: AuthContext): Promise<AccountWithSnapshot[]> => {
      const result = await run(async () => {
        return await getAccountsWithSnapshotsUseCase.execute({ householdId, auth });
      });
      return result ?? [];
    },
    [run],
  );

  return { fetchAccounts, fetchAccountsWithSnapshots, loading, error };
}
