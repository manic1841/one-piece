import { useCallback } from 'react';

import { createDebtAccountUseCase } from '@/application/debt/use_cases/createDebtAccountUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { removeDebtAccountUseCase } from '@/application/debt/use_cases/removeDebtAccountUseCase';
import { updateDebtAccountUseCase } from '@/application/debt/use_cases/updateDebtAccountUseCase';
import { type DebtAccount, type DebtAccountCreate } from '@/domains/debt/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useDebtAccountCmds(householdId: string) {
  const auth = useAuthIdentity();

  const { loading, error, run } = useLoadingTask();

  const createDebtAccount = useCallback(
    async (
      data: Omit<DebtAccountCreate, 'linkedLedgerCode'>,
      meta?: { disbursementDate?: Date; disbursementDescription?: string },
    ) => {
      return run(() =>
        createDebtAccountUseCase.execute({
          householdId,
          data,
          disbursementDate: meta?.disbursementDate,
          disbursementDescription: meta?.disbursementDescription,
          userEmail: auth.email || '',
          auth,
        }),
      );
    },
    [householdId, auth, run],
  );

  const updateDebtAccount = useCallback(
    async (debtAccountId: string, data: Partial<Omit<DebtAccountCreate, 'linkedLedgerCode'>>) => {
      return run(async () => {
        await updateDebtAccountUseCase.execute({
          householdId,
          debtAccountId,
          data,
          userEmail: auth.email || '',
          auth,
        });
        return true;
      });
    },
    [householdId, auth, run],
  );

  const removeDebtAccount = useCallback(
    async (debtAccountId: string) => {
      return run(() =>
        removeDebtAccountUseCase.execute({
          householdId,
          debtAccountId,
          userEmail: auth.email || '',
          auth,
        }),
      );
    },
    [householdId, auth, run],
  );

  const listDebtAccounts = useCallback(async (): Promise<DebtAccount[] | undefined> => {
    return run(() => listDebtAccountsUseCase.execute({ householdId }));
  }, [householdId, run]);

  return {
    loading,
    error,
    createDebtAccount,
    updateDebtAccount,
    removeDebtAccount,
    listDebtAccounts,
  };
}
