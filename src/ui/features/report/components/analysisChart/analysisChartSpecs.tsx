import { ANALYSIS_ANCHORS, REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { type ReportAnalysisVM } from '../../viewmodels/reportAnalysis.vm';
import { type RenderChart } from './engine/types';
import { assetCompositionChart } from './sections/assetComposition';
import { cashCoverageChart } from './sections/cashCoverage';
import { cashFlowChart } from './sections/cashFlow';
import { debtLeverageChart } from './sections/debtLeverage';
import { incomeChart } from './sections/income';
import { investmentPerformanceChart } from './sections/investmentPerformance';
import { netWorthChart } from './sections/netWorth';

/** VM keys that hold a chart section; excludes the page-level fields. */
export type SectionVmKey = {
  [Key in keyof ReportAnalysisVM]: ReportAnalysisVM[Key] extends { points: unknown[] }
    ? Key
    : never;
}[keyof ReportAnalysisVM];

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
  chart: RenderChart;
}

/** The analysis page's blocks, in display order. Adding a block is one entry. */
export const ANALYSIS_SECTIONS: readonly AnalysisSectionSpec[] = [
  {
    id: ANALYSIS_ANCHORS.NET_WORTH,
    vmKey: 'netWorth',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION,
    chart: netWorthChart,
  },
  {
    id: ANALYSIS_ANCHORS.ASSET_COMPOSITION,
    vmKey: 'assetComposition',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_SECTION,
    chart: assetCompositionChart,
  },
  {
    id: ANALYSIS_ANCHORS.INVESTMENT_PERFORMANCE,
    vmKey: 'investmentPerformance',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_HINT,
    chart: investmentPerformanceChart,
  },
  {
    id: ANALYSIS_ANCHORS.INCOME,
    vmKey: 'income',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INCOME_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.SAVINGS_FORMULA,
    chart: incomeChart,
  },
  {
    id: ANALYSIS_ANCHORS.CASH_FLOW,
    vmKey: 'cashFlow',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_FLOW_HINT,
    chart: cashFlowChart,
  },
  {
    id: ANALYSIS_ANCHORS.DEBT_LEVERAGE,
    vmKey: 'debtLeverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_SECTION,
    chart: debtLeverageChart,
  },
  {
    id: ANALYSIS_ANCHORS.CASH_COVERAGE,
    vmKey: 'cashCoverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_HINT,
    sectionClassName: 'pt-4',
    chart: cashCoverageChart,
  },
];

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
