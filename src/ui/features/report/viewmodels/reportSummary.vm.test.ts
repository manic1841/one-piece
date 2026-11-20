import { describe, expect, it } from 'vitest';

import { type ReportSummary } from '@/application/report/use_cases/getReportSummaryWorkflow';

import { buildReportSummaryVM } from './reportSummary.vm';

const summary = (overrides: Partial<ReportSummary['kpis']> = {}): ReportSummary => ({
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

const kpiText = (vm: ReturnType<typeof buildReportSummaryVM>, key: string): string | null => {
  const item = kpi(vm, key);
  return item?.value == null ? null : item.format(item.value);
};

describe('buildReportSummaryVM', () => {
  it('formats the four figures and deep-links each into the analysis', () => {
    const vm = buildReportSummaryVM(summary());

    expect(vm.periodText).toBe('2026 年 6 月');
    expect(vm.unclosed).toBe(false);
    expect(kpiText(vm, 'totalAssets')).toBe('NT$600,000');
    expect(kpi(vm, 'totalAssets')?.href).toBe('/reports/analysis?series=assets#net-worth');
    expect(kpi(vm, 'netWorth')?.href).toBe('/reports/analysis#net-worth');
    expect(kpi(vm, 'totalLiabilities')?.href).toBe('/reports/analysis?series=debt#net-worth');
    expect(kpi(vm, 'savingsRate')?.href).toBe('/reports/analysis#income');
    expect(kpiText(vm, 'savingsRate')).toBe('12.5%');
  });

  it('dashes missing figures and tones a negative savings rate', () => {
    const vm = buildReportSummaryVM(
      summary({ assets: null, netWorth: null, liabilities: null, savingsRate: -8 }),
    );

    expect(kpiText(vm, 'totalAssets')).toBeNull();
    expect(kpiText(vm, 'netWorth')).toBeNull();
    expect(kpiText(vm, 'totalLiabilities')).toBeNull();
    expect(kpiText(vm, 'savingsRate')).toBe('-8.0%');
    expect(kpi(vm, 'savingsRate')?.tone).toBe('negative');
  });

  it('flags an unclosed anchor and dashes the whole summary without one', () => {
    expect(buildReportSummaryVM(summary({ anchorClosed: false })).unclosed).toBe(true);

    const empty = buildReportSummaryVM({
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
