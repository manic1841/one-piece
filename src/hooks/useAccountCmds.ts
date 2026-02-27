import { useCallback } from 'react';

import { type AccountCreate, type AccountSnapshotCreate } from '@/domains/account/types';
import { accountService } from '@/services/accountService';

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

  // record account snapshot
  const recordSnapshot = useCallback(
    async (accountId: string, snapshot: AccountSnapshotCreate) => {
      if (!householdId || !email) return;
      await accountService.recordSnapshot(householdId, accountId, snapshot, email);
    },
    [householdId, email],
  );

  // update account snapshot
  const updateSnapshot = async (
    accountId: string,
    snapshotId: string,
    updates: { amount: number; year: number; month: number },
  ) => {
    if (!householdId || !email) return;
    await accountService.updateSnapshot(householdId, accountId, snapshotId, updates, email);
  };

  const deleteSnapshot = async (accountId: string, snapshotId: string) => {
    if (!householdId) return;

    await accountService.deleteSnapshot(householdId, accountId, snapshotId);
  };

  // get total asset balance
  const getTotalBalance = useCallback(async () => {
    if (!householdId) return 0;
    return await accountService.getTotalAssets(householdId);
  }, [householdId]);

  // get previous snapshot
  const getPreviousSnapshot = useCallback(
    async (accountId: string, year: number, month: number) => {
      if (!householdId) return null;
      return await accountService.getPreviousSnapshot(householdId, accountId, year, month);
    },
    [householdId],
  );

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    recordSnapshot,
    updateSnapshot,
    deleteSnapshot,
    getTotalBalance,
    getPreviousSnapshot,
  };
};
