import { useCallback } from 'react';

import { createAccountUseCase } from '@/application/account/use_cases/createAccountUseCase';
import { deleteAccountUseCase } from '@/application/account/use_cases/deleteAccountUseCase';
import { reorderAccountsUseCase } from '@/application/account/use_cases/reorderAccountsUseCase';
import { updateAccountUseCase } from '@/application/account/use_cases/updateAccountUseCase';
import { type AccountCreate } from '@/domains/account/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useAccountCmds(householdId: string) {
  const auth = useAuthIdentity();

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
        return true;
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

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    loading,
    error,
  };
}
