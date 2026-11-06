import { describe, expect, it } from 'vitest';

import { type FinancialAnalysis } from './getFinancialAnalysisWorkflow';
import { rollUpFinancialAnalysisUseCase } from './rollUpFinancialAnalysisUseCase';

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

describe('rollUpFinancialAnalysisUseCase', () => {
  it('returns the monthly analysis untouched', () => {
    const analysis = analysisOf();

    expect(rollUpFinancialAnalysisUseCase.execute(analysis, 'monthly')).toBe(analysis);
  });

  it('keeps the year stock, sums the gain and recomputes the rate from the year opening', () => {
    const annual = rollUpFinancialAnalysisUseCase.execute(analysisOf(), 'annual');

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

    const annual = rollUpFinancialAnalysisUseCase.execute(analysis, 'annual');

    expect(annual.anchor).toBe(analysis.anchor);
    expect(annual.kpis).toBe(analysis.kpis);
    expect(annual.unclosedMonths).toBe(analysis.unclosedMonths);
  });

  it('takes the last month of every stock series and marks the year provisional', () => {
    const annual = rollUpFinancialAnalysisUseCase.execute(
      analysisOf({
        assetCompositionPoints: [
          {
            yearMonth: '2026-01',
            closed: true,
            assetsTotal: 900,
            cash: 1,
            investment: 2,
            property: 3,
          },
          {
            yearMonth: '2026-02',
            closed: false,
            assetsTotal: 1000,
            cash: 4,
            investment: 5,
            property: 6,
          },
        ],
        debtLeveragePoints: [
          {
            yearMonth: '2026-01',
            closed: true,
            liabilities: 1,
            assetsTotal: 900,
            debtRatio: 1,
            leverage: null,
          },
          {
            yearMonth: '2026-02',
            closed: false,
            liabilities: 2,
            assetsTotal: 1000,
            debtRatio: 2,
            leverage: 1.2,
          },
        ],
        cashCoveragePoints: [
          { yearMonth: '2026-01', closed: true, cash: 100, expenseAverage: 10, coverageMonths: 10 },
          {
            yearMonth: '2026-02',
            closed: false,
            cash: 200,
            expenseAverage: 20,
            coverageMonths: 10,
          },
        ],
      }),
      'annual',
    );

    expect(annual.assetCompositionPoints).toEqual([
      { yearMonth: '2026', closed: false, assetsTotal: 1000, cash: 4, investment: 5, property: 6 },
    ]);
    expect(annual.debtLeveragePoints[0]).toMatchObject({ yearMonth: '2026', liabilities: 2 });
    expect(annual.cashCoveragePoints[0]).toMatchObject({ yearMonth: '2026', cash: 200 });
  });

  it('marks a flow year provisional when any month is open', () => {
    const annual = rollUpFinancialAnalysisUseCase.execute(analysisOf(), 'annual');

    expect(annual.incomePoints[0]?.closed).toBe(true);
    expect(annual.cashFlowPoints.every((point) => point.closed)).toBe(true);
    expect(annual.investmentPerformancePoints[0]?.closed).toBe(true);

    const open = rollUpFinancialAnalysisUseCase.execute(
      analysisOf({
        incomePoints: [
          { yearMonth: '2026-01', closed: true, income: 10, expense: 1, savingsRate: 90 },
          { yearMonth: '2026-02', closed: false, income: 10, expense: 1, savingsRate: 90 },
        ],
      }),
      'annual',
    );

    expect(open.incomePoints[0]?.closed).toBe(false);
  });

  it('takes the yearly opening value from the year first month even when unsorted', () => {
    const annual = rollUpFinancialAnalysisUseCase.execute(
      analysisOf({
        investmentPerformancePoints: [
          { yearMonth: '2026-02', closed: true, gain: 200, openingValue: 2000, returnRate: 10 },
          { yearMonth: '2026-01', closed: true, gain: 100, openingValue: 1000, returnRate: 10 },
        ],
      }),
      'annual',
    );

    expect(annual.investmentPerformancePoints[0]).toMatchObject({ openingValue: 1000, gain: 300 });
  });

  it('nulls a yearly savings rate when the year has no income', () => {
    const annual = rollUpFinancialAnalysisUseCase.execute(
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
