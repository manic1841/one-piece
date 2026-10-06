import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

interface RetirementRisksProps {
  projection: RetirementProjectionVM;
}

/** 關鍵風險：把投影的關鍵時間點（退休、破產、最低資產、預期壽命終點）直接列出。 */
export const RetirementRisks: React.FC<RetirementRisksProps> = ({ projection }) => (
  <MetricGroup columns={4}>
    {projection.risks.map((risk) => (
      <Metric
        key={risk.key}
        testId={`retirement-risk-${risk.key}`}
        label={risk.label}
        value={risk.valueText}
        tone={risk.tone}
      />
    ))}
  </MetricGroup>
);
