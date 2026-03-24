import React from 'react';
import { CreditCard, Receipt, Wallet, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Button } from '@/ui/components/ui/button';
import { formatCurrency } from '@/ui/utils';
import { useDebtSummary } from '@/ui/features/dashboard/hooks/useDebtSummary';

interface DebtSummaryCardProps {
  householdId: string | undefined;
}

const DebtSummaryCard: React.FC<DebtSummaryCardProps> = ({ householdId }) => {
  const { totalDebt, monthlyPaymentTotal, unpaidCount, loading, error } = useDebtSummary(householdId);

  if (loading) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center text-rose-500">
        <p>{error}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white">
      <CardHeader className="pb-2 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="text-indigo-600" size={20} />
            <CardTitle className="text-base font-bold text-slate-800">債務摘要</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-indigo-600 p-0 h-auto">
            <Link to="/debt" className="flex items-center gap-1 text-xs font-medium">
              管理債務
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Debt */}
          <div className="flex flex-col p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                <Wallet size={16} />
              </div>
              <span className="text-xs font-medium text-slate-500">總負債</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(Math.round(totalDebt))}
            </span>
          </div>

          {/* Monthly Repayment */}
          <div className="flex flex-col p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Receipt size={16} />
              </div>
              <span className="text-xs font-medium text-slate-500">每月固定還款</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(Math.round(monthlyPaymentTotal))}
            </span>
          </div>

          {/* Unpaid Count */}
          <div 
            className={`flex flex-col p-4 rounded-xl border transition-all hover:shadow-md group ${
              unpaidCount > 0 
                ? 'bg-rose-50 border-rose-100' 
                : 'bg-emerald-50 border-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${
                unpaidCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {unpaidCount > 0 ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              </div>
              <span className={`text-xs font-medium ${
                unpaidCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                本月待繳筆數
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold tabular-nums ${
                unpaidCount > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {unpaidCount}
              </span>
              <span className={`text-xs ${
                unpaidCount > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}>
                筆
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtSummaryCard;
