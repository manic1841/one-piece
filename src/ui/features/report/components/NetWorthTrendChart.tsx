import { useState } from 'react';

import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import {
  type ComposedReferenceLine,
  type ComposedSeries,
} from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type NetWorthChartVM,
  type NetWorthSeriesKey,
  unclosedRunStarts,
} from '../viewmodels/reportAnalysis.vm';

interface NetWorthTrendChartProps {
  points: NetWorthChartVM[];
  /** Context series preselected from `?series=`. */
  initialSeries?: NetWorthSeriesKey[];
  onPointActivate: (yearMonth: string) => void;
}

/** 淨資產為主線；總資產與總負債是可切換的虛線脈絡。 */
export const NetWorthTrendChart: React.FC<NetWorthTrendChartProps> = ({
  points,
  initialSeries = [],
  onPointActivate,
}) => {
  const isDesktop = useIsDesktop();
  const [active, setActive] = useState<ReadonlySet<NetWorthSeriesKey>>(
    () => new Set<NetWorthSeriesKey>(['netWorth', ...initialSeries]),
  );
  const toggle = (key: NetWorthSeriesKey) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const series: ComposedSeries[] = [
    ...(active.has('netWorth')
      ? ([
          {
            kind: 'line',
            tone: 'asset',
            area: true,
            values: points.map((point) => point.netWorth),
          },
        ] as const)
      : []),
    ...(active.has('assets')
      ? ([
          {
            kind: 'line',
            tone: 'neutral',
            dashed: true,
            values: points.map((point) => point.assets),
          },
        ] as const)
      : []),
    ...(active.has('liabilities')
      ? ([
          {
            kind: 'line',
            tone: 'negative',
            dashed: true,
            values: points.map((point) => point.liabilities),
          },
        ] as const)
      : []),
  ];

  const referenceLines: ComposedReferenceLine[] = unclosedRunStarts(points).map((index) => ({
    index,
    tone: 'warning',
    label: REPORT_ANALYSIS_LABELS.UNCLOSED_MARKER,
  }));

  const visibleLabels = [
    active.has('netWorth') ? REPORT_ANALYSIS_LABELS.NET_WORTH : null,
    active.has('assets') ? REPORT_ANALYSIS_LABELS.TOTAL_ASSETS : null,
    active.has('liabilities') ? REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES : null,
  ].filter((label) => label !== null);

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={points.map((point) => point.label)}
        series={series}
        referenceLines={referenceLines}
        points={points.map((point) => ({
          title: point.label,
          value: active.has('netWorth')
            ? `${REPORT_ANALYSIS_LABELS.NET_WORTH} ${point.netWorthText}`
            : REPORT_ANALYSIS_LABELS.DASH,
          meta: [
            active.has('netWorth') ? null : `${REPORT_ANALYSIS_LABELS.NET_WORTH} ${point.netWorthText}`,
            active.has('assets') ? `${REPORT_ANALYSIS_LABELS.TOTAL_ASSETS} ${point.assetsText}` : null,
            active.has('liabilities')
              ? `${REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES} ${point.liabilitiesText}`
              : null,
          ]
            .filter((part): part is string => part !== null)
            .join(' · '),
        }))}
        height={isDesktop ? 320 : 200}
        ariaLabel={REPORT_ANALYSIS_LABELS.NET_WORTH_ARIA(visibleLabels.join('、'))}
        onPointClick={(index) => {
          const point = points[index];
          if (point !== undefined) onPointActivate(point.yearMonth);
        }}
      />
      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.NET_WORTH, tone: 'asset' },
          { label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS, tone: 'neutral' },
          { label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES, tone: 'negative' },
        ]}
        active={visibleLabels}
        onToggle={(label) => {
          const key = (
            {
              [REPORT_ANALYSIS_LABELS.NET_WORTH]: 'netWorth',
              [REPORT_ANALYSIS_LABELS.TOTAL_ASSETS]: 'assets',
              [REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES]: 'liabilities',
            } as Record<string, NetWorthSeriesKey>
          )[label];
          if (key !== undefined) toggle(key);
        }}
      />
    </div>
  );
};
