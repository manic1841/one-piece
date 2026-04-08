import React, { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Pencil, Trash2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type Account, type AccountSnapshot } from '../../schemas';
import { accountService } from '../../services/accountService';
import { formatCurrency } from '../../utils/formatUtils';
import { toDate } from '../../utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSnapshot, setEditingSnapshot] = useState<AccountSnapshot | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editMonth, setEditMonth] = useState('');

  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        setLoading(true);
        const snapshotsList = await accountService.getSnapshots(householdId, account.id);
        setSnapshots(snapshotsList);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSnapshots();
  }, [householdId, account.id]);

  const handleEditSnapshot = (snapshot: AccountSnapshot) => {
    setEditingSnapshot(snapshot);
    setEditAmount(snapshot.amount.toString());
    setEditYear(snapshot.year.toString());
    setEditMonth(snapshot.month.toString());
  };

  const handleSaveSnapshot = async () => {
    if (!editingSnapshot) return;

    try {
      await accountService.updateSnapshot(householdId, account.id, editingSnapshot.id, {
        amount: parseFloat(editAmount),
        year: parseInt(editYear),
        month: parseInt(editMonth),
      });

      // Reload snapshots
      const snapshotsList = await accountService.getSnapshots(householdId, account.id);
      setSnapshots(snapshotsList);
      setEditingSnapshot(null);
    } catch (error) {
      console.error('Error updating snapshot:', error);
      alert('Failed to update snapshot. Please try again.');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;

    try {
      await accountService.deleteSnapshot(householdId, account.id, snapshotId);

      //  Reload snapshots
      const snapshotsList = await accountService.getSnapshots(householdId, account.id);
      setSnapshots(snapshotsList);
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      alert('Failed to delete snapshot. Please try again.');
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft size={20} />
        Back to Accounts
      </Button>

      {/* Account Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{account.name}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{account.type}</span>
            <span>•</span>
            <span>{account.currency}</span>
            {chartData.length > 0 && (
              <>
                <span>•</span>
                <span>Current: {formatCurrency(chartData[chartData.length - 1].amount)}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Trend Summary */}
          {chartData.length >= 2 && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                {trend >= 0 ? (
                  <TrendingUp className="text-green-600" size={20} />
                ) : (
                  <TrendingUp
                    className="text-red-600"
                    size={20}
                    style={{ transform: 'scaleY(-1)' }}
                  />
                )}
                <span className={`font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? '+' : ''}
                  {formatCurrency(trend)} ({trendPercentage}%)
                </span>
                <span className="text-sm text-muted-foreground">
                  vs first record ({chartData[0].month})
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Balance History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => value.slice(5)} // Show only MM
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Balance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Snapshot History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Calendar className="text-blue-600" size={20} />
          <CardTitle>Snapshot History</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No snapshots recorded yet. Record your first balance to start tracking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Recorded At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots
                  .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                  })
                  .map((snapshot, index, arr) => {
                    const previousSnapshot = arr[index + 1];
                    const change = previousSnapshot ? snapshot.amount - previousSnapshot.amount : 0;
                    return (
                      <TableRow key={snapshot.id}>
                        <TableCell>
                          {snapshot.year}-{String(snapshot.month).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(snapshot.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {previousSnapshot ? (
                            <span
                              className={`font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                              {change >= 0 ? '+' : ''}
                              {formatCurrency(change)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {toDate(snapshot.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                              onClick={() => handleEditSnapshot(snapshot)}
                              title="Edit snapshot"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteSnapshot(snapshot.id)}
                              title="Delete snapshot"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Snapshot Modal */}
      <Dialog open={!!editingSnapshot} onOpenChange={(open) => !open && setEditingSnapshot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="number"
                min="1"
                max="12"
                value={editMonth}
                onChange={(e) => setEditMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSnapshot(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSnapshot}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountDetailView;
