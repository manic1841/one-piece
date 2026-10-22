import { type ProjectionInput, type ProjectionResult } from '@/domains/retirement/projectionTypes';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import {
  mapProjectionPoint,
  mapYearlyDetail,
} from '@/ui/features/retirement/viewmodels/projectionRows.vm';

/**
 * Adapts the pure engine output to the existing projection presentation VM so
 * the net-worth, cash-flow and yearly-detail components stay shared.
 */
export function mapProjectionResultToVM(
  input: ProjectionInput,
  result: ProjectionResult,
): RetirementProjectionVM {
  const inputByYear = new Map(input.years.map((year) => [year.year, year]));
  const bankruptYear = result.summary.bankruptcyYear;

  return {
    retirementYear: input.retirementYear,
    negativeYear: bankruptYear,
    chartData: result.years.map((year) => {
      const source = inputByYear.get(year.year);
      const income = source?.inflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      const expense = source?.outflows.reduce((total, item) => total + item.amount, 0) ?? 0;
      return mapProjectionPoint(year, income, expense, bankruptYear);
    }),
    yearlyDetails: result.years.map(mapYearlyDetail),
  };
}
