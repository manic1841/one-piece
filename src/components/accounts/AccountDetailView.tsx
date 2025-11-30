import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Account, type AccountSnapshot } from '../../schemas';
import { useAccountSnapshots } from '../../hooks/useAccountSnapshots';
import { AccountHeader } from './detail/AccountHeader';
import { AccountBalanceChart } from './detail/AccountBalanceChart';
import { AccountSnapshotTable } from './detail/AccountSnapshotTable';
import { EditSnapshotDialog } from './detail/EditSnapshotDialog';

interface AccountDetailViewProps {
  account: Account;
  householdId: string;
  onBack: () => void;
}

interface ChartDataPoint {
  month: string;
  amount: number;
  date: Date;
}

const AccountDetailView: React.FC<AccountDetailViewProps> = ({ account, householdId, onBack }) => {
  const { snapshots, loading, updateSnapshot, deleteSnapshot } = useAccountSnapshots(
    householdId,
    account.id
  );
  const [editingSnapshot, setEditingSnapshot] = useState<AccountSnapshot | null>(null);

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

  // Prepare chart data
  const chartData: ChartDataPoint[] = snapshots
    .map((snapshot) => ({
      month: `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`,
      amount: snapshot.amount,
      date: new Date(snapshot.year, snapshot.month - 1),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate trend
  const trend =
    chartData.length >= 2 ? chartData[chartData.length - 1].amount - chartData[0].amount : 0;
  const trendPercentage =
    chartData.length >= 2 && chartData[0].amount !== 0
      ? ((trend / Math.abs(chartData[0].amount)) * 100).toFixed(1)
      : '0.0';

  const handleSaveSnapshot = async (
    id: string,
    updates: { amount: number; year: number; month: number }
  ) => {
    const success = await updateSnapshot(id, updates);
    if (!success) {
      alert('Failed to update snapshot. Please try again.');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;
    const success = await deleteSnapshot(snapshotId);
    if (!success) {
      alert('Failed to delete snapshot. Please try again.');
    }
  };

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
      <AccountSnapshotTable
        snapshots={snapshots}
        onEdit={setEditingSnapshot}
        onDelete={handleDeleteSnapshot}
      />

      {/* Edit Snapshot Modal */}
      <EditSnapshotDialog
        key={editingSnapshot?.id}
        snapshot={editingSnapshot}
        open={!!editingSnapshot}
        onOpenChange={(open) => !open && setEditingSnapshot(null)}
        onSave={handleSaveSnapshot}
      />
    </div>
  );
};

export default AccountDetailView;
