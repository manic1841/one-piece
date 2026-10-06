import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { RetirementChartLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

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
                  label: RetirementChartLabels.retirementMarker,
                },
              ]
            : []
        }
        points={projection.chartData.map((point) => ({
          title: `${RetirementChartLabels.tooltipYearPrefix} ${point.year}`,
          value: `${RetirementChartLabels.netCashFlow} ${point.netCashFlowText}`,
          meta: `${RetirementChartLabels.income} ${point.incomeText} · ${RetirementChartLabels.investmentReturn} ${point.investmentIncomeText} · ${RetirementChartLabels.expense} ${point.expenseText} · ${RetirementChartLabels.netWorth} ${point.savingsText}`,
        }))}
        height={360}
        ariaLabel={RetirementChartLabels.cashFlowAriaLabel}
      />
      <ChartLegend
        items={[
          { label: RetirementChartLabels.income, tone: 'positive' },
          { label: RetirementChartLabels.investmentReturn, tone: 'investment' },
          { label: RetirementChartLabels.expense, tone: 'negative' },
          { label: RetirementChartLabels.netCashFlow, tone: 'primary' },
          { label: RetirementChartLabels.netWorth, tone: 'asset' },
        ]}
      />
    </div>
  );
}
