import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { type IncomeChartVM, type IncomeSeriesKey } from '../viewmodels/reportAnalysis.vm';
import { unclosedReferenceLines } from './unclosedMarkers';
import { pointActivator, useSeriesToggle } from './useSeriesToggle';

interface IncomeSavingsChartProps {
  points: IncomeChartVM[];
  onPointActivate: (yearMonth: string) => void;
}

const SERIES_KEYS: Record<string, IncomeSeriesKey> = {
  [REPORT_ANALYSIS_LABELS.INCOME]: 'income',
  [REPORT_ANALYSIS_LABELS.EXPENSE]: 'expense',
  [REPORT_ANALYSIS_LABELS.SAVINGS_RATE]: 'savingsRate',
};

/**
 * 上半收入／支出並列柱，下半 96px 儲蓄率折線。兩者共用月份與 x 軸，
 * 但各自一個刻度，不使用右軸；儲蓄率也放進柱圖 tooltip 的 meta。
 */
export const IncomeSavingsChart: React.FC<IncomeSavingsChartProps> = ({
  points,
  onPointActivate,
}) => {
  const isDesktop = useIsDesktop();
  const { isActive, toggle } = useSeriesToggle<IncomeSeriesKey>([
    'income',
    'expense',
    'savingsRate',
  ]);

  const referenceLines = unclosedReferenceLines(points);

  const barSeries: ComposedSeries[] = [
    ...(isActive('income')
      ? ([{ kind: 'bar', tone: 'positive', values: points.map((point) => point.income) }] as const)
      : []),
    ...(isActive('expense')
      ? ([{ kind: 'bar', tone: 'negative', values: points.map((point) => point.expense) }] as const)
      : []),
  ];

  const savingsVisible = isActive('savingsRate');
  const visibleLabels = [
    isActive('income') ? REPORT_ANALYSIS_LABELS.INCOME : null,
    isActive('expense') ? REPORT_ANALYSIS_LABELS.EXPENSE : null,
    savingsVisible ? REPORT_ANALYSIS_LABELS.SAVINGS_RATE : null,
  ].filter((label) => label !== null);

  const labels = points.map((point) => point.label);
  const activate = pointActivator(points, onPointActivate);

  // Both layers show the same tooltip so the stacked values read together.
  const tooltipPoints = points.map((point) => {
    const income = isActive('income')
      ? `${REPORT_ANALYSIS_LABELS.INCOME} ${point.incomeText}`
      : null;
    const expense = isActive('expense')
      ? `${REPORT_ANALYSIS_LABELS.EXPENSE} ${point.expenseText}`
      : null;
    const rate = savingsVisible
      ? `${REPORT_ANALYSIS_LABELS.SAVINGS_RATE} ${point.savingsRateText}`
      : null;
    const parts = [income, expense, rate].filter((part): part is string => part !== null);
    return {
      title: point.label,
      value: parts[0] ?? REPORT_ANALYSIS_LABELS.DASH,
      meta: parts.slice(1).join(' · '),
    };
  });

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={labels}
        series={barSeries}
        referenceLines={referenceLines}
        points={tooltipPoints}
        height={isDesktop ? 240 : 160}
        // The lower savings line owns the x labels while it is visible.
        showLabels={!savingsVisible}
        ariaLabel={REPORT_ANALYSIS_LABELS.INCOME_ARIA(visibleLabels.join('、'))}
        onPointClick={activate}
      />

      {savingsVisible && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {REPORT_ANALYSIS_LABELS.SAVINGS_RATE_UNIT}
          </p>
          <InteractiveComposedChart
            labels={labels}
            series={[
              {
                kind: 'line',
                tone: 'asset',
                values: points.map((point) => point.savingsRate),
              },
            ]}
            points={tooltipPoints}
            // The bar chart above already labels each run.
            referenceLines={referenceLines.map(({ index, tone }) => ({ index, tone }))}
            height={96}
            ariaLabel={REPORT_ANALYSIS_LABELS.SAVINGS_RATE}
            onPointClick={activate}
          />
        </div>
      )}

      <ChartLegend
        items={[
          { label: REPORT_ANALYSIS_LABELS.INCOME, tone: 'positive' },
          { label: REPORT_ANALYSIS_LABELS.EXPENSE, tone: 'negative' },
          { label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE, tone: 'asset' },
        ]}
        active={visibleLabels}
        onToggle={(label) => {
          const key = SERIES_KEYS[label];
          if (key !== undefined) toggle(key);
        }}
      />
      <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.SAVINGS_FORMULA}</p>
    </div>
  );
};
