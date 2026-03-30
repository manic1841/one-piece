import React, { useEffect, useState } from 'react';

import {
  Download,
  Edit2,
  GripVertical,
  History,
  Landmark,
  LineChart,
  ListOrdered,
  Plus,
  Upload,
  Wallet,
} from 'lucide-react';

import {
  type Account,
  type AccountCreate,
  type AccountWithSnapshot,
} from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccountExport } from '@/ui/features/account/hooks/useAccountExport';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { cn } from '@/ui/utils/cn';

import { AccountHistoryDialog } from '../components/detail/AccountHistoryDialog';
import AccountForm from './AccountForm';
import AccountSnapshotEditor from './AccountSnapshotEditor';

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
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

interface AccountCardProps {
  account: AccountWithSnapshot;
  isReorderMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: (account: Account) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onOpenSnapshot: (id: string) => void;
  onOpenHistory: (id: string) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isReorderMode,
  isDragging,
  isDragOver,
  onEdit,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onOpenSnapshot,
  onOpenHistory,
}) => {
  return (
    <div
      draggable={isReorderMode}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', account.id);
        onDragStart(account.id);
      }}
      onDragEnter={() => onDragEnter(account.id)}
      onDragOver={(event) => {
        if (!isReorderMode) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragEnter(account.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(account.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all group hover:shadow-md',
        isReorderMode && 'cursor-grab border-dashed border-slate-300 active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-60 shadow-none',
        isDragOver && !isDragging && 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200',
      )}
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
        {isReorderMode ? (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            <GripVertical size={14} className="text-slate-400" />
            拖拉排序
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-blue-600"
              onClick={() => onEdit(account)}
            >
              <Edit2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm text-gray-500">最新餘額</div>
        <div className="text-2xl font-bold text-gray-900">
          {account.snapshot
            ? formatCurrency(
                account.snapshot.originalAmount || account.snapshot.amount,
                account.currency,
              )
            : '尚未設定'}
        </div>
        {account.snapshot && (
          <div className="text-xs text-gray-400">
            最後更新：{account.snapshot.year}/{account.snapshot.month.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {!isReorderMode && (
        <div className="mt-6 pt-6 border-t border-gray-100 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-sm"
            onClick={() => onOpenSnapshot(account.id)}
          >
            <Plus size={14} />
            月底餘額
          </Button>
          <Button
            variant="ghost"
            className="px-3"
            title="歷史記錄"
            onClick={() => onOpenHistory(account.id)}
          >
            <History size={16} className="text-gray-400" />
          </Button>
        </div>
      )}
    </div>
  );
};

const AccountList: React.FC = () => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';
  const { fetchAccountsWithSnapshots, loading: loadingAccounts } = useAccounts();
  const { createAccount, reorderAccounts, updateAccount } = useAccountCmds(householdId);
  const { exportToCSV, importFromCSV } = useAccountExport();

  const [accounts, setAccounts] = useState<AccountWithSnapshot[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AccountWithSnapshot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [snapshotAccountId, setSnapshotAccountId] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const loadAccounts = React.useCallback(async () => {
    if (householdId) {
      const data = await fetchAccountsWithSnapshots(householdId, {
        uid: userProfile?.uid || '',
        isGlobalAdmin: false,
      });
      setAccounts(data);
      setLocalAccounts(data);
    }
  }, [householdId, fetchAccountsWithSnapshots, userProfile?.uid]);

  useEffect(() => {
    const init = async () => {
      await loadAccounts();
    };
    init();
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const result = await importFromCSV(file);
    setImporting(false);

    if (result.errors.length > 0) {
      alert(
        `匯入完成。成功: ${result.success}, 失敗: ${result.failed}\n\n錯誤資訊:\n${result.errors.join('\n')}`,
      );
    } else {
      alert(`匯入成功！共 ${result.success} 筆紀錄`);
    }

    if (result.success > 0) {
      loadAccounts();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const moveAccount = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const sourceIndex = localAccounts.findIndex((account) => account.id === sourceId);
    const targetIndex = localAccounts.findIndex((account) => account.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const newList = [...localAccounts];
    const [movedAccount] = newList.splice(sourceIndex, 1);
    newList.splice(targetIndex, 0, movedAccount);
    setLocalAccounts(newList);
  };

  const saveOrder = async () => {
    const accountOrders = localAccounts.map((account, index) => ({
      id: account.id,
      order: index,
    }));

    await reorderAccounts(accountOrders);
    setIsReorderMode(false);
    setDraggedAccountId(null);
    setDragOverAccountId(null);
    await loadAccounts();
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
          <p className="text-gray-500">
            {isReorderMode ? '拖拉卡片調整順序，完成後儲存變更' : '管理您的銀行、券商與現金帳戶'}
          </p>
        </div>
        <div className="flex gap-2">
          {isReorderMode ? (
            <>
              <Button onClick={saveOrder}>儲存順序</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsReorderMode(false);
                  setLocalAccounts(accounts);
                  setDraggedAccountId(null);
                  setDragOverAccountId(null);
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".csv"
                className="hidden"
              />
              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download size={18} />
                匯出
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                disabled={importing}
              >
                <Upload size={18} />
                {importing ? '匯入中...' : '匯入'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsReorderMode(true)}
                className="gap-2"
                disabled={localAccounts.length < 2}
              >
                <ListOrdered size={18} />
                排序
              </Button>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={18} />
                新增帳戶
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {localAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isReorderMode={isReorderMode}
            isDragging={draggedAccountId === account.id}
            isDragOver={dragOverAccountId === account.id}
            onEdit={setEditingAccount}
            onDragStart={(id) => {
              setDraggedAccountId(id);
              setDragOverAccountId(id);
            }}
            onDragEnter={(id) => {
              if (!draggedAccountId || draggedAccountId === id) return;
              setDragOverAccountId(id);
            }}
            onDrop={(id) => {
              if (!draggedAccountId) return;
              moveAccount(draggedAccountId, id);
              setDraggedAccountId(null);
              setDragOverAccountId(null);
            }}
            onDragEnd={() => {
              setDraggedAccountId(null);
              setDragOverAccountId(null);
            }}
            onOpenSnapshot={setSnapshotAccountId}
            onOpenHistory={setHistoryAccountId}
          />
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
          account={localAccounts.find((a) => a.id === snapshotAccountId)!}
          isOpen={true}
          onClose={() => {
            setSnapshotAccountId(null);
            loadAccounts();
          }}
        />
      )}

      {historyAccountId && (
        <AccountHistoryDialog
          account={localAccounts.find((a) => a.id === historyAccountId)!}
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
