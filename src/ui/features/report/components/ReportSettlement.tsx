import React from 'react';

import { AlertCircle, Calendar, FileBarChart2, HelpCircle, RefreshCw } from 'lucide-react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { SettlementSummary } from '@/ui/features/project/components/settlement/SettlementSummary';

import { useReportSettlement } from '../hooks/useReportSettlement';

interface ReportSettlementProps {
  householdId: string;
  onGoToProjectSettlement?: () => void;
}

export const ReportSettlement: React.FC<ReportSettlementProps> = ({
  householdId,
  onGoToProjectSettlement,
}) => {
  const {
    year,
    month,
    setYear,
    setMonth,
    summary,
    reportsGenerated,
    reportTimestamps,
    error,
    isLoading,
    unsettledProjectNames,
    unsettledAccountNames,
    unsettledPortfolioNames,
    unsettledDebtNames,
    debtNoRepaymentWarningNames,
    refresh,
  } = useReportSettlement(householdId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      <Card className="border-border/60 overflow-hidden rounded-lg border-0">
        <CardHeader className="bg-elevated text-foreground py-6 px-8 border-b-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-foreground/10 p-2.5 rounded-lg backdrop-blur-md border border-foreground/20">
                <FileBarChart2 size={24} className="text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black tracking-tight">財務結算中心</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">
                  MONTHLY FINANCIAL SETTLEMENT
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="需先完成專案、帳戶、投資組合與債務的月結算，才可產生正式報表。"
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 h-9 w-9 rounded-sm"
              >
                <HelpCircle size={18} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 h-9 w-9 rounded-sm transition-all active:scale-90"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="bg-muted/50 border-b border-border p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-card p-3 rounded-lg border border-border shrink-0">
                <Calendar className="text-muted-foreground" size={20} />
              </div>
              <div className="flex-1 min-w-[320px]">
                <YearMonthPicker
                  year={year}
                  month={month}
                  onYearChange={(y) => setYear(parseInt(y) || 0)}
                  onMonthChange={(m) => setMonth(parseInt(m) || 1)}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 max-w-[280px] bg-warning/5 p-3 rounded-lg border border-warning/20">
              <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">
                專案與帳戶快照數據取自「專案管理」結算結果；債務數據取自「債務管理」。若數據有誤，請回該模組更新。
              </p>
            </div>
          </div>

          <div className="p-8">
            <SettlementSummary
              year={year}
              month={month}
              summary={summary}
              isLoadingSummary={isLoading}
              reportsGenerated={reportsGenerated}
              reportTimestamps={reportTimestamps}
              error={error}
              unsettledProjectNames={unsettledProjectNames}
              unsettledAccountNames={unsettledAccountNames}
              unsettledPortfolioNames={unsettledPortfolioNames}
              unsettledDebtNames={unsettledDebtNames}
              debtNoRepaymentWarningNames={debtNoRepaymentWarningNames}
              onGoToProjectSettlement={onGoToProjectSettlement}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
