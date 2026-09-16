import React, { useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { useIncomeStatement } from '@/ui/features/report/hooks/useIncomeStatement';
import { type IncomeStatementItemVM } from '@/ui/features/report/viewmodels/reportDisplay.vm';

import { ReportHeader, type ReportMode, type ReportView } from '../components/ReportHeader';

interface IncomeStatementPageProps {
  householdId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ReportView) => void;
  onBack: () => void;
  reportMode: ReportMode;
  onReportModeChange: (mode: ReportMode) => void;
}

const IncomeStatementPage: React.FC<IncomeStatementPageProps> = ({
  householdId,
  currentDate,
  onDateChange,
  onViewChange,
  onBack,
  reportMode,
  onReportModeChange,
}) => {
  const { data, loading, error } = useIncomeStatement(householdId, currentDate, reportMode);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  const toggleExpand = (code: string) => {
    const next = new Set(expandedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setExpandedCodes(next);
  };

  const renderItem = (item: IncomeStatementItemVM, depth = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedCodes.has(item.code);

    return (
      <div
        key={item.code}
        className="border-b last:border-0 border-border dark:border-slate-800"
      >
        <div
          className={`flex items-center justify-between py-3 px-2 hover:bg-muted dark:hover:bg-slate-900 transition-colors cursor-pointer ${depth > 0 ? 'bg-muted/50 dark:bg-slate-900/30' : ''}`}
          onClick={() => hasSubItems && toggleExpand(item.code)}
        >
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
            {hasSubItems ? (
              isExpanded ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
            <span
              className={`${depth === 0 ? 'font-medium' : 'text-muted-foreground dark:text-slate-400'}`}
            >
              {item.label}
            </span>
          </div>
          <span className={`font-mono ${depth === 0 ? 'font-bold' : ''}`}>{item.amountText}</span>
        </div>
        {isExpanded && hasSubItems && (
          <div className="bg-muted/30 dark:bg-slate-900/10">
            {item.subItems!.map((sub: IncomeStatementItemVM) => renderItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    const errorMsg = typeof error === 'string' ? error : String(error);
    return <div className="p-8 text-center text-destructive">Error loading report: {errorMsg}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ReportHeader
        title={REPORT_VIEW_TITLES.INCOME_STATEMENT}
        subtitle="收入與支出分析，掌握每月的淨利潤。"
        currentDate={currentDate}
        onDateChange={onDateChange}
        onBack={onBack}
        currentView="INCOME_STATEMENT"
        onViewChange={onViewChange}
        reportMode={reportMode}
        onReportModeChange={onReportModeChange}
      />

      {!data && loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-positive/5 dark:bg-emerald-950/20 border-positive/20 dark:border-emerald-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-positive dark:text-emerald-400 mb-1">
                  收入合計
                </p>
                <p className="text-2xl font-bold text-positive dark:text-emerald-300">
                  {data.incomeTotalText}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-negative/5 dark:bg-rose-950/20 border-negative/20 dark:border-rose-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-negative dark:text-rose-400 mb-1">
                  支出合計
                </p>
                <p className="text-2xl font-bold text-negative dark:text-rose-300">
                  {data.expenseTotalText}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">淨收入</p>
                <p
                  className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-primary' : 'text-negative'}`}
                >
                  {data.netIncomeText}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Income Table */}
            <Card className="bg-positive/5 dark:bg-emerald-950/20 border-positive/20 dark:border-emerald-900">
              <CardHeader className="bg-positive/5 dark:bg-emerald-950/10 border-b border-positive/10">
                <CardTitle className="text-lg flex items-center gap-2 text-positive dark:text-emerald-300">
                  收入 (Income)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.incomeItems.length > 0 ? (
                  data.incomeItems.map((item) => renderItem(item))
                ) : (
                  <div className="p-8 text-center text-muted-foreground italic">本月無收入資料</div>
                )}
              </CardContent>
            </Card>

            {/* Expense Table */}
            <Card className="bg-negative/5 dark:bg-rose-950/20 border-negative/20 dark:border-rose-900">
              <CardHeader className="bg-negative/5 dark:bg-rose-950/10 border-b border-negative/10">
                <CardTitle className="text-lg flex items-center gap-2 text-negative dark:text-rose-300">
                  支出 (Expense)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.expenseItems.length > 0 ? (
                  data.expenseItems.map((item) => renderItem(item))
                ) : (
                  <div className="p-8 text-center text-muted-foreground italic">本月無支出資料</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default IncomeStatementPage;
