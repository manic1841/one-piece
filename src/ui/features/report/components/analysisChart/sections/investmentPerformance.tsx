import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import {
  type InvestmentPerformanceChartVM,
  type InvestmentPerformanceSeriesKey,
} from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

/** Gain bars on the main plot; the return-rate scale is a band beneath. */
export const investmentPerformanceChart: RenderChart = (vm, context) => (
  <AnalysisChart<InvestmentPerformanceSeriesKey, InvestmentPerformanceChartVM>
    points={vm.investmentPerformance.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    density="compact"
    layers={(points) => [
      {
        kind: 'bar',
        seriesKey: 'gain',
        label: REPORT_ANALYSIS_LABELS.GAIN,
        tone: 'positive',
        toneBySign: true,
        values: points.map((point) => point.gain),
      },
      {
        kind: 'band',
        seriesKey: 'returnRate',
        label: REPORT_ANALYSIS_LABELS.RETURN_RATE,
        unit: REPORT_ANALYSIS_LABELS.RETURN_RATE_UNIT,
        tone: 'investment',
        values: points.map((point) => point.returnRate),
        includeZero: true,
        yTicks: 3,
        yDecimals: 1,
        yUnit: REPORT_ANALYSIS_LABELS.RETURN_RATE_AXIS_UNIT,
      },
    ]}
    tooltip={(point) => ({
      primary: {
        id: 'gain',
        seriesKey: 'gain',
        label: REPORT_ANALYSIS_LABELS.GAIN,
        value: point.gainText,
      },
      secondary: [
        {
          id: 'returnRate',
          seriesKey: 'returnRate',
          label: REPORT_ANALYSIS_LABELS.RETURN_RATE,
          value: point.returnRateText,
        },
        // The opening value stays even when the rate line is hidden; it is the rate's scale.
        {
          id: 'openingValue',
          label: REPORT_ANALYSIS_LABELS.OPENING_VALUE,
          value: point.openingValueText,
        },
      ],
    })}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_ARIA(visible.join('、'))}
  />
);
