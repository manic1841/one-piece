import { describe, expect, it } from 'vitest';

import { aggregateTrendPoints } from './trendAggregation';

describe('aggregateTrendPoints', () => {
  const samplePoints = [
    {
      year: 2026,
      month: 1,
      income: 100,
      incomeByCategory: {},
      expense: 80,
      totalAssets: 1000,
      liabilities: 300,
      netAssets: 700,
      investmentGain: 20,
      investmentReturnRate: 2,
    },
    {
      year: 2026,
      month: 2,
      income: 110,
      incomeByCategory: {},
      expense: 85,
      totalAssets: 1050,
      liabilities: 320,
      netAssets: 730,
      investmentGain: 10,
      investmentReturnRate: 1,
    },
    {
      year: 2026,
      month: 3,
      income: 120,
      incomeByCategory: {},
      expense: 90,
      totalAssets: 1100,
      liabilities: 330,
      netAssets: 770,
      investmentGain: 15,
      investmentReturnRate: -0.5,
    },
    {
      year: 2026,
      month: 4,
      income: 130,
      incomeByCategory: {},
      expense: 95,
      totalAssets: 1120,
      liabilities: 340,
      netAssets: 780,
      investmentGain: 12,
      investmentReturnRate: 0.8,
    },
  ];

  it('keeps monthly return rate unchanged for month mode', () => {
    const result = aggregateTrendPoints(samplePoints, 'month');

    expect(result.labels).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(result.investmentReturnRates).toEqual([2, 1, -0.5, 0.8]);
  });

  it('compounds return rates for quarter mode', () => {
    const result = aggregateTrendPoints(samplePoints, 'quarter');

    // Q1 = (1+0.02) * (1+0.01) * (1-0.005) - 1 = 2.5149%
    const expectedQ1 = ((1 + 0.02) * (1 + 0.01) * (1 - 0.005) - 1) * 100;

    expect(result.labels).toEqual(['2026-Q1', '2026-Q2']);
    expect(result.investmentReturnRates[0]).toBeCloseTo(expectedQ1, 6);
    expect(result.investmentReturnRates[1]).toBeCloseTo(0.8, 6);
  });

  it('compounds return rates for year mode', () => {
    const result = aggregateTrendPoints(samplePoints, 'year');

    const expectedYear = ((1 + 0.02) * (1 + 0.01) * (1 - 0.005) * (1 + 0.008) - 1) * 100;

    expect(result.labels).toEqual(['2026']);
    expect(result.investmentReturnRates).toHaveLength(1);
    expect(result.investmentReturnRates[0]).toBeCloseTo(expectedYear, 6);
  });
});
