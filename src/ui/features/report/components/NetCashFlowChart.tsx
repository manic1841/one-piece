import { useState } from 'react';

import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedReferenceLine } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type CashFlowChartVM, unclosedRunStarts } from '../viewmodels/reportAnalysis.vm';

interface NetCashFlowChartProps {
  points: CashFlowChartVM[];
  onPointActivate: (yearMonth: string) => void;
}

/** 淨現金流：零基準柱，正值向上、負值向下，方向由顏色承擔。 */
export const NetCashFlowChart: React.FC<NetCashFlowChartProps> = ({
  points,
  onPointActivate,
}) => {
  const isDesktop = useIsDesktop();
  const [visible, setVisible] = useState(true);
  const referenceLines: ComposedReferenceLine[] = unclosedRunStarts(points).map((index) => ({
    index,
    tone: 'warning',
    label: REPORT_ANALYSIS_LABELS.UNCLOSED_MARKER,
  }));

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
        points={points.map((point) => ({
          title: point.label,
          value: visible
            ? `${REPORT_ANALYSIS_LABELS.NET_CASH_FLOW} ${point.netCashFlowText}`
            : REPORT_ANALYSIS_LABELS.DASH,
        }))}
        height={isDesktop ? 240 : 160}
        ariaLabel={REPORT_ANALYSIS_LABELS.CASH_FLOW_ARIA(visible ? REPORT_ANALYSIS_LABELS.NET_CASH_FLOW : '')}
        onPointClick={(index) => {
          const point = points[index];
          if (point !== undefined) onPointActivate(point.yearMonth);
        }}
      />
      <ChartLegend
        items={[{ label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW, tone: 'positive' }]}
        active={visible ? [REPORT_ANALYSIS_LABELS.NET_CASH_FLOW] : []}
        onToggle={() => setVisible((current) => !current)}
      />
    </div>
  );
};
