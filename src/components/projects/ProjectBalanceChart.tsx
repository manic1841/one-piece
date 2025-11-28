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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [selectedMonths, setSelectedMonths] = useState('6'); // Default to 6 months

  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        const monthlyTotals: Record<string, number> = {};
        const monthsToShow = Number(selectedMonths);

        for (const project of projects) {
          const snapshots = await projectService.getSnapshots(householdId, project.id);

          snapshots.slice(0, monthsToShow).forEach((snapshot) => {
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
      <Card>
        <CardContent className="pt-6">
          <div className="text-muted-foreground text-center">Loading chart...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No snapshot data available. Create your first monthly settlement to see the trend chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstBalance = chartData[0].balance;
  const lastBalance = chartData[chartData.length - 1].balance;
  const trend = lastBalance - firstBalance;
  const trendPercentage =
    firstBalance !== 0 ? ((trend / Math.abs(firstBalance)) * 100).toFixed(1) : '0.0';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Total Balance Trend</CardTitle>
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
            <span className="text-xs text-muted-foreground">vs first month</span>
          </div>
        </div>
        <Select value={selectedMonths} onValueChange={setSelectedMonths}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

export default ProjectBalanceChart;
