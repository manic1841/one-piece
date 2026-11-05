import { describe, expect, it } from 'vitest';

import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisUseCase';

import { buildReportAnalysisVM, buildReportSummaryVM, unclosedRunStarts } from './reportAnalysis.vm';

const analysis: FinancialAnalysis = {
  anchor: { yearMonth: '2026-03', closed: false },
  kpis: {
    yearMonth: '2026-03',
    assets: 1000,
    netWorth: 900,
    liabilities: 100,
    savingsRate: null,
    anchorClosed: false,
  },
  cutoff: '2026-03',
  unclosedMonths: ['2026-02', '2026-03'],
  range: '3y',
  availableRanges: ['1y', '3y'],
  netWorthPoints: [
    { yearMonth: '2026-01', closed: true, netWorth: 800, assets: 900, liabilities: 100 },
    { yearMonth: '2026-03', closed: false, netWorth: 900, assets: 1000, liabilities: 100 },
  ],
  incomePoints: [
    {
      yearMonth: '2026-01',
      closed: true,
      income: 5000,
      expense: 6000,
      savingsRate: -20,
    },
    { yearMonth: '2026-03', closed: false, income: 0, expense: 200, savingsRate: null },
  ],
  cashFlowPoints: [
    { yearMonth: '2026-01', closed: true, netCashFlow: -300 },
    { yearMonth: '2026-03', closed: false, netCashFlow: 500 },
  ],
};

describe('buildReportSummaryVM', () => {
  it('links each KPI to its analysis section and preselected series', () => {
    const vm = buildReportSummaryVM(analysis);

    expect(vm.kpis.map((kpi) => kpi.key)).toEqual([
      'totalAssets',
      'netWorth',
      'totalLiabilities',
      'savingsRate',
    ]);
    expect(vm.kpis[0]?.href).toBe('/reports/analysis?series=assets#net-worth');
    expect(vm.kpis[1]?.href).toBe('/reports/analysis#net-worth');
    expect(vm.kpis[2]?.href).toBe('/reports/analysis?series=debt#net-worth');
    expect(vm.kpis[3]?.href).toBe('/reports/analysis#income');
  });

  it('shows the anchor period, the unclosed flag and a dash for the missing rate', () => {
    const vm = buildReportSummaryVM(analysis);

    expect(vm.periodText).toBe('2026 年 3 月');
    expect(vm.unclosed).toBe(true);
    expect(vm.kpis[3]?.valueText).toBe('—');
  });

  it('dashes every value without an anchor', () => {
    const vm = buildReportSummaryVM({
      ...analysis,
      anchor: null,
      kpis: {
        yearMonth: null,
        assets: null,
        netWorth: null,
        liabilities: null,
        savingsRate: null,
        anchorClosed: null,
      },
    });

    expect(vm.periodText).toBe('—');
    expect(vm.kpis.every((kpi) => kpi.valueText === '—')).toBe(true);
  });
});

describe('buildReportAnalysisVM', () => {
  it('describes the cutoff and unclosed count and keeps the range options', () => {
    const vm = buildReportAnalysisVM(analysis);

    expect(vm.description).toBe('資料截至 2026-03，含 2 期未關帳');
    expect(vm.showRangeControl).toBe(true);
    expect(vm.rangeItems.map((item) => item.label)).toEqual(['1Y', '3Y']);
  });

  it('hides the range control when only one option survives', () => {
    const vm = buildReportAnalysisVM({ ...analysis, availableRanges: ['3y'] });

    expect(vm.showRangeControl).toBe(false);
  });

  it('formats a negative rate and dashes a null rate', () => {
    const vm = buildReportAnalysisVM(analysis);

    expect(vm.income.points[0]?.savingsRateText).toBe('-20.0%');
    expect(vm.income.points[1]?.savingsRateText).toBe('—');
  });

  it('collapses more than six unclosed months and links to the history', () => {
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07'];
    const vm = buildReportAnalysisVM({ ...analysis, unclosedMonths: months });

    expect(vm.unclosedNote).toEqual({
      text: '未關帳月份：2025-01 起等 7 期',
      showHistoryLink: true,
    });
    expect(vm.description).toBe('資料截至 2026-03，含 7 期未關帳');
  });

  it('shows the insufficient hint below two points', () => {
    const vm = buildReportAnalysisVM({
      ...analysis,
      netWorthPoints: analysis.netWorthPoints.slice(0, 1),
      cashFlowPoints: [],
    });

    expect(vm.netWorth.insufficient).toBe(true);
    expect(vm.cashFlow.insufficient).toBe(true);
    expect(vm.cashFlow.latestText).toBeNull();
  });
});

describe('unclosedRunStarts', () => {
  it('returns only the first point of every run', () => {
    expect(
      unclosedRunStarts([
        { unclosed: false },
        { unclosed: true },
        { unclosed: true },
        { unclosed: false },
        { unclosed: true },
      ]),
    ).toEqual([1, 4]);
  });
});
