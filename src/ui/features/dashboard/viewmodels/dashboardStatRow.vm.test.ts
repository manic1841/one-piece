import { describe, expect, it } from 'vitest';

import { mapDashboardOverviewToStatRowVM } from './dashboardStatRow.vm';
import {
  type DashboardOverview,
  type DashboardPulse,
} from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

const buildOverview = (
  anchor: Partial<NonNullable<DashboardOverview['anchor']>> | null,
  pulse: DashboardPulse | null = null,
): DashboardOverview => ({
  anchor: anchor
    ? {
        yearMonth: '2026-08',
        netWorth: 450,
        assets: 600,
        liabilities: 150,
        composition: { assets: [], liabilities: [] },
        netWorthSeries: [],
        ...anchor,
      }
    : null,
  pulse,
  cashFlowSeries: [],
});

describe('dashboardStatRow.vm', () => {
  it('renders five tiles: assets, liabilities, cash flow, return, leverage', () => {
    const vm = mapDashboardOverviewToStatRowVM(
      buildOverview(
        { assets: 600, liabilities: 150 },
        {
          netCashFlow: -12300,
          investmentReturn: 3.913,
          investmentLeverage: 1.2,
          monthlyDebtPayment: 13500,
          investmentGain: 3000,
        },
      ),
    );

    expect(vm.metrics.map((metric) => metric.key)).toEqual([
      'totalAssets',
      'totalLiabilities',
      'monthlyCashFlow',
      'portfolioReturn',
      'investmentLeverage',
    ]);
    expect(vm.metrics.map((metric) => metric.valueText)).toEqual([
      'NT$600',
      'NT$150',
      '-NT$12,300',
      '3.91%',
      '1.20x',
    ]);
    expect(vm.metrics[0].detailText).toBe('ANCHORED 2026-08');
  });

  it('emphasizes the cash flow sign with semantic classes', () => {
    const vm = mapDashboardOverviewToStatRowVM(
      buildOverview(
        { assets: 600, liabilities: 150 },
        {
          netCashFlow: 4200,
          investmentReturn: 3.913,
          investmentLeverage: 1.2,
          monthlyDebtPayment: 13500,
          investmentGain: 3000,
        },
      ),
    );

    expect(vm.metrics[2].valueClassName).toBe('text-positive');
  });

  it('renders em-dashes when no anchor is closed', () => {
    const vm = mapDashboardOverviewToStatRowVM(buildOverview(null));

    expect(vm.metrics.map((metric) => metric.valueText)).toEqual(['—', '—', '—', '—', '—']);
  });

  it('renders an em-dash for pulse metrics when the anchor month lacks data', () => {
    const vm = mapDashboardOverviewToStatRowVM(buildOverview({ assets: 600, liabilities: 150 }));

    expect(vm.metrics[2].valueText).toBe('—');
    expect(vm.metrics[3].valueText).toBe('—');
    expect(vm.metrics[4].valueText).toBe('—');
  });
});
