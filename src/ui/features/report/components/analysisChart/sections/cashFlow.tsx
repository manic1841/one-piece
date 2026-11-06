import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { type CashFlowChartVM } from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

type CashFlowSeriesKey = 'netCashFlow';

export const cashFlowChart: RenderChart = (vm, context) => (
  <AnalysisChart<CashFlowSeriesKey, CashFlowChartVM>
    points={vm.cashFlow.points}
    initialActive={['netCashFlow']}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    density="compact"
    layers={(points) => [
      {
        kind: 'bar',
        seriesKey: 'netCashFlow',
        label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
        tone: 'positive',
        toneBySign: true,
        values: points.map((point) => point.netCashFlow),
      },
    ]}
    tooltip={(point) => ({
      primary: {
        id: 'netCashFlow',
        seriesKey: 'netCashFlow',
        label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
        value: point.netCashFlowText,
      },
    })}
    ariaLabel={(visible) =>
      REPORT_ANALYSIS_LABELS.CASH_FLOW_ARIA(
        visible.length === 0 ? '' : REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
      )
    }
  />
);
