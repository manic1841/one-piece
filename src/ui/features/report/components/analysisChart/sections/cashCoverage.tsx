import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { type CashCoverageChartVM } from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

type CashCoverageSeriesKey = 'coverageMonths';

export const cashCoverageChart: RenderChart = (vm, context) => (
  <AnalysisChart<CashCoverageSeriesKey, CashCoverageChartVM>
    points={vm.cashCoverage.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    showUnclosedLabels={context.showUnclosedLabels}
    density="standard"
    includeZero
    yTicks={3}
    yDecimals={1}
    layers={(points) => [
      {
        kind: 'line',
        seriesKey: 'coverageMonths',
        label: REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS,
        tone: 'positive',
        values: points.map((point) => point.coverageMonths),
      },
    ]}
    tooltip={(point) => ({
      primary: {
        id: 'coverageMonths',
        seriesKey: 'coverageMonths',
        label: REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS,
        value: point.coverageMonthsText,
      },
      secondary: [
        { id: 'cash', label: REPORT_ANALYSIS_LABELS.COVERAGE_CASH, value: point.cashText },
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
);
