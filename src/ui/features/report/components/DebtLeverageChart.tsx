import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type DebtLeverageChartVM,
  type DebtLeverageSeriesKey,
} from '../viewmodels/reportAnalysis.vm';
import { unclosedReferenceLines } from './unclosedMarkers';
import { pointActivator, useSeriesToggle } from './useSeriesToggle';

interface DebtLeverageChartProps {
  points: DebtLeverageChartVM[];
  /** The range contains at least one month above 1x, so the leverage layer exists. */
  showLeverage: boolean;
  onPointActivate: (yearMonth: string) => void;
}

const SERIES_KEYS: Record<string, DebtLeverageSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.DEBT_BALANCE]: 'liabilities',
  [REPORT_ANALYSIS_LABELS.DEBT_RATIO]: 'debtRatio',
  [REPORT_ANALYSIS_LABELS.LEVERAGE]: 'leverage',
};

/**
 * 負債餘額柱、負債比折線、加權平均槓桿折線三層同節。槓桿層只在目前範圍
 * 真的出現槓桿時存在；缺 snapshot 只讓槓桿線斷開。
 */
export const DebtLeverageChart: React.FC<DebtLeverageChartProps> = ({
  points,
  showLeverage,
  onPointActivate,
}) => {
  const isDesktop = useIsDesktop();
  const { isActive, toggle } = useSeriesToggle<DebtLeverageSeriesKey>([
    'liabilities',
    'debtRatio',
    'leverage',
  ]);

  const debtVisible = isActive('liabilities');
  const ratioVisible = isActive('debtRatio');
  const leverageVisible = showLeverage && isActive('leverage');
  const visibleLabels = [
    debtVisible ? REPORT_ANALYSIS_LABELS.DEBT_BALANCE : null,
    ratioVisible ? REPORT_ANALYSIS_LABELS.DEBT_RATIO : null,
    leverageVisible ? REPORT_ANALYSIS_LABELS.LEVERAGE : null,
  ].filter((label) => label !== null);

  const labels = points.map((point) => point.label);
  const referenceLines = unclosedReferenceLines(points);
  const activate = pointActivator(points, onPointActivate);
  // The lowest visible line owns the x labels; the bars only label when both are hidden.
  const barLabels = !ratioVisible && !leverageVisible;

  // Every layer shows the same tooltip so the stacked values read together.
  const tooltipPoints = points.map((point) => {
    const parts = [
      debtVisible ? `${REPORT_ANALYSIS_LABELS.DEBT_BALANCE} ${point.liabilitiesText}` : null,
      ratioVisible ? `${REPORT_ANALYSIS_LABELS.DEBT_RATIO} ${point.debtRatioText}` : null,
      leverageVisible ? `${REPORT_ANALYSIS_LABELS.LEVERAGE} ${point.leverageText}` : null,
    ].filter((part): part is string => part !== null);
    return {
      title: point.label,
      value: parts[0] ?? REPORT_ANALYSIS_LABELS.DASH,
      meta: parts.slice(1).join(' · '),
    };
  });

  const barSeries: ComposedSeries[] = debtVisible
    ? [{ kind: 'bar', tone: 'negative', values: points.map((point) => point.liabilities) }]
    : [];

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={labels}
        series={barSeries}
        referenceLines={referenceLines}
        points={tooltipPoints}
        height={isDesktop ? 240 : 160}
        showLabels={barLabels}
        ariaLabel={REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_ARIA(visibleLabels.join('、'))}
        onPointClick={activate}
      />

      {ratioVisible && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {REPORT_ANALYSIS_LABELS.DEBT_RATIO_UNIT}
          </p>
          <InteractiveComposedChart
            labels={labels}
            series={[
              { kind: 'line', tone: 'neutral', values: points.map((point) => point.debtRatio) },
            ]}
            points={tooltipPoints}
            referenceLines={referenceLines.map(({ index, tone }) => ({ index, tone }))}
            height={96}
            yUnit="%"
            showLabels={!leverageVisible}
            ariaLabel={REPORT_ANALYSIS_LABELS.DEBT_RATIO}
            onPointClick={activate}
          />
        </div>
      )}

      {leverageVisible && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {REPORT_ANALYSIS_LABELS.LEVERAGE_UNIT}
          </p>
          <InteractiveComposedChart
            labels={labels}
            series={[
              {
                kind: 'line',
                tone: 'investment',
                values: points.map((point) => point.leverage),
              },
            ]}
            points={tooltipPoints}
            referenceLines={referenceLines.map(({ index, tone }) => ({ index, tone }))}
            height={96}
            yUnit="x"
            ariaLabel={REPORT_ANALYSIS_LABELS.LEVERAGE}
            onPointClick={activate}
          />
        </div>
      )}

      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE, tone: 'negative' },
          { label: REPORT_ANALYSIS_LABELS.DEBT_RATIO, tone: 'neutral' },
          ...(showLeverage
            ? [{ label: REPORT_ANALYSIS_LABELS.LEVERAGE, tone: 'investment' as const }]
            : []),
        ]}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES_KEYS[label];
          if (key !== undefined) toggle(key);
        }}
      />
      {!showLeverage && (
        <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.NO_LEVERAGE_HINT}</p>
      )}
    </div>
  );
};
