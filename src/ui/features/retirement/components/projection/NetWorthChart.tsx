import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { RetirementChartLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type NetWorthChartProps = {
  projection: RetirementProjectionVM;
};

/**
 * 淨資產軌跡：單一條逐年淨資產（投影期末餘額），標出退休年與歸零點。
 * 資料即投影的 `savings`，不新增計算（issue #264）。
 */
export function NetWorthChart({ projection }: NetWorthChartProps) {
  const labels = projection.chartData.map((point) => String(point.year));
  const retirementIndex = projection.chartData.findIndex(
    (point) => point.year === projection.retirementYear,
  );
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
      referenceLines={
        retirementIndex >= 0
          ? [
              {
                index: retirementIndex,
                tone: 'primary',
                label: RetirementChartLabels.retirementMarker,
              },
            ]
          : []
      }
      points={projection.chartData.map((point) => ({
        title: `${RetirementChartLabels.tooltipYearPrefix} ${point.year}`,
        value: `${RetirementChartLabels.netWorth} ${point.savingsText}`,
      }))}
      height={320}
      ariaLabel={RetirementChartLabels.netWorthAriaLabel}
    />
  );
}
