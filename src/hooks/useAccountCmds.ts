import { type AccountCreate, type AccountSnapshotCreate } from '@/domains/account/types';
import { accountService } from '@/services/accountService';
import { useCallback } from 'react';

export const useAccountCmds = (householdId?: string, email?: string) => {
  const createAccount = useCallback(
    async (account: AccountCreate) => {
      if (!householdId || !email) return;
      await accountService.createAccount(householdId, account, email);
    },
    [householdId, email],
  );

  const updateAccount = useCallback(
    async (id: string, account: AccountCreate) => {
      if (!householdId || !email) return;
      await accountService.updateAccount(householdId, id, account, email);
    },
    [householdId, email],
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await accountService.deleteAccount(householdId, id);
    },
    [householdId],
  );

  const recordSnapshot = useCallback(
    async (accountId: string, snapshot: AccountSnapshotCreate) => {
      if (!householdId || !email) return;
      await accountService.recordSnapshot(householdId, accountId, snapshot, email);
    },
    [householdId, email],
  );

  // get total asset balance
  const getTotalBalance = useCallback(async () => {
    if (!householdId) return 0;
    return await accountService.getTotalAssets(householdId);
  }, [householdId]);

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    recordSnapshot,
    getTotalBalance,
  };
};
