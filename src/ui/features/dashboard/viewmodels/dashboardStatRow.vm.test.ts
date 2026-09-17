import { describe, expect, it } from 'vitest';

import { mapDashboardOverviewToStatRowVM } from './dashboardStatRow.vm';
import { type DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

const buildOverview = (
  anchor: Partial<NonNullable<DashboardOverview['anchor']>> | null,
): DashboardOverview => ({
  anchor: anchor
    ? {
        yearMonth: '2026-08',
        netWorth: 450,
        assets: 0,
        liabilities: 0,
        netWorthSeries: [],
        ...anchor,
      }
    : null,
  pulse: null,
});

describe('dashboardStatRow.vm', () => {
  it('renders assets, liabilities, and next-month due from the anchor', () => {
    const vm = mapDashboardOverviewToStatRowVM(
      buildOverview({ assets: 600, liabilities: 150 }),
      { total: 420, yearMonth: '2026-10' },
    );

    expect(vm.metrics).toHaveLength(3);
    expect(vm.metrics.map((metric) => metric.valueText)).toEqual([
      '$600',
      '$150',
      '$420',
    ]);
    expect(vm.metrics[2].detailText).toBe('2026-10');
  });

  it('renders em-dashes when no anchor is closed', () => {
    const vm = mapDashboardOverviewToStatRowVM(buildOverview(null), {
      total: 420,
      yearMonth: '2026-10',
    });

    expect(vm.metrics.map((metric) => metric.valueText)).toEqual(['—', '—', '$420']);
  });

  it('renders an em-dash for the next-month due when no debt accounts exist', () => {
    const vm = mapDashboardOverviewToStatRowVM(
      buildOverview({ assets: 600, liabilities: 150 }),
      null,
    );

    expect(vm.metrics[2].valueText).toBe('—');
  });
});
