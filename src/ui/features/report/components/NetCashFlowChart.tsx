import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { heroPoint } from '@/ui/components/charts/chartInteraction';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type CashFlowChartVM } from '../viewmodels/reportAnalysis.vm';
import { pointActivator, useSeriesToggle } from './chartInteractions';
import { pointTitle } from './seriesTooltip';
import { unclosedReferenceLines, withoutLabels } from './unclosedMarkers';

interface NetCashFlowChartProps {
  points: CashFlowChartVM[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  markerLabels?: boolean;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
}

/** 淨現金流：零基準柱，正值向上、負值向下，方向由顏色承擔。 */
export const NetCashFlowChart: React.FC<NetCashFlowChartProps> = ({
  points,
  markerLabels = true,
  selectedPeriod,
  onPointSelect,
}) => {
  const isDesktop = useIsDesktop();
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const { isActive, toggle } = useSeriesToggle(['netCashFlow']);
  const visible = isActive('netCashFlow');
  const referenceLines = markerLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={points.map((point) => point.label)}
        series={
          visible
            ? [
                {
                  kind: 'bar',
                  tone: 'positive',
                  toneBySign: true,
                  values: points.map((point) => point.netCashFlow),
                },
              ]
            : []
        }
        referenceLines={referenceLines}
        points={points.map((point) =>
          heroPoint(
            pointTitle(point),
            visible
              ? {
                  id: 'netCashFlow',
                  label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
                  value: point.netCashFlowText,
                }
              : undefined,
          ),
        )}
        height={isDesktop ? (points.length < 6 ? 160 : 240) : 160}
        ariaLabel={REPORT_ANALYSIS_LABELS.CASH_FLOW_ARIA(
          visible ? REPORT_ANALYSIS_LABELS.NET_CASH_FLOW : '',
        )}
        selectedIndex={selectedIndex}
        onPointClick={pointActivator(points, onPointSelect)}
      />
      <ChartLegend
        items={[{ label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW, tone: 'positive' }]}
        active={visible ? [REPORT_ANALYSIS_LABELS.NET_CASH_FLOW] : []}
        onToggle={() => toggle('netCashFlow')}
      />
    </div>
  );
};
