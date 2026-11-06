import { describe, expect, it } from 'vitest';

import { type FinancialAnalysis } from './getFinancialAnalysisWorkflow';
import { rollUpAnalysis } from './rollUpFinancialAnalysis';

const analysisOf = (overrides: Partial<FinancialAnalysis> = {}): FinancialAnalysis => ({
  anchor: { yearMonth: '2026-02', closed: true },
  kpis: {
    yearMonth: '2026-02',
    assets: 1000,
    netWorth: 900,
    liabilities: 100,
    savingsRate: 20,
    anchorClosed: true,
  },
  unclosedMonths: ['2026-02'],
  range: 'all',
  availableRanges: ['all'],
  netWorthPoints: [
    { yearMonth: '2025-12', closed: true, netWorth: 700, assets: 800, liabilities: 100 },
    { yearMonth: '2026-01', closed: true, netWorth: 800, assets: 900, liabilities: 100 },
  ],
  assetCompositionPoints: [],
  investmentPerformancePoints: [
    { yearMonth: '2026-01', closed: true, gain: 100, openingValue: 1000, returnRate: 10 },
    { yearMonth: '2026-02', closed: true, gain: 200, openingValue: 2000, returnRate: 10 },
  ],
  incomePoints: [
    { yearMonth: '2026-01', closed: true, income: 0, expense: 100, savingsRate: null },
    { yearMonth: '2026-02', closed: true, income: 1000, expense: 100, savingsRate: 90 },
  ],
  cashFlowPoints: [],
  debtLeveragePoints: [],
  cashCoveragePoints: [],
  ...overrides,
});

describe('rollUpAnalysis', () => {
  it('returns the monthly analysis untouched', () => {
    const analysis = analysisOf();

    expect(rollUpAnalysis(analysis, 'monthly')).toBe(analysis);
  });

  it('keeps the year stock, sums the gain and recomputes the rate from the year opening', () => {
    const annual = rollUpAnalysis(analysisOf(), 'annual');

    expect(annual.netWorthPoints).toEqual([
      { yearMonth: '2025', closed: true, netWorth: 700, assets: 800, liabilities: 100 },
      { yearMonth: '2026', closed: true, netWorth: 800, assets: 900, liabilities: 100 },
    ]);
    expect(annual.investmentPerformancePoints).toEqual([
      { yearMonth: '2026', closed: true, gain: 300, openingValue: 1000, returnRate: 30 },
    ]);
    expect(annual.incomePoints[0]?.savingsRate).toBe(80);
  });

  it('leaves the anchor, the KPIs and the unclosed months monthly', () => {
    const analysis = analysisOf();

    const annual = rollUpAnalysis(analysis, 'annual');

    expect(annual.anchor).toBe(analysis.anchor);
    expect(annual.kpis).toBe(analysis.kpis);
    expect(annual.unclosedMonths).toBe(analysis.unclosedMonths);
  });

  it('nulls a yearly savings rate when the year has no income', () => {
    const annual = rollUpAnalysis(
      analysisOf({
        incomePoints: [
          { yearMonth: '2026-01', closed: true, income: 0, expense: 100, savingsRate: null },
        ],
      }),
      'annual',
    );

    expect(annual.incomePoints[0]?.savingsRate).toBeNull();
    expect(annual.incomePoints[0]?.expense).toBe(100);
  });
});
