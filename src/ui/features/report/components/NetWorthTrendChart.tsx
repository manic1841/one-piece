import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { heroPoint } from '@/ui/components/charts/chartInteraction';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type NetWorthChartVM, type NetWorthSeriesKey } from '../viewmodels/reportAnalysis.vm';
import { pointActivator, useSeriesToggle } from './chartInteractions';
import { pointTitle } from './seriesTooltip';
import { unclosedReferenceLines, withoutLabels } from './unclosedMarkers';

const SERIES_KEYS: Record<string, NetWorthSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.NET_WORTH]: 'netWorth',
  [REPORT_ANALYSIS_LABELS.TOTAL_ASSETS]: 'assets',
  [REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES]: 'liabilities',
};

interface NetWorthTrendChartProps {
  points: NetWorthChartVM[];
  /** Context series preselected from `?series=`. */
  initialSeries?: NetWorthSeriesKey[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  markerLabels?: boolean;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
}

/** 淨資產為主線；總資產與總負債是右軸上的可切換虛線脈絡。 */
export const NetWorthTrendChart: React.FC<NetWorthTrendChartProps> = ({
  points,
  initialSeries = [],
  markerLabels = true,
  selectedPeriod,
  onPointSelect,
}) => {
  const isDesktop = useIsDesktop();
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const { isActive, toggle } = useSeriesToggle<NetWorthSeriesKey>(['netWorth', ...initialSeries]);

  const series: ComposedSeries[] = [
    ...(isActive('netWorth')
      ? ([
          {
            kind: 'line',
            tone: 'primary',
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
            axis: 'right',
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
            axis: 'right',
            dashed: true,
            values: points.map((point) => point.liabilities),
          },
        ] as const)
      : []),
  ];

  const referenceLines = markerLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));

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
        points={points.map((point) =>
          heroPoint(
            pointTitle(point),
            // A hidden hero leaves its slot empty rather than lifting a peer.
            isActive('netWorth')
              ? {
                  id: 'netWorth',
                  label: REPORT_ANALYSIS_LABELS.NET_WORTH,
                  value: point.netWorthText,
                }
              : undefined,
            [
              // Hidden series stay out of the tooltip entirely.
              point.changeText === null ? null : { id: 'change', value: point.changeText },
              isActive('assets')
                ? {
                    id: 'assets',
                    label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS,
                    value: point.assetsText,
                  }
                : null,
              isActive('liabilities')
                ? {
                    id: 'liabilities',
                    label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
                    value: point.liabilitiesText,
                  }
                : null,
            ],
          ),
        )}
        height={isDesktop ? (points.length < 6 ? 240 : 320) : 200}
        ariaLabel={REPORT_ANALYSIS_LABELS.NET_WORTH_ARIA(visibleLabels.join('、'))}
        selectedIndex={selectedIndex}
        onPointClick={pointActivator(points, onPointSelect)}
      />
      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.NET_WORTH, tone: 'primary' },
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
