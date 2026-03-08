import { useEffect, useState } from 'react';

import {
  type Account,
  type AccountCreate,
  type AccountSnapshotCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types';

import { useAccountCmds } from '../useAccountCmds';
import { useAccounts } from '../useAccounts';

export type AccountArgs = {
  account: AccountCreate;
  accountId?: string;
};

export const useAccountPage = (householdId?: string, userEmail?: string) => {
  const { accounts, loading, error, reload } = useAccounts(householdId);
  const {
    createAccount,
    updateAccount,
    deleteAccount,
    recordSnapshot,
    getTotalBalance,
    reorderAccounts,
  } = useAccountCmds(householdId, userEmail);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>(undefined);

  const [isSnapshotFormOpen, setIsSnapshotFormOpen] = useState(false);
  const [selectedAccountForSnapshot, setSelectedAccountForSnapshot] = useState<Account | undefined>(
    undefined,
  );

  const [selected, setSelected] = useState<AccountWithSnapshot | undefined>(undefined);
  const [balance, setBalance] = useState<number>(0);
  const [isBatchSnapshotOpen, setIsBatchSnapshotOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    const fetchBalance = async () => {
      const bal = await getTotalBalance();
      setBalance(bal || 0);
    };
    fetchBalance();
  }, [getTotalBalance]);

  const create = async ({ account }: AccountArgs) => {
    createAccount(account);
    reload();
  };

  const update = async ({ account, accountId }: AccountArgs) => {
    if (!accountId) return;
    updateAccount(accountId, account);
    setEditing(undefined);
    reload();
  };

  const editClick = (account: Account) => {
    setEditing(account);
    setIsAccountFormOpen(true);
  };

  const deleteClick = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    deleteAccount(accountId);
    reload();
  };

  const select = async (account: AccountWithSnapshot) => {
    setSelected(account);
  };

  const unselect = () => {
    setSelected(undefined);
  };

  const openAccountForm = () => {
    setIsAccountFormOpen(true);
  };

  const closeAccountForm = () => {
    setEditing(undefined);
    setIsAccountFormOpen(false);
  };

  const openSnapshotForm = (account: Account) => {
    setSelectedAccountForSnapshot(account);
    setIsSnapshotFormOpen(true);
  };

  const closeSnapshotForm = () => {
    setSelectedAccountForSnapshot(undefined);
    setIsSnapshotFormOpen(false);
  };

  const record = async (accountId: string, snapshot: AccountSnapshotCreate) => {
    if (!householdId || !userEmail) return;
    recordSnapshot(accountId, snapshot);
    reload();
  };

  const moveAccountUp = (accountId: string) => {
    const index = localAccounts.findIndex((a) => a.id === accountId);
    if (index <= 0) return;

    const newAccounts = [...localAccounts];
    const temp = newAccounts[index];
    newAccounts[index] = newAccounts[index - 1];
    newAccounts[index - 1] = temp;
    setLocalAccounts(newAccounts);
  };

  const moveAccountDown = (accountId: string) => {
    const index = localAccounts.findIndex((a) => a.id === accountId);
    if (index < 0 || index >= localAccounts.length - 1) return;

    const newAccounts = [...localAccounts];
    const temp = newAccounts[index];
    newAccounts[index] = newAccounts[index + 1];
    newAccounts[index + 1] = temp;
    setLocalAccounts(newAccounts);
  };

  const saveOrder = async () => {
    const orders = localAccounts.map((account, index) => ({
      id: account.id,
      order: index,
    }));
    await reorderAccounts(orders);
    setIsReorderMode(false);
    reload();
  };

  return {
    loading,
    error,
    editing,
    create,
    update,
    deleteClick,
    editClick,
    record,
    isAccountFormOpen,
    openAccountForm,
    closeAccountForm,
    isSnapshotFormOpen,
    openSnapshotForm,
    closeSnapshotForm,
    selected,
    select,
    unselect,
    selectedAccountForSnapshot,
    balance,
    isBatchSnapshotOpen,
    openBatchSnapshot: () => setIsBatchSnapshotOpen(true),
    closeBatchSnapshot: () => setIsBatchSnapshotOpen(false),
    onBatchSuccess: () => {
      reload();
      const fetchBalance = async () => {
        const bal = await getTotalBalance();
        setBalance(bal || 0);
      };
      fetchBalance();
    },
    isReorderMode,
    toggleReorderMode: () => {
      if (isReorderMode) {
        setLocalAccounts(accounts); // Reset if canceling
      }
      setIsReorderMode(!isReorderMode);
    },
    moveAccountUp,
    moveAccountDown,
    saveOrder,
    accounts: localAccounts,
  };
};
