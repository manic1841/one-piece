import { useCallback } from 'react';

import { createAccountUseCase } from '@/application/account/use_cases/createAccountUseCase';
import { deleteAccountSnapshotUseCase } from '@/application/account/use_cases/deleteAccountSnapshotUseCase';
import { deleteAccountUseCase } from '@/application/account/use_cases/deleteAccountUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { getTotalAssetsUseCase } from '@/application/account/use_cases/getTotalAssetsUseCase';
import { recordAccountSnapshotUseCase } from '@/application/account/use_cases/recordAccountSnapshotUseCase';
import { reorderAccountsUseCase } from '@/application/account/use_cases/reorderAccountsUseCase';
import { updateAccountSnapshotUseCase } from '@/application/account/use_cases/updateAccountSnapshotUseCase';
import { updateAccountUseCase } from '@/application/account/use_cases/updateAccountUseCase';
import {
  type AccountCreate,
  type AccountSnapshot,
  type AccountSnapshotCreate,
} from '@/domains/account/types';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useAccountCmds(householdId: string) {
  const auth = useAuthContext();

  const { loading, error, run } = useLoadingTask();

  const createAccount = useCallback(
    async (data: AccountCreate) => {
      return run(async () => {
        await createAccountUseCase.execute({
          householdId,
          data,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const updateAccount = useCallback(
    async (accountId: string, updates: Partial<AccountCreate>) => {
      return run(async () => {
        await updateAccountUseCase.execute({
          householdId,
          accountId,
          updates,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      return run(async () => {
        await deleteAccountUseCase.execute({
          householdId,
          accountId,
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const recordSnapshot = useCallback(
    async (accountId: string, snapshot: AccountSnapshotCreate) => {
      return run(async () => {
        await recordAccountSnapshotUseCase.execute({
          householdId,
          accountId,
          snapshot,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const updateSnapshot = useCallback(
    async (accountId: string, snapshotId: string, updates: Partial<AccountSnapshot>) => {
      return run(async () => {
        await updateAccountSnapshotUseCase.execute({
          householdId,
          accountId,
          snapshotId,
          updates,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const deleteSnapshot = useCallback(
    async (accountId: string, snapshotId: string) => {
      return run(async () => {
        await deleteAccountSnapshotUseCase.execute({
          householdId,
          accountId,
          snapshotId,
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const reorderAccounts = useCallback(
    async (accountOrders: Array<{ id: string; order: number }>) => {
      return run(async () => {
        await reorderAccountsUseCase.execute({
          householdId,
          accountOrders,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const getTotalBalance = useCallback(async (): Promise<number> => {
    return await getTotalAssetsUseCase.execute({
      householdId,
      auth,
    });
  }, [householdId, auth]);

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

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    recordSnapshot,
    updateSnapshot,
    deleteSnapshot,
    reorderAccounts,
    getTotalBalance,
    getPreviousSnapshot,
    loading,
    error,
  };
}
