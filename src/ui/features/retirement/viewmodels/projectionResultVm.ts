import {
  type ProjectionInput,
  type ProjectionResult,
} from '@/domains/retirement/logic/projectionTypes';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplayVm';
import {
  mapProjectionPoint,
  mapYearlyDetail,
} from '@/ui/features/retirement/viewmodels/projectionRows';
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
        ? PROJECTION_COMMON_LABELS.DASH
        : formatCurrency(result.summary.retirementNetWorth),
    minYearText: minYear === null ? PROJECTION_COMMON_LABELS.DASH : String(minYear),
    minSavingsText: formatCurrency(result.summary.minNetWorth),
    bankruptText:
      bankruptYear === null
        ? PROJECTION_COMMON_LABELS.NO
        : `${PROJECTION_COMMON_LABELS.YES} (${bankruptYear})`,
    bankruptTone: result.summary.isBankrupt ? 'negative' : 'positive',
    chartData: result.years.map((year) => {
      const source = inputByYear.get(year.year);
      const income = source?.inflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      const expense = source?.outflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      return mapProjectionPoint(year, income, expense, bankruptYear);
    }),
    yearlyDetails: result.years.map(mapYearlyDetail),
  };
}
