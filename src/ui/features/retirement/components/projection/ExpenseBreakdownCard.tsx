import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type PieDataItem = {
  name: string;
  value: number;
  type: 'fixed' | 'variable';
};

const PIE_COLORS = {
  fixed: '#3b82f6',
  variable: '#f59e0b',
};

export function ExpenseBreakdownCard({ pieData }: { pieData: PieDataItem[] }) {
  if (pieData.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 text-sm font-semibold">退休後支出組成（第一年估算）</h4>
      <div className="flex items-center gap-6">
        <div className="h-[160px] w-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                label={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.type === 'fixed' ? PIE_COLORS.fixed : PIE_COLORS.variable}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${Math.round(value).toLocaleString()}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                style={{
                  background: entry.type === 'fixed' ? PIE_COLORS.fixed : PIE_COLORS.variable,
                }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto pl-4 font-medium tabular-nums">
                {Math.round(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
