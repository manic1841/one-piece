import React from 'react';

import { Briefcase } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Portfolio, type PortfolioSnapshot } from '@/schemas';
import { formatYearMonth } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface PortfolioItemProps {
  portfolio: Portfolio;
  latestSnapshot?: PortfolioSnapshot;
  onClick: (id: string) => void;
}

export const PortfolioItem: React.FC<PortfolioItemProps> = ({
  portfolio,
  latestSnapshot,
  onClick,
}) => {
  return (
    <Card
      className="cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => onClick(portfolio.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{portfolio.name}</CardTitle>
        <Briefcase className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {latestSnapshot ? formatCurrency(latestSnapshot.totalValue) : '--'}
        </div>
        <p className="text-xs text-muted-foreground">
          {latestSnapshot
            ? `As of ${formatYearMonth(latestSnapshot.year, latestSnapshot.month)}`
            : `${portfolio.accountIds.length} linked accounts`}
        </p>
        {portfolio.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{portfolio.description}</p>
        )}
      </CardContent>
    </Card>
  );
};
