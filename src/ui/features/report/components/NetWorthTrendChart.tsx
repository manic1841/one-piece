import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type NetWorthChartVM, type NetWorthSeriesKey } from '../viewmodels/reportAnalysis.vm';
import { unclosedReferenceLines } from './unclosedMarkers';
import { pointActivator, useSeriesToggle } from './useSeriesToggle';

const SERIES_KEYS: Record<string, NetWorthSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.NET_WORTH]: 'netWorth',
  [REPORT_ANALYSIS_LABELS.TOTAL_ASSETS]: 'assets',
  [REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES]: 'liabilities',
};

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
  const { isActive, toggle } = useSeriesToggle<NetWorthSeriesKey>([
    'netWorth',
    ...initialSeries,
  ]);

  const series: ComposedSeries[] = [
    ...(isActive('netWorth')
      ? ([
          {
            kind: 'line',
            tone: 'asset',
            area: true,
            values: points.map((point) => point.netWorth),
          },
        ] as const)
      : []),
    ...(isActive('assets')
      ? ([
          {
            kind: 'line',
            tone: 'neutral',
            dashed: true,
            values: points.map((point) => point.assets),
          },
        ] as const)
      : []),
    ...(isActive('liabilities')
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

  const referenceLines = unclosedReferenceLines(points);

  const visibleLabels = [
    isActive('netWorth') ? REPORT_ANALYSIS_LABELS.NET_WORTH : null,
    isActive('assets') ? REPORT_ANALYSIS_LABELS.TOTAL_ASSETS : null,
    isActive('liabilities') ? REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES : null,
  ].filter((label) => label !== null);

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={points.map((point) => point.label)}
        series={series}
        referenceLines={referenceLines}
        points={points.map((point) => {
          // Hidden series stay out of the tooltip entirely.
          const visible = [
            isActive('netWorth')
              ? `${REPORT_ANALYSIS_LABELS.NET_WORTH} ${point.netWorthText}`
              : null,
            isActive('assets')
              ? `${REPORT_ANALYSIS_LABELS.TOTAL_ASSETS} ${point.assetsText}`
              : null,
            isActive('liabilities')
              ? `${REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES} ${point.liabilitiesText}`
              : null,
          ].filter((part): part is string => part !== null);
          return {
            title: point.label,
            value: visible[0] ?? REPORT_ANALYSIS_LABELS.DASH,
            meta: visible.slice(1).join(' · '),
          };
        })}
        height={isDesktop ? 320 : 200}
        ariaLabel={REPORT_ANALYSIS_LABELS.NET_WORTH_ARIA(visibleLabels.join('、'))}
        onPointClick={pointActivator(points, onPointActivate)}
      />
      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.NET_WORTH, tone: 'asset' },
          { label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS, tone: 'neutral' },
          { label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES, tone: 'negative' },
        ]}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES_KEYS[label];
          if (key !== undefined) toggle(key);
        }}
      />
    </div>
  );
};
