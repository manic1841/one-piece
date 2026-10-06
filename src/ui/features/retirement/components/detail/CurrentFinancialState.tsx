import React from 'react';

import { Link } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementWorkspaceLabels,
  RetirementWorkspaceMetricLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type StartingNetWorthSource } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { formatCurrency } from '@/ui/utils';

interface CurrentFinancialStateProps {
  netWorthSource: StartingNetWorthSource | null;
}

/** 期初財務狀態：投影起點的三個數字（資產、負債、期初淨資產）。 */
export const CurrentFinancialState: React.FC<CurrentFinancialStateProps> = ({ netWorthSource }) => {
  if (!netWorthSource || 'reason' in netWorthSource) {
    return (
      <EmptyState
        title={RetirementWorkspaceMetricLabels.stateEmptyTitle}
        description={RetirementWorkspaceMetricLabels.stateEmptyDescription}
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/close">{RetirementWorkspaceLabels.goToClose}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {RetirementWorkspaceMetricLabels.stateAsOfPrefix} {netWorthSource.anchorYearMonth}
      </p>
      <MetricGroup columns={3} lastSpansFull>
        <Metric
          testId="retirement-state-assets"
          label={RetirementWorkspaceMetricLabels.stateAssets}
          value={formatCurrency(netWorthSource.assets)}
        />
        <Metric
          testId="retirement-state-liabilities"
          label={RetirementWorkspaceMetricLabels.stateLiabilities}
          value={formatCurrency(netWorthSource.liabilities)}
        />
        <Metric
          testId="retirement-state-starting-net-worth"
          label={RetirementWorkspaceMetricLabels.stateStartingNetWorth}
          value={formatCurrency(netWorthSource.startingNetWorth)}
        />
      </MetricGroup>
    </div>
  );
};
