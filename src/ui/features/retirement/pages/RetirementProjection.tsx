import {
  CartesianGrid,
  Line,
  LineChart,
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

export default function RetirementProjection({ projection }: RetirementProjectionProps) {
  return (
    <div className="space-y-6">
      <div className="h-[360px] w-full rounded-lg border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={projection.chartData}
            margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip
              labelFormatter={(value) => `Year ${value}`}
              formatter={(
                _value: number,
                _name: string,
                payload: { payload?: { savingsText?: string } },
              ) => [payload.payload?.savingsText ?? '', 'Savings']}
            />
            <ReferenceLine
              x={projection.retirementYear}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Retirement', position: 'top', fill: '#f59e0b' }}
            />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload?.isBankruptYear) {
                  return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                }
                return <circle cx={cx} cy={cy} r={5} fill="#dc2626" stroke="#dc2626" />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">退休時資產</p>
          <p className="text-xl font-semibold">{projection.retirementSavingsText}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">最低資產年份</p>
          <p className="text-xl font-semibold">
            {projection.minYearText} / {projection.minSavingsText}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">是否破產</p>
          <p className={`text-xl font-semibold ${projection.bankruptClassName}`}>
            {projection.bankruptText}
          </p>
        </div>
      </div>
    </div>
  );
}
