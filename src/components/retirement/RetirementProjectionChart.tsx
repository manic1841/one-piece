import { useMemo } from 'react';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { RetirementProjectionYear } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

interface RetirementProjectionChartProps {
  projection: RetirementProjectionYear[];
  retirementAge: number;
}

export default function RetirementProjectionChart({
  projection,
  retirementAge,
}: RetirementProjectionChartProps) {
  const chartData = useMemo(() => {
    return projection.map((year) => ({
      year: year.year,
      age: year.age,
      balance: year.closingBalance,
      income: year.totalIncome,
      expense: year.totalExpense,
      net: year.netCashFlow,
      investment: year.investmentIncome,
    }));
  }, [projection]);

  const retirementYear = projection.find((p) => p.age === retirementAge)?.year;

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
        <XAxis
          dataKey="year"
          label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
          tick={{ fontSize: 12 }}
        />
        {/* Left Y-Axis for Flows */}
        <YAxis
          yAxisId="left"
          stroke="#888888"
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'Flows ($)', angle: -90, position: 'insideLeft', offset: 0 }}
        />
        {/* Right Y-Axis for Balance */}
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#2563eb"
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'Balance ($)', angle: 90, position: 'insideRight', offset: 0 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          labelFormatter={(label) => `Year ${label}`}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />

        {retirementYear && (
          <ReferenceLine
            yAxisId="right"
            x={retirementYear}
            stroke="#ff7300"
            strokeDasharray="3 3"
            strokeWidth={2}
            label={{
              value: 'Retirement',
              position: 'top',
              fill: '#ff7300',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
        )}

        <Bar
          yAxisId="right"
          dataKey="balance"
          fill="#2563eb"
          name="Savings Balance"
          opacity={0.3}
          radius={[4, 4, 0, 0]}
        />

        <Line
          yAxisId="left"
          type="monotone"
          dataKey="income"
          stroke="#16a34a"
          strokeWidth={2}
          name="Annual Income"
          dot={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="expense"
          stroke="#dc2626"
          strokeWidth={2}
          name="Annual Expense"
          dot={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="net"
          stroke="#8b5cf6"
          strokeWidth={2}
          name="Net Cash Flow"
          dot={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="investment"
          stroke="#f59e0b"
          strokeWidth={2}
          name="Investment Income"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
