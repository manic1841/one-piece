import { BarChart3, ListOrdered, Plus } from 'lucide-react';

import AccountDetailView from '@/components/accounts/AccountDetailView';
import AccountForm from '@/components/accounts/AccountForm';
import { AccountGrid } from '@/components/accounts/AccountGrid';
import AccountSnapshotForm from '@/components/accounts/AccountSnapshotForm';
import { BatchSnapshotForm } from '@/components/accounts/BatchSnapshotForm';
// import AccountTrendChart from '@/components/accounts/AccountTrendChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/useAuth';
import { useAccountPage } from '@/hooks/pages/useAccountPage';
import { formatCurrency } from '@/utils/formatUtils';

const Accounts: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const {
    loading,
    error,
    accounts,
    create,
    update,
    deleteClick,
    editClick,
    editing,
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
    openBatchSnapshot,
    closeBatchSnapshot,
    onBatchSuccess,
    isReorderMode,
    toggleReorderMode,
    moveAccountUp,
    moveAccountDown,
    saveOrder,
  } = useAccountPage(userProfile?.householdId, userProfile?.email);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">Error!!!</div>
      </div>
    );
  }

  // Show detail view if account is selected
  if (selected && userProfile?.householdId) {
    return (
      <AccountDetailView
        account={selected}
        householdId={userProfile.householdId}
        userEmail={userProfile.email}
        onBack={unselect}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage your accounts and track asset trends</p>
        </div>
        <div className="flex gap-2">
          {isReorderMode ? (
            <Button onClick={saveOrder} variant="default" className="gap-2">
              Save Order
            </Button>
          ) : (
            <Button onClick={toggleReorderMode} variant="outline" className="gap-2">
              <ListOrdered size={20} />
              Reorder
            </Button>
          )}
          {!isReorderMode && (
            <>
              <Button onClick={openBatchSnapshot} variant="outline" className="gap-2">
                <BarChart3 size={20} />
                Settlement (結算)
              </Button>
              <Button onClick={openAccountForm} className="gap-2">
                <Plus size={20} />
                Add Account
              </Button>
            </>
          )}
          {isReorderMode && (
            <Button onClick={toggleReorderMode} variant="ghost">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Total Balance */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 size={24} />
            <h2 className="text-lg font-semibold">Total Balance</h2>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      {/* Asset Trend Chart */}
      {/* <AccountTrendChart householdId={userProfile?.householdId} /> */}

      {/* Accounts List */}
      <AccountGrid
        accounts={accounts}
        onEdit={editClick}
        onDelete={deleteClick}
        onRecordSnapshot={openSnapshotForm}
        onSelectAccount={select}
        isReorderMode={isReorderMode}
        onMoveUp={moveAccountUp}
        onMoveDown={moveAccountDown}
      />

      {/* Account Form Modal */}
      {isAccountFormOpen && (
        <AccountForm
          isOpen={isAccountFormOpen}
          onClose={closeAccountForm}
          onSubmit={editing ? update : create}
          initialData={editing}
          householdId={userProfile?.householdId || ''}
          userEmail={currentUser?.email || ''}
        />
      )}

      {/* Snapshot Form Modal */}
      {isSnapshotFormOpen && selectedAccountForSnapshot && (
        <AccountSnapshotForm
          isOpen={isSnapshotFormOpen}
          onClose={closeSnapshotForm}
          onSubmit={record}
          accounts={accounts}
          selectedAccount={selectedAccountForSnapshot}
          householdId={userProfile?.householdId || ''}
        />
      )}

      {/* Batch Snapshot Modal */}
      {isBatchSnapshotOpen && userProfile && (
        <BatchSnapshotForm
          isOpen={isBatchSnapshotOpen}
          onClose={closeBatchSnapshot}
          onSuccess={onBatchSuccess}
          householdId={userProfile?.householdId || ''}
          userEmail={userProfile.email || ''}
        />
      )}
    </div>
  );
};

export default Accounts;
