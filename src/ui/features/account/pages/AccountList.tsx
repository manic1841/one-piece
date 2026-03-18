import React, { useEffect, useState } from 'react';

import { Edit2, History, Landmark, LineChart, Plus, Wallet } from 'lucide-react';

import {
  type Account,
  type AccountCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';

import AccountForm from './AccountForm';
import AccountSnapshotEditor from './AccountSnapshotEditor';
import { AccountHistoryDialog } from '../components/detail/AccountHistoryDialog';

const AccountList: React.FC = () => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';
  const { fetchAccountsWithSnapshots, loading: loadingAccounts } = useAccounts();
  const { createAccount, updateAccount } = useAccountCmds(householdId);

  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [snapshotAccountId, setSnapshotAccountId] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);

  const loadAccounts = React.useCallback(async () => {
    if (householdId) {
      const data = await fetchAccountsWithSnapshots(householdId, {
        uid: userProfile?.uid || '',
        isGlobalAdmin: false,
      });
      setAccounts(data);
    }
  }, [householdId, fetchAccountsWithSnapshots, userProfile?.uid]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCreate = async (data: AccountCreate) => {
    await createAccount(data);
    setShowForm(false);
    loadAccounts();
  };

  const handleUpdate = async (data: AccountCreate) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
      setEditingAccount(null);
      loadAccounts();
    }
  };

  const getCategoryIcon = (category: AccountCategory) => {
    switch (category) {
      case AccountCategory.BANK:
        return <Landmark className="text-blue-500" size={20} />;
      case AccountCategory.SECURITIES:
        return <LineChart className="text-purple-500" size={20} />;
      case AccountCategory.CASH:
        return <Wallet className="text-amber-500" size={20} />;
      default:
        return <Wallet size={20} />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (showForm || editingAccount) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <AccountForm
          initialData={editingAccount}
          onSubmit={editingAccount ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingAccount(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">帳戶管理</h2>
          <p className="text-gray-500">管理您的銀行、券商與現金帳戶</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={18} />
          新增帳戶
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-white group-hover:scale-110 transition-all">
                  {getCategoryIcon(account.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    {account.currency}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-blue-600"
                  onClick={() => setEditingAccount(account)}
                >
                  <Edit2 size={16} />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-500">最新餘額</div>
              <div className="text-2xl font-bold text-gray-900">
                {account.snapshot
                  ? formatCurrency(account.snapshot.amount, account.currency)
                  : '尚未設定'}
              </div>
              {account.snapshot && (
                <div className="text-xs text-gray-400">
                  最後更新：{account.snapshot.year}/
                  {account.snapshot.month.toString().padStart(2, '0')}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-sm"
                onClick={() => setSnapshotAccountId(account.id)}
              >
                <Plus size={14} />
                月底餘額
              </Button>
              <Button 
                variant="ghost" 
                className="px-3" 
                title="歷史記錄"
                onClick={() => setHistoryAccountId(account.id)}
              >
                <History size={16} className="text-gray-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!loadingAccounts && accounts.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-gray-400 mb-4 flex justify-center">
            <Landmark size={48} strokeWidth={1} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">目前沒有帳戶</h3>
          <p className="text-gray-500 mt-1">點擊「新增帳戶」按鈕開始管理您的資產</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="mt-6">
            新增我的第一個帳戶
          </Button>
        </div>
      )}

      {snapshotAccountId && (
        <AccountSnapshotEditor
          account={accounts.find((a) => a.id === snapshotAccountId)!}
          isOpen={true}
          onClose={() => {
            setSnapshotAccountId(null);
            loadAccounts();
          }}
        />
      )}

      {historyAccountId && (
        <AccountHistoryDialog
          account={accounts.find((a) => a.id === historyAccountId)!}
          isOpen={true}
          onClose={() => {
            setHistoryAccountId(null);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
};

export default AccountList;
