import { Fragment, useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
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

const PIE_COLORS = {
  fixed: '#3b82f6',
  variable: '#f59e0b',
};

export default function RetirementProjection({ projection }: RetirementProjectionProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const toggleYearDetails = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const pieData = (projection.expenseBreakdownChartData || []) as Array<{
    name: string;
    value: number;
    type: 'fixed' | 'variable';
  }>;

  const hasDetails = projection.yearlyDetails.length > 0;

  return (
    <div className="space-y-6">
      {/* Cash flow chart */}
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
              stroke="#94a3b8"
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
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Retirement', position: 'top', fill: '#f59e0b' }}
            />
            <Bar yAxisId="savings" dataKey="savings" barSize={14} radius={[4, 4, 0, 0]}>
              {projection.chartData.map((item) => (
                <Cell
                  key={item.year}
                  fill={item.isBankruptYear ? '#dc2626' : '#2563eb'}
                  fillOpacity={item.isBankruptYear ? 0.85 : 0.45}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cashflow"
              type="monotone"
              dataKey="income"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="cashflow"
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="cashflow"
              type="monotone"
              dataKey="netCashFlow"
              stroke="#f59e0b"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Expense breakdown pie */}
      {pieData && (
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-semibold mb-3">退休後支出組成（第一年估算）</h4>
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
                  <Tooltip formatter={(v: number) => [`${Math.round(v).toLocaleString()}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                    style={{
                      background: entry.type === 'fixed' ? PIE_COLORS.fixed : PIE_COLORS.variable,
                    }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium tabular-nums ml-auto pl-4">
                    {Math.round(entry.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
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

      {/* Yearly details */}
      {hasDetails && (
        <div className="rounded-lg border p-4">
          <button
            type="button"
            className="mb-1 flex w-full items-center justify-between rounded-md py-1 text-left"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            aria-expanded={isDetailsOpen}
          >
            <h4 className="text-sm font-semibold">每年明細</h4>
            <span className="text-muted-foreground">
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>

          {isDetailsOpen && (
            <div className="overflow-x-auto">
              <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-100 border border-sky-200" />
                  <span>退休前</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-100 border border-amber-200" />
                  <span>退休後</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">Year</th>
                    <th className="py-2 pr-3 text-left font-medium">Age</th>
                    <th className="py-2 pr-3 text-left font-medium">Status</th>
                    <th className="py-2 pr-3 text-right font-medium">Income</th>
                    <th className="py-2 pr-3 text-right font-medium">Expense</th>
                    <th className="py-2 pr-3 text-right font-medium">投資收益</th>
                    <th className="py-2 pr-3 text-right font-medium">Net</th>
                    <th className="py-2 pr-3 text-right font-medium">Savings</th>
                    <th className="py-2 text-center font-medium">明細</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.yearlyDetails.map((row) => {
                    const isExpanded = !!expandedYears[row.year];

                    return (
                      <Fragment key={row.year}>
                        <tr
                          className={`border-b ${
                            row.isRetired ? 'bg-amber-50/60' : 'bg-sky-50/60'
                          }`}
                        >
                          <td className="py-2 pr-3 tabular-nums">{row.year}</td>
                          <td className="py-2 pr-3 tabular-nums">{row.age}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                                row.isRetired
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {row.statusText}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.incomeText}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.expenseText}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {row.investmentReturnText}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {row.netCashFlowText}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.savingsText}</td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleYearDetails(row.year)}
                              className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              {isExpanded ? '收合' : '展開'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr
                            key={`${row.year}-detail`}
                            className="border-b last:border-0 bg-muted/20"
                          >
                            <td colSpan={9} className="px-3 py-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-md border bg-white/70 p-3">
                                  <div className="mb-2 text-xs font-semibold text-muted-foreground">
                                    收入明細
                                  </div>
                                  {row.incomeItems.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">無收入項目</div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {row.incomeItems.map((item, index) => (
                                        <div
                                          key={`${row.year}-income-${index}`}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <span className="text-muted-foreground">{item.name}</span>
                                          <span className="ml-auto font-medium tabular-nums text-emerald-700">
                                            {item.amountText}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="rounded-md border bg-white/70 p-3">
                                  <div className="mb-2 text-xs font-semibold text-muted-foreground">
                                    支出明細
                                  </div>
                                  {row.expenseItems.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">無支出項目</div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {row.expenseItems.map((item, index) => (
                                        <div
                                          key={`${row.year}-expense-${index}`}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <span className="text-muted-foreground">{item.name}</span>
                                          <span className="ml-auto font-medium tabular-nums text-rose-700">
                                            {item.amountText}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
