import React from 'react';

import { Link } from 'react-router-dom';

import { type StartingNetWorthSource } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { Button } from '@/ui/components/ui/button';
import { formatCurrency } from '@/ui/utils';

interface CurrentFinancialStateProps {
  netWorthSource: StartingNetWorthSource | null;
}

export const CurrentFinancialState: React.FC<CurrentFinancialStateProps> = ({
  netWorthSource,
}) => {
  if (!netWorthSource || 'reason' in netWorthSource) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          尚無已關帳期間的財務快照，投影無法建立。請先完成每月關帳。
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to="/close">前往每月關帳</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">截至 {netWorthSource.anchorYearMonth}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">資產</p>
          <p className="text-xl font-semibold">{formatCurrency(netWorthSource.assets)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">負債</p>
          <p className="text-xl font-semibold">{formatCurrency(netWorthSource.liabilities)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">期初淨資產</p>
          <p className="text-xl font-semibold">
            {formatCurrency(netWorthSource.startingNetWorth)}
          </p>
        </div>
      </div>
    </div>
  );
};
