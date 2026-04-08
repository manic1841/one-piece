import React from 'react';

import { AlertCircle, Briefcase, CheckCircle2, ChevronRight, Wallet } from 'lucide-react';

import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { type UnsettledStatsCardVM } from '@/ui/features/dashboard/viewmodels/dashboardDisplay.vm';

interface UnsettledStatsCardUIProps {
  stats: UnsettledStatsCardVM;
  loading: boolean;
}

const UnsettledStatsCardUI: React.FC<UnsettledStatsCardUIProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${stats.statusIconContainerClassName}`}>
              {stats.statusIconType === 'settled' ? (
                <CheckCircle2 size={20} className={stats.statusIconClassName} />
              ) : (
                <AlertCircle size={20} className={stats.statusIconClassName} />
              )}
            </div>
            <CardTitle className="text-lg font-bold">{stats.titleText}</CardTitle>
          </div>
          <Badge variant={stats.badgeVariant} className="px-3 py-1">
            {stats.totalBadgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Accounts */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <Wallet size={16} />
                <span className="text-xs font-medium uppercase tracking-wider">帳戶</span>
              </div>
              <span className={`text-lg font-bold ${stats.accounts.countClassName}`}>
                {stats.accounts.countText}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${stats.accounts.progressWidth}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">尚未輸入餘額</p>
          </div>

          {/* Portfolios */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <Briefcase size={16} />
                <span className="text-xs font-medium uppercase tracking-wider">投資組合</span>
              </div>
              <span className={`text-lg font-bold ${stats.portfolios.countClassName}`}>
                {stats.portfolios.countText}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${stats.portfolios.progressWidth}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">尚未建立投資組合快照</p>
          </div>

          {/* Projects */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle size={16} />
                <span className="text-xs font-medium uppercase tracking-wider">專案</span>
              </div>
              <span className={`text-lg font-bold ${stats.projects.countClassName}`}>
                {stats.projects.countText}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${stats.projects.progressWidth}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">尚未建立專案結算</p>
          </div>
        </div>

        {!stats.isFullySettled && (
          <div className="mt-6 flex justify-end">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 group">
              前往結算頁面
              <ChevronRight
                size={16}
                className="ml-1 transition-transform group-hover:translate-x-1"
              />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnsettledStatsCardUI;
