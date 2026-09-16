import React from 'react';

import {
  AlertCircle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  FileText,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { formatCurrency } from '@/ui/utils';

export interface SummaryData {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  netWorth: number;
}

export function NoSummaryCard({
  year,
  month,
  isLoading,
  unsettledProjects,
  unsettledAccounts,
  unsettledPortfolios,
  unsettledDebts,
  debtWarnings,
  onGoToSettlement,
}: {
  year: number;
  month: number;
  isLoading: boolean;
  unsettledProjects: string[];
  unsettledAccounts: string[];
  unsettledPortfolios: string[];
  unsettledDebts: string[];
  debtWarnings: string[];
  onGoToSettlement?: () => void;
}) {
  const hasUnsettledItems =
    unsettledProjects.length > 0 ||
    unsettledAccounts.length > 0 ||
    unsettledPortfolios.length > 0 ||
    unsettledDebts.length > 0 ||
    debtWarnings.length > 0;

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-lg p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm min-h-[280px]">
      <div className="bg-warning/10 p-4 rounded-lg text-warning shadow-inner">
        {isLoading ? (
          <Loader2 size={32} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <AlertCircle size={32} strokeWidth={2.5} />
        )}
      </div>
      <div className="flex-1 text-center md:text-left space-y-2">
        <h4 className="text-lg font-black text-foreground leading-tight">
          {isLoading
            ? `正在更新 ${year}-${String(month).padStart(2, '0')} 月度結算摘要`
            : `尚未取得 ${year}-${String(month).padStart(2, '0')} 月度結算摘要`}
        </h4>
        <p className="text-sm text-foreground/80 font-medium leading-relaxed max-w-xl">
          {isLoading
            ? '系統正在讀取該月份的結算快照並整理報表摘要，完成後會自動更新畫面。'
            : '財務報表會引用該月份的資產與負債結算快照 (Snapshots)。若您剛完成結算，系統可能仍在同步中，請稍候片刻或點右上角重新整理。'}
        </p>
        {isLoading && hasUnsettledItems && (
          <p className="text-xs text-warning font-semibold pt-1">
            正在更新資料，以下清單可能是上一個月份的結果。
          </p>
        )}
        <UnsettledItemsList
          projects={unsettledProjects}
          accounts={unsettledAccounts}
          portfolios={unsettledPortfolios}
          debts={unsettledDebts}
          debtWarnings={debtWarnings}
        />
      </div>
      {onGoToSettlement && !isLoading && (
        <Button
          variant="default"
          onClick={onGoToSettlement}
          className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-lg shrink-0 gap-2 h-12 px-6 rounded-xl font-bold"
        >
          立刻前往結算 <ArrowRight size={18} />
        </Button>
      )}
    </div>
  );
}

function UnsettledItemsList({
  projects,
  accounts,
  portfolios,
  debts,
  debtWarnings,
}: {
  projects: string[];
  accounts: string[];
  portfolios: string[];
  debts: string[];
  debtWarnings: string[];
}) {
  return (
    <>
      {projects.length > 0 && <UnsettledItemSection label="尚未結算的專案" items={projects} />}
      {accounts.length > 0 && <UnsettledItemSection label="尚未結算的帳戶" items={accounts} />}
      {portfolios.length > 0 && (
        <UnsettledItemSection label="尚未結算的 Portfolio" items={portfolios} />
      )}
      {debts.length > 0 && <UnsettledItemSection label="尚未結算的債務" items={debts} />}
      {debtWarnings.length > 0 && (
        <div className="pt-3 mt-2 border-t border-negative/20">
          <p className="text-xs font-bold uppercase tracking-widest text-negative/80">
            債務無還款警訊
          </p>
          <p className="text-sm text-negative font-semibold leading-relaxed">
            {debtWarnings.join('、')} 於該月無還款紀錄。 可結算但請先在債務結算預覽中確認。
          </p>
        </div>
      )}
    </>
  );
}

function UnsettledItemSection({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="pt-2">
      <p className="text-xs font-bold uppercase tracking-widest text-warning">{label}</p>
      <p className="text-sm text-foreground font-semibold leading-relaxed">{items.join('、')}</p>
    </div>
  );
}

export function SummaryStatsGrid({ summary }: { summary: SummaryData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label="本月總收入"
        value={summary.totalRevenue}
        icon={<ArrowDownCircle className="text-positive" size={16} />}
        colorClass="text-positive"
        bgClass="bg-positive/5"
      />
      <StatCard
        label="本月總支出"
        value={summary.totalExpense}
        icon={<ArrowUpCircle className="text-negative" size={16} />}
        colorClass="text-negative"
        bgClass="bg-negative/5"
      />
      <StatCard
        label="本月淨損益"
        value={summary.netIncome}
        icon={
          <TrendingUp
            className={summary.netIncome >= 0 ? 'text-positive' : 'text-negative'}
            size={16}
          />
        }
        colorClass={summary.netIncome >= 0 ? 'text-positive' : 'text-negative'}
        bgClass={summary.netIncome >= 0 ? 'bg-positive/5' : 'bg-negative/5'}
      />
      <StatCard
        label="結算後總資產"
        value={summary.netWorth}
        icon={<Wallet className="text-muted-foreground" size={16} />}
        colorClass="text-foreground"
        bgClass="bg-muted/50"
      />
    </div>
  );
}

export function ReportStatusSection({
  reportsGenerated,
  error,
  reportTimestamps,
}: {
  reportsGenerated: boolean;
  error?: string;
  reportTimestamps?: {
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  };
}) {
  return (
    <div className="flex flex-col md:flex-row items-stretch gap-6">
      <div className="flex-1 bg-card border border-border/60 rounded-lg p-8 space-y-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-accent p-2 rounded-lg text-foreground">
              <FileText size={20} />
            </div>
            <h4 className="text-lg font-black text-foreground tracking-tight">正式財務三表</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg font-medium">
            正式報表已改為透過「月度關帳」流程產生，此處僅顯示各報表的產生狀態。
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        {reportsGenerated && reportTimestamps && <ReportStatusGrid timestamps={reportTimestamps} />}
        {!reportsGenerated && (
          <p className="text-sm text-muted-foreground">本期尚未產生正式報表。</p>
        )}
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-negative bg-negative/5 p-4 rounded-xl border border-negative/20 animate-in shake duration-500">
      <AlertCircle size={18} className="shrink-0" />
      {message}
    </div>
  );
}

function ReportStatusGrid({
  timestamps,
}: {
  timestamps: {
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  };
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
      <ReportStatusItem
        label="損益表 (Income)"
        timestamp={timestamps.incomeStatement}
        isDone={!!timestamps.incomeStatement}
      />
      <ReportStatusItem
        label="資產負債表 (BS)"
        timestamp={timestamps.balanceSheet}
        isDone={!!timestamps.balanceSheet}
      />
      <ReportStatusItem
        label="現金流量表 (CF)"
        timestamp={timestamps.cashFlow}
        isDone={!!timestamps.cashFlow}
      />
    </div>
  );
}

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
      className={`${bgClass} border border-border rounded-lg p-5 space-y-2 transition-all hover:shadow-md hover:translate-y-[-2px]`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
      className={`flex flex-col gap-1 p-4 rounded-xl border transition-all ${isDone ? 'bg-muted border-border shadow-sm' : 'bg-card border-dashed border-border opacity-50'}`}
    >
      <span className="text-xs font-black text-foreground tracking-tight">{label}</span>
      <span className="text-[10px] font-bold text-muted-foreground">
        {timestamp ? `LAST UPDATED: ${timestamp}` : 'NOT GENERATED'}
      </span>
    </div>
  );
}
