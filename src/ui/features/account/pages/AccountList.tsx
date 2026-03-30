import React from 'react';

import { Download, Landmark, ListOrdered, Plus, Upload } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { useAccountListController } from '@/ui/features/account/hooks/useAccountListController';

import { AccountHistoryDialog } from '../components/detail/AccountHistoryDialog';
import { AccountCard } from '../components/list/AccountCard';
import AccountForm from './AccountForm';
import AccountSnapshotEditor from './AccountSnapshotEditor';

const AccountList: React.FC = () => {
  const {
    accounts,
    localAccounts,
    loadingAccounts,
    showForm,
    setShowForm,
    isReorderMode,
    setIsReorderMode,
    draggedAccountId,
    dragOverAccountId,
    editingAccount,
    setEditingAccount,
    snapshotAccountId,
    setSnapshotAccountId,
    historyAccountId,
    setHistoryAccountId,
    fileInputRef,
    importing,
    exportToCSV,
    handleCreate,
    handleUpdate,
    handleImport,
    handleDragStart,
    handleDragEnter,
    handleDrop,
    handleDragEnd,
    saveOrder,
    cancelReorderMode,
    closeSnapshotEditor,
    closeHistoryDialog,
  } = useAccountListController();

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
              <Button variant="ghost" onClick={cancelReorderMode}>
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
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
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
          onClose={closeSnapshotEditor}
        />
      )}

      {historyAccountId && (
        <AccountHistoryDialog
          account={localAccounts.find((a) => a.id === historyAccountId)!}
          isOpen={true}
          onClose={closeHistoryDialog}
        />
      )}
    </div>
  );
};

export default AccountList;
