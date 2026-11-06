import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

/** Point caption; a still-open period is named as provisional. */
export const pointTitle = (point: { label: string; unclosed: boolean }): string =>
  `${point.label}${point.unclosed ? REPORT_ANALYSIS_LABELS.PROVISIONAL_SUFFIX : ''}`;

/** Tooltip point: the first visible part is the value, the rest become meta. */
export const tooltipFrom = (title: string, parts: (string | null)[]) => {
  const visible = parts.filter((part): part is string => part !== null);
  return {
    title,
    value: visible[0] ?? REPORT_ANALYSIS_LABELS.DASH,
    meta: visible.slice(1).join(' · '),
  };
};
