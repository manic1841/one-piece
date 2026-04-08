import React from 'react';

import { Info, Rocket, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { type LeverageStatsCardVM } from '@/ui/features/dashboard/viewmodels/dashboardDisplay.vm';

interface LeverageStatsCardUIProps {
  stats: LeverageStatsCardVM;
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
          <div className={`text-5xl font-black ${stats.statusColorClass}`}>{stats.ratioText}</div>
          <p className="text-sm text-slate-400 mt-2 font-medium">槓桿比率（越低越穩健）</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>總曝險 (Exposure)</span>
              <span>{stats.totalExposureText}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${stats.progressColorClass} transition-all duration-1000`}
                style={{ width: `${stats.progressWidth}%` }}
              />
            </div>
            <div className="relative flex text-[10px] text-slate-400 font-medium">
              <span className="absolute left-0">0x</span>
              <span className="absolute left-1/2 -translate-x-1/2">1x</span>
              <span className="absolute right-0">2x</span>
            </div>
            <div className="h-3" />
            {/* spacer for the absolute-positioned labels */}
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2 text-slate-500">
              <Info size={14} />
              <span className="text-xs">淨資產價值 (NAV)</span>
            </div>
            <span className="text-sm font-semibold">{stats.totalNetValueText}</span>
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
