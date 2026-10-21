import {
  type ProjectionInput,
  type ProjectionResult,
} from '@/domains/retirement/logic/projectionTypes';
import { PROJECTION_RISK_LABELS } from '@/ui/constants/retirement-redesign/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement-redesign/viewmodels/projectionDisplayVm';
import { formatCurrency } from '@/ui/utils';

/**
 * Adapts the pure engine output to the existing projection presentation VM so
 * the net-worth, cash-flow and yearly-detail components stay shared.
 */
export function mapProjectionResultToVM(
  input: ProjectionInput,
  result: ProjectionResult,
): RetirementProjectionVM {
  const inputByYear = new Map(input.years.map((year) => [year.year, year]));
  const minYear = result.summary.minNetWorthYear;
  const bankruptYear = result.summary.bankruptcyYear;

  return {
    retirementYear: input.retirementYear,
    retirementSavingsText:
      result.summary.retirementNetWorth === null
        ? '—'
        : formatCurrency(result.summary.retirementNetWorth),
    minYearText: minYear === null ? PROJECTION_RISK_LABELS.none : String(minYear),
    minSavingsText: formatCurrency(result.summary.minNetWorth),
    bankruptText: bankruptYear === null ? '否' : `是 (${bankruptYear})`,
    bankruptTone: result.summary.isBankrupt ? 'negative' : 'positive',
    chartData: result.years.map((year) => {
      const source = inputByYear.get(year.year);
      const income = source?.inflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      const expense = source?.outflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      const netCashFlow = year.inflows - year.outflows;

      return {
        year: year.year,
        age: year.age,
        income,
        expense,
        investmentIncome: year.return,
        netCashFlow,
        savings: year.closing,
        incomeText: formatCurrency(income),
        expenseText: formatCurrency(expense),
        investmentIncomeText: formatCurrency(year.return),
        netCashFlowText: formatCurrency(netCashFlow),
        savingsText: formatCurrency(year.closing),
        isBankruptYear: bankruptYear === year.year,
        isRetired: year.isRetired,
      };
    }),
    yearlyDetails: result.years.map((year) => {
      const source = inputByYear.get(year.year);
      return {
        year: year.year,
        age: year.age,
        isRetired: year.isRetired,
        statusText: year.isRetired ? 'Retired' : 'Working',
        incomeText: formatCurrency(year.inflows),
        expenseText: formatCurrency(year.outflows),
        investmentReturnText: formatCurrency(year.return),
        netCashFlowText: formatCurrency(year.inflows - year.outflows),
        savingsText: formatCurrency(year.closing),
        incomeItems: (source?.inflows ?? []).map((item) => ({
          name: item.label,
          amountText: formatCurrency(item.amount),
        })),
        expenseItems: (source?.outflows ?? []).map((item) => ({
          name: item.label,
          amountText: formatCurrency(item.amount),
        })),
      };
    }),
    expenseBreakdownChartData: null,
    risks: [
      {
        key: 'retirementYear',
        label: PROJECTION_RISK_LABELS.retirementYear,
        valueText: String(input.retirementYear),
        tone: 'default',
      },
      {
        key: 'bankruptcyYear',
        label: PROJECTION_RISK_LABELS.bankruptcyYear,
        valueText: bankruptYear === null ? PROJECTION_RISK_LABELS.none : String(bankruptYear),
        tone: bankruptYear === null ? 'default' : 'negative',
      },
      {
        key: 'minSavingsYear',
        label: PROJECTION_RISK_LABELS.minSavingsYear,
        valueText: minYear === null ? PROJECTION_RISK_LABELS.none : String(minYear),
        tone: 'default',
      },
      {
        key: 'lifeExpectancyEnd',
        label: PROJECTION_RISK_LABELS.lifeExpectancyEnd,
        valueText: String(input.lastYear),
        tone: 'default',
      },
    ],
  };
}
