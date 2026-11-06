import { type ComposedReferenceLine } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

/** Drop the labels so a lower layer can draw the same markers without repeating them. */
export const withoutLabels = (lines: readonly ComposedReferenceLine[]): ComposedReferenceLine[] =>
  lines.map(({ index, tone }) => ({ index, tone }));

/** One labelled warning marker at the first index of every contiguous unclosed run. */
export const unclosedReferenceLines = (
  points: readonly { unclosed: boolean }[],
): ComposedReferenceLine[] =>
  points.flatMap((point, index) => {
    if (!point.unclosed || points[index - 1]?.unclosed === true) return [];
    return [{ index, tone: 'warning', label: REPORT_ANALYSIS_LABELS.UNCLOSED_MARKER }];
  });
