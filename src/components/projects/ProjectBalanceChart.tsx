import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { projectService } from '../../services/projectService';
import { formatCurrency } from '../../utils/formatUtils';

interface ProjectBalanceChartProps {
  householdId: string;
  projects: Array<{ id: string; name: string; icon: string; color: string }>;
}

interface ChartDataPoint {
  month: string;
  balance: number;
}

const ProjectBalanceChart: React.FC<ProjectBalanceChartProps> = ({ householdId, projects }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(6); // Default to 6 months

  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        const monthlyTotals: Record<string, number> = {};

        for (const project of projects) {
          const snapshots = await projectService.getSnapshots(householdId, project.id);

          snapshots.slice(0, selectedMonths).forEach((snapshot) => {
            const monthKey = `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`;
            if (!monthlyTotals[monthKey]) {
              monthlyTotals[monthKey] = 0;
            }
            monthlyTotals[monthKey] += snapshot.closingBalance;
          });
        }

        // Convert to array and sort by month
        const data = Object.entries(monthlyTotals)
          .map(([month, balance]) => ({
            month,
            balance,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        setChartData(data);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (householdId && projects.length > 0) {
      loadChartData();
    }
  }, [householdId, projects, selectedMonths]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-gray-500 text-center">Loading chart...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Balance Trend</h3>
        <p className="text-gray-500 text-sm">
          No snapshot data available. Create your first monthly settlement to see the trend chart.
        </p>
      </div>
    );
  }

  // Calculate trend
  const firstBalance = chartData[0].balance;
  const lastBalance = chartData[chartData.length - 1].balance;
  const trend = lastBalance - firstBalance;
  const trendPercentage =
    firstBalance !== 0 ? ((trend / Math.abs(firstBalance)) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Total Balance Trend</h3>
          <div className="flex items-center gap-2 mt-1">
            {trend >= 0 ? (
              <TrendingUp className="text-green-600" size={20} />
            ) : (
              <TrendingDown className="text-red-600" size={20} />
            )}
            <span
              className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend >= 0 ? '+' : ''}
              {formatCurrency(trend)} ({trendPercentage}%)
            </span>
            <span className="text-xs text-gray-500">vs first month</span>
          </div>
        </div>
        <select
          value={selectedMonths}
          onChange={(e) => setSelectedMonths(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      {/* Recharts Line Chart */}
      <ResponsiveContainer width="100%" height={250}>
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
          <Legend />
          <Line
            type="monotone"
            dataKey="balance"
            name="Total Balance"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const isPositive = payload.balance >= 0;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={isPositive ? '#22c55e' : '#ef4444'}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectBalanceChart;
