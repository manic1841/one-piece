import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountTrendPeriodLabels, AccountTrendPeriods } from '@/constants/account/trend';
import { formatCurrency } from '@/utils/formatUtils';
import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAccountTrendChart } from './useAccountTrendChart';

interface AccountTrendChartProps {
  householdId?: string;
}

const AccountTrendChart: React.FC<AccountTrendChartProps> = ({ householdId }) => {
  const { data, selectedPeriod, selectPeriod } = useAccountTrendChart(householdId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={24} />
          <CardTitle className="text-lg font-semibold">Asset Trend</CardTitle>
        </div>
        <div className="flex gap-2">
          {AccountTrendPeriods.map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectPeriod(period)}
            >
              {AccountTrendPeriodLabels[period]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={formatCurrency} />
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

            {/* Total Assets Line */}
            <Line
              type="monotone"
              dataKey="totalAssets"
              name="Total Assets"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AccountTrendChart;
