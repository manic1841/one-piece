import React from 'react';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Card, CardContent } from '@/ui/components/ui/card';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { useBalanceSheet } from '@/ui/features/report/hooks/useBalanceSheet';
import {
  type BalanceSheetGroupVM,
  type BalanceSheetVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';
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
  const { data, loading, errorMessage } = useBalanceSheet(householdId, currentDate, reportMode);

  if (errorMessage) {
    return (
      <div className="p-8 text-center text-destructive">Error loading report: {errorMessage}</div>
    );
  }

  const renderGroup = (group: BalanceSheetGroupVM) => {
    if (group.total === 0) return null;
    return (
      <div key={group.label} className="mb-6">
        <div className="flex justify-between items-center mb-2 px-2">
          <h4 className="font-semibold text-foreground">{group.label}</h4>
          <span className="font-bold text-foreground">{group.totalText}</span>
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {group.items.map((item) => (
            <div
              key={item.code}
              className="flex justify-between items-center py-3 px-4 border-b last:border-0 border-border hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono text-foreground">{item.amountText}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEquity = (equity: BalanceSheetVM['equity']) => {
    const adjustmentTotal = equity.groups.adjustment?.total || 0;
    const showWarning = Math.abs(adjustmentTotal) > 1000;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-muted-foreground rounded-full" />
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
                  <h4 className="font-semibold text-foreground">
                    {equity.groups.adjustment.label}
                  </h4>
                  {showWarning && <AlertTriangle className="w-4 h-4 text-warning" />}
                </div>
                <span
                  className={cn(
                    'font-bold',
                    Math.abs(adjustmentTotal) > 0 ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  {equity.groups.adjustment.totalText}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center py-4 px-4 bg-primary text-primary-foreground rounded-lg">
            <span className="font-bold">期末權益 (Total Equity)</span>
            <span className="text-xl font-bold">{equity.totalText}</span>
          </div>
        </div>

        {showWarning && (
          <Alert variant="destructive" className="border-warning/40 bg-warning/5 text-warning">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              注意：調整項目偏大，請確認是否有漏記交易，或帳戶結算金額是否正確。
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ReportHeader
        title={REPORT_VIEW_TITLES.BALANCE_SHEET}
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
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-primary mb-1">資產合計</p>
                <p className="text-2xl font-bold text-primary">{data.assets.totalText}</p>
              </CardContent>
            </Card>
            <Card className="bg-negative/5 border-negative/20">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-negative mb-1">負債合計</p>
                <p className="text-2xl font-bold text-negative">{data.liabilities.totalText}</p>
              </CardContent>
            </Card>
            <Card className="bg-primary">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">淨資產 (Equity)</p>
                <p className="text-2xl font-bold text-primary-foreground">
                  {data.equity.totalText}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets side */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full" />
                資產 (Assets)
              </h3>
              {Object.values(data.assets.groups).map((group) => renderGroup(group))}
            </div>

            <div className="space-y-8">
              {/* Liabilities side */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-negative rounded-full" />
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
