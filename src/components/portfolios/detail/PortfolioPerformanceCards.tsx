import React from 'react';
import { formatCurrency, formatPercentage } from '../../../utils/formatUtils';
import { formatYearMonth } from '../../../utils/dateUtils';
import { type PortfolioSnapshot } from '../../../schemas';
import { PerformanceCard } from './PerformanceCard';

interface PortfolioPerformanceCardsProps {
  latestSnapshot: PortfolioSnapshot | null;
}

export const PortfolioPerformanceCards: React.FC<PortfolioPerformanceCardsProps> = ({ latestSnapshot }) => {
  const getTrend = (value: number) => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'green';
    if (value < 0) return 'red';
    return 'default';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <PerformanceCard
        title="Total Value"
        value={latestSnapshot ? formatCurrency(latestSnapshot.totalValue) : '--'}
        subValue={latestSnapshot ? formatYearMonth(latestSnapshot.year, latestSnapshot.month) : 'No data'}
      />
      
      <PerformanceCard
        title="Monthly Return"
        value={latestSnapshot ? formatPercentage(latestSnapshot.performance.returnRate, 2) : '--'}
        subValue={latestSnapshot ? formatCurrency(latestSnapshot.performance.gain) : '--'}
        trend={latestSnapshot ? getTrend(latestSnapshot.performance.returnRate) : undefined}
        valueColor={latestSnapshot ? getValueColor(latestSnapshot.performance.returnRate) : 'default'}
      />

      <PerformanceCard
        title="Cumulative Return"
        value={latestSnapshot ? formatPercentage(latestSnapshot.performance.cumulativeReturnRate, 2) : '--'}
        subValue={latestSnapshot ? formatCurrency(latestSnapshot.performance.cumulativeGain) : '--'}
        trend={latestSnapshot ? getTrend(latestSnapshot.performance.cumulativeReturnRate) : undefined}
        valueColor={latestSnapshot ? getValueColor(latestSnapshot.performance.cumulativeReturnRate) : 'default'}
      />

      <PerformanceCard
        title="Net Cash Flow (MoM)"
        value={latestSnapshot ? formatCurrency(latestSnapshot.performance.netCashFlow) : '--'}
        subValue={`In: ${latestSnapshot ? formatCurrency(latestSnapshot.cashFlow.deposits) : '--'} / Out: ${latestSnapshot ? formatCurrency(latestSnapshot.cashFlow.withdrawals) : '--'}`}
      />
    </div>
  );
};

