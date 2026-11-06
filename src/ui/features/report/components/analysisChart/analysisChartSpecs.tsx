import { type ReactNode } from 'react';

import { ANALYSIS_ANCHORS, REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { type NetWorthSeriesKey, type ReportAnalysisVM } from '../../viewmodels/reportAnalysis.vm';
import { SECTION_CHARTS } from './analysisSectionCharts';

/** VM keys that hold a chart section; excludes the page-level fields. */
export type SectionVmKey =
  | 'netWorth'
  | 'assetComposition'
  | 'investmentPerformance'
  | 'income'
  | 'cashFlow'
  | 'debtLeverage'
  | 'cashCoverage';

export interface ChartContext {
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
  /** Context series preselected from `?series=`. */
  initialSeries: NetWorthSeriesKey[];
  /** Draw the unclosed caption; only the first block and the last block carry it. */
  showUnclosedLabels: boolean;
}

/**
 * One analysis block. Order here is the page order and the index order; `pair`
 * neighbours share a two-column row, `full` blocks get their own.
 */
export interface AnalysisSectionSpec {
  id: (typeof ANALYSIS_ANCHORS)[keyof typeof ANALYSIS_ANCHORS];
  vmKey: SectionVmKey;
  layout: 'full' | 'pair';
  title: string;
  footnote?: string;
  /** Extra classes on the section band, e.g. to tighten its top padding. */
  sectionClassName?: string;
  /** Draw the unclosed caption; only the first block needs it. */
  showUnclosedLabels?: boolean;
  chart: (vm: ReportAnalysisVM, context: ChartContext) => ReactNode;
}

type SectionMeta = Omit<AnalysisSectionSpec, 'chart'>;

const SECTIONS: readonly SectionMeta[] = [
  {
    id: ANALYSIS_ANCHORS.NET_WORTH,
    vmKey: 'netWorth',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION,
    showUnclosedLabels: true,
  },
  {
    id: ANALYSIS_ANCHORS.ASSET_COMPOSITION,
    vmKey: 'assetComposition',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_SECTION,
  },
  {
    id: ANALYSIS_ANCHORS.INVESTMENT_PERFORMANCE,
    vmKey: 'investmentPerformance',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_HINT,
  },
  {
    id: ANALYSIS_ANCHORS.INCOME,
    vmKey: 'income',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INCOME_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.SAVINGS_FORMULA,
  },
  {
    id: ANALYSIS_ANCHORS.CASH_FLOW,
    vmKey: 'cashFlow',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_FLOW_HINT,
  },
  {
    id: ANALYSIS_ANCHORS.DEBT_LEVERAGE,
    vmKey: 'debtLeverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_SECTION,
  },
  {
    id: ANALYSIS_ANCHORS.CASH_COVERAGE,
    vmKey: 'cashCoverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_HINT,
    sectionClassName: 'pt-4',
    showUnclosedLabels: true,
  },
];

/** The analysis page's blocks, in display order. Adding a block is one entry. */
export const ANALYSIS_SECTIONS: readonly AnalysisSectionSpec[] = SECTIONS.map((section) => ({
  ...section,
  chart: SECTION_CHARTS[section.vmKey],
}));

/** Group `pair` neighbours into rows; `full` blocks stand alone. */
export const groupSections = (
  sections: readonly AnalysisSectionSpec[],
): AnalysisSectionSpec[][] => {
  const rows: AnalysisSectionSpec[][] = [];
  let pair: AnalysisSectionSpec[] = [];
  const flush = () => {
    if (pair.length > 0) rows.push(pair);
    pair = [];
  };
  for (const section of sections) {
    if (section.layout === 'full') {
      flush();
      rows.push([section]);
      continue;
    }
    pair.push(section);
    if (pair.length === 2) flush();
  }
  flush();
  return rows;
};
