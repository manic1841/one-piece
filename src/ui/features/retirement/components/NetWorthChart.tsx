import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import {
  type ComposedReferenceLine,
  type ComposedSeries,
} from '@/ui/components/charts/composedChartGeometry';
import { PROJECTION_CHART_LABELS } from '@/ui/constants/retirement/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';

type NetWorthChartProps = {
  projection: RetirementProjectionVM;
  /** Selected year, marked when it falls inside the projection period. */
  selectedYear?: number | null;
  /** Called with the activated year. */
  onSelectYear?: (year: number) => void;
  /** Marks the year net worth first turned negative. On by default. */
  showNegativeMarker?: boolean;
};

/**
 * 淨資產軌跡：單一條逐年淨資產（投影期末餘額），標出退休年與轉負年。
 * 資料即投影的 `savings`，不新增計算（issue #264）。
 *
 * 同一格只留優先序最高的一條垂直標記：轉負 > 選取 > 退休。
 */
export function NetWorthChart({
  projection,
  selectedYear = null,
  onSelectYear,
  showNegativeMarker = true,
}: NetWorthChartProps) {
  const labels = projection.chartData.map((point) => String(point.year));
  const indexOf = (year: number | null) =>
    year === null ? -1 : projection.chartData.findIndex((point) => point.year === year);

  const byPriority = new Map<number, ComposedReferenceLine>();
  const add = (index: number, tone: 'negative' | 'primary', label: string) => {
    if (index < 0 || byPriority.has(index)) return;
    byPriority.set(index, { index, tone, label });
  };
  add(
    showNegativeMarker ? indexOf(projection.negativeYear) : -1,
    'negative',
    PROJECTION_CHART_LABELS.negativeMarker,
  );
  add(indexOf(selectedYear), 'primary', PROJECTION_CHART_LABELS.selectedMarker);
  add(indexOf(projection.retirementYear), 'primary', PROJECTION_CHART_LABELS.retirementMarker);

  const series: ComposedSeries[] = [
    {
      // `asset` keeps net worth the same blue as the cash flow chart's right-axis line.
      kind: 'line',
      tone: 'asset',
      area: true,
      values: projection.chartData.map((point) => point.savings),
    },
  ];

  return (
    <InteractiveComposedChart
      labels={labels}
      series={series}
      referenceLines={[...byPriority.values()]}
      points={projection.chartData.map((point) => ({
        title: `${PROJECTION_CHART_LABELS.tooltipYearPrefix} ${point.year}`,
        value: `${PROJECTION_CHART_LABELS.netWorth} ${point.savingsText}`,
      }))}
      height={320}
      ariaLabel={PROJECTION_CHART_LABELS.netWorthAriaLabel}
      {...(onSelectYear === undefined
        ? {}
        : {
            onPointClick: (index: number) => {
              const point = projection.chartData[index];
              if (point !== undefined) onSelectYear(point.year);
            },
          })}
    />
  );
}
