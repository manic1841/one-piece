import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { CHART_COLOR_TOKEN_COLOR, type ChartColorToken } from '@/ui/components/charts/chartTheme';
import {
  type ComposedLineSeries,
  type ComposedSeries,
} from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type AssetCompositionChartVM,
  type AssetCompositionSeriesKey,
} from '../viewmodels/reportAnalysis.vm';
import { unclosedReferenceLines } from './unclosedMarkers';
import { pointActivator, useSeriesToggle } from './useSeriesToggle';

interface AssetCompositionChartProps {
  points: AssetCompositionChartVM[];
  onPointActivate: (yearMonth: string) => void;
}

const SERIES_KEYS: Record<string, AssetCompositionSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.CASH_GROUP]: 'cash',
  [REPORT_ANALYSIS_LABELS.INVESTMENT_GROUP]: 'investment',
  [REPORT_ANALYSIS_LABELS.PROPERTY_GROUP]: 'property',
};

const SERIES: {
  key: AssetCompositionSeriesKey;
  label: string;
  colorToken: ChartColorToken;
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

/** 資產以什麼形式持有：三條固定類別的 100% 堆疊面積，分母固定總資產。 */
export const AssetCompositionChart: React.FC<AssetCompositionChartProps> = ({
  points,
  onPointActivate,
}) => {
  const isDesktop = useIsDesktop();
  const { isActive, toggle } = useSeriesToggle<AssetCompositionSeriesKey>([
    'cash',
    'investment',
    'property',
  ]);

  const visible = SERIES.filter((item) => isActive(item.key));
  const visibleLabels = visible.map((item) => item.label);

  // Hidden series collapse out of the stack; the percentages themselves are
  // still shares of the full asset total, so the visible bands may not reach 100%.
  let runningBaseline: number[] = points.map(() => 0);
  const series: ComposedSeries[] = visible.map((item) => {
    const values = points.map(item.value);
    const baselineValues = runningBaseline;
    runningBaseline = runningBaseline.map((baseline, index) => baseline + (values[index] ?? 0));
    return {
      kind: 'line',
      tone: 'neutral',
      colorToken: item.colorToken,
      area: true,
      values,
      baselineValues,
    } satisfies ComposedLineSeries;
  });

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={points.map((point) => point.label)}
        series={series}
        referenceLines={unclosedReferenceLines(points)}
        yDomain={{ min: 0, max: 100 }}
        yTicks={5}
        yUnit="%"
        points={points.map((point) => {
          const parts = visible.map(
            (item) => `${item.label} ${item.amountText(point)}（${item.shareText(point)}）`,
          );
          return {
            title: point.label,
            value: parts[0] ?? REPORT_ANALYSIS_LABELS.DASH,
            meta: parts.slice(1).join(' · '),
          };
        })}
        height={isDesktop ? 320 : 200}
        ariaLabel={REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_ARIA(visibleLabels.join('、'))}
        onPointClick={pointActivator(points, onPointActivate)}
      />
      <ChartLegend
        items={SERIES.map((item) => ({
          label: item.label,
          color: CHART_COLOR_TOKEN_COLOR[item.colorToken],
        }))}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES_KEYS[label];
          if (key !== undefined) toggle(key);
        }}
      />
    </div>
  );
};
