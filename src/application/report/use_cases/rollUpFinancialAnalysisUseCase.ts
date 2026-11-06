import { type AnalysisGranularity } from '@/domains/report/analysisScale';
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
    return {
      ...analysis,
      netWorthPoints: rollUpStock(analysis.netWorthPoints),
      assetCompositionPoints: rollUpStock(analysis.assetCompositionPoints),
      debtLeveragePoints: rollUpStock(analysis.debtLeveragePoints),
      cashCoveragePoints: rollUpStock(analysis.cashCoveragePoints),
      incomePoints: rollUpByYear(analysis.incomePoints, (group) => {
        const income = sumOf(group, (point) => point.income);
        const expense = sumOf(group, (point) => point.expense);
        return {
          income,
          expense,
          savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
        };
      }),
      cashFlowPoints: rollUpByYear(analysis.cashFlowPoints, (group) => ({
        netCashFlow: sumOf(group, (point) => point.netCashFlow),
      })),
      investmentPerformancePoints: rollUpByYear(analysis.investmentPerformancePoints, (group) => {
        const gain = sumOf(group, (point) => point.gain);
        const openingValue = group[0]?.openingValue ?? 0;
        return {
          gain,
          openingValue,
          returnRate: openingValue > 0 ? (gain / openingValue) * 100 : null,
        };
      }),
    };
  }
}

export const rollUpFinancialAnalysisUseCase = new RollUpFinancialAnalysisUseCase();
