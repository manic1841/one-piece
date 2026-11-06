import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

/** Point caption; a still-open period is named as provisional. */
export const pointTitle = (point: { label: string; unclosed: boolean }): string =>
  `${point.label}${point.unclosed ? REPORT_ANALYSIS_LABELS.PROVISIONAL_SUFFIX : ''}`;
