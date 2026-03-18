import React from 'react';

import { AlertCircle, Briefcase, CheckCircle2, ChevronRight, Wallet } from 'lucide-react';

import { type Account } from '@/domains/account/types/account';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type Project } from '@/domains/project/schemas';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';

export interface UnsettledStats {
  year: number;
  month: number;
  unsettledAccounts: Account[];
  unsettledPortfolios: Portfolio[];
  unsettledProjects: Project[];
  totalUnsettled: number;
}

interface UnsettledStatsCardUIProps {
  stats: UnsettledStats | null;
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

  const now = new Date();
  const { year, month, unsettledAccounts, unsettledPortfolios, unsettledProjects, totalUnsettled } = stats ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    unsettledAccounts: [],
    unsettledPortfolios: [],
    unsettledProjects: [],
    totalUnsettled: 0,
  };

  const isFullySettled = totalUnsettled === 0;

  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isFullySettled ? 'bg-green-100' : 'bg-amber-100'}`}>
              {isFullySettled ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : (
                <AlertCircle size={20} className="text-amber-600" />
              )}
            </div>
            <CardTitle className="text-lg font-bold">
              結算 ({year}/{month})
            </CardTitle>
          </div>
          <Badge variant={isFullySettled ? 'outline' : 'destructive'} className="px-3 py-1">
            {isFullySettled ? '已全部結算' : `${totalUnsettled} 項未結算`}
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
              <span
                className={`text-lg font-bold ${unsettledAccounts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}
              >
                {unsettledAccounts.length}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${unsettledAccounts.length > 0 ? 100 : 0}%` }}
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
              <span
                className={`text-lg font-bold ${unsettledPortfolios.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}
              >
                {unsettledPortfolios.length}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${unsettledPortfolios.length > 0 ? 100 : 0}%` }}
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
              <span
                className={`text-lg font-bold ${unsettledProjects.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}
              >
                {unsettledProjects.length}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${unsettledProjects.length > 0 ? 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">尚未建立專案結算</p>
          </div>
        </div>

        {!isFullySettled && (
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
