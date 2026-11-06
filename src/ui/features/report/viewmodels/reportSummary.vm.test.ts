import { describe, expect, it } from 'vitest';

import { type ReportSummary } from '@/application/report/use_cases/getReportSummaryWorkflow';

import { buildReportSummaryVM } from './reportSummary.vm';

const summary = (overrides: Partial<ReportSummary['kpis']> = {}): ReportSummary => ({
  anchor: { yearMonth: '2026-06', closed: true },
  kpis: {
    yearMonth: '2026-06',
    assets: 600000,
    netWorth: 450000,
    liabilities: 150000,
    savingsRate: 12.5,
    anchorClosed: true,
    ...overrides,
  },
});

const kpi = (vm: ReturnType<typeof buildReportSummaryVM>, key: string) =>
  vm.kpis.find((item) => item.key === key);

describe('buildReportSummaryVM', () => {
  it('formats the four figures and deep-links each into the analysis', () => {
    const vm = buildReportSummaryVM(summary());

    expect(vm.periodText).toBe('2026 年 6 月');
    expect(vm.unclosed).toBe(false);
    expect(kpi(vm, 'totalAssets')?.valueText).toBe('NT$600,000');
    expect(kpi(vm, 'totalAssets')?.href).toBe('/reports/analysis?series=assets#net-worth');
    expect(kpi(vm, 'netWorth')?.href).toBe('/reports/analysis#net-worth');
    expect(kpi(vm, 'totalLiabilities')?.href).toBe('/reports/analysis?series=debt#net-worth');
    expect(kpi(vm, 'savingsRate')?.href).toBe('/reports/analysis#income');
    expect(kpi(vm, 'savingsRate')?.valueText).toBe('12.5%');
  });

  it('dashes missing figures and tones a negative savings rate', () => {
    const vm = buildReportSummaryVM(
      summary({ assets: null, netWorth: null, liabilities: null, savingsRate: -8 }),
    );

    expect(kpi(vm, 'totalAssets')?.valueText).toBe('—');
    expect(kpi(vm, 'netWorth')?.valueText).toBe('—');
    expect(kpi(vm, 'totalLiabilities')?.valueText).toBe('—');
    expect(kpi(vm, 'savingsRate')?.valueText).toBe('-8.0%');
    expect(kpi(vm, 'savingsRate')?.tone).toBe('negative');
  });

  it('flags an unclosed anchor and dashes the whole summary without one', () => {
    expect(buildReportSummaryVM(summary({ anchorClosed: false })).unclosed).toBe(true);

    const empty = buildReportSummaryVM({
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

    expect(empty.periodText).toBe('—');
    expect(empty.unclosed).toBe(false);
  });
});
