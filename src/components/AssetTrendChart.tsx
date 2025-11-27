import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AssetTrendChartProps {
  data: Array<{
    date: string;
    totalAssets: number;
    accounts?: Record<string, number>;
  }>;
  showIndividualAccounts?: boolean;
  accountNames?: Record<string, string>;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
];

const AssetTrendChart: React.FC<AssetTrendChartProps> = ({
  data,
  showIndividualAccounts = false,
  accountNames = {},
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get unique account IDs from data
  const accountIds =
    showIndividualAccounts && data.length > 0 ? Object.keys(data[0].accounts || {}) : [];

  return (
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
  );
};

export default AssetTrendChart;
