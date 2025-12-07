import { type Account, type AccountSnapshot } from '@/domains/account/types';
import { accountService } from '@/services/accountService';
import { type AssetDataPoint, assetTrackingService } from '@/services/assetTrackingService';
import { useEffect, useState } from 'react';

export const useAccountPage = (householdId?: string, userEmail?: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Map<string, AccountSnapshot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isSnapshotFormOpen, setIsSnapshotFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [assetTrendData, setAssetTrendData] = useState<AssetDataPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);
  const [showIndividualAccounts, setShowIndividualAccounts] = useState(false);
  const [selectedAccountForSnapshot, setSelectedAccountForSnapshot] = useState<
    string | undefined
  >();
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);

  useEffect(() => {
    if (!householdId) return;

    let mounted = true;

    const loadData = async () => {
      if (!householdId) return;

      try {
        setLoading(true);

        const [accountsData, snapshotsMap, trendData] = await Promise.all([
          accountService.getAccounts(householdId),
          accountService.getLatestSnapshots(householdId),
          assetTrackingService.getAssetTrend(householdId, selectedPeriod),
        ]);

        if (!mounted) return;

        setAccounts(accountsData);
        setLatestSnapshots(snapshotsMap);
        setAssetTrendData(trendData);
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [householdId, selectedPeriod]);

  const reloadData = async () => {
    if (!householdId) return;

    try {
      setLoading(true);

      const [accountsData, snapshotsMap, trendData] = await Promise.all([
        accountService.getAccounts(householdId),
        accountService.getLatestSnapshots(householdId),
        assetTrackingService.getAssetTrend(householdId, selectedPeriod),
      ]);

      setAccounts(accountsData);
      setLatestSnapshots(snapshotsMap);
      setAssetTrendData(trendData);
    } catch (err) {
      console.error('Error reloading assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
    if (!householdId || !userEmail) return;

    try {
      await accountService.createAccount(householdId, account, userEmail);
      await reloadData();
    } catch (err) {
      console.error('Error creating account:', err);
    }
  };

  const handleUpdateAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
    if (!editingAccount || !householdId || !userEmail) return;

    try {
      await accountService.updateAccount(householdId, editingAccount.id, account, userEmail);
      setEditingAccount(undefined);
      await reloadData();
    } catch (err) {
      console.error('Error updating account:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!householdId) return;
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await accountService.deleteAccount(householdId, id);
      await reloadData();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleRecordSnapshot = async (
    accountId: string,
    snapshot: Omit<AccountSnapshot, 'id' | 'createdAt'>,
  ) => {
    if (!householdId || !userEmail) return;

    try {
      await accountService.recordSnapshot(
        householdId,
        accountId,
        {
          ...snapshot,
        },
        userEmail,
      );
      await reloadData();
      setIsSnapshotFormOpen(false);
      setSelectedAccountForSnapshot(undefined);
    } catch (err) {
      console.error('Error recording balance:', err);
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => {
      const snapshot = latestSnapshots.get(account.id);
      return sum + (snapshot?.amount || 0);
    }, 0);
  };

  return {
    loading,
    isAccountFormOpen,
    setIsAccountFormOpen,
    isSnapshotFormOpen,
    setIsSnapshotFormOpen,
    assetTrendData,
    showIndividualAccounts,
    setShowIndividualAccounts,
    selectedAccountForSnapshot,
    setSelectedAccountForSnapshot,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
    setSelectedPeriod,
    handleCreateAccount,
    handleDeleteAccount,
    handleRecordSnapshot,
    getTotalBalance,
    handleUpdateAccount,
    setEditingAccount,
    selectedPeriod,
    accounts,
    latestSnapshots,
    editingAccount,
  };
};
