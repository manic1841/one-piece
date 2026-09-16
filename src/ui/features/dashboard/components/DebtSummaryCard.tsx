import React from 'react';

import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Receipt, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { useDebtSummary } from '@/ui/features/dashboard/hooks/useDebtSummary';

interface DebtSummaryCardProps {
  householdId: string | undefined;
}

const DebtSummaryCard: React.FC<DebtSummaryCardProps> = ({ householdId }) => {
  const { cardVM, loading, error } = useDebtSummary(householdId);

  if (loading) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center text-negative">
        <p>{error}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-card">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="text-muted-foreground" size={20} />
            <CardTitle className="text-base font-bold text-foreground">債務摘要</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground p-0 h-auto"
          >
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
          <div className="flex flex-col p-4 rounded-xl bg-muted border border-border transition-all hover:shadow-md group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent text-foreground">
                <Wallet size={16} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">總負債</span>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums">
              {cardVM.totalDebtText}
            </span>
          </div>

          {/* Monthly Repayment */}
          <div className="flex flex-col p-4 rounded-xl bg-muted border border-border transition-all hover:shadow-md group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-positive/15 text-positive">
                <Receipt size={16} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">每月固定還款</span>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums">
              {cardVM.monthlyPaymentText}
            </span>
          </div>

          {/* Unpaid Count */}
          <div
            className={`flex flex-col p-4 rounded-xl border transition-all hover:shadow-md group ${cardVM.unpaidContainerClassName}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${cardVM.unpaidIconClassName}`}>
                {cardVM.isUnpaid ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              </div>
              <span className={`text-xs font-medium ${cardVM.unpaidLabelClassName}`}>
                本月待繳筆數
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold tabular-nums ${cardVM.unpaidCountClassName}`}>
                {cardVM.unpaidCountText}
              </span>
              <span className={`text-xs ${cardVM.unpaidUnitClassName}`}>
                {cardVM.unpaidUnitText}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtSummaryCard;
