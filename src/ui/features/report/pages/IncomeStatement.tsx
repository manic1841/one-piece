import React, { useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { type IncomeStatementItem } from '@/domains/report/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { useIncomeStatement } from '@/ui/features/report/hooks/useIncomeStatement';
import { formatCurrency } from '@/ui/utils';

import { ReportHeader, type ReportView } from '../components/ReportHeader';

interface IncomeStatementPageProps {
  householdId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ReportView) => void;
  onBack: () => void;
}

const IncomeStatementPage: React.FC<IncomeStatementPageProps> = ({
  householdId,
  currentDate,
  onDateChange,
  onViewChange,
  onBack,
}) => {
  const { data, loading, error } = useIncomeStatement(householdId, currentDate);
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

  const renderItem = (item: IncomeStatementItem, depth = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedCodes.has(item.code);

    return (
      <div
        key={item.code}
        className="border-b last:border-0 border-slate-100 dark:border-slate-800"
      >
        <div
          className={`flex items-center justify-between py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer ${depth > 0 ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}`}
          onClick={() => hasSubItems && toggleExpand(item.code)}
        >
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
            {hasSubItems ? (
              isExpanded ? (
                <ChevronDown size={16} className="text-slate-400" />
              ) : (
                <ChevronRight size={16} className="text-slate-400" />
              )
            ) : (
              <div className="w-4" />
            )}
            <span
              className={`${depth === 0 ? 'font-medium' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {item.label}
            </span>
          </div>
          <span className={`font-mono ${depth === 0 ? 'font-bold' : ''}`}>
            {formatCurrency(item.amount)}
          </span>
        </div>
        {isExpanded && hasSubItems && (
          <div className="bg-slate-50/30 dark:bg-slate-900/10">
            {item.subItems!.map((sub: IncomeStatementItem) => renderItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    const errorMsg = typeof error === 'string' ? error : String(error);
    return <div className="p-8 text-center text-red-500">Error loading report: {errorMsg}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ReportHeader
        title="損益表 (Income Statement)"
        subtitle="收入與支出分析，掌握每月的淨利潤。"
        currentDate={currentDate}
        onDateChange={onDateChange}
        onBack={onBack}
        currentView="INCOME_STATEMENT"
        onViewChange={onViewChange}
      />

      {!data && loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  收入合計
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(data.incomeTotal)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">
                  支出合計
                </p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {formatCurrency(data.expenseTotal)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500 mb-1">淨收入</p>
                <p
                  className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-primary' : 'text-rose-600'}`}
                >
                  {formatCurrency(data.netIncome)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Income Table */}
            <Card overflow-hidden>
              <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-emerald-100/50">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  收入 (Income)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.incomeItems.length > 0 ? (
                  data.incomeItems.map((item) => renderItem(item))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic">本月無收入資料</div>
                )}
              </CardContent>
            </Card>

            {/* Expense Table */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100/50">
                <CardTitle className="text-lg flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  支出 (Expense)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.expenseItems.length > 0 ? (
                  data.expenseItems.map((item) => renderItem(item))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic">本月無支出資料</div>
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
