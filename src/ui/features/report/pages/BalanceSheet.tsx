import React from 'react';

import { format } from 'date-fns';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { type BalanceSheetGroup } from '@/domains/report/schemas';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { useBalanceSheet } from '@/ui/features/report/hooks/useBalanceSheet';
import { formatCurrency } from '@/ui/utils';

interface BalanceSheetPageProps {
  householdId: string;
  onBack?: () => void;
}

const BalanceSheetPage: React.FC<BalanceSheetPageProps> = ({ householdId, onBack }) => {
  const { data, loading, error, currentDate, nextMonth, prevMonth } = useBalanceSheet(householdId);

  if (error) {
    const errorMsg = String(error);
    return <div className="p-8 text-center text-red-500">Error loading report: {errorMsg}</div>;
  }

  const renderGroup = (group: BalanceSheetGroup) => {
    if (group.items.length === 0) return null;

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">資產負債表 (Balance Sheet)</h1>
            <p className="text-muted-foreground">財務存量分析</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Button variant="ghost" size="icon" onClick={prevMonth} disabled={loading}>
            <ChevronLeft size={18} />
          </Button>
          <div className="flex items-center gap-2 px-3 font-medium min-w-[120px] justify-center">
            <Calendar size={16} className="text-slate-400" />
            <span>{format(currentDate, 'yyyy / MM')}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} disabled={loading}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

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
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(typeof data.equity === 'number' ? data.equity : data.equity.total)}
                </p>
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
              {typeof data.equity === 'object' && data.equity.groups && (
                <div className="space-y-2 pb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-slate-500 rounded-full" />
                    權益 (Equity)
                  </h3>
                  {Object.values(data.equity.groups).map((group) => renderGroup(group as BalanceSheetGroup))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BalanceSheetPage;
