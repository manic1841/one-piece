import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { PROJECTION_CHART_LABELS } from '@/ui/constants/retirement-redesign/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement-redesign/viewmodels/projectionDisplayVm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
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
    { kind: 'line', tone: 'asset', axis: 'right', values: points.map((point) => point.savings) },
  ];
};

/**
 * 年度現金流投影：收入與投資報酬的堆疊帶（零以上）、支出帶（零以下）＋淨現金流線，
 * 疊上淨資產線（右軸）。資料即投影的 `chartData`，不新增計算（issue #265）。
 */
export function CashFlowChart({ projection }: RetirementProjectionProps) {
  const labels = projection.chartData.map((point) => String(point.year));
  const retirementIndex = projection.chartData.findIndex(
    (point) => point.year === projection.retirementYear,
  );

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        labels={labels}
        series={buildSeries(projection)}
        referenceLines={
          retirementIndex >= 0
            ? [
                {
                  index: retirementIndex,
                  tone: 'primary',
                  label: PROJECTION_CHART_LABELS.retirementMarker,
                },
              ]
            : []
        }
        points={projection.chartData.map((point) => ({
          title: `${PROJECTION_CHART_LABELS.tooltipYearPrefix} ${point.year}`,
          value: `${PROJECTION_CHART_LABELS.netCashFlow} ${point.netCashFlowText}`,
          meta: `${PROJECTION_CHART_LABELS.income} ${point.incomeText} · ${PROJECTION_CHART_LABELS.investmentReturn} ${point.investmentIncomeText} · ${PROJECTION_CHART_LABELS.expense} ${point.expenseText} · ${PROJECTION_CHART_LABELS.netWorth} ${point.savingsText}`,
        }))}
        height={360}
        ariaLabel={PROJECTION_CHART_LABELS.cashFlowAriaLabel}
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
