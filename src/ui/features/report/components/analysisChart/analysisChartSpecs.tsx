import { type ReactNode } from 'react';

import { ANALYSIS_ANCHORS, REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { AssetCompositionChart } from '../AssetCompositionChart';
import { DebtLeverageChart } from '../DebtLeverageChart';
import { IncomeSavingsChart } from '../IncomeSavingsChart';
import { InvestmentPerformanceChart } from '../InvestmentPerformanceChart';
import { NetWorthTrendChart } from '../NetWorthTrendChart';
import { type NetWorthSeriesKey, type ReportAnalysisVM } from '../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from './AnalysisChart';

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

/** The analysis page's blocks, in display order. Adding a block is one entry. */
export const ANALYSIS_SECTIONS: readonly AnalysisSectionSpec[] = [
  {
    id: ANALYSIS_ANCHORS.NET_WORTH,
    vmKey: 'netWorth',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION,
    showUnclosedLabels: true,
    chart: (vm, context) => (
      <NetWorthTrendChart
        points={vm.netWorth.points}
        initialSeries={context.initialSeries}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.ASSET_COMPOSITION,
    vmKey: 'assetComposition',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_SECTION,
    chart: (vm, context) => (
      <AssetCompositionChart
        points={vm.assetComposition.points}
        markerLabels={false}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.INVESTMENT_PERFORMANCE,
    vmKey: 'investmentPerformance',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_HINT,
    chart: (vm, context) => (
      <InvestmentPerformanceChart
        points={vm.investmentPerformance.points}
        markerLabels={false}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.INCOME,
    vmKey: 'income',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.INCOME_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.SAVINGS_FORMULA,
    chart: (vm, context) => (
      <IncomeSavingsChart
        points={vm.income.points}
        markerLabels={false}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.CASH_FLOW,
    vmKey: 'cashFlow',
    layout: 'pair',
    title: REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_FLOW_HINT,
    chart: (vm, context) => (
      <AnalysisChart
        points={vm.cashFlow.points}
        initialActive={['netCashFlow']}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
        layers={(points, isVisible) =>
          isVisible('netCashFlow')
            ? [
                {
                  kind: 'bar',
                  seriesKey: 'netCashFlow',
                  tone: 'positive',
                  toneBySign: true,
                  values: points.map((point) => point.netCashFlow),
                },
              ]
            : []
        }
        tooltip={(point, isVisible) => ({
          primary: isVisible('netCashFlow')
            ? {
                id: 'netCashFlow',
                label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
                value: point.netCashFlowText,
              }
            : undefined,
        })}
        legend={{
          items: [
            {
              key: 'netCashFlow',
              label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
              tone: 'positive',
            },
          ],
        }}
        ariaLabel={(visible) =>
          REPORT_ANALYSIS_LABELS.CASH_FLOW_ARIA(
            visible.length === 0 ? '' : REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
          )
        }
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.DEBT_LEVERAGE,
    vmKey: 'debtLeverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_SECTION,
    chart: (vm, context) => (
      <DebtLeverageChart
        points={vm.debtLeverage.points}
        showLeverage={vm.debtLeverage.showLeverage}
        markerLabels={false}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
      />
    ),
  },
  {
    id: ANALYSIS_ANCHORS.CASH_COVERAGE,
    vmKey: 'cashCoverage',
    layout: 'full',
    title: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_SECTION,
    footnote: REPORT_ANALYSIS_LABELS.CASH_COVERAGE_HINT,
    sectionClassName: 'pt-4',
    showUnclosedLabels: true,
    chart: (vm, context) => (
      <AnalysisChart
        points={vm.cashCoverage.points}
        selectedPeriod={context.selectedPeriod}
        onPointSelect={context.onPointSelect}
        showUnclosedLabels={context.showUnclosedLabels}
        height={{ mobile: 160, desktop: 240, shortDesktop: 240 }}
        includeZero
        yTicks={3}
        yDecimals={1}
        layers={(points) => [
          {
            kind: 'line',
            seriesKey: 'coverageMonths',
            tone: 'positive',
            values: points.map((point) => point.coverageMonths),
          },
        ]}
        tooltip={(point) => ({
          primary: {
            id: 'coverageMonths',
            label: REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS,
            value: point.coverageMonthsText,
          },
          secondary: [
            {
              id: 'cash',
              label: REPORT_ANALYSIS_LABELS.COVERAGE_CASH,
              value: point.cashText,
            },
            {
              id: 'expenseAverage',
              label: REPORT_ANALYSIS_LABELS.COVERAGE_EXPENSE_AVERAGE,
              value: point.expenseAverageText,
            },
          ],
        })}
        ariaLabel={() =>
          REPORT_ANALYSIS_LABELS.CASH_COVERAGE_ARIA(REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS)
        }
      />
    ),
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
