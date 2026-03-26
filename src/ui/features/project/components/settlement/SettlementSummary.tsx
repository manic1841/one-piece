import React from 'react';

import {
  AlertCircle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Check,
  FileText,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { formatCurrency } from '@/ui/utils';

interface SettlementSummaryProps {
  year: number;
  month: number;
  summary: {
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    netWorth: number;
  } | null;
  isGenerating: boolean;
  reportsGenerated: boolean;
  onGenerateReports: () => void;
  error?: string;
  unsettledProjectNames?: string[];
  unsettledAccountNames?: string[];
  unsettledPortfolioNames?: string[];
  unsettledDebtNames?: string[];
  debtNoRepaymentWarningNames?: string[];
  reportTimestamps?: {
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  };
  onGoToProjectSettlement?: () => void;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({
  year,
  month,
  summary,
  isGenerating,
  reportsGenerated,
  onGenerateReports,
  error,
  unsettledProjectNames = [],
  unsettledAccountNames = [],
  unsettledPortfolioNames = [],
  unsettledDebtNames = [],
  debtNoRepaymentWarningNames = [],
  reportTimestamps,
  onGoToProjectSettlement,
}) => {
  return (
    <div className="space-y-8">
      {!summary ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 shadow-inner">
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h4 className="text-lg font-black text-amber-900 leading-tight">
              尚未執行 {year}-{String(month).padStart(2, '0')} 月度結算
            </h4>
            <p className="text-sm text-amber-800/80 font-medium leading-relaxed max-w-xl">
              財務報表需要引用該月份的各項資產與負債結算快照
              (Snapshots)。請先前往「專案管理」完成該月份的自動化結算流程。
            </p>
            {unsettledProjectNames.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700/80">
                  尚未結算的專案
                </p>
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  {unsettledProjectNames.join('、')}
                </p>
              </div>
            )}
            {unsettledAccountNames.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700/80">
                  尚未結算的帳戶
                </p>
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  {unsettledAccountNames.join('、')}
                </p>
              </div>
            )}
            {unsettledPortfolioNames.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700/80">
                  尚未結算的 Portfolio
                </p>
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  {unsettledPortfolioNames.join('、')}
                </p>
              </div>
            )}
            {unsettledDebtNames.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700/80">
                  尚未結算的債務
                </p>
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  {unsettledDebtNames.join('、')}
                </p>
              </div>
            )}
            {debtNoRepaymentWarningNames.length > 0 && (
              <div className="pt-3 mt-2 border-t border-amber-200/70">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700/80">
                  債務無還款警訊
                </p>
                <p className="text-sm text-rose-900 font-semibold leading-relaxed">
                  {debtNoRepaymentWarningNames.join('、')} 於該月無還款紀錄。
                  可結算但請先在債務結算預覽中確認。
                </p>
              </div>
            )}
          </div>
          {onGoToProjectSettlement && (
            <Button
              variant="default"
              onClick={onGoToProjectSettlement}
              className="bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-lg shadow-amber-200 shrink-0 gap-2 h-12 px-6 rounded-xl font-bold"
            >
              立刻前往結算 <ArrowRight size={18} />
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="本月總收入"
            value={summary.totalRevenue}
            icon={<ArrowDownCircle className="text-emerald-500" size={16} />}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50/50"
          />
          <StatCard
            label="本月總支出"
            value={summary.totalExpense}
            icon={<ArrowUpCircle className="text-rose-500" size={16} />}
            colorClass="text-rose-600"
            bgClass="bg-rose-50/50"
          />
          <StatCard
            label="本月淨損益"
            value={summary.netIncome}
            icon={<TrendingUp className="text-indigo-500" size={16} />}
            colorClass={summary.netIncome >= 0 ? 'text-indigo-600' : 'text-orange-600'}
            bgClass="bg-indigo-50/50"
          />
          <StatCard
            label="結算後總資產"
            value={summary.netWorth}
            icon={<Wallet className="text-slate-500" size={16} />}
            colorClass="text-slate-900"
            bgClass="bg-slate-100/50"
          />
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-start">
          <span className="bg-white pr-4 text-xs font-black uppercase tracking-widest text-slate-400">
            正式報表作業
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-6">
        <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <FileText size={20} />
                </div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  產生正式財務三表
                </h4>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-lg font-medium">
                點選按鈕後，系統將鎖定當前快照數據並產出{' '}
                <span className="text-slate-900 font-bold">損益表</span>、
                <span className="text-slate-900 font-bold">資產負債表</span> 與{' '}
                <span className="text-slate-900 font-bold">現金流量表</span>。
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={onGenerateReports}
                disabled={isGenerating || !summary}
                variant={reportsGenerated ? 'outline' : 'default'}
                className={`h-14 px-8 rounded-2xl font-black text-base transition-all shadow-xl active:scale-95 ${!reportsGenerated && summary ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="mr-3 animate-spin" />
                    報表計算中...
                  </>
                ) : reportsGenerated ? (
                  '重新更新報表數據'
                ) : (
                  '正式發佈財務報表'
                )}
              </Button>
              {reportsGenerated && (
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                  <Check size={12} strokeWidth={3} /> Data Synchronized
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 text-sm font-bold text-rose-600 bg-rose-50/50 p-4 rounded-xl border border-rose-100 animate-in shake duration-500">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {reportsGenerated && reportTimestamps && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <ReportStatusItem
                label="損益表 (Income)"
                timestamp={reportTimestamps.incomeStatement}
                isDone={!!reportTimestamps.incomeStatement}
              />
              <ReportStatusItem
                label="資產負債表 (BS)"
                timestamp={reportTimestamps.balanceSheet}
                isDone={!!reportTimestamps.balanceSheet}
              />
              <ReportStatusItem
                label="現金流量表 (CF)"
                timestamp={reportTimestamps.cashFlow}
                isDone={!!reportTimestamps.cashFlow}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  icon,
  colorClass,
  bgClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div
      className={`${bgClass} border border-slate-100 rounded-2xl p-5 space-y-2 transition-all hover:shadow-md hover:translate-y-[-2px]`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-black tracking-tight ${colorClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function ReportStatusItem({
  label,
  timestamp,
  isDone,
}: {
  label: string;
  timestamp?: string;
  isDone: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 p-4 rounded-xl border transition-all ${isDone ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white border-dashed border-slate-300 opacity-50'}`}
    >
      <span className="text-xs font-black text-slate-800 tracking-tight">{label}</span>
      <span className="text-[10px] font-bold text-slate-400">
        {timestamp ? `LAST UPDATED: ${timestamp}` : 'NOT GENERATED'}
      </span>
    </div>
  );
}
