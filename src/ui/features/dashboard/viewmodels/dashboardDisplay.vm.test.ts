import { describe, expect, it } from 'vitest';

import {
  formatCompactAxisValue,
  mapAssetTrendDataToChartPoints,
  mapAssetTrendMetricToVM,
  mapAssetTrendStatusToBadgeVM,
  mapAssetTrendYAxisDomains,
  mapDebtSummaryToCardVM,
  mapLeverageStatsToCardVM,
  mapUnsettledStatsToCardVM,
} from './dashboardDisplay.vm';

describe('dashboardDisplay.vm', () => {
  it('maps leverage stats to card vm', () => {
    const vm = mapLeverageStatsToCardVM({
      ratio: 1.2,
      totalExposure: 123456,
      totalNetValue: 100000,
    });

    expect(vm.ratioText).toBe('1.20x');
    expect(vm.totalExposureText).toContain('123,456');
    expect(vm.totalNetValueText).toContain('100,000');
    expect(vm.statusColorClass).toBe('text-amber-600');
    expect(vm.progressColorClass).toBe('bg-amber-500');
  });

  it('maps debt summary to card vm', () => {
    const vm = mapDebtSummaryToCardVM(200000, 12000, 2);

    expect(vm.totalDebtText).toContain('200,000');
    expect(vm.monthlyPaymentText).toContain('12,000');
    expect(vm.unpaidCountText).toBe('2');
    expect(vm.isUnpaid).toBe(true);
    expect(vm.unpaidContainerClassName).toContain('bg-rose-50');
  });

  it('maps asset trend status and metric vm', () => {
    const status = mapAssetTrendStatusToBadgeVM('ahead');
    expect(status.label).toBe('進度超前');

    const metric = mapAssetTrendMetricToVM('累計收入', 100000, 90000, 11.1);
    expect(metric.actualText).toContain('100,000');
    expect(metric.projectedText).toContain('90,000');
    expect(metric.gapText).toContain('+11.1%');
  });

  it('maps chart points and y-axis domains', () => {
    const chartData = mapAssetTrendDataToChartPoints({
      labels: ['2026-01', '2026-02', '2026-03'],
      assets: [1000, 2000, 0],
      incomes: [500, 600, 0],
      expenses: [300, 350, 0],
      investmentGains: [50, 60, 0],
    });

    expect(chartData.length).toBe(2);

    const domains = mapAssetTrendYAxisDomains(chartData, 3000, 1200, 800);
    expect(domains.left[1]).toBeGreaterThan(0);
    expect(domains.right[1]).toBeGreaterThan(0);
    expect(formatCompactAxisValue(1200)).toBe('1K');
  });

  it('maps unsettled stats to card vm', () => {
    const vm = mapUnsettledStatsToCardVM({
      year: 2026,
      month: 3,
      unsettledAccounts: [{} as never],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [{} as never, {} as never],
      totalUnsettled: 3,
    });

    expect(vm.titleText).toBe('結算 (2026/3)');
    expect(vm.isFullySettled).toBe(false);
    expect(vm.totalBadgeText).toBe('3 項未結算');
    expect(vm.accounts.countText).toBe('1');
    expect(vm.projects.countText).toBe('2');
    expect(vm.badgeVariant).toBe('destructive');
  });
});
