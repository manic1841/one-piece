import { ArrowLeft } from 'lucide-react';

import { AccountSnapshotForm } from '@/components/accounts/AccountSnapshotForm';
import { AccountBalanceChart } from '@/components/accounts/detail/AccountBalanceChart';
import { AccountHeader } from '@/components/accounts/detail/AccountHeader';
import { AccountSnapshotTable } from '@/components/accounts/detail/AccountSnapshotTable';
import { useAccountDetailView } from '@/components/accounts/detail/useAccountDetailView';
import { Button } from '@/components/ui/button';
import { type Account } from '@/domains/account/types';
import { useAccountSnapshots } from '@/hooks/useAccountSnapshots';

interface AccountDetailViewProps {
  account: Account;
  householdId: string;
  userEmail?: string;
  onBack: () => void;
}

const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  account,
  householdId,
  userEmail,
  onBack,
}) => {
  const { snapshots, loading, reload } = useAccountSnapshots(householdId, account.id);
  const {
    chartData,
    trend,
    trendPercentage,
    save,
    editClick,
    deleteClick,
    closeForm,
    editing,
    isFormOpen,
  } = useAccountDetailView(householdId, account.id, userEmail, reload);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
          <ArrowLeft size={20} />
          Back to Accounts
        </Button>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft size={20} />
        Back to Accounts
      </Button>

      {/* Account Header */}
      <AccountHeader
        account={account}
        currentBalance={chartData.length > 0 ? chartData[chartData.length - 1].amount : undefined}
        trend={trend}
        trendPercentage={trendPercentage}
        firstRecordMonth={chartData.length > 0 ? chartData[0].month : undefined}
      />

      {/* Balance Trend Chart */}
      <AccountBalanceChart data={chartData} />

      {/* Snapshot History Table */}
      <AccountSnapshotTable snapshots={snapshots} onEdit={editClick} onDelete={deleteClick} />

      {/* Edit Snapshot Form */}
      <AccountSnapshotForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={save}
        selectedAccount={account}
        initialData={editing}
        householdId={householdId}
      />
    </div>
  );
};

export default AccountDetailView;
