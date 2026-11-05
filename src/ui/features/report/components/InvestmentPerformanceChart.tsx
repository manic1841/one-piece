import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type InvestmentPerformanceChartVM,
  type InvestmentPerformanceSeriesKey,
} from '../viewmodels/reportAnalysis.vm';
import { unclosedReferenceLines } from './unclosedMarkers';
import { pointActivator, useSeriesToggle } from './useSeriesToggle';

interface InvestmentPerformanceChartProps {
  points: InvestmentPerformanceChartVM[];
  onPointActivate: (yearMonth: string) => void;
}

const SERIES_KEYS: Record<string, InvestmentPerformanceSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.GAIN]: 'gain',
  [REPORT_ANALYSIS_LABELS.RETURN_RATE]: 'returnRate',
};

/**
 * 上層報酬金額柱（正負分向），下層 96px 報酬率折線。兩層共用月份與 x 軸，
 * 不使用右軸；折線可見時由它承擔 x 標籤。
 */
export const InvestmentPerformanceChart: React.FC<InvestmentPerformanceChartProps> = ({
  points,
  onPointActivate,
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
  const referenceLines = unclosedReferenceLines(points);
  const activate = pointActivator(points, onPointActivate);

  // Every layer shows the same tooltip so the stacked values read together.
  const tooltipPoints = points.map((point) => {
    const parts = [
      gainVisible ? `${REPORT_ANALYSIS_LABELS.GAIN} ${point.gainText}` : null,
      rateVisible ? `${REPORT_ANALYSIS_LABELS.RETURN_RATE} ${point.returnRateText}` : null,
      rateVisible ? `${REPORT_ANALYSIS_LABELS.OPENING_VALUE} ${point.openingValueText}` : null,
    ].filter((part): part is string => part !== null);
    return {
      title: point.label,
      value: parts[0] ?? REPORT_ANALYSIS_LABELS.DASH,
      meta: parts.slice(1).join(' · '),
    };
  });

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
        height={isDesktop ? 240 : 160}
        showLabels={!rateVisible}
        ariaLabel={REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_ARIA(visibleLabels.join('、'))}
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
            referenceLines={referenceLines.map(({ index, tone }) => ({ index, tone }))}
            height={96}
            includeZero
            yUnit="%"
            ariaLabel={REPORT_ANALYSIS_LABELS.RETURN_RATE}
            onPointClick={activate}
          />
        </div>
      )}

      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.GAIN, tone: 'positive' },
          { label: REPORT_ANALYSIS_LABELS.RETURN_RATE, tone: 'investment' },
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
