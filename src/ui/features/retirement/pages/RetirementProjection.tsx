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

import { calculatePlanProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import { type RetirementPlan } from '@/domains/retirement/types';
import { formatCurrency } from '@/ui/utils';

type RetirementProjectionProps = {
  plan: RetirementPlan;
};

export default function RetirementProjection({ plan }: RetirementProjectionProps) {
  const projection = calculatePlanProjection(plan);
  const retirementYear = plan.birthYear + plan.retirementAge;
  const retirementSnapshot = projection.find((item) => item.year === retirementYear);
  const bankruptSnapshot = projection.find((item) => item.savings < 0);

  let minSnapshot = projection[0];
  for (const snapshot of projection) {
    if (!minSnapshot || snapshot.savings < minSnapshot.savings) {
      minSnapshot = snapshot;
    }
  }

  const chartData = projection.map((item) => ({
    year: item.year,
    savings: item.savings,
    isBankruptYear: bankruptSnapshot?.year === item.year,
  }));

  return (
    <div className="space-y-6">
      <div className="h-[360px] w-full rounded-lg border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip
              labelFormatter={(value) => `Year ${value}`}
              formatter={(value: number) => [formatCurrency(value), 'Savings']}
            />
            <ReferenceLine
              x={retirementYear}
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
          <p className="text-xl font-semibold">
            {formatCurrency(retirementSnapshot?.savings ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">最低資產年份</p>
          <p className="text-xl font-semibold">
            {minSnapshot?.year ?? '-'} / {formatCurrency(minSnapshot?.savings ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">是否破產</p>
          <p
            className={`text-xl font-semibold ${bankruptSnapshot ? 'text-red-600' : 'text-green-600'}`}
          >
            {bankruptSnapshot ? `是 (${bankruptSnapshot.year})` : '否'}
          </p>
        </div>
      </div>
    </div>
  );
}
