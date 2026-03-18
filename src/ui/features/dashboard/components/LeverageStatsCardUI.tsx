import React from 'react';

import { Info, Rocket, Shield } from 'lucide-react';

import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { formatCurrency } from '@/ui/utils';

interface LeverageStatsCardUIProps {
  stats: LeverageStats | null;
  loading: boolean;
}

const LeverageStatsCardUI: React.FC<LeverageStatsCardUIProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </Card>
    );
  }

  const { ratio, totalExposure, totalNetValue } = stats ?? {
    ratio: 0,
    totalExposure: 0,
    totalNetValue: 0,
  };

  const getStatusColor = (r: number) => {
    if (r <= 1.05) return 'text-green-600';
    if (r <= 1.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (r: number) => {
    if (r <= 1.05) return 'bg-green-500';
    if (r <= 1.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100">
            <Shield size={20} className="text-indigo-600" />
          </div>
          <CardTitle className="text-lg font-bold">槓桿風險監控</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div className="flex flex-col items-center justify-center py-4">
          <div className={`text-5xl font-black ${getStatusColor(ratio)}`}>
            {ratio.toFixed(2)}
            <span className="text-xl ml-1">x</span>
          </div>
          <p className="text-sm text-slate-400 mt-2 font-medium">槓桿比率（越低越穩健）</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>總曝險 (Exposure)</span>
              <span>{formatCurrency(totalExposure)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(ratio)} transition-all duration-1000`}
                style={{ width: `${Math.min((ratio / 2) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2 text-slate-500">
              <Info size={14} />
              <span className="text-xs">淨資產價值 (NAV)</span>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(totalNetValue)}</span>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700">
            <Rocket size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              槓桿比率越接近 1 代表部位越健康。 若長期高於 1，請評估降低曝險或提升淨值緩衝。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeverageStatsCardUI;
