import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { accountService } from '../services/accountService';
import { assetTrackingService, type AssetDataPoint } from '../services/assetTrackingService';
import { type Account, type AccountSnapshot } from '../schemas';
import AccountForm from '../components/AccountForm';
import AccountSnapshotForm from '../components/AccountSnapshotForm';
import AssetTrendChart from '../components/AssetTrendChart';
import { Plus, Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react';

const accountTypeIcons: Record<string, string> = {
  bank: '🏦',
  credit_card: '💳',
  cash: '💵',
  investment: '📈',
  other: '📦',
};

const Accounts: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
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

  useEffect(() => {
    if (!userProfile?.householdId) return;

    let mounted = true;

    const loadData = async () => {
      if (!userProfile?.householdId) return;

      try {
        setLoading(true);

        const [accountsData, snapshotsMap, trendData] = await Promise.all([
          accountService.getAccounts(userProfile.householdId),
          accountService.getLatestSnapshots(userProfile.householdId),
          assetTrackingService.getAssetTrend(userProfile.householdId, selectedPeriod),
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
  }, [userProfile, selectedPeriod]);

  const reloadData = async () => {
    if (!userProfile?.householdId) return;

    try {
      setLoading(true);

      const [accountsData, snapshotsMap, trendData] = await Promise.all([
        accountService.getAccounts(userProfile.householdId),
        accountService.getLatestSnapshots(userProfile.householdId),
        assetTrackingService.getAssetTrend(userProfile.householdId, selectedPeriod),
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
    if (!userProfile?.householdId) return;

    try {
      await accountService.createAccount(account);
      await reloadData();
    } catch (err) {
      console.error('Error creating account:', err);
    }
  };

  const handleUpdateAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
    if (!editingAccount) return;

    try {
      await accountService.updateAccount(editingAccount.id, account);
      setEditingAccount(undefined);
      await reloadData();
    } catch (err) {
      console.error('Error updating account:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await accountService.deleteAccount(id);
      await reloadData();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleRecordSnapshot = async (snapshot: Omit<AccountSnapshot, 'id' | 'createdAt'>) => {
    try {
      await accountService.recordSnapshot(snapshot);
      await reloadData();
    } catch (err) {
      console.error('Error recording snapshot:', err);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const calculateTotalAssets = () => {
    let total = 0;
    for (const snapshot of latestSnapshots.values()) {
      total += snapshot.amount;
    }
    return total;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const totalAssets = calculateTotalAssets();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your accounts and track balances</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(undefined);
            setIsAccountFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          Add Account
        </button>
      </div>

      {/* Asset Trend Chart */}
      {assetTrendData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">Asset Trend</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPeriod(3)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  selectedPeriod === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => setSelectedPeriod(6)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  selectedPeriod === 6
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setSelectedPeriod(12)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  selectedPeriod === 12
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1Y
              </button>
              <label className="flex items-center gap-2 ml-4 text-sm">
                <input
                  type="checkbox"
                  checked={showIndividualAccounts}
                  onChange={(e) => setShowIndividualAccounts(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Show individual accounts</span>
              </label>
            </div>
          </div>
          <AssetTrendChart
            data={assetTrendData}
            showIndividualAccounts={showIndividualAccounts}
            accountNames={Object.fromEntries(accounts.map((a) => [a.id, a.name]))}
          />
          {assetTrendData.length >= 2 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Growth:
              <span
                className={`ml-1 font-semibold ${
                  assetTrackingService.calculateGrowth(assetTrendData) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {assetTrackingService.calculateGrowth(assetTrendData) >= 0 ? '+' : ''}
                {assetTrackingService.calculateGrowth(assetTrendData).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Total Assets Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
        <h3 className="text-sm font-medium opacity-90">Total Assets</h3>
        <p className="text-3xl font-bold mt-2">{formatCurrency(totalAssets, 'USD')}</p>
        <button
          onClick={() => setIsSnapshotFormOpen(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
        >
          <TrendingUp size={18} />
          Record Balance
        </button>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accounts</h2>

          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No accounts yet</p>
              <button
                onClick={() => setIsAccountFormOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const snapshot = latestSnapshots.get(account.id);
                return (
                  <div
                    key={account.id}
                    className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{accountTypeIcons[account.type]}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{account.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {account.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {snapshot ? (
                      <div className="mb-4">
                        <p className="text-3xl font-bold text-gray-900">
                          {formatCurrency(snapshot.amount, account.currency)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Last updated: {snapshot.year}/{snapshot.month}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-gray-400">
                          {formatCurrency(0, account.currency)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">No balance recorded</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSelectedAccountForSnapshot(account.id);
                          setIsSnapshotFormOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Update Balance"
                      >
                        <TrendingUp size={16} />
                        <span>Balance</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setIsAccountFormOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Forms */}
      {userProfile?.householdId && currentUser?.email && (
        <>
          <AccountForm
            isOpen={isAccountFormOpen}
            onClose={() => {
              setIsAccountFormOpen(false);
              setEditingAccount(undefined);
            }}
            onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
            initialData={editingAccount}
            householdId={userProfile.householdId}
            userEmail={currentUser.email}
          />

          <AccountSnapshotForm
            isOpen={isSnapshotFormOpen}
            onClose={() => {
              setIsSnapshotFormOpen(false);
              setSelectedAccountForSnapshot(undefined);
            }}
            onSubmit={handleRecordSnapshot}
            accounts={accounts}
            userEmail={currentUser.email}
            initialAccountId={selectedAccountForSnapshot}
          />
        </>
      )}
    </div>
  );
};

export default Accounts;
