import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { AccountWithSnapshot } from '@/domains/account/types';
import { type AssetTrendData } from '@/domains/account/types';
import { formatCurrency } from '@/utils/formatUtils';
import { TrendingUp } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
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

import { Label } from '../ui/label';

interface AccountTrendChartProps {
  accounts: AccountWithSnapshot[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
];

const AccountTrendChart: React.FC<AccountTrendChartProps> = ({ accounts }) => {
  // Get unique account IDs from data
  const data: Array<AssetTrendData> = []; // Replace with actual data processing logic
  const accountIds = accounts.map((account) => account.id);
  const accountNames: Record<string, string> = accounts.reduce(
    (acc, account) => {
      acc[account.id] = account.name;
      return acc;
    },
    {} as Record<string, string>,
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // in months
  const [showIndividualAccounts, setShowIndividualAccounts] = useState<boolean>(true);
  return (
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

            {/* Individual Account Lines */}
            {showIndividualAccounts &&
              accountIds.map((accountId, index) => (
                <Line
                  key={accountId}
                  type="monotone"
                  dataKey={`accounts.${accountId}`}
                  name={accountNames[accountId] || accountId}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AccountTrendChart;
