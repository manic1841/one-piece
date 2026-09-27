import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
};

export function CashFlowChart({ projection }: RetirementProjectionProps) {
  return (
    <div className="h-[360px] w-full rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={projection.chartData}
          margin={{ top: 16, right: 28, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis dataKey="year" />
          <YAxis yAxisId="cashflow" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
          <YAxis
            yAxisId="savings"
            orientation="right"
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          <ReferenceLine
            yAxisId="cashflow"
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.8}
          />
          <Tooltip
            labelFormatter={(value) => `Year ${value}`}
            formatter={(
              _value: number,
              name: string,
              payload: {
                payload?: {
                  incomeText?: string;
                  expenseText?: string;
                  netCashFlowText?: string;
                  savingsText?: string;
                };
              },
            ) => {
              if (name === 'income') return [payload.payload?.incomeText ?? '', 'Income'];
              if (name === 'expense') return [payload.payload?.expenseText ?? '', 'Expense'];
              if (name === 'netCashFlow') {
                return [payload.payload?.netCashFlowText ?? '', 'Net Cash Flow'];
              }
              return [payload.payload?.savingsText ?? '', 'Savings'];
            }}
          />
          <ReferenceLine
            x={projection.retirementYear}
            yAxisId="cashflow"
            stroke="hsl(var(--chart-4))"
            strokeDasharray="4 4"
            label={{ value: 'Retirement', position: 'top', fill: 'hsl(var(--chart-4))' }}
          />
          <Bar yAxisId="savings" dataKey="savings" barSize={14} radius={[4, 4, 0, 0]}>
            {projection.chartData.map((item) => (
              <Cell
                key={item.year}
                fill={item.isBankruptYear ? 'hsl(var(--negative))' : 'hsl(var(--chart-3))'}
                fillOpacity={item.isBankruptYear ? 0.85 : 0.45}
              />
            ))}
          </Bar>
          <Line
            yAxisId="cashflow"
            type="monotone"
            dataKey="income"
            stroke="hsl(var(--positive))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cashflow"
            type="monotone"
            dataKey="expense"
            stroke="hsl(var(--negative))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cashflow"
            type="monotone"
            dataKey="netCashFlow"
            stroke="hsl(var(--chart-4))"
            strokeWidth={1.8}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
