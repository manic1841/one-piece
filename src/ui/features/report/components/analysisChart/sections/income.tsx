import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { type IncomeChartVM, type IncomeSeriesKey } from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

/** Income and expense bars with the savings rate as a band beneath. */
export const incomeChart: RenderChart = (vm, context) => (
  <AnalysisChart<IncomeSeriesKey, IncomeChartVM>
    points={vm.income.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    density="compact"
    layers={(points) => [
      {
        kind: 'bar',
        seriesKey: 'income',
        label: REPORT_ANALYSIS_LABELS.INCOME,
        tone: 'positive',
        values: points.map((point) => point.income),
      },
      {
        kind: 'bar',
        seriesKey: 'expense',
        label: REPORT_ANALYSIS_LABELS.EXPENSE,
        tone: 'negative',
        values: points.map((point) => point.expense),
      },
      {
        kind: 'band',
        seriesKey: 'savingsRate',
        label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE,
        unit: REPORT_ANALYSIS_LABELS.SAVINGS_RATE_UNIT,
        tone: 'asset',
        values: points.map((point) => point.savingsRate),
        // A negative savings rate must be able to sit below the zero baseline.
        includeZero: true,
        yTicks: 3,
        yDecimals: 1,
      },
    ]}
    tooltip={(point) => ({
      primary: {
        id: 'income',
        seriesKey: 'income',
        label: REPORT_ANALYSIS_LABELS.INCOME,
        value: point.incomeText,
      },
      secondary: [
        {
          id: 'expense',
          seriesKey: 'expense',
          label: REPORT_ANALYSIS_LABELS.EXPENSE,
          value: point.expenseText,
        },
        {
          id: 'savingsRate',
          seriesKey: 'savingsRate',
          label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE,
          value: point.savingsRateText,
        },
        point.changeText === null ? null : { id: 'change', value: point.changeText },
      ],
    })}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.INCOME_ARIA(visible.join('、'))}
  />
);
