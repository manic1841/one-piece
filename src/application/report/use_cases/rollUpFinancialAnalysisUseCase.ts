import { returnRateOf, savingsRateOf } from '@/domains/report/analysisRatios';
import { type AnalysisGranularity, yearOf } from '@/domains/report/analysisScale';
import { rollUpByYear, rollUpStock } from '@/domains/report/annualRollup';

import { type FinancialAnalysis } from './getFinancialAnalysisWorkflow';

const sumOf = <Point>(points: Point[], value: (point: Point) => number): number =>
  points.reduce((total, point) => total + value(point), 0);

/**
 * Rescale a resolved analysis without another read. Stocks keep the year's last
 * month; flows are summed and their ratios recomputed from the yearly totals.
 * Anchor, KPIs and the unclosed months stay monthly: they describe the range,
 * not the drawn scale.
 */
export class RollUpFinancialAnalysisUseCase {
  execute(analysis: FinancialAnalysis, granularity: AnalysisGranularity): FinancialAnalysis {
    if (granularity === 'monthly') return analysis;
    // An open month anywhere in the analysis makes its whole year provisional, even
    // when this series has no point there (docs/financial_analysis.md §1b).
    const unclosedYears = new Set(analysis.unclosedMonths.map(yearOf));
    return {
      ...analysis,
      netWorthPoints: rollUpStock(analysis.netWorthPoints, unclosedYears),
      assetCompositionPoints: rollUpStock(analysis.assetCompositionPoints, unclosedYears),
      debtLeveragePoints: rollUpStock(analysis.debtLeveragePoints, unclosedYears),
      cashCoveragePoints: rollUpStock(analysis.cashCoveragePoints, unclosedYears),
      incomePoints: rollUpByYear(
        analysis.incomePoints,
        (group) => {
          const income = sumOf(group, (point) => point.income);
          const expense = sumOf(group, (point) => point.expense);
          return {
            income,
            expense,
            savingsRate: savingsRateOf(income, expense),
          };
        },
        unclosedYears,
      ),
      cashFlowPoints: rollUpByYear(
        analysis.cashFlowPoints,
        (group) => ({
          netCashFlow: sumOf(group, (point) => point.netCashFlow),
        }),
        unclosedYears,
      ),
      investmentPerformancePoints: rollUpByYear(
        analysis.investmentPerformancePoints,
        (group) => {
          const gain = sumOf(group, (point) => point.gain);
          const openingValue = group[0]?.openingValue ?? 0;
          return {
            gain,
            openingValue,
            returnRate: returnRateOf(gain, openingValue),
          };
        },
        unclosedYears,
      ),
    };
  }
}

export const rollUpFinancialAnalysisUseCase = new RollUpFinancialAnalysisUseCase();
