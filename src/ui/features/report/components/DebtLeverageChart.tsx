import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { heroPoint } from '@/ui/components/charts/chartInteraction';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type DebtLeverageChartVM,
  type DebtLeverageSeriesKey,
} from '../viewmodels/reportAnalysis.vm';
import { pointActivator, useSeriesToggle } from './chartInteractions';
import { pointTitle } from './seriesTooltip';
import { unclosedReferenceLines, withoutLabels } from './unclosedMarkers';

interface DebtLeverageChartProps {
  points: DebtLeverageChartVM[];
  /** The range contains at least one month above 1x, so the leverage layer exists. */
  showLeverage: boolean;
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  markerLabels?: boolean;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
}

const SERIES = [
  { key: 'liabilities', label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE, tone: 'negative' },
  { key: 'debtRatio', label: REPORT_ANALYSIS_LABELS.DEBT_RATIO, tone: 'neutral' },
  { key: 'leverage', label: REPORT_ANALYSIS_LABELS.LEVERAGE, tone: 'investment' },
] as const;

/**
 * 負債餘額柱、負債比折線、加權平均槓桿折線三層同節。槓桿層只在目前範圍
 * 真的出現槓桿時存在；缺 snapshot 只讓槓桿線斷開。
 */
export const DebtLeverageChart: React.FC<DebtLeverageChartProps> = ({
  points,
  showLeverage,
  markerLabels = true,
  selectedPeriod,
  onPointSelect,
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
  const referenceLines = markerLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const activate = pointActivator(points, onPointSelect);
  // The lowest visible line owns the x labels; the bars only label when both are hidden.
  const barLabels = !ratioVisible && !leverageVisible;

  // Every layer shows the same tooltip so the stacked values read together.
  const tooltipPoints = points.map((point) =>
    heroPoint(
      pointTitle(point),
      debtVisible
        ? {
            id: 'liabilities',
            label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE,
            value: point.liabilitiesText,
          }
        : undefined,
      [
        ratioVisible
          ? {
              id: 'debtRatio',
              label: REPORT_ANALYSIS_LABELS.DEBT_RATIO,
              value: point.debtRatioText,
              ...(point.changeText === null ? {} : { detail: point.changeText }),
            }
          : null,
        leverageVisible
          ? {
              id: 'leverage',
              label: REPORT_ANALYSIS_LABELS.LEVERAGE,
              value: point.leverageText,
            }
          : null,
      ],
    ),
  );

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
        height={isDesktop ? (points.length < 6 ? 160 : 240) : 160}
        showLabels={barLabels}
        ariaLabel={REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_ARIA(visibleLabels.join('、'))}
        selectedIndex={selectedIndex}
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
            referenceLines={withoutLabels(referenceLines)}
            height={96}
            yTicks={3}
            yDecimals={1}
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
            referenceLines={withoutLabels(referenceLines)}
            height={96}
            yTicks={3}
            yDecimals={3}
            yUnit="x"
            ariaLabel={REPORT_ANALYSIS_LABELS.LEVERAGE}
            onPointClick={activate}
          />
        </div>
      )}

      <ChartLegend
        items={SERIES.filter((item) => showLeverage || item.key !== 'leverage').map((item) => ({
          label: item.label,
          tone: item.tone,
        }))}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES.find((item) => item.label === label)?.key;
          if (key !== undefined) toggle(key);
        }}
      />
      {!showLeverage && (
        <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.NO_LEVERAGE_HINT}</p>
      )}
    </div>
  );
};
