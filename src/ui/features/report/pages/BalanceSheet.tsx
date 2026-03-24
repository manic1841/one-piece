import React from 'react';

import { AlertTriangle } from 'lucide-react';

import { type BalanceSheetData, type BalanceSheetGroup } from '@/domains/report/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/ui/alert';
import { Card, CardContent } from '@/ui/components/ui/card';
import { useBalanceSheet } from '@/ui/features/report/hooks/useBalanceSheet';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { ReportHeader, type ReportMode, type ReportView } from '../components/ReportHeader';

interface BalanceSheetPageProps {
  householdId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ReportView) => void;
  onBack: () => void;
  reportMode: ReportMode;
  onReportModeChange: (mode: ReportMode) => void;
}

const BalanceSheetPage: React.FC<BalanceSheetPageProps> = ({
  householdId,
  currentDate,
  onDateChange,
  onViewChange,
  onBack,
  reportMode,
  onReportModeChange,
}) => {
  const { data, loading, error } = useBalanceSheet(householdId, currentDate, reportMode);

  if (error) {
    const errorMsg = String(error);
    return <div className="p-8 text-center text-red-500">Error loading report: {errorMsg}</div>;
  }

  const renderGroup = (group: BalanceSheetGroup) => {
    if (group.total === 0) return null;
    return (
      <div key={group.label} className="mb-6">
        <div className="flex justify-between items-center mb-2 px-2">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300">{group.label}</h4>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(group.total)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {group.items.map((item) => (
            <div
              key={item.code}
              className="flex justify-between items-center py-3 px-4 border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEquity = (equity: BalanceSheetData['equity']) => {
    const adjustmentTotal = equity.groups.adjustment?.total || 0;
    const showWarning = Math.abs(adjustmentTotal) > 1000;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-slate-500 rounded-full" />
          權益 (Equity)
        </h3>

        <div className="space-y-2">
          {Object.entries(equity.groups).map(([id, group]) => {
            if (id === 'adjustment') return null; // Handle adjustment separately for warning
            return renderGroup(group);
          })}

          {/* Render Adjustment with warning if needed */}
          {equity.groups.adjustment && (
            <div key="adjustment" className="mb-6">
              <div className="flex justify-between items-center mb-2 px-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                    {equity.groups.adjustment.label}
                  </h4>
                  {showWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <span
                  className={cn(
                    'font-bold',
                    Math.abs(adjustmentTotal) > 0 ? 'text-amber-600' : 'text-slate-500',
                  )}
                >
                  {formatCurrency(adjustmentTotal)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center py-4 px-4 bg-slate-900 text-white rounded-xl">
            <span className="font-bold">期末權益 (Total Equity)</span>
            <span className="text-xl font-bold">{formatCurrency(equity.total)}</span>
          </div>
        </div>

        {showWarning && (
          <Alert
            variant="destructive"
            className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>
              調整項目偏大，請確認是否有漏記交易，或帳戶結算金額是否正確。
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ReportHeader
        title="資產負債表 (BS)"
        subtitle="財務存量分析，掌握資產與負債分佈。"
        currentDate={currentDate}
        onDateChange={onDateChange}
        onBack={onBack}
        currentView="BALANCE_SHEET"
        onViewChange={onViewChange}
        reportMode={reportMode}
        onReportModeChange={onReportModeChange}
      />

      {!data && loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  資產合計
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(data.assets.total)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">
                  負債合計
                </p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {formatCurrency(data.liabilities.total)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 text-white">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-400 mb-1">淨資產 (Equity)</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.equity.total)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets side */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                資產 (Assets)
              </h3>
              {Object.values(data.assets.groups).map((group) => renderGroup(group))}
            </div>

            <div className="space-y-8">
              {/* Liabilities side */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-rose-500 rounded-full" />
                  負債 (Liabilities)
                </h3>
                {Object.values(data.liabilities.groups).map((group) => renderGroup(group))}
              </div>

              {/* Equity side */}
              {renderEquity(data.equity)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BalanceSheetPage;
