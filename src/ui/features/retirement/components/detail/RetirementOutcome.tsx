import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { RetirementWorkspaceMetricLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

interface RetirementOutcomeProps {
  projection: RetirementProjectionVM;
}

/** 投影結論摘要：退休時資產、最低資產年份／金額、是否破產。 */
export const RetirementOutcome: React.FC<RetirementOutcomeProps> = ({ projection }) => (
  <MetricGroup columns={3} lastSpansFull>
    <Metric
      testId="retirement-outcome-savings"
      label={RetirementWorkspaceMetricLabels.outcomeRetirementSavings}
      value={projection.retirementSavingsText}
    />
    <Metric
      testId="retirement-outcome-min-year"
      label={RetirementWorkspaceMetricLabels.outcomeMinYear}
      value={projection.minYearText}
      change={projection.minSavingsText}
    />
    <Metric
      testId="retirement-outcome-bankrupt"
      label={RetirementWorkspaceMetricLabels.outcomeBankrupt}
      value={projection.bankruptText}
      tone={projection.bankruptTone}
    />
  </MetricGroup>
);
