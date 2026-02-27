import { useMemo } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { RetirementProjectionYear } from '../../schemas/retirementPlan';

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
    }));
  }, [projection]);

  const retirementYear = projection.find((p) => p.age === retirementAge)?.year;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
        <YAxis
          label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number) => `$${value.toLocaleString()}`}
          labelFormatter={(label) => `Year ${label}`}
        />
        <Legend />

        {retirementYear && (
          <ReferenceLine
            x={retirementYear}
            stroke="#ff7300"
            strokeDasharray="3 3"
            label={{ value: 'Retirement', position: 'top' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="balance"
          stroke="#2563eb"
          strokeWidth={3}
          name="Savings Balance"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#16a34a"
          strokeWidth={2}
          name="Annual Income"
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#dc2626"
          strokeWidth={2}
          name="Annual Expense"
          dot={false}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
