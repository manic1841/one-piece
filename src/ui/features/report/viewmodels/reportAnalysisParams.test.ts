import { describe, expect, it } from 'vitest';

import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';

import {
  drawableYears,
  latestMonthOfYear,
  monthsNeededForYear,
  rangeForYear,
  resolveAnalysisUrlState,
  widerRange,
} from './reportAnalysisParams';

const params = (query: string) => new URLSearchParams(query);

const analysisOf = (months: string[]): FinancialAnalysis =>
  ({
    anchor: { yearMonth: '2026-03', closed: true },
    kpis: {},
    unclosedMonths: [],
    range: 'all',
    availableRanges: ['all'],
    netWorthPoints: months.map((yearMonth) => ({ yearMonth, closed: true })),
    assetCompositionPoints: [],
    investmentPerformancePoints: [],
    incomePoints: [],
    cashFlowPoints: [],
    debtLeveragePoints: [],
    cashCoveragePoints: [],
  }) as FinancialAnalysis;

describe('resolveAnalysisUrlState', () => {
  it('defaults to the monthly scale with no selection', () => {
    expect(resolveAnalysisUrlState(params(''))).toEqual({
      range: '3y',
      granularity: 'monthly',
      period: null,
    });
  });

  it('reads a bare year as the annual scale', () => {
    expect(resolveAnalysisUrlState(params('period=2025'))).toMatchObject({
      granularity: 'annual',
      period: '2025',
    });
  });

  it('turns a month into its year when the scale is annual', () => {
    expect(resolveAnalysisUrlState(params('granularity=annual&period=2025-04'))).toMatchObject({
      granularity: 'annual',
      period: '2025',
    });
  });

  it('lets the annual scale win over an explicit monthly scale', () => {
    expect(resolveAnalysisUrlState(params('granularity=monthly&period=2025'))).toMatchObject({
      granularity: 'annual',
      period: '2025',
    });
  });

  it('falls back on an invalid granularity and an invalid period', () => {
    expect(resolveAnalysisUrlState(params('granularity=weekly&period=2025-13'))).toEqual({
      range: '3y',
      granularity: 'monthly',
      period: null,
    });
  });
});

describe('rangeForYear', () => {
  it('picks the smallest available range that reaches the year', () => {
    expect(rangeForYear(['1y', '3y', '5y', 'all'], 39)).toBe('5y');
    expect(rangeForYear(['all'], 39)).toBe('all');
  });

  it('returns null when no range reaches or the year is after the anchor', () => {
    expect(rangeForYear(['1y', '3y'], 39)).toBeNull();
    expect(rangeForYear(['all'], -2)).toBeNull();
  });

  it('never narrows the current range', () => {
    expect(widerRange('3y', '5y')).toBe('5y');
    expect(widerRange('all', '5y')).toBe('all');
    expect(widerRange('5y', '5y')).toBe('5y');
  });

  it('counts the anchor month itself in the needed months', () => {
    expect(monthsNeededForYear('2025', '2026-03')).toBe(15);
    expect(monthsNeededForYear('2026', '2026-03')).toBe(3);
  });
});

describe('drawableYears and latestMonthOfYear', () => {
  it('lists distinct years newest first across every series', () => {
    expect(drawableYears(analysisOf(['2024-02', '2026-01', '2024-11']))).toEqual(['2026', '2024']);
  });

  it('returns the last month of a year, or null', () => {
    const analysis = analysisOf(['2024-02', '2024-11', '2026-01']);

    expect(latestMonthOfYear(analysis, '2024')).toBe('2024-11');
    expect(latestMonthOfYear(analysis, '2025')).toBeNull();
  });
});
