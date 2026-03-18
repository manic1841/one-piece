import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { useCashFlow } from '@/ui/features/report/hooks/useCashFlow';
import { formatCurrency } from '@/ui/utils';
import { format } from 'date-fns';
import { type CashFlowGroup } from '@/domains/report/schemas';
import { cn } from '@/ui/utils/cn';

interface CashFlowStatementProps {
  householdId: string;
  onBack?: () => void;
}

const CashFlowStatement: React.FC<CashFlowStatementProps> = ({ householdId, onBack }) => {
  const { data, loading, error, currentDate, nextMonth, prevMonth } = useCashFlow(householdId);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: false,
    financing: false
  });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return <div className="p-8 text-center text-red-500">Error loading report: {errorMsg}</div>;
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderActivityGroup = (group: CashFlowGroup, id: string) => {
    const isExpanded = expandedSections[id];
    const isPositive = group.total >= 0;

    return (
      <div key={id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              id === 'operating' ? "bg-blue-100 text-blue-600" :
              id === 'investing' ? "bg-purple-100 text-purple-600" :
              "bg-amber-100 text-amber-600"
            )}>
              {id === 'operating' ? <Wallet size={18} /> : 
               id === 'investing' ? <TrendingUp size={18} /> : 
               <TrendingDown size={18} />}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{group.label}</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className={cn(
              "font-mono font-bold text-lg",
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
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
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">流入 (Inflow)</p>
                <div className="space-y-2">
                  {group.inflowItems.map((item, idx) => (
                    <div key={`${item.code}-${idx}`} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">+{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outflows */}
            {group.outflowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">流出 (Outflow)</p>
                <div className="space-y-2">
                  {group.outflowItems.map((item, idx) => (
                    <div key={`${item.code}-${idx}`} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">-{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">活動淨額</span>
                <span className={cn(
                  "font-mono font-bold",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">現金流量表 (Cash Flow)</h1>
            <p className="text-muted-foreground">資金來源與去向</p>
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
        <div className="space-y-6">
          {/* Main Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500 mb-1">期初餘額</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(data.beginningBalance)}
                </p>
              </CardContent>
            </Card>
            <Card className={cn(
              "border-2",
              data.netCashChange >= 0 ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900" : "bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900"
            )}>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500 mb-1">淨現金變動</p>
                <p className={cn(
                  "text-2xl font-bold",
                  data.netCashChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {data.netCashChange > 0 ? '+' : ''}{formatCurrency(data.netCashChange)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-400 mb-1">期末餘額</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(data.endingBalance)}
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

          <p className="text-xs text-slate-400 text-center italic">
            * 期初餘額由上月帳戶快照計算，期末餘額 = 期初 + 淨現金變動。
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default CashFlowStatement;
