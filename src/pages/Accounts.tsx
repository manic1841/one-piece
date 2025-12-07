import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAccountPage } from '@/hooks/pages/useAccountPage';
import { BarChart3, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';

import AccountDetailView from '../components/accounts/AccountDetailView';
import AccountForm from '../components/accounts/AccountForm';
import AccountSnapshotForm from '../components/accounts/AccountSnapshotForm';
import AccountTrendChart from '../components/accounts/AccountTrendChart';
import { useAuth } from '../contexts/useAuth';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatUtils';

const accountTypeIcons: Record<string, string> = {
  bank: '🏦',
  credit_card: '💳',
  cash: '💵',
  investment: '📈',
  other: '📦',
};

const Accounts: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const {
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
  } = useAccountPage(userProfile?.householdId, userProfile?.email);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show detail view if account is selected
  if (selectedAccountForDetail && userProfile?.householdId) {
    return (
      <AccountDetailView
        account={selectedAccountForDetail}
        householdId={userProfile.householdId}
        onBack={() => setSelectedAccountForDetail(null)}
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
        <Button
          onClick={() => {
            setEditingAccount(undefined);
            setIsAccountFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus size={20} />
          Add Account
        </Button>
      </div>

      {/* Total Balance */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 size={24} />
            <h2 className="text-lg font-semibold">Total Balance</h2>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(getTotalBalance())}</p>
        </CardContent>
      </Card>

      {/* Asset Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={24} />
            <CardTitle className="text-lg font-semibold">Asset Trend</CardTitle>
          </div>
          <div className="flex gap-2">
            {[6, 12, 24].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 12 ? '1Y' : `${period}M`}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-2">
            <Checkbox
              id="show-individual"
              checked={showIndividualAccounts}
              onCheckedChange={(checked) => setShowIndividualAccounts(checked as boolean)}
            />
            <Label htmlFor="show-individual">Show individual accounts</Label>
          </div>

          <AccountTrendChart
            data={assetTrendData}
            showIndividualAccounts={showIndividualAccounts}
          />
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const snapshot = latestSnapshots.get(account.id);
              return (
                <div
                  key={account.id}
                  onClick={() => setSelectedAccountForDetail(account)}
                  className="border border-border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer bg-card text-card-foreground shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{accountTypeIcons[account.type]}</span>
                      <div>
                        <h3 className="font-medium text-foreground">{account.name}</h3>
                        <p className="text-xs text-muted-foreground">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(account);
                          setIsAccountFormOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(snapshot?.amount || 0)}
                    </p>
                    {snapshot && (
                      <p className="text-xs text-muted-foreground">
                        As of {formatDate(snapshot.createdAt)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccountForSnapshot(account.id);
                      setIsSnapshotFormOpen(true);
                    }}
                  >
                    Record Balance
                  </Button>
                </div>
              );
            })}
          </div>

          {accounts.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No accounts yet. Add your first account to start tracking your assets.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Account Form Modal */}
      {isAccountFormOpen && (
        <AccountForm
          isOpen={isAccountFormOpen}
          onClose={() => {
            setIsAccountFormOpen(false);
            setEditingAccount(undefined);
          }}
          onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
          initialData={editingAccount}
          householdId={userProfile?.householdId || ''}
          userEmail={currentUser?.email || ''}
        />
      )}

      {/* Snapshot Form Modal */}
      {isSnapshotFormOpen && selectedAccountForSnapshot && (
        <AccountSnapshotForm
          isOpen={isSnapshotFormOpen}
          onClose={() => {
            setIsSnapshotFormOpen(false);
            setSelectedAccountForSnapshot(undefined);
          }}
          onSubmit={(snapshot) => handleRecordSnapshot(selectedAccountForSnapshot, snapshot)}
          accounts={accounts}
          userEmail={currentUser?.email || ''}
          initialAccountId={selectedAccountForSnapshot}
          householdId={userProfile?.householdId || ''}
        />
      )}
    </div>
  );
};

export default Accounts;
