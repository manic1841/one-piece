import React, { useState } from 'react';

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Card, CardContent } from '@/ui/components/ui/card';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { useCashFlow } from '@/ui/features/report/hooks/useCashFlow';
import { type CashFlowGroupVM } from '@/ui/features/report/viewmodels/reportDisplay.vm';
import { cn } from '@/ui/utils/cn';

import { ReportHeader, type ReportMode, type ReportView } from '../components/ReportHeader';

interface CashFlowStatementProps {
  householdId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ReportView) => void;
  onBack: () => void;
  reportMode: ReportMode;
  onReportModeChange: (mode: ReportMode) => void;
}

const CashFlowStatement: React.FC<CashFlowStatementProps> = ({
  householdId,
  currentDate,
  onDateChange,
  onViewChange,
  onBack,
  reportMode,
  onReportModeChange,
}) => {
  const { data, loading, error } = useCashFlow(householdId, currentDate, reportMode);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: false,
    financing: false,
  });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return <div className="p-8 text-center text-destructive">Error loading report: {errorMsg}</div>;
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderActivityGroup = (group: CashFlowGroupVM, id: string) => {
    const isExpanded = expandedSections[id];
    const isPositive = group.total >= 0;

    return (
      <div
        key={id}
        className="bg-card rounded-lg border border-border overflow-hidden mb-4"
      >
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                id === 'operating'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-accent text-foreground',
              )}
            >
              {id === 'operating' ? (
                <Wallet size={18} />
              ) : id === 'investing' ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )}
            </div>
            <h3 className="font-bold text-foreground">{group.label}</h3>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono font-bold text-lg',
                isPositive
                  ? 'text-positive'
                  : 'text-negative',
              )}
            >
              {group.totalText}
            </span>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {/* Inflows */}
            {group.inflowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  流入 (Inflow)
                </p>
                <div className="space-y-2">
                  {group.inflowItems.map((item, idx) => (
                    <div
                      key={`${item.code}-${idx}`}
                      className="flex justify-between items-center text-sm py-1"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono text-positive">
                        +{item.amountText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outflows */}
            {group.outflowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  流出 (Outflow)
                </p>
                <div className="space-y-2">
                  {group.outflowItems.map((item, idx) => (
                    <div
                      key={`${item.code}-${idx}`}
                      className="flex justify-between items-center text-sm py-1"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono text-negative">
                        -{item.amountText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-dashed border-border flex justify-between items-center">
              <span className="font-semibold text-foreground">活動淨額</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  isPositive
                    ? 'text-positive'
                    : 'text-negative',
                )}
              >
                {group.totalText}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ReportHeader
        title={REPORT_VIEW_TITLES.CASH_FLOW}
        subtitle="資金來源與去向，衡量財務流動性。"
        currentDate={currentDate}
        onDateChange={onDateChange}
        onBack={onBack}
        currentView="CASH_FLOW"
        onViewChange={onViewChange}
        reportMode={reportMode}
        onReportModeChange={onReportModeChange}
      />

      {!data && loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Main Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-muted">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">期初餘額</p>
                <p className="text-lg font-bold text-foreground">
                  {data.beginningBalanceText}
                </p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'border-2',
                data.netCashChange >= 0
                  ? 'bg-positive/5 border-positive/20'
                  : 'bg-negative/5 border-negative/20',
              )}
            >
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">淨現金變動</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    data.netCashChange >= 0
                      ? 'text-positive'
                      : 'text-negative',
                  )}
                >
                  {data.netCashChange > 0 ? '+' : ''}
                  {data.netCashChangeText}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">期末餘額 (計算)</p>
                <p className="text-lg font-bold text-foreground">
                  {data.endingBalanceText}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">帳戶實際餘額</p>
                <p className="text-lg font-bold text-primary-foreground">
                  {data.actualBalanceText}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activities List */}
          <div className="space-y-2">
            {renderActivityGroup(data.operating, 'operating')}
            {renderActivityGroup(data.investing, 'investing')}
            {renderActivityGroup(data.financing, 'financing')}
          </div>

          {/* Reconciliation Alert */}
          {data.adjustment !== 0 && (
            <Alert
              variant="destructive"
              className="border-warning/40 bg-warning/5 text-warning"
            >
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                對帳差異提醒：期末現金（計算值：{data.endingBalanceText}）與帳戶實際餘額（
                {data.actualBalanceText}）存在差異， 金額為{' '}
                <span className="font-bold underline">{data.adjustmentText}</span>。
                請確認是否有漏記交易，或帳戶結算金額是否有誤。
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground text-center italic">
            * 帳戶實際餘額取自各帳戶該月份之結算金額。
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default CashFlowStatement;
