import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import {
  type ComposedReferenceLine,
  type ComposedSeries,
} from '@/ui/components/charts/composedChartGeometry';
import { PROJECTION_CHART_LABELS } from '@/ui/constants/retirement/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
  /** Selected year, marked when it falls inside the projection period. */
  selectedYear?: number | null;
  /** Called with the activated year. */
  onSelectYear?: (year: number) => void;
};

const buildSeries = (projection: RetirementProjectionVM): ComposedSeries[] => {
  const points = projection.chartData;
  const income = points.map((point) => point.income);
  const incomeAndReturn = points.map((point) => point.income + point.investmentIncome);

  return [
    { kind: 'line', tone: 'positive', area: true, values: income },
    // Investment return stacks on income: the band is the gap between the two lines.
    {
      kind: 'line',
      tone: 'investment',
      area: true,
      values: incomeAndReturn,
      baselineValues: income,
    },
    { kind: 'line', tone: 'negative', area: true, values: points.map((point) => -point.expense) },
    { kind: 'line', tone: 'primary', values: points.map((point) => point.netCashFlow) },
    // Net worth is the context line here, not the subject: thin and dashed so it never
    // competes with the composition it overlaps.
    {
      kind: 'line',
      tone: 'asset',
      axis: 'right',
      dashed: true,
      values: points.map((point) => point.savings),
    },
  ];
};

/**
 * 年度收支結構投影：收入與投資報酬的堆疊帶（零以上）、支出帶（零以下）＋淨資產變動線，
 * 疊上淨資產線（右軸）。資料即投影的 `chartData`，不新增計算（issue #265）。
 * 變動線是「帶頂 − 支出帶」，含投資報酬，因此與淨資產線的斜率一致。
 *
 * 垂直標記與 `NetWorthChart` 同一個優先序：轉負 > 選取 > 退休，一格只留一條。
 */
export function CashFlowChart({
  projection,
  selectedYear = null,
  onSelectYear,
}: RetirementProjectionProps) {
  const labels = projection.chartData.map((point) => String(point.year));
  const indexOf = (year: number | null) =>
    year === null ? -1 : projection.chartData.findIndex((point) => point.year === year);

  const byPriority = new Map<number, ComposedReferenceLine>();
  const add = (index: number, tone: 'negative' | 'primary', label: string) => {
    if (index < 0 || byPriority.has(index)) return;
    byPriority.set(index, { index, tone, label });
  };
  add(indexOf(projection.negativeYear), 'negative', PROJECTION_CHART_LABELS.negativeMarker);
  add(indexOf(selectedYear), 'primary', PROJECTION_CHART_LABELS.selectedMarker);
  add(indexOf(projection.retirementYear), 'primary', PROJECTION_CHART_LABELS.retirementMarker);

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={labels}
        series={buildSeries(projection)}
        referenceLines={[...byPriority.values()]}
        points={projection.chartData.map((point) => ({
          title: `${PROJECTION_CHART_LABELS.tooltipYearPrefix} ${point.year}`,
          value: `${PROJECTION_CHART_LABELS.netCashFlow} ${point.netCashFlowText}`,
          meta: `${PROJECTION_CHART_LABELS.income} ${point.incomeText} · ${PROJECTION_CHART_LABELS.investmentReturn} ${point.investmentIncomeText} · ${PROJECTION_CHART_LABELS.expense} ${point.expenseText} · ${PROJECTION_CHART_LABELS.netWorth} ${point.savingsText}`,
        }))}
        height={360}
        ariaLabel={PROJECTION_CHART_LABELS.cashFlowAriaLabel}
        {...(onSelectYear === undefined
          ? {}
          : {
              onPointClick: (index: number) => {
                const point = projection.chartData[index];
                if (point !== undefined) onSelectYear(point.year);
              },
            })}
      />
      <ChartLegend
        items={[
          { label: PROJECTION_CHART_LABELS.income, tone: 'positive' },
          { label: PROJECTION_CHART_LABELS.investmentReturn, tone: 'investment' },
          { label: PROJECTION_CHART_LABELS.expense, tone: 'negative' },
          { label: PROJECTION_CHART_LABELS.netCashFlow, tone: 'primary' },
          { label: PROJECTION_CHART_LABELS.netWorth, tone: 'asset' },
        ]}
      />
    </div>
  );
}
