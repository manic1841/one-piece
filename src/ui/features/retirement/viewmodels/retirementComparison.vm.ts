import { type RetirementAgeComparison } from '@/application/retirement/workflows/compareRetirementAges';
import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { PREVIEW_LABELS } from '@/ui/constants/retirement/previewLabels';
import {
  resolveErrorLabel,
  resolveValidationIssueLabel,
} from '@/ui/constants/retirement/resultLabels';
import {
  type ProjectionSummaryVM,
  mapProjectionSummaryToVM,
} from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { formatCurrency } from '@/ui/utils';

export interface RetirementComparisonVM {
  age: number;
  summary: ProjectionSummaryVM | null;
  error: string | null;
  finalDelta: string | null;
  retirementDelta: string | null;
}

const delta = (value: number | null, base: number | null): string | null => {
  if (value === null || base === null) return null;
  const difference = value - base;
  // The contract: a difference only shows when the ages actually differ.
  if (difference === 0) return null;
  return `${difference > 0 ? '+' : ''}${formatCurrency(difference)}`;
};

export function mapRetirementComparison(
  comparison: RetirementAgeComparison,
  baseline: ProjectionSummary,
): RetirementComparisonVM {
  const { age, outcome } = comparison;
  if (!outcome.ok) {
    const messages = [
      ...(outcome.errors?.map(resolveErrorLabel) ?? []),
      ...(outcome.issues?.map(resolveValidationIssueLabel) ?? []),
    ];
    return {
      age,
      summary: null,
      error: messages.join(' · ') || PREVIEW_LABELS.COMPARISON_FAILED,
      finalDelta: null,
      retirementDelta: null,
    };
  }
  return {
    age,
    summary: mapProjectionSummaryToVM(outcome.summary),
    error: null,
    finalDelta: delta(outcome.summary.finalNetWorth, baseline.finalNetWorth),
    retirementDelta: delta(outcome.summary.retirementNetWorth, baseline.retirementNetWorth),
  };
}
