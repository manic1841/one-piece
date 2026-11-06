import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import {
  type DebtLeverageChartVM,
  type DebtLeverageSeriesKey,
} from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

/**
 * 負債餘額柱、負債比折線、加權平均槓桿折線三層同節。槓桿層只在目前範圍
 * 真的出現槓桿時存在；缺 snapshot 只讓槓桿線斷開。
 */
export const debtLeverageChart: RenderChart = (vm, context) => (
  <div className="space-y-3">
    <AnalysisChart<DebtLeverageSeriesKey, DebtLeverageChartVM>
      points={vm.debtLeverage.points}
      selectedPeriod={context.selectedPeriod}
      onPointSelect={context.onPointSelect}
      density="compact"
      layers={(points) => [
        {
          kind: 'bar',
          seriesKey: 'liabilities',
          label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE,
          tone: 'negative',
          values: points.map((point) => point.liabilities),
        },
        {
          kind: 'band',
          seriesKey: 'debtRatio',
          label: REPORT_ANALYSIS_LABELS.DEBT_RATIO,
          unit: REPORT_ANALYSIS_LABELS.DEBT_RATIO_UNIT,
          tone: 'neutral',
          values: points.map((point) => point.debtRatio),
          yTicks: 3,
          yDecimals: 1,
          yUnit: REPORT_ANALYSIS_LABELS.RETURN_RATE_AXIS_UNIT,
        },
        ...(vm.debtLeverage.showLeverage
          ? [
              {
                kind: 'band' as const,
                seriesKey: 'leverage' as const,
                label: REPORT_ANALYSIS_LABELS.LEVERAGE,
                unit: REPORT_ANALYSIS_LABELS.LEVERAGE_UNIT,
                tone: 'investment' as const,
                values: points.map((point) => point.leverage),
                yTicks: 3,
                yDecimals: 3,
                yUnit: REPORT_ANALYSIS_LABELS.LEVERAGE_AXIS_UNIT,
              },
            ]
          : []),
      ]}
      tooltip={(point) => ({
        primary: {
          id: 'liabilities',
          seriesKey: 'liabilities',
          label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE,
          value: point.liabilitiesText,
        },
        secondary: [
          {
            id: 'debtRatio',
            seriesKey: 'debtRatio',
            label: REPORT_ANALYSIS_LABELS.DEBT_RATIO,
            value: point.debtRatioText,
            ...(point.changeText === null ? {} : { detail: point.changeText }),
          },
          // Only when the layer exists at all; hidden-layer filtering is the chart's job.
          ...(vm.debtLeverage.showLeverage
            ? [
                {
                  id: 'leverage',
                  seriesKey: 'leverage' as const,
                  label: REPORT_ANALYSIS_LABELS.LEVERAGE,
                  value: point.leverageText,
                },
              ]
            : []),
        ],
      })}
      ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_ARIA(visible.join('、'))}
    />
    {!vm.debtLeverage.showLeverage && (
      <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.NO_LEVERAGE_HINT}</p>
    )}
  </div>
);
