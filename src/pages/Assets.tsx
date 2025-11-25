import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountService } from '../services/accountService';
import { type Account, type BalanceSnapshot } from '../types';
import AccountForm from '../components/AccountForm';
import BalanceSnapshotForm from '../components/BalanceSnapshotForm';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';

const accountTypeIcons: Record<string, string> = {
    bank: '🏦',
    credit_card: '💳',
    cash: '💵',
    investment: '📈',
    other: '📦'
};

const Assets: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [latestSnapshots, setLatestSnapshots] = useState<Map<string, BalanceSnapshot>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
    const [isSnapshotFormOpen, setIsSnapshotFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | undefined>();

    useEffect(() => {
        if (userProfile?.householdId) {
            loadData();
        }
    }, [userProfile?.householdId]);

    const loadData = async () => {
        if (!userProfile?.householdId) return;

        setLoading(true);
        try {
            const [accountsData, snapshotsMap] = await Promise.all([
                accountService.getAccounts(userProfile.householdId),
                accountService.getLatestSnapshots(userProfile.householdId)
            ]);
            setAccounts(accountsData);
            setLatestSnapshots(snapshotsMap);
        } catch (error) {
            console.error('Error loading assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
        await accountService.createAccount(account);
        await loadData();
    };

    const handleUpdateAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
        if (editingAccount) {
            await accountService.updateAccount(editingAccount.id, account);
            setEditingAccount(undefined);
            await loadData();
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (confirm('Are you sure you want to delete this account?')) {
            await accountService.deleteAccount(id);
            await loadData();
        }
    };

    const handleRecordBalance = async (snapshot: Omit<BalanceSnapshot, 'id' | 'recordedAt'>) => {
        await accountService.recordBalanceSnapshot(snapshot);
        await loadData();
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    };

    const calculateTotalAssets = () => {
        let total = 0;
        for (const snapshot of latestSnapshots.values()) {
            total += snapshot.balance;
        }
        return total;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const totalAssets = calculateTotalAssets();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
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

            {/* Total Assets Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-sm font-medium opacity-90">Total Assets</h3>
                <p className="text-3xl font-bold mt-2">
                    {formatCurrency(totalAssets, 'USD')}
                </p>
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
                        <div className="space-y-3">
                            {accounts.map(account => {
                                const snapshot = latestSnapshots.get(account.id);
                                return (
                                    <div
                                        key={account.id}
                                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">{accountTypeIcons[account.type]}</span>
                                            <div>
                                                <h3 className="font-medium text-gray-900">{account.name}</h3>
                                                <p className="text-sm text-gray-500 capitalize">
                                                    {account.type.replace('_', ' ')} • {account.currency}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {snapshot ? (
                                                <div className="text-right">
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {formatCurrency(snapshot.balance, account.currency)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {snapshot.year}/{snapshot.month}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400">No balance recorded</p>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingAccount(account);
                                                        setIsAccountFormOpen(true);
                                                    }}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAccount(account.id)}
                                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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

                    <BalanceSnapshotForm
                        isOpen={isSnapshotFormOpen}
                        onClose={() => setIsSnapshotFormOpen(false)}
                        onSubmit={handleRecordBalance}
                        accounts={accounts}
                        householdId={userProfile.householdId}
                        userEmail={currentUser.email}
                    />
                </>
            )}
        </div>
    );
};

export default Assets;
