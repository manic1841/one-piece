import React from 'react';

import { Info, TrendingUp } from 'lucide-react';
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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type AssetTrendData, type AssetTrendViewMode } from '@/domains/finance/types';
import { formatCurrency } from '@/utils/formatUtils';

interface AssetTrendCardUIProps {
  data: AssetTrendData | null;
  loading: boolean;
  viewMode: AssetTrendViewMode;
  onViewModeChange: (mode: AssetTrendViewMode) => void;
}

const AssetTrendCardUI: React.FC<AssetTrendCardUIProps> = ({
  data,
  loading,
  viewMode,
  onViewModeChange,
}) => {
  const chartData = React.useMemo(() => {
    if (!data) return [];

    // Find the last index with actual data
    let lastDataIndex = -1;
    for (let i = data.points.length - 1; i >= 0; i--) {
      const p = data.points[i];
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
    return data.points.slice(0, lastDataIndex + 1);
  }, [data]);

  const modes: { label: string; value: AssetTrendViewMode }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Season', value: 'season' },
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={24} />
          <CardTitle className="text-lg font-semibold">過去資產趨勢變化</CardTitle>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
          {modes.map((mode) => (
            <Button
              key={mode.value}
              variant={viewMode === mode.value ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 px-3 text-xs ${viewMode === mode.value ? 'bg-white shadow-sm' : ''}`}
              onClick={() => onViewModeChange(mode.value)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Info size={32} className="opacity-20" />
            <p className="text-sm">尚無足夠數據顯示趨勢</p>
          </div>
        ) : (
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={0}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />

                <Bar
                  yAxisId="right"
                  dataKey="totalAssets"
                  name="總資產"
                  fill="#3b82f6"
                  opacity={0.15}
                  radius={[4, 4, 0, 0]}
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
      </CardContent>
    </Card>
  );
};

export default AssetTrendCardUI;
