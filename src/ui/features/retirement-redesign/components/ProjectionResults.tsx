import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement-redesign/displayLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement-redesign/resultLabels';
import { CashFlowChart } from '@/ui/features/retirement-redesign/components/CashFlowChart';
import { NetWorthChart } from '@/ui/features/retirement-redesign/components/NetWorthChart';
import { SummaryMetrics } from '@/ui/features/retirement-redesign/components/SummaryMetrics';
import { YearlyDetails } from '@/ui/features/retirement-redesign/components/YearlyDetails';
import { type ProjectionSummary } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';
import { type RetirementProjectionVM } from '@/ui/features/retirement-redesign/viewmodels/projectionDisplayVm';
import { formatCurrency } from '@/ui/utils';

interface ProjectionResultsProps {
  projection: RetirementProjectionVM;
  summary: ProjectionSummary;
}

const money = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : formatCurrency(value);

const year = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : String(value);

/** Calculated preview: six summary metrics, trajectory and yearly breakdown. */
export function ProjectionResults({ projection, summary }: ProjectionResultsProps) {
  return (
    <div className="space-y-6" data-testid="projection-results">
      <SummaryMetrics
        summary={{
          retirementNetWorthText: money(summary.retirementNetWorth),
          finalNetWorthText: money(summary.finalNetWorth),
          minNetWorthText: money(summary.minNetWorth),
          minNetWorthYearText: year(summary.minNetWorthYear),
          bankruptcyYearText: year(summary.bankruptcyYear),
          isBankruptText: summary.isBankrupt
            ? PROJECTION_COMMON_LABELS.YES
            : PROJECTION_COMMON_LABELS.NO,
          isBankrupt: summary.isBankrupt,
        }}
      />

      <PageSection title={PROJECTION_RESULT_LABELS.NET_WORTH_SECTION} spacing="compact">
        <NetWorthChart projection={projection} />
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.CASH_FLOW_SECTION} spacing="compact">
        <CashFlowChart projection={projection} />
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.YEARS_SECTION} spacing="compact">
        <YearlyDetails projection={projection} />
      </PageSection>
    </div>
  );
}
