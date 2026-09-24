import { useCallback } from 'react';

import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type AccountSnapshot } from '@/domains/account/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Read-only account snapshot queries. Split out of `useAccountCmds` so that
 * calling `*Cmds` always means "this changes data".
 */
export function useAccountSnapshotQueries(householdId: string) {
  const auth = useAuthIdentity();

  const getPreviousSnapshot = useCallback(
    async (accountId: string, year: number, month: number): Promise<AccountSnapshot | null> => {
      return await getPreviousSnapshotUseCase.execute({
        householdId,
        accountId,
        year,
        month,
        auth,
      });
    },
    [householdId, auth],
  );

  return { getPreviousSnapshot };
}
