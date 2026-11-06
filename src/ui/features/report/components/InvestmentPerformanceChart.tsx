import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type InvestmentPerformanceChartVM,
  type InvestmentPerformanceSeriesKey,
} from '../viewmodels/reportAnalysis.vm';
import { pointActivator, useSeriesToggle } from './chartInteractions';
import { pointTitle, tooltipFrom } from './seriesTooltip';
import { unclosedReferenceLines, withoutLabels } from './unclosedMarkers';

interface InvestmentPerformanceChartProps {
  points: InvestmentPerformanceChartVM[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  markerLabels?: boolean;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
}

const SERIES = [
  { key: 'gain', label: REPORT_ANALYSIS_LABELS.GAIN, tone: 'positive' },
  { key: 'returnRate', label: REPORT_ANALYSIS_LABELS.RETURN_RATE, tone: 'investment' },
] as const;

/**
 * 上層報酬金額柱（正負分向），下層 96px 報酬率折線。兩層共用月份與 x 軸，
 * 不使用右軸；折線可見時由它承擔 x 標籤。
 */
export const InvestmentPerformanceChart: React.FC<InvestmentPerformanceChartProps> = ({
  points,
  markerLabels = true,
  selectedPeriod,
  onPointSelect,
}) => {
  const isDesktop = useIsDesktop();
  const { isActive, toggle } = useSeriesToggle<InvestmentPerformanceSeriesKey>([
    'gain',
    'returnRate',
  ]);

  const gainVisible = isActive('gain');
  const rateVisible = isActive('returnRate');
  const visibleLabels = [
    gainVisible ? REPORT_ANALYSIS_LABELS.GAIN : null,
    rateVisible ? REPORT_ANALYSIS_LABELS.RETURN_RATE : null,
  ].filter((label) => label !== null);

  const labels = points.map((point) => point.label);
  const referenceLines = markerLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const activate = pointActivator(points, onPointSelect);

  // Every layer shows the same tooltip so the stacked values read together.
  // The opening value stays even when the rate line is hidden; it is the rate's scale.
  const tooltipPoints = points.map((point) =>
    tooltipFrom(pointTitle(point), [
      gainVisible ? `${REPORT_ANALYSIS_LABELS.GAIN} ${point.gainText}` : null,
      rateVisible ? `${REPORT_ANALYSIS_LABELS.RETURN_RATE} ${point.returnRateText}` : null,
      `${REPORT_ANALYSIS_LABELS.OPENING_VALUE} ${point.openingValueText}`,
    ]),
  );

  const barSeries: ComposedSeries[] = gainVisible
    ? [{ kind: 'bar', tone: 'positive', toneBySign: true, values: points.map((p) => p.gain) }]
    : [];

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={labels}
        series={barSeries}
        referenceLines={referenceLines}
        points={tooltipPoints}
        height={isDesktop ? (points.length < 6 ? 160 : 240) : 160}
        showLabels={!rateVisible}
        ariaLabel={REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_ARIA(visibleLabels.join('、'))}
        selectedIndex={selectedIndex}
        onPointClick={activate}
      />

      {rateVisible && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {REPORT_ANALYSIS_LABELS.RETURN_RATE_UNIT}
          </p>
          <InteractiveComposedChart
            labels={labels}
            series={[
              {
                kind: 'line',
                tone: 'investment',
                values: points.map((point) => point.returnRate),
              },
            ]}
            points={tooltipPoints}
            referenceLines={withoutLabels(referenceLines)}
            height={96}
            includeZero
            yTicks={3}
            yDecimals={1}
            yUnit="%"
            ariaLabel={REPORT_ANALYSIS_LABELS.RETURN_RATE}
            onPointClick={activate}
          />
        </div>
      )}

      <ChartLegend
        items={SERIES.map((item) => ({ label: item.label, tone: item.tone }))}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES.find((item) => item.label === label)?.key;
          if (key !== undefined) toggle(key);
        }}
      />
    </div>
  );
};
