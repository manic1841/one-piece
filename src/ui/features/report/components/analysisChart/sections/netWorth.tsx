import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import {
  type NetWorthChartVM,
  type NetWorthSeriesKey,
} from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

/** Net worth is the hero; assets and liabilities are context lines on the right axis. */
export const netWorthChart: RenderChart = (vm, context) => (
  <AnalysisChart<NetWorthSeriesKey, NetWorthChartVM>
    points={vm.netWorth.points}
    initialActive={['netWorth', ...context.initialSeries]}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    showUnclosedLabels={context.showUnclosedLabels}
    density="tall"
    layers={(points) => [
      {
        kind: 'line',
        seriesKey: 'netWorth',
        label: REPORT_ANALYSIS_LABELS.NET_WORTH,
        tone: 'asset',
        area: true,
        values: points.map((point) => point.netWorth),
      },
      {
        kind: 'line',
        seriesKey: 'assets',
        label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS,
        tone: 'neutral',
        axis: 'right',
        dashed: true,
        values: points.map((point) => point.assets),
      },
      {
        kind: 'line',
        seriesKey: 'liabilities',
        label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
        tone: 'negative',
        axis: 'right',
        dashed: true,
        values: points.map((point) => point.liabilities),
      },
    ]}
    tooltip={(point) => ({
      // A hidden hero leaves its slot empty rather than lifting a peer.
      primary: {
        id: 'netWorth',
        seriesKey: 'netWorth',
        label: REPORT_ANALYSIS_LABELS.NET_WORTH,
        value: point.netWorthText,
      },
      secondary: [
        point.changeText === null ? null : { id: 'change', value: point.changeText },
        {
          id: 'assets',
          seriesKey: 'assets',
          label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS,
          value: point.assetsText,
        },
        {
          id: 'liabilities',
          seriesKey: 'liabilities',
          label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
          value: point.liabilitiesText,
        },
      ],
    })}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.NET_WORTH_ARIA(visible.join('、'))}
  />
);
