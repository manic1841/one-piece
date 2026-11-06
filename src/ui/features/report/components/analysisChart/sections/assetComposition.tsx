import { CHART_COLOR_TOKEN_COLOR } from '@/ui/components/charts/chartTheme';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import {
  type AssetCompositionChartVM,
  type AssetCompositionSeriesKey,
} from '../../../viewmodels/reportAnalysis.vm';
import { AnalysisChart } from '../engine/AnalysisChart';
import { type RenderChart } from '../engine/types';

/** 資產以什麼形式持有：三條固定類別的 100% 堆疊面積，分母固定總資產。 */
const ASSET_SERIES: {
  key: AssetCompositionSeriesKey;
  label: string;
  colorToken: 'chart-1' | 'chart-4' | 'chart-3';
  value: (point: AssetCompositionChartVM) => number;
  amountText: (point: AssetCompositionChartVM) => string;
  shareText: (point: AssetCompositionChartVM) => string;
}[] = [
  {
    key: 'cash',
    label: REPORT_ANALYSIS_LABELS.CASH_GROUP,
    colorToken: 'chart-1',
    value: (point) => point.cashShare,
    amountText: (point) => point.cashText,
    shareText: (point) => point.cashShareText,
  },
  {
    key: 'investment',
    label: REPORT_ANALYSIS_LABELS.INVESTMENT_GROUP,
    colorToken: 'chart-4',
    value: (point) => point.investmentShare,
    amountText: (point) => point.investmentText,
    shareText: (point) => point.investmentShareText,
  },
  {
    key: 'property',
    label: REPORT_ANALYSIS_LABELS.PROPERTY_GROUP,
    colorToken: 'chart-3',
    value: (point) => point.propertyShare,
    amountText: (point) => point.propertyText,
    shareText: (point) => point.propertyShareText,
  },
];

export const assetCompositionChart: RenderChart = (vm, context) => (
  <AnalysisChart<AssetCompositionSeriesKey, AssetCompositionChartVM>
    points={vm.assetComposition.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    yDomain={{ min: 0, max: 100 }}
    yTicks={5}
    yUnit={REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_UNIT}
    layers={(points) =>
      ASSET_SERIES.map((item) => ({
        kind: 'line' as const,
        seriesKey: item.key,
        label: item.label,
        tone: 'neutral' as const,
        colorToken: item.colorToken,
        area: true,
        // Hidden series collapse out of the stack; the percentages themselves are
        // still shares of the full asset total, so the visible bands may not reach 100%.
        baseline: 'stack' as const,
        values: points.map(item.value),
      }))
    }
    tooltip={(point) => ({
      mode: 'list',
      items: ASSET_SERIES.map((item) => ({
        id: item.key,
        seriesKey: item.key,
        label: item.label,
        value: item.amountText(point),
        detail: REPORT_ANALYSIS_LABELS.SHARE_DETAIL(item.shareText(point)),
        color: CHART_COLOR_TOKEN_COLOR[item.colorToken],
      })),
    })}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_ARIA(visible.join('、'))}
  />
);
