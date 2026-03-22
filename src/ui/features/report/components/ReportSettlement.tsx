import React from 'react';

import { AlertCircle, Calendar, Eye, FileBarChart2, HelpCircle, RefreshCw } from 'lucide-react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import { SettlementSummary } from '@/ui/features/project/components/settlement/SettlementSummary';

import { useReportSettlement } from '../hooks/useReportSettlement';
import { ReportPreview } from './ReportPreview';

interface ReportSettlementProps {
  householdId: string;
  userEmail: string;
  onGoToProjectSettlement?: () => void;
}

export const ReportSettlement: React.FC<ReportSettlementProps> = ({
  householdId,
  userEmail,
  onGoToProjectSettlement,
}) => {
  const {
    year,
    month,
    setYear,
    setMonth,
    summary,
    isGenerating,
    reportsGenerated,
    reportTimestamps,
    error,
    isLoading,
    unsettledProjectNames,
    unsettledAccountNames,
    unsettledPortfolioNames,
    unsettledDebtNames,
    generateReports,
    refresh,
    previewData,
    isPreviewing,
    setIsPreviewing,
    fetchPreview,
  } = useReportSettlement(householdId, userEmail);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden rounded-2xl border-0">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-6 px-8 border-b-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20">
                <FileBarChart2 size={24} className="text-indigo-300" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black tracking-tight">財務結算中心</CardTitle>
                <p className="text-xs text-indigo-200/70 font-medium">
                  MONTHLY FINANCIAL SETTLEMENT
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="需先完成專案、帳戶、投資組合與債務的月結算，才可產生正式報表。"
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
              >
                <HelpCircle size={18} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                disabled={isLoading || isGenerating}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all active:scale-90"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="bg-slate-50/50 border-b border-slate-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                <Calendar className="text-indigo-600" size={20} />
              </div>
              <div className="flex-1 min-w-[320px]">
                <YearMonthPicker
                  year={year}
                  month={month}
                  onYearChange={(y) => setYear(parseInt(y) || 0)}
                  onMonthChange={(m) => setMonth(parseInt(m) || 1)}
                  yearLabel="結算年份"
                  monthLabel="結算月份"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 max-w-[280px] bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
              <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                專案、帳戶與債務快照數據取自「專案管理」結算結果。若數據有誤，請回該模組更新。
              </p>
            </div>
          </div>

          <div className="p-8">
            <SettlementSummary
              year={year}
              month={month}
              summary={summary}
              isGenerating={isGenerating}
              reportsGenerated={reportsGenerated}
              onGenerateReports={generateReports}
              reportTimestamps={reportTimestamps}
              error={error}
              unsettledProjectNames={unsettledProjectNames}
              unsettledAccountNames={unsettledAccountNames}
              unsettledPortfolioNames={unsettledPortfolioNames}
              unsettledDebtNames={unsettledDebtNames}
              onGoToProjectSettlement={onGoToProjectSettlement}
            />

            {summary && (
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      disabled={isLoading || isGenerating}
                      onClick={() => fetchPreview().then(() => setIsPreviewing(true))}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold group"
                    >
                      <Eye
                        size={18}
                        className="mr-2 text-slate-400 group-hover:text-indigo-600 transition-colors"
                      />
                      預覽即將發佈之報表
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-slate-900 mb-6">
                        財務報表發佈預覽 ({year}-{month})
                      </DialogTitle>
                    </DialogHeader>
                    {previewData ? (
                      <ReportPreview data={previewData} />
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center space-y-4">
                        <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                        <p className="font-bold text-slate-500">正在計算預覽數據...</p>
                      </div>
                    )}
                    <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
                      <Button
                        variant="ghost"
                        onClick={() => setIsPreviewing(false)}
                        className="rounded-xl font-bold"
                      >
                        關閉預覽
                      </Button>
                      <Button
                        onClick={() => {
                          setIsPreviewing(false);
                          generateReports();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                      >
                        確認數據無誤，正式發佈
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
