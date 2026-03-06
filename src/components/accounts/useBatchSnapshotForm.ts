import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { type Account, type AccountWithSnapshot } from '@/domains/account/types';
import { accountService } from '@/services/accountService';

export const useBatchSnapshotForm = (
  householdId: string,
  userEmail: string,
  onSuccess: () => void,
  onClose: () => void,
) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [accountData, setAccountData] = useState<
    Array<{
      account: Account;
      snapshot: AccountWithSnapshot['snapshot'];
      amount: number;
    }>
  >([]);

  const loadData = useCallback(async () => {
    if (!householdId) return;
    setFetching(true);
    try {
      const accounts = await accountService.getAccounts(householdId);
      const nonInvestmentAccounts = accounts.filter((a) => a.category !== 'investment');
      const withSnapshots = await accountService.getAccountWithSnapshots(
        householdId,
        nonInvestmentAccounts.map((a) => a.id),
        year,
        month,
      );

      setAccountData(
        withSnapshots.map((item) => ({
          account: item,
          snapshot: item.snapshot,
          amount: item.snapshot?.amount || 0,
        })),
      );
    } finally {
      setFetching(false);
    }
  }, [householdId, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const removeAccount = (accountId: string) => {
    setAccountData((prev) => prev.filter((item) => item.account.id !== accountId));
  };

  const updateAmount = (accountId: string, amount: number) => {
    setAccountData((prev) =>
      prev.map((item) => (item.account.id === accountId ? { ...item, amount } : item)),
    );
  };

  const submit = async () => {
    setLoading(true);
    try {
      const snapshotsToCreate = accountData
        .filter((item) => !item.snapshot) // 只建立尚不存在的
        .map((item) => ({
          accountId: item.account.id,
          data: {
            amount: item.amount,
            year,
            month,
          },
        }));

      if (snapshotsToCreate.length === 0) return;

      await accountService.batchRecordSnapshots(householdId, snapshotsToCreate, userEmail, auth);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save snapshots');
    } finally {
      setLoading(false);
    }
  };

  return {
    year,
    setYear,
    month,
    setMonth,
    accountData,
    fetching,
    loading,
    removeAccount,
    updateAmount,
    submit,
  };
};
