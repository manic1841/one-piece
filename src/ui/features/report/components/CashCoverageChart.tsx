import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type CashCoverageChartVM } from '../viewmodels/reportAnalysis.vm';
import { pointActivator } from './chartInteractions';
import { pointTitle, tooltipFrom } from './seriesTooltip';
import { unclosedReferenceLines, withoutLabels } from './unclosedMarkers';

interface CashCoverageChartProps {
  points: CashCoverageChartVM[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  markerLabels?: boolean;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
}

/**
 * 現金覆蓋月數：單一折線、零基準。三期 window 缺任一期時值為 `null`，
 * 折線在該點斷開；現金與平均支出仍留在 tooltip 供回溯。
 */
export const CashCoverageChart: React.FC<CashCoverageChartProps> = ({
  points,
  markerLabels = true,
  selectedPeriod,
  onPointSelect,
}) => {
  const isDesktop = useIsDesktop();
  const referenceLines = markerLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={points.map((point) => point.label)}
        series={[
          {
            kind: 'line',
            tone: 'positive',
            values: points.map((point) => point.coverageMonths),
          },
        ]}
        referenceLines={referenceLines}
        points={points.map((point) =>
          tooltipFrom(pointTitle(point), [
            `${REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS} ${point.coverageMonthsText}`,
            `${REPORT_ANALYSIS_LABELS.COVERAGE_CASH} ${point.cashText}`,
            `${REPORT_ANALYSIS_LABELS.COVERAGE_EXPENSE_AVERAGE} ${point.expenseAverageText}`,
          ]),
        )}
        height={isDesktop ? 240 : 160}
        includeZero
        yTicks={3}
        yDecimals={1}
        ariaLabel={REPORT_ANALYSIS_LABELS.CASH_COVERAGE_ARIA(
          REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS,
        )}
        selectedIndex={selectedIndex}
        onPointClick={pointActivator(points, onPointSelect)}
      />
    </div>
  );
};
