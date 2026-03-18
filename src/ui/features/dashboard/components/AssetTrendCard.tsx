import React, { useMemo } from 'react';

import { AlertCircle, ArrowRight, CheckCircle, Info, MinusCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
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

import { type AssetTrendViewMode } from '@/domains/report/logic/trendAggregation';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { useAssetTrend } from '@/ui/features/account/hooks/useAssetTrend';
import { formatCurrency } from '@/ui/utils';

interface AssetTrendCardProps {
  householdId: string | undefined;
}

const AssetTrendCard: React.FC<AssetTrendCardProps> = ({ householdId }) => {
  const { trendData, healthStatus, loading, viewMode, setViewMode, activePlan } = useAssetTrend({
    householdId,
  });

  const chartData = useMemo(() => {
    if (!trendData) return [];

    const points = trendData.labels.map((label, index) => ({
      label,
      totalAssets: trendData.assets[index] ?? 0,
      income: trendData.incomes[index] ?? 0,
      expense: trendData.expenses[index] ?? 0,
      investmentGain: 0,
    }));

    let lastDataIndex = -1;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (
        (p.totalAssets !== null && p.totalAssets !== 0) ||
        (p.income !== null && p.income !== 0) ||
        (p.expense !== null && p.expense !== 0) ||
        (p.investmentGain !== null && p.investmentGain !== 0)
      ) {
        lastDataIndex = i;
        break;
      }
    }

    if (lastDataIndex === -1) return [];
    return points.slice(0, lastDataIndex + 1);
  }, [trendData]);

  const yAxisDomains = useMemo(() => {
    const actualAssetsMax = Math.max(...chartData.map((p: any) => p.totalAssets || 0), 0);
    const projectedAssets = healthStatus?.assets?.projected || 0;
    const rightMax = Math.max(actualAssetsMax, projectedAssets);

    const actualIncomeMax = Math.max(...chartData.map((p: any) => p.income || 0), 0);
    const actualExpenseMax = Math.max(...chartData.map((p: any) => p.expense || 0), 0);
    const projectedIncome = healthStatus?.income?.projected || 0;
    const projectedExpense = healthStatus?.expense?.projected || 0;
    const leftMax = Math.max(actualIncomeMax, actualExpenseMax, projectedIncome, projectedExpense);

    return {
      left: [0, Math.ceil(leftMax * 1.1)],
      right: [0, Math.ceil(rightMax * 1.1)],
    };
  }, [chartData, healthStatus]);

  const modes: { label: string; value: AssetTrendViewMode }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  if (loading) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">正在載入資產趨勢...</p>
        </div>
      </Card>
    );
  }

  const renderStatusIcon = (status: 'ahead' | 'on-track' | 'behind', size = 16) => {
    if (status === 'ahead') return <CheckCircle size={size} className="text-emerald-500" />;
    if (status === 'on-track') return <MinusCircle size={size} className="text-blue-500" />;
    return <AlertCircle size={size} className="text-rose-500" />;
  };

  const renderStatusLabel = (status: 'ahead' | 'on-track' | 'behind') => {
    if (status === 'ahead') return '進度超前';
    if (status === 'on-track') return '符合預期';
    return '稍微落後';
  };

  // Build the text metrics row
  const renderMetric = (
    label: string,
    actual: number,
    projected: number,
    gapPercent: number,
    invertGoodMode: boolean = false,
  ) => {
    const isGood = invertGoodMode ? gapPercent <= 0 : gapPercent >= 0;
    const sign = gapPercent > 0 ? '+' : '';
    const colorClass = isGood ? 'text-emerald-600' : 'text-rose-600';

    return (
      <div className="flex flex-col text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1">
        <span className="text-slate-500 mb-1">{label}</span>
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatCurrency(Math.round(actual))}
            </span>
            <span className="text-xs text-slate-400 tabular-nums mb-0.5">
              ??{formatCurrency(Math.round(projected))}
            </span>
          </div>
          <span
            className={`text-xs font-medium ml-2 px-1.5 py-0.5 rounded-full ${isGood ? 'bg-emerald-100' : 'bg-rose-100'} ${colorClass}`}
          >
            {sign}
            {gapPercent.toFixed(1)}% {isGood ? '超前' : '落後'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={24} />
          <CardTitle className="text-lg font-semibold flex items-center gap-3">
            資產趨勢
            {healthStatus && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium text-slate-600 border border-slate-200">
                {renderStatusIcon(healthStatus.status)}
                {renderStatusLabel(healthStatus.status)}
              </span>
            )}
          </CardTitle>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
          {modes.map((mode) => (
            <Button
              key={mode.value}
              variant={viewMode === mode.value ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 px-3 text-xs ${viewMode === mode.value ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setViewMode(mode.value)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-grow flex flex-col">
        {healthStatus && activePlan && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 mt-2">
            {renderMetric(
              '累計收入',
              healthStatus.income.actual,
              healthStatus.income.projected,
              healthStatus.income.gapPercent,
              false,
            )}
            {renderMetric(
              '累計支出',
              healthStatus.expense.actual,
              healthStatus.expense.projected,
              healthStatus.expense.gapPercent,
              true,
            )}
          </div>
        )}

        {chartData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2 flex-grow">
            <Info size={32} className="opacity-20" />
            <p className="text-sm">尚無足夠資料顯示趨勢</p>
          </div>
        ) : (
          <div className="h-[350px] w-full mt-2 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  domain={yAxisDomains.left}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `${(val / 1000000).toFixed(1)}M`
                      : val >= 1000
                        ? `${(val / 1000).toFixed(0)}K`
                        : val
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={yAxisDomains.right}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#3b82f6' }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `${(val / 1000000).toFixed(1)}M`
                      : val >= 1000
                        ? `${(val / 1000).toFixed(0)}K`
                        : val
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                  }}
                  itemStyle={{ padding: '4px 0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                <ReferenceLine
                  yAxisId="left"
                  y={0}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />

                {healthStatus?.assets?.projected && healthStatus.assets.projected > 0 && (
                  <ReferenceLine
                    yAxisId="right"
                    y={healthStatus.assets.projected}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      position: 'insideTopLeft',
                      value: ` ${new Date().getFullYear()} 預測資產`,
                      fill: '#3b82f6',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  />
                )}

                <Bar
                  yAxisId="right"
                  dataKey="totalAssets"
                  name="總資產"
                  fill="#3b82f6"
                  opacity={0.15}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="income"
                  name="收入"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#22c55e', strokeWidth: 1, stroke: '#fff' }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="expense"
                  name="支出"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff' }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="investmentGain"
                  name="投資收益"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {healthStatus && activePlan && (
          <div className="mt-6 flex justify-end">
            <Button
              variant="link"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-primary p-0 h-auto"
            >
              <Link to={`/retirement/${activePlan.id}`} className="flex items-center gap-1.5">
                查看詳細
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssetTrendCard;
