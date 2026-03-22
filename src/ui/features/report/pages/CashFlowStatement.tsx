import React, { useState } from 'react';

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { type CashFlowGroup } from '@/domains/report/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/ui/alert';
import { Card, CardContent } from '@/ui/components/ui/card';
import { useCashFlow } from '@/ui/features/report/hooks/useCashFlow';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { ReportHeader, type ReportView } from '../components/ReportHeader';

interface CashFlowStatementProps {
  householdId: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ReportView) => void;
  onBack: () => void;
}

const CashFlowStatement: React.FC<CashFlowStatementProps> = ({
  householdId,
  currentDate,
  onDateChange,
  onViewChange,
  onBack,
}) => {
  const { data, loading, error } = useCashFlow(householdId, currentDate);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: false,
    financing: false,
  });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return <div className="p-8 text-center text-red-500">Error loading report: {errorMsg}</div>;
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderActivityGroup = (group: CashFlowGroup, id: string) => {
    const isExpanded = expandedSections[id];
    const isPositive = group.total >= 0;

    return (
      <div
        key={id}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-4"
      >
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                id === 'operating'
                  ? 'bg-blue-100 text-blue-600'
                  : id === 'investing'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-amber-100 text-amber-600',
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
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{group.label}</h3>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono font-bold text-lg',
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {formatCurrency(group.total)}
            </span>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            {/* Inflows */}
            {group.inflowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  流入 (Inflow)
                </p>
                <div className="space-y-2">
                  {group.inflowItems.map((item, idx) => (
                    <div
                      key={`${item.code}-${idx}`}
                      className="flex justify-between items-center text-sm py-1"
                    >
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outflows */}
            {group.outflowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  流出 (Outflow)
                </p>
                <div className="space-y-2">
                  {group.outflowItems.map((item, idx) => (
                    <div
                      key={`${item.code}-${idx}`}
                      className="flex justify-between items-center text-sm py-1"
                    >
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">
                        -{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="font-semibold text-slate-700 dark:text-slate-300">活動淨額</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {formatCurrency(group.total)}
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
        title="現金流量表 (Cash Flow)"
        subtitle="資金來源與去向，衡量財務流動性。"
        currentDate={currentDate}
        onDateChange={onDateChange}
        onBack={onBack}
        currentView="CASH_FLOW"
        onViewChange={onViewChange}
      />

      {!data && loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Main Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-slate-500 mb-1">期初餘額</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(data.beginningBalance)}
                </p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'border-2',
                data.netCashChange >= 0
                  ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900'
                  : 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900',
              )}
            >
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-slate-500 mb-1">淨現金變動</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    data.netCashChange >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {data.netCashChange > 0 ? '+' : ''}
                  {formatCurrency(data.netCashChange)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-slate-500 mb-1">期末餘額 (計算)</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(data.endingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 px-4">
                <p className="text-sm font-medium text-slate-400 mb-1">帳戶實際餘額</p>
                <p className="text-lg font-bold text-white">{formatCurrency(data.actualBalance)}</p>
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
              className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertTitle>對帳差異提醒</AlertTitle>
              <AlertDescription>
                期末現金（計算值：{formatCurrency(data.endingBalance)}）與帳戶實際餘額（
                {formatCurrency(data.actualBalance)}）存在差異， 金額為{' '}
                <span className="font-bold underline">{formatCurrency(data.adjustment)}</span>。
                請確認是否有漏記交易，或帳戶結算金額是否有誤。
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-slate-400 text-center italic">
            * 帳戶實際餘額取自各帳戶該月份之結算金額。
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default CashFlowStatement;
