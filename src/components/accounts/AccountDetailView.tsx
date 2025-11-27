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
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Accounts
        </button>
        <div className="text-gray-500">Loading...</div>
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
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Accounts
      </button>

      {/* Account Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{account.name}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
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

        {/* Trend Summary */}
        {chartData.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
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
              <span className="text-sm text-gray-500">vs first record ({chartData[0].month})</span>
            </div>
          </div>
        )}
      </div>

      {/* Balance Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance History</h3>
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
        </div>
      )}

      {/* Snapshot History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Snapshot History</h3>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No snapshots recorded yet. Record your first balance to start tracking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    Balance
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Change</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Recorded At
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshots
                  .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                  })
                  .map((snapshot, index, arr) => {
                    const previousSnapshot = arr[index + 1];
                    const change = previousSnapshot ? snapshot.amount - previousSnapshot.amount : 0;
                    return (
                      <tr key={snapshot.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {snapshot.year}-{String(snapshot.month).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(snapshot.amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {previousSnapshot ? (
                            <span
                              className={`font-medium ${
                                change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {change >= 0 ? '+' : ''}
                              {formatCurrency(change)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {toDate(snapshot.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditSnapshot(snapshot)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit snapshot"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snapshot.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Snapshot Modal */}
      {editingSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Snapshot</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingSnapshot(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSnapshot}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetailView;
